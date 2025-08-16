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
  blockHeader?: {
    number: string;
    timestamp: string;
  };
  blockNumber?: number | string;
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
  events: Events[];
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
  logs?: Events[];
}

export type AccountState = {
  balance?: string; // hex string like "0x..."
  nonce?: number | string; // can be numeric or hex
  code?: string; // optional code hash or bytecode
  storage?: Record<string, string>; // mapping slot => hex value
};

export type StateSnapshot = Record<string, AccountState>;

export interface TraceStateDiff {
  pre: StateSnapshot;
  post: StateSnapshot;
}

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

export interface Events {
  index: number;
  address: string;
  topics: string[];
  data: string;
}