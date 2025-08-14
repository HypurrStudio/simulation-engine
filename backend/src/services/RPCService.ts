import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import { RPCError } from '../utils/errors';

// RPC request interfaces
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
 * RPC Service Class
 * Handles all blockchain RPC communication with proper error handling and retries
 */
export class RPCService {
  private clients: AxiosInstance[];
  private requestId: number = 1;

  constructor() {
    // Create one Axios instance per RPC URL
    this.clients = config.hyperEvmRpcUrls.map((url) => {
      const client = axios.create({
        baseURL: url,
        timeout: config.request.timeoutMs,
        headers: { "Content-Type": "application/json" },
      });

      // Add request interceptor for logging
      client.interceptors.request.use(
        (cfg) => {
          logger.debug("RPC Request", {
            rpcUrl: url,
            method: cfg.method?.toUpperCase(),
            path: cfg.url,
            data: cfg.data,
          });
          return cfg;
        },
        (error) => {
          logger.error("RPC Request Error", { rpcUrl: url, error: error.message });
          return Promise.reject(error);
        }
      );

      // Add response interceptor for logging
      client.interceptors.response.use(
        (response) => {
          logger.debug("RPC Response", {
            rpcUrl: url,
            status: response.status,
            data: response.data,
          });
          return response;
        },
        (error) => {
          logger.error("RPC Response Error", {
            rpcUrl: url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
          return Promise.reject(error);
        }
      );

      return client;
    });
  }

  /**
   * Make a generic RPC call with fallback to next RPC if one fails
   */
  private async makeRPCCall(method: string, params: any[]): Promise<any> {
    const payload: RPCPayload = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.requestId++,
    };

    let lastError: Error | null = null;

    for (const client of this.clients) {
      try {
        const response: AxiosResponse = await client.post("", payload);

        if (response.data.error) {
          throw new RPCError(
            `RPC Error: ${response.data.error.message || "Unknown error"}`
          );
        }

        return response.data.result; // success, return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`RPC call failed on ${client.defaults.baseURL}, trying next...`, {
          method,
          error: lastError.message,
        });
      }
    }

    throw new RPCError(`All RPC calls failed. Last error: ${lastError?.message}`);
  }

  /**
   * Trace a transaction call
   */
  async traceCall(
    callParams: RPCCallParam,
    blockNumber: string | number = 'latest',
    traceParams: string[]
  ): Promise<TraceResult> {
    logger.info('Tracing transaction call', {
      from: callParams.from,
      to: callParams.to,
      blockNumber,
    });

    logger.info('Trace parameters', {
      callParams,
      blockNumber: this.toHex(blockNumber),
      traceParams,
    });

    const result = await this.makeRPCCall('trace_call', [
      callParams,
      traceParams,
      this.toHex(blockNumber),
    ]);

    return result;
  }

  /**
   * Get block information
   */
  async getBlockByNumber(blockNumber: string | number, includeTransactions: boolean = false): Promise<BlockHeader> {
    logger.info('Fetching block information', { blockNumber });

    const result = await this.makeRPCCall('eth_getBlockByNumber', [
      this.toHex(blockNumber),
      includeTransactions,
    ]);

    return result;
  }

  /**
   * Create access list for a transaction
   */
  async createAccessList(
    callParams: RPCCallParam,
    blockNumber: string | number = 'latest'
  ): Promise<AccessListResult> {
    logger.info('Creating access list', {
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
   * Get gas price
   */
  async getGasPrice(): Promise<string> {
    logger.info('Fetching current gas price');

    const result = await this.makeRPCCall('eth_gasPrice', []);
    return result;
  }

  /**
   * Get network ID
   */
  async getNetworkId(): Promise<string> {
    logger.info('Fetching network ID');

    const result = await this.makeRPCCall('net_version', []);
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
   * Health check for RPC endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getNetworkId();
      return true;
    } catch (error: any) {
      logger.error('RPC health check failed', { error: error?.message });
      return false;
    }
  }
}

// Export singleton instance
export const rpcService = new RPCService();
export default rpcService;
