import { Interface } from "ethers";

// Etherscan API integration for fetching contract ABI and functions

export interface EtherscanFunction {
  name: string;
  type: string;
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  stateMutability?: string;
  payable?: boolean;
  constant?: boolean;
}

export interface ContractABI {
  functions: EtherscanFunction[];
  events: any[];
  errors: any[];
}

export async function fetchContractABI(contractAddress: string): Promise<ContractABI | null> {
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    console.error('Etherscan API key not found. Please add NEXT_PUBLIC_ETHERSCAN_API_KEY to your .env file');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=999&module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === '0') {
      console.error('Etherscan API error:', data.message);
      return null;
    }

    if (!data.result || data.result === 'Contract source code not verified') {
      console.warn('Contract not verified on Etherscan');
      return null;
    }

    const abi = JSON.parse(data.result);
    
    // Filter and organize the ABI
    const functions: EtherscanFunction[] = [];
    const events: any[] = [];
    const errors: any[] = [];

    abi.forEach((item: any) => {
      if (item.type === 'function') {
        functions.push(item);
      } else if (item.type === 'event') {
        events.push(item);
      } else if (item.type === 'error') {
        errors.push(item);
      }
    });

    return {
      functions,
      events,
      errors
    };

  } catch (error) {
    console.error('Error fetching contract ABI:', error);
    return null;
  }
}

export function encodeFunctionCall(functionName: string, parameters: Array<{ name: string; type: string; value: string }>, abi: ContractABI): string {
  try {
    // Find the function in the ABI
    const func = abi.functions.find(f => f.name === functionName);
    if (!func) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    // Create a minimal ABI with just this function
    const functionABI = [func];
    
    // Create ethers Interface
    const iface = new Interface(functionABI);
    
    // Extract parameter values
    const paramValues = parameters.map(p => p.value);
    
    // Encode the function call
    const encodedData = iface.encodeFunctionData(functionName, paramValues);
    
    return encodedData;
  } catch (error) {
    console.error('Error encoding function call:', error);
    return '';
  }
}

export function getFunctionSignature(func: EtherscanFunction): string {
  const inputTypes = func.inputs.map(input => input.type).join(',');
  return `${func.name}(${inputTypes})`;
}

export function getFunctionDisplayName(func: EtherscanFunction): string {
  const signature = getFunctionSignature(func);
  const inputs = func.inputs.map(input => `${input.type} ${input.name || 'param'}`).join(', ');
  return `${func.name}(${inputs})`;
} 