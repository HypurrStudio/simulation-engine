import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { RPCError } from '../utils/errors';
import anvilManager, { AnvilInstance } from './anvilManager';

// RPC request interfaces (reused from RPCService)
export interface RPCCallParam {
  from?: string;
  to?: string;
  data: string;
  value: string;
  gas: string | number;
  gasPrice?: string;
}

export interface RPCTraceParam {
  tracer: string;
  enableMemory: boolean;
  enableReturnData: boolean;
  disableStack: boolean;
  disableStorage: boolean;
  stateOverrides: any;
}

export interface RPCPayload {
  jsonrpc: '2.0';
  method: string;
  params: any[];
  id: number;
}

export interface TraceResult {
  from: string;
  to: string;
  gas: string;
  gasUsed: string;
  input: string;
  output?: string;
  value: string;
  error?: string;
  calls?: TraceResult[];
  stateDiff?: any;
}

export interface BlockHeader {
  hash: string;
  number: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  [key: string]: any;
}

export interface AccessListResult {
  accessList: Array<{
    address: string;
    storageKeys: string[];
  }>;
  gasUsed: string;
}

/**
 * Anvil RPC Service Class
 * Handles blockchain RPC communication using local Anvil instances
 */
export class AnvilRPCService {
  private requestId: number = 1;
  private currentInstance: { instance: AnvilInstance; client: AxiosInstance } | null = null;

  constructor() {
    // Set up graceful shutdown
    process.on('SIGINT', () => this.cleanupAll());
    process.on('SIGTERM', () => this.cleanupAll());
  }

  /**
   * Create and get an Anvil instance for the simulation
   */
  async createSimulationInstance(): Promise<void> {
    if (this.currentInstance) {
      await anvilManager.cleanupInstance(this.currentInstance.instance.id);
    }
    this.currentInstance = await this.createFreshInstance();
  }

  /**
   * Clean up all instances (for shutdown)
   */
  async cleanupAll(): Promise<void> {
    if (this.currentInstance) {
      await anvilManager.cleanupInstance(this.currentInstance.instance.id);
      this.currentInstance = null;
    }
  }

  /**
   * Send raw transaction and get transaction hash
   */
  async sendTransaction(callParams: RPCCallParam, existingInstance?: { instance: AnvilInstance; client: AxiosInstance }): Promise<string> {
    try {
      const response = await this.makeRPCCall('eth_sendTransaction', [callParams]);
      console.log("RESPONSE: ", response);
      return response;
    } catch (error) {
      throw new RPCError(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Trace a transaction using debug_traceTransaction
   */
  async traceTransaction(txHash: string, traceTypes: string[] = ["trace", "stateDiff"]): Promise<any> {
    try {
      console.log("TX HASH: ", txHash);
      const response = await this.makeRPCCall('debug_traceTransaction', [txHash, {
        tracer: "callTracer",
        tracerConfig: {
          onlyTopCall: false,
          withLog: true,
        },
      }]);
      console.log(response);
      return response;
    } catch (error) {
      throw new RPCError(`Failed to trace transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      console.log(txHash);
      const response = await this.makeRPCCall('eth_getTransactionReceipt', [txHash]);
      console.log(response);
      return response;
    } catch (error) {
      throw new RPCError(`Failed to get transaction receipt: ${error.message}`);
    }
  }

  /**
   * Create a fresh Anvil instance for each simulation
   */
  private async createFreshInstance(): Promise<{ instance: AnvilInstance; client: AxiosInstance }> {
    // Get the first available RPC URL as fork URL
    const forkUrl = config.hyperEvmRpcUrls[0];
    if (!forkUrl) {
      throw new RPCError('No RPC URLs available for forking');
    }

    logger.info('Creating fresh Anvil instance for simulation', { forkUrl });

    try {
      const instance = await anvilManager.createInstance(forkUrl);
      // console.log(instance);
      const client = anvilManager.createRPCClient(instance);
      
      logger.info('Fresh Anvil instance created successfully', {
        instanceId: instance.id,
        port: instance.port,
      });

      return { instance, client };
    } catch (error: any) {
      logger.error('Failed to create fresh Anvil instance', { error: error.message });
      throw new RPCError(`Failed to create fresh Anvil instance: ${error.message}`);
    }
  }

  /**
   * Make a generic RPC call using the current Anvil instance
   */
  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    if (!this.currentInstance) {
      throw new RPCError('No active Anvil instance. Call createSimulationInstance first.');
    }

    const payload: RPCPayload = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.requestId++,
    };

    try {
      logger.debug('Making RPC call to current Anvil instance', {
        method,
        params,
        instanceId: this.currentInstance.instance.id,
        port: this.currentInstance.instance.port,
      });

      const response: AxiosResponse = await this.currentInstance.client.post("", payload);

      if (response.data.error) {
        throw new RPCError(
          `Anvil RPC Error: ${response.data.error.message || "Unknown error"}`
        );
      }

      return response.data.result;
    } catch (error: any) {
      logger.error('Anvil RPC call failed', {
        method,
        error: error.message,
        instanceId: this.currentInstance.instance.id,
        port: this.currentInstance.instance.port,
      });

      throw new RPCError(`Anvil RPC call failed: ${error.message}`);
    }
  }

  /**
   * Trace a transaction call using Anvil
   */
  async traceCall(
    callParams: RPCCallParam,
    blockNumber: string | number = 'latest',
    traceParams: string[]
  ): Promise<TraceResult> {
    logger.info('Tracing transaction call with Anvil', {
      from: callParams.from,
      to: callParams.to,
      blockNumber,
    });

    const result = await this.makeRPCCall('debug_traceCall', [
      callParams,
      this.toHex(blockNumber),
      {
        "tracer": "callTracer"
      }
    ]);

    console.log(result);

    return result;
  }

  /**
   * Get block information from Anvil
   */
  async getBlockByNumber(blockNumber: string | number, includeTransactions: boolean = false): Promise<BlockHeader> {
    logger.info('Fetching block information from Anvil', { blockNumber });

    const result = await this.makeRPCCall('eth_getBlockByNumber', [
      this.toHex(blockNumber),
      includeTransactions,
    ]);

    return result;
  }

  /**
   * Create access list for a transaction using Anvil
   */
  async createAccessList(
    callParams: RPCCallParam,
    blockNumber: string | number = 'latest'
  ): Promise<AccessListResult> {
    logger.info('Creating access list with Anvil', {
      from: callParams.from,
      to: callParams.to,
      blockNumber,
    });

    const result = await this.makeRPCCall('eth_createAccessList', [
      callParams,
      this.toHex(blockNumber),
    ]);

    return result;
  }

  /**
   * Get gas price from Anvil
   */
  async getGasPrice(): Promise<string> {
    logger.info('Fetching current gas price from Anvil');

    const result = await this.makeRPCCall('eth_gasPrice', []);
    return result;
  }

  /**
   * Get network ID from Anvil
   */
  async getNetworkId(): Promise<string> {
    logger.info('Fetching network ID from Anvil');

    const result = await this.makeRPCCall('net_version', []);
    return result;
  }

  /**
   * Get chain ID from Anvil
   */
  async getChainId(): Promise<string> {
    logger.info('Fetching chain ID from Anvil');

    const result = await this.makeRPCCall('eth_chainId', []);
    return result;
  }

  /**
   * Get latest block number from Anvil
   */
  async getLatestBlockNumber(): Promise<string> {
    logger.info('Fetching latest block number from Anvil');

    const result = await this.makeRPCCall('eth_blockNumber', []);
    return result;
  }

  /**
   * Convert value to hex string
   */
  private toHex(value: string | number): string {
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return value;
      }
      if (['latest', 'earliest', 'pending'].includes(value)) {
        return value;
      }
      return '0x' + BigInt(value).toString(16);
    }
    return '0x' + BigInt(value).toString(16);
  }

  /**
   * Health check for Anvil instance
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getNetworkId();
      return true;
    } catch (error: any) {
      logger.error('Anvil health check failed', { error: error?.message });
      return false;
    }
  }

  /**
   * Clean up all resources (for shutdown)
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Anvil RPC service');
    // No cleanup needed since instances are cleaned up immediately after each use
  }

  /**
   * Get Anvil manager statistics
   */
  getStats() {
    return anvilManager.getStats();
  }
}

// Export singleton instance
export const anvilRPCService = new AnvilRPCService();
export default anvilRPCService;
