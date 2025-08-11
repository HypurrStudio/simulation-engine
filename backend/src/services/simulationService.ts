import { v4 as uuidv4 } from 'uuid';
import {
  SimulationRequest,
  SimulationResponse,
  ContractObject,
  TransactionObject,
  CallTrace,
  StateDiff,
  StorageDiff,
  BalanceDiff,
  ContractObjectResponse,
} from '../types/simulation';
import { rpcService, RPCCallParam, AccessListResult } from './RPCService';
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
   * Main simulation method
   */
  async simulateTransaction(request: SimulationRequest): Promise<SimulationResponse> {
    const simulationId = uuidv4();
    
    logger.info('Starting transaction simulation', {
      simulationId,
      from: request.from,
      to: request.to,
      networkId: request.networkId,
    });

    try {
      // Validate required fields
      this.validateRequest(request);

      // Prepare simulation parameters
      const callParams = this.prepareCallParams(request);
      const traceParams = this.prepareTraceParams(request);

      // Execute simulation
      const traceResult = await rpcService.traceCall(
        callParams,
        request.blockNumber || 'latest',
        traceParams
      );

      // Process results
      const callTrace = this.processTraceResult(traceResult);
      const contractAddresses = this.collectContractAddresses(callTrace, request.to);

      const [blockHeaderResult, accessList, contractsMetadataResult] = await Promise.allSettled([
        this.fetchBlockHeader(request.blockNumber),
        this.generateAccessList(request, callParams),
        this.fetchContractMetadata(contractAddresses, config.hyperEvmChainId.toString())
      ]);

      const blockHeader = blockHeaderResult.status === "fulfilled" ? blockHeaderResult.value : null;
      const contractsMetadata = contractsMetadataResult.status === "fulfilled" ? contractsMetadataResult.value : null;

      const {storageDiff, balanceDiff} = this.splitStateDiff(traceResult.stateDiff || {});

      // Build response
      const response = this.buildSimulationResponse(
        request,
        traceResult,
        callTrace,
        accessList.status === 'fulfilled' ? accessList.value : [],
        storageDiff,
        balanceDiff,
        blockHeader,
        contractsMetadata,
        simulationId
      );

      // logger.info('Transaction simulation completed successfully', {
      //   simulationId,
      //   gasUsed: response.simulation.gas_used,
      //   status: response.simulation.status,
      // });

      return response;
    } catch (error) {
      logger.error('Transaction simulation failed', {
        simulationId,
        error: error.message,
        stack: error.stack,
      });

      throw new SimulationError(`Simulation failed: ${error.message}`);
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
    };
  }

  /**
   * Prepare trace parameters for RPC
   */
  private prepareTraceParams(request: SimulationRequest): string[] {
    return ["trace", "stateDiff"];
  }

  /**
   * Process trace result into call trace format
   */
  private processTraceResult(traceResult: any): CallTrace[] {
    if (!traceResult) return [];
    const traces = traceResult.trace;

    const lookup = new Map<string, CallTrace>();

    // Pass 1: Create all nodes and store in map
    for (const t of traces) {
      const node: CallTrace = {
        from: t.action.from,
        to: t.action.to,
        gas: t.action.gas,
        gas_used: t.result?.gasUsed || "0x0",
        input: t.action.input,
        subtraces: t.subtraces,
        traceAddress: t.traceAddress,
        output: t.result?.output,
        value: t.action.value,
        error: t.error,
        calls: []
      };

      const addrKey = t.traceAddress.join(".");
      lookup.set(addrKey, node);
    }

    const root: CallTrace[] = [];

    // Pass 2: Link children to parents
    for (const [addrKey, node] of lookup) {
      if (node.traceAddress.length === 0) {
        root.push(node); // top-level trace
      } else {
        const parentKey = node.traceAddress.slice(0, -1).join(".");
        const parent = lookup.get(parentKey);
        if (parent) {
          parent.calls!.push(node);
        } else {
          // orphan — push to root if no parent found
          root.push(node);
        }
      }
    }

    return root;
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
    } catch (error) {
      logger.warn('Failed to fetch block header', { blockNumber, error: error.message });
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
    } catch (error) {
      logger.warn('Failed to generate access list', { error: error.message });
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
        blockHeader
      ),
      contracts: this.buildContractObject(request, traceResult, contractsMetadata),
      generated_access_list: accessList,
    };
  }

  private splitStateDiff(stateDiff: StateDiff): any {
      const storageDiff: StorageDiff = {};
  const balanceDiff: BalanceDiff = {};

  for (const [address, diff] of Object.entries(stateDiff)) {
    // Check storage changes
    const storageChanges: StorageDiff[string] = {};
    for (const [slot, slotDiff] of Object.entries(diff.storage || {})) {
      if (slotDiff !== "=" && "*" in slotDiff) {
        storageChanges[slot] = slotDiff["*"];
      }
    }
    if (Object.keys(storageChanges).length > 0) {
      storageDiff[address] = storageChanges;
    }

    // Check balance changes
    if (diff.balance !== "=" && "*" in diff.balance) {
      balanceDiff[address] = diff.balance["*"];
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
    blockHeader: any
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
        number: blockHeader.blockNumber || '0',
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
