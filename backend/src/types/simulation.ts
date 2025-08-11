import { AccessListResult } from '../services/RPCService';

export interface SimulationRequest {
  from?: string;
  to?: string;
  input?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  stateObjects?: {
    [address: string]: {
      balance: string;
      storage: {
        [slot: string]: string;
      };
    };
  };
  generateAccessList?: boolean;
  networkId?: string;
  blockHeader?: {
    number: string;
    timestamp: string;
  };
  blockNumber?: number | null;
  transactionIndex?: number;
  accessList?: AccessListResult['accessList'];
}

export interface SimulationResponse {
  transaction: TransactionObject;
  generated_access_list: GeneratedAccessList[];
  contracts: ContractObjectResponse;
}

export interface ContractObjectResponse {
  [address: string]: ContractObject;
}

export interface TransactionObject {
  from: string;
  to: string;
  input: string;
  value: string;
  gas: string;
  gasPrice: string;
  output: string;
  timestamp: string;
  blockHeader: {
    number: string;
    hash: string;
    baseFeePerGas: string;
    blobGasUsed: string;
    difficulty: string;
    excessBlobGas: string;
    extraData: string;
    gasLimit: string;
    gasUsed: string;
    logsBloom: string;
    miner: string;
    nonce: string;
    size: string;
    stateRoot: string;
    timestamp: string;
  };
  callTrace: CallTrace[];
  balanceDiff: BalanceDiff;
  storageDiff: StorageDiff;
}

export interface GeneratedAccessList {
  address: string;
  storageKeys: string[];
}

export interface ContractObject {
  address: string;
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  CompilerType: string;
  OptimizationUsed: boolean;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  ContractFileName: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  SimilarMatch: string;
}

export interface CallTrace {
  from: string;
  to: string;
  gas: string;
  gas_used: string;
  input: string;
  subtraces: number;
  traceAddress: number[];
  output?: string;
  value: string;
  error?: string;
  calls?: CallTrace[];
}

export type StateDiff = Record<
  string,
  {
    balance: '=' | { '*': { from: string; to: string } };
    code: string | { '*': { from: string; to: string } };
    nonce: '=' | { '*': { from: string; to: string } };
    storage: Record<string, '=' | { '*': { from: string; to: string } }>;
  }
>;

export interface StorageDiff {
  [address: string]: {
    [slot: string]: { from: string; to: string };
  };
}

export interface BalanceDiff {
  [address: string]: { from: string; to: string };
}
export interface SimulationError {
  message: string;
  reason?: string;
}
