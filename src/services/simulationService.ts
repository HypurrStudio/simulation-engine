import { v4 as uuidv4 } from 'uuid';
import {
  SimulationRequest,
  SimulationResponse,
  ContractObject,
  TransactionObject,
  CallTrace,
  StorageDiff,
  BalanceDiff,
  ContractObjectResponse,
  Events,
  TraceStateDiff,
} from '../types/simulation';
import { rpcService, RPCCallParam, AccessListResult, RPCTraceParam } from './RPCService';
import { SimulationError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';
import contractMetadataService from './contractMetadataService';

/**
 * Simulation Service Class
 * Handles transaction simulation with proper error handling and response formatting
 */
export class SimulationService {
  /**
   * Get transaction by hash and trace it
   */
  async traceTransaction(request: SimulationRequest, txHash: string): Promise<SimulationResponse> {
    const traceId = uuidv4();
    
    logger.info('Starting transaction trace', {
      traceId,
      from: request.from,
      to: request.to
    });

    try {
      // Validate required fields
      this.validateRequest(request);

      // Prepare trace parameters
      const callTracerParams = this.prepareCallTracerParams(request);

      // Execute trace
      const callTraceResult = await rpcService.traceCallTx(
        txHash,
        callTracerParams
      );

      // Prepare prestate trace parameters
      const prestateTracerParams = this.preparePrestateTracerParams(request);

      // Execute trace
      const prestateTraceResult = await rpcService.traceCallTx(
        txHash,
        prestateTracerParams
      );

      const logs = this.parseEvents([callTraceResult] as unknown as CallTrace[]);

      // Process results
      const callTrace = callTraceResult as unknown as CallTrace;
      const contractAddresses = this.collectContractAddresses([callTrace], request.to);

      const [blockHeaderResult, contractsMetadataResult] = await Promise.allSettled([
        this.fetchBlockHeader(request.blockNumber || 'latest'),
        this.fetchContractMetadata(contractAddresses, config.hyperEvmChainId.toString())
      ]);

      const blockHeader = blockHeaderResult.status === "fulfilled" ? blockHeaderResult.value : null;
      const contractsMetadata = contractsMetadataResult.status === "fulfilled" ? contractsMetadataResult.value : [];

      const {storageDiff, balanceDiff} = this.splitStateDiff(prestateTraceResult as unknown as TraceStateDiff);

      // Build response
      const response = this.buildSimulationResponse(
        request,
        callTraceResult,
        [callTrace],
        [],
        storageDiff,
        balanceDiff,
        blockHeader,
        contractsMetadata,
        logs,
        traceId
      );

      // logger.info('Transaction trace completed successfully', {
      //   traceId,
      //   gasUsed: response.trace.gas_used,
      //   status: response.trace.status,
      // });

      return response;
    } catch (error: any) {
      logger.error('Transaction trace failed', {
        traceId,
        error: error?.message,
        stack: error?.stack,
      });

      throw new SimulationError(`trace failed: ${error?.message}`);
    }
  }

  /**
   * Main simulation method
   */
  async simulateTransaction(request: SimulationRequest): Promise<SimulationResponse> {
    const simulationId = uuidv4();
    
    logger.info('Starting transaction simulation', {
      simulationId,
      from: request.from,
      to: request.to
    });

    try {
      // Validate required fields
      this.validateRequest(request);

      // Prepare simulation parameters
      const callParams = this.prepareCallParams(request);
      const callTracerParams = this.prepareCallTracerParams(request);

      // Execute simulation
      const callTraceResult = await rpcService.traceCallSimulate(
        callParams,
        request.blockNumber || 'latest',
        callTracerParams
      );

      // Prepare prestate trace parameters
      const prestateTracerParams = this.preparePrestateTracerParams(request);

      // Execute simulation
      const prestateTraceResult = await rpcService.traceCallSimulate(
        callParams,
        request.blockNumber || 'latest',
        prestateTracerParams
      );

      const logs = this.parseEvents([callTraceResult] as unknown as CallTrace[]);

      // Process results
      const callTrace = callTraceResult as unknown as CallTrace;
      const contractAddresses = this.collectContractAddresses([callTrace], request.to);

      const [blockHeaderResult, accessList, contractsMetadataResult] = await Promise.allSettled([
        this.fetchBlockHeader(request.blockNumber || 'latest'),
        this.generateAccessList(request, callParams),
        this.fetchContractMetadata(contractAddresses, config.hyperEvmChainId.toString())
      ]);

      const blockHeader = blockHeaderResult.status === "fulfilled" ? blockHeaderResult.value : null;
      const contractsMetadata = contractsMetadataResult.status === "fulfilled" ? contractsMetadataResult.value : [];

      const {storageDiff, balanceDiff} = this.splitStateDiff(prestateTraceResult as unknown as TraceStateDiff);

      // Build response
      const response = this.buildSimulationResponse(
        request,
        callTraceResult,
        [callTrace],
        accessList.status === 'fulfilled' ? accessList.value : [],
        storageDiff,
        balanceDiff,
        blockHeader,
        contractsMetadata,
        logs,
        simulationId
      );

      // logger.info('Transaction simulation completed successfully', {
      //   simulationId,
      //   gasUsed: response.simulation.gas_used,
      //   status: response.simulation.status,
      // });

      return response;
    } catch (error: any) {
      logger.error('Transaction simulation failed', {
        simulationId,
        error: error?.message,
        stack: error?.stack,
      });

      throw new SimulationError(`Simulation failed: ${error?.message}`);
    }
  }

  /**
   * Validate simulation request
   */
  private validateRequest(request: SimulationRequest): void {
    if (!request.from || !request.to) {
      throw new SimulationError('From and To addresses are required for simulation');
    }

    if (!this.isValidAddress(request.from)) {
      throw new SimulationError('Invalid from address format');
    }

    if (!this.isValidAddress(request.to)) {
      throw new SimulationError('Invalid to address format');
    }
  }

  /**
   * Check if address is valid
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Prepare call parameters for RPC
   */
  private prepareCallParams(request: SimulationRequest): RPCCallParam {
    return {
      from: request.from,
      to: request.to,
      data: request.input || '0x',
      value: this.toHex(request.value || '0x0'),
      gas: this.toHex(request.gas?.toString() || '1000000'),
      gasPrice: request.gasPrice ? this.toHex(request.gasPrice) : undefined,
      accessList: request?.accessList,
    };
  }

  /**
   * Prepare call trace parameters for RPC
   */
  private prepareCallTracerParams(request: SimulationRequest): RPCTraceParam {
    return {
      tracer: "callTracer",
      tracerConfig: {
        withLog: true
      },
      stateOverrides: request.stateObjects
    }
  }

  /**
   * Prepare state trace parameters for RPC
   */
  private preparePrestateTracerParams(request: SimulationRequest): RPCTraceParam {
    return {
      tracer: "prestateTracer",
      tracerConfig: {
        diffMode: true,
        disableCode: true,
        disableStorage: false
      },
      stateOverrides: request.stateObjects
    }
  }

  /**
   * Parse events from callTrace
   */
  private parseEvents(callsTrace: CallTrace[]): Events[] {
    const logs: Events[] = [];

    function recurse(calls: CallTrace[]) {
      for (const call of calls) {
        if (call.logs) logs.push(...call.logs);
        if (call.calls) recurse(call.calls);
      }
    }

    recurse(callsTrace);
    return logs;
  }

  /**
   * Collect all contract addresses from call trace
   */
  private collectContractAddresses(callTrace: CallTrace[], toAddress?: string): Set<string> {
    const addresses = new Set<string>();
    
    if (toAddress) {
      addresses.add(toAddress.toLowerCase());
    }

    function recurse(calls: CallTrace[]) {
      for (const call of calls) {
        if (call.to) addresses.add(call.to.toLowerCase());
        if (call.calls) recurse(call.calls);
      }
    }

    recurse(callTrace);
    return addresses;
  }

  /**
   * Fetch block header information
   */
  private async fetchBlockHeader(blockNumber?: string | number): Promise<any> {
    if (!blockNumber || blockNumber === 'latest') {
      return {};
    }

    try {
      return await rpcService.getBlockByNumber(blockNumber, false);
    } catch (error: any) {
      logger.warn('Failed to fetch block header', { blockNumber, error: error?.message });
      return {};
    }
  }

  /**
   * Generate access list for transaction
   */
  private async generateAccessList(
    request: SimulationRequest,
    callParams: RPCCallParam
  ): Promise<AccessListResult["accessList"]> {
    if (!request.generateAccessList) {
      return request.accessList || [];
    }

    try {
      const result = await rpcService.createAccessList(
        callParams,
        request.blockNumber || 'latest'
      );
      return result.accessList || [];
    } catch (error: any) {
      logger.warn('Failed to generate access list', { error: error?.message });
      return [];
    }
  }

  /**
   * Fetch contract metadata for addresses
   */
  private async fetchContractMetadata(
  addresses: Set<string>,
  networkId: string
): Promise<ContractObject[]> {
  const promises = Array.from(addresses).map(async (address) => {
    try {
      const metadata = await contractMetadataService.getContractMetadata(address, networkId);
      if (metadata) {
        return { ...metadata, address };
      }
    } catch (err) {
      console.error(`Failed to fetch metadata for ${address}:`, err);
      return null;
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((c): c is ContractObject => c !== null);
}

  /**
   * Build simulation response
   */
  private buildSimulationResponse(
    request: SimulationRequest,
    traceResult: any,
    callTrace: CallTrace[],
    accessList: AccessListResult["accessList"],
    storageDiff: StorageDiff,
    balanceDiff: BalanceDiff,
    blockHeader: any,
    contractsMetadata: ContractObject[],
    events: Events[],
    simulationId: string
  ): SimulationResponse {
    const gasUsed = parseInt(traceResult?.gasUsed || '0x0', 16);

    return {
      transaction: this.buildTransactionObject(
        request,
        traceResult,
        callTrace,
        storageDiff,
        balanceDiff,
        blockHeader,
        events
      ),
      contracts: this.buildContractObject(request, traceResult, contractsMetadata),
      generated_access_list: accessList,
    };
  }

  // Split State into storage and balance diff
  private splitStateDiff(stateDiff: TraceStateDiff): {
    storageDiff: StorageDiff;
    balanceDiff: BalanceDiff;
  } {
    const storageDiff: StorageDiff = {};
    const balanceDiff: BalanceDiff = {};

    const addresses = new Set([
      ...Object.keys(stateDiff.pre),
      ...Object.keys(stateDiff.post),
    ]);

    for (const address of addresses) {
      const pre = stateDiff.pre[address] || {};
      const post = stateDiff.post[address] || {};

      // --- balance ---
      const preBalance = pre.balance ?? "0x0";
      const postBalance = post.balance ?? "0x0";
      if (preBalance !== postBalance) {
        balanceDiff[address] = { from: preBalance, to: postBalance };
      }

      // --- storage ---
      const preStorage = pre.storage || {};
      const postStorage = post.storage || {};
      const slots = new Set([...Object.keys(preStorage), ...Object.keys(postStorage)]);
      const storageChanges: StorageDiff[string] = {};

      for (const slot of slots) {
        const from = preStorage[slot] ?? "0x0000000000000000000000000000000000000000000000000000000000000000";
        const to = postStorage[slot] ?? "0x0000000000000000000000000000000000000000000000000000000000000000";
        if (from !== to) {
          storageChanges[slot] = { from, to };
        }
      }

      if (Object.keys(storageChanges).length > 0) {
        storageDiff[address] = storageChanges;
      }
    }

    return { storageDiff, balanceDiff };
  }

  /**
   * Build transaction object
   */
  private buildTransactionObject(
    request: SimulationRequest,
    traceResult: any,
    callTrace: CallTrace[],
    storageDiff: StorageDiff,
    balanceDiff: BalanceDiff,
    blockHeader: any,
    events: Events[]
  ): TransactionObject {
    return {
      from: request.from || '0x0',
      to: request.to || '0x0',
      input: request.input || '0x',
      value: request.value || '0x0',
      gas: this.toHex(request.gas || 21000),
      gasPrice: this.toHex(request.gasPrice || '0x0'),
      output: traceResult?.output || '0x',
      timestamp: blockHeader.timestamp || '0',
      blockHeader: {
        number: blockHeader.number || '0',
        hash: blockHeader.hash || '0x0',
        baseFeePerGas: blockHeader.baseFeePerGas || '0x0',
        blobGasUsed: blockHeader.blobGasUsed || '0x0',
        difficulty: blockHeader.difficulty || '0x0',
        excessBlobGas: blockHeader.excessBlobGas || '0x0',
        extraData: blockHeader.extraData || '0x0',
        gasLimit: blockHeader.gasLimit || '0x0',
        gasUsed: blockHeader.gasUsed || '0x0',
        logsBloom: blockHeader.logsBloom || '0x0',
        miner: blockHeader.miner || '0x0',
        nonce: blockHeader.nonce || '0x0',
        size: blockHeader.size || '0x0',
        stateRoot: blockHeader.stateRoot || '0x0',
        timestamp: blockHeader.timestamp || '0',
      },
      callTrace: callTrace,
      balanceDiff: balanceDiff,
      storageDiff: storageDiff,
      events: events
    };
  }

  /**
   * Build contract object
   */
  private buildContractObject(request: SimulationRequest,
    traceResult: any, contractsMetadata: ContractObject[]): ContractObjectResponse {
      const resp: ContractObjectResponse = {};
      contractsMetadata.map((contract) => {
        resp[contract.address] = contract
      })
      return resp;
    }

  /**
   * Convert value to hex string
   */
  private toHex(value: string | number): string {
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return value;
      }
      return '0x' + BigInt(value).toString(16);
    }
    return '0x' + BigInt(value).toString(16);
  }
}

// Export singleton instance
export const simulationService = new SimulationService();
export default simulationService;
