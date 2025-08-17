import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Call trace utilities
export interface CallTraceItem {
  from: string
  to: string
  error: string
  gas: string
  gas_used: string
  input: string
  subtraces: number
  traceAddress: number[]
  output: string
  value: string
  calls: CallTraceItem[]
}

export interface DisplayTraceItem {
  id: string
  from: string
  to: string
  gas: string
  gasUsed: string
  input: string
  error: string
  output: string
  value: string
  subtraces: number
  traceAddress: number[]
  calls: DisplayTraceItem[]
  level: number
  isExpanded: boolean
}
// ---- helpers ----
const asArray = <T>(x: T | T[] | undefined | null): T[] =>
  Array.isArray(x) ? x : (x ? [x] : []);

const safeArr = <T>(x?: T[]): T[] => (Array.isArray(x) ? x : []);

let autoId = 0;
const genId = (traceAddress: number[] | undefined, fallbackBits: string) => {
  const ta = safeArr(traceAddress);
  return ta.length ? ta.join("-") : `node-${fallbackBits}-${autoId++}`;
};

/**
 * Parse a call trace tree into display nodes, defensively handling absent fields.
 * Accepts either an array of root nodes or a single root node.
 */
export function parseCallTrace(
  callTrace: CallTraceItem[] | CallTraceItem | undefined | null,
  expanded: boolean = false
): DisplayTraceItem[] {
  const roots = asArray(callTrace);

  const parseItem = (item: CallTraceItem, level: number, siblingIndex: number): DisplayTraceItem => {
    const traceAddress = safeArr(item.traceAddress);
    const id = genId(traceAddress, `${level}-${siblingIndex}`);

    const childrenIn = safeArr(item.calls);
    const childrenOut = childrenIn.map((child, idx) => parseItem(child, level + 1, idx));

    return {
      id,
      from: item.from ?? "0x",
      to: item.to ?? "0x",
      gas: item.gas,
      gasUsed: item.gas_used,
      error: item.error,
      input: item.input,
      output: item.output,
      value: item.value,
      subtraces: item.subtraces,
      traceAddress,
      calls: childrenOut,
      level,
      isExpanded: expanded,
    };
  };

  return roots.map((root, i) => parseItem(root, 0, i));
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}



export function formatGas(gas: string): string {
  if (!gas) return '0'
  const gasNum = parseInt(gas, 16)
  return gasNum.toLocaleString()
}

export function formatValue(value: string): string {
  if (!value) return '0'
  const valueNum = parseInt(value, 16)
  if (valueNum === 0) return '0'
  return `${(valueNum / 1e18).toFixed(9)} HYPE`
}

export function getFunctionName(input: string): string {
  if (!input || input === '0x') return 'fallback()'
  if (input.length < 10) return 'fallback()'
  
  const functionSelector = input.slice(0, 10)
  
  // Common function selectors
  const functionMap: { [key: string]: string } = {
    '0xd0e30db0': 'deposit()',
    '0x70a08231': 'balanceOf(address)',
    '0x095ea7b3': 'approve(address,uint256)',
    '0xfeaf968c': 'latestRoundData()',
    '0x313ce567': 'decimals()',
    '0x04e45aaf': 'addFunds(bytes32)',
    '0x128acb08': 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))',
    '0xa9059cbb': 'transfer(address,uint256)',
    '0x23b872dd': 'transferFrom(address,address,uint256)',
    '0xfa461e33': 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint160))'
  }
  
  return functionMap[functionSelector] || `0x${functionSelector.slice(2, 6)}...`
}

// Get contract names and ABI from response
export const getContractName = (address: string, responseData?: any): string => {
  if (responseData?.contracts && (responseData.contracts as any)[address.toLowerCase()]) {
    return (responseData.contracts as any)[address.toLowerCase()].ContractName || address
  }
  return address
}

export const getContractABI = (address: string, responseData?: any): any[] | null => {
  if (responseData?.contracts && (responseData.contracts as any)[address]) {
    try {
      const abiData = (responseData.contracts as any)[address].ABI
      if (typeof abiData === 'string') {
        return JSON.parse(abiData)
      } else if (Array.isArray(abiData)) {
        return abiData
      }
    } catch {
      return null
    }
  }
  return null
}

// Generate function selector from function signature
const generateFunctionSelector = (functionName: string, inputs: any[]): string => {
  const inputTypes = inputs.map(input => input.type).join(',')
  const signature = `${functionName}(${inputTypes})`
  
  // Simple hash function for demo (in production, use proper keccak256)
  let hash = 0
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to 8 characters (4 bytes)
  return '0x' + Math.abs(hash).toString(16).padStart(8, '0')
}

// Decode function input using ABI - completely dynamic
export const decodeFunctionInput = (input: string, toAddress: string, responseData?: any): { functionName: string; params: any[]; decodedParams: string } => {
  if (!input || input === '0x' || input.length < 10) {
    return { functionName: 'fallback()', params: [], decodedParams: '' }
  }

  const functionSelector = input.slice(0, 10)
  const remainingData = input.slice(10)

  // First, try to find the function in the contract ABI
  const abi = getContractABI(toAddress, responseData)
  if (abi) {
    // Look for function with matching selector
    for (const item of abi) {
      if (item.type === 'function' && item.inputs) {
        const expectedSelector = generateFunctionSelector(item.name, item.inputs)
        if (expectedSelector === functionSelector) {
          // Found matching function, decode parameters
          let decodedParams = ''
          const params = []
          
          if (item.inputs.length > 0 && remainingData.length >= item.inputs.length * 64) {
            for (let i = 0; i < item.inputs.length; i++) {
              const input = item.inputs[i]
              const paramData = remainingData.slice(i * 64, (i + 1) * 64)
              const paramName = input.name || `param${i}`
              
              let paramValue = ''
              switch (input.type) {
                case 'address':
                  // Remove padding and convert to address
                  paramValue = '0x' + paramData.slice(24)
                  break
                case 'uint256':
                case 'uint128':
                case 'uint64':
                case 'uint32':
                case 'uint16':
                case 'uint8':
                  // Convert hex to decimal
                  const numValue = parseInt(paramData, 16)
                  paramValue = numValue.toString()
                  break
                case 'int256':
                case 'int128':
                case 'int64':
                case 'int32':
                case 'int16':
                case 'int8':
                  // Convert hex to decimal (handle negative numbers)
                  const intValue = parseInt(paramData, 16)
                  paramValue = intValue.toString()
                  break
                case 'bool':
                  // Convert to boolean
                  paramValue = paramData === '0000000000000000000000000000000000000000000000000000000000000001' ? 'true' : 'false'
                  break
                case 'bytes32':
                case 'bytes':
                  // Show as hex
                  paramValue = '0x' + paramData
                  break
                case 'string':
                  // Try to decode as UTF-8 string
                  try {
                    // Remove padding and convert hex to string
                    const hexString = paramData.replace(/^0+/, '')
                    if (hexString.length % 2 === 0) {
                      const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
                      paramValue = new TextDecoder().decode(bytes)
                    } else {
                      paramValue = '0x' + paramData
                    }
                  } catch {
                    paramValue = '0x' + paramData
                  }
                  break
                default:
                  // For other types, show as hex
                  paramValue = '0x' + paramData
              }
              
              params.push(`${paramName} = ${paramValue}`)
            }
            decodedParams = params.join(', ')
          }
          
          return {
            functionName: item.name,
            params: [input],
            decodedParams: decodedParams
          }
        }
      }
    }
  }

  // If no ABI match found, try common function selectors as fallback
  const commonSelectors: { [key: string]: { name: string; params: string[] } } = {
    '0xd0e30db0': { name: 'deposit', params: [] },
    '0x70a08231': { name: 'balanceOf', params: ['address'] },
    '0x095ea7b3': { name: 'approve', params: ['address', 'uint256'] },
    '0xfeaf968c': { name: 'latestRoundData', params: [] },
    '0x313ce567': { name: 'decimals', params: [] },
    '0xa9059cbb': { name: 'transfer', params: ['address', 'uint256'] },
    '0x04e45aaf': { name: 'addFunds', params: ['address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'bool'] },
    '0x128acb08': { name: 'swap', params: ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes', 'bytes'] },
    '0xf9bfe8a7': { name: 'addFunds', params: ['bytes32'] }
  }

  if (commonSelectors[functionSelector]) {
    const func = commonSelectors[functionSelector]
    let decodedParams = ''
    
    if (func.params.length > 0 && remainingData.length >= func.params.length * 64) {
      const params = []
      for (let i = 0; i < func.params.length; i++) {
        const paramData = remainingData.slice(i * 64, (i + 1) * 64)
        const paramType = func.params[i]
        
        if (paramType === 'address') {
          const address = '0x' + paramData.slice(24)
          params.push(`param${i} = ${address}`)
        } else if (paramType === 'uint256') {
          const value = parseInt(paramData, 16)
          params.push(`param${i} = ${value}`)
        } else if (paramType === 'bytes32') {
          const hexValue = '0x' + paramData
          params.push(`param${i} = ${hexValue}`)
        } else {
          params.push(`param${i} = 0x${paramData}`)
        }
      }
      decodedParams = params.join(', ')
    }
    
    return {
      functionName: func.name,
      params: [input],
      decodedParams: decodedParams
    }
  }

  // Final fallback: show function selector + remaining data
  return { 
    functionName: `0x${functionSelector.slice(2, 6)}...`, 
    params: remainingData ? [remainingData] : [],
    decodedParams: remainingData || ''
  }
}

// Decode function output using ABI - completely dynamic
export const decodeFunctionOutput = (output: string, toAddress: string, responseData?: any): string => {
  if (!output || output === '0x') {
    return ''
  }

  // Try to find the function in the contract ABI to get output type
  const abi = getContractABI(toAddress, responseData)
  if (abi) {
    // Look for function with matching output
    for (const item of abi) {
      if (item.type === 'function' && item.outputs && item.outputs.length > 0) {
        const outputType = item.outputs[0].type
        const outputName = item.outputs[0].name || 'result'
        
        try {
          let decodedValue = ''
          switch (outputType) {
            case 'bool':
              decodedValue = output === '0x0000000000000000000000000000000000000000000000000000000000000001' ? 'true' : 'false'
              break
            case 'uint256':
            case 'uint128':
            case 'uint64':
            case 'uint32':
            case 'uint16':
            case 'uint8':
              const uintValue = parseInt(output.slice(2), 16)
              decodedValue = uintValue.toString()
              break
            case 'int256':
            case 'int128':
            case 'int64':
            case 'int32':
            case 'int16':
            case 'int8':
              const intValue = parseInt(output.slice(2), 16)
              decodedValue = intValue.toString()
              break
            case 'address':
              decodedValue = '0x' + output.slice(2).slice(24)
              break
            case 'bytes32':
            case 'bytes':
              decodedValue = output
              break
            case 'string':
              try {
                const hexString = output.slice(2).replace(/^0+/, '')
                if (hexString.length % 2 === 0) {
                  const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
                  decodedValue = new TextDecoder().decode(bytes)
                } else {
                  decodedValue = output
                }
              } catch {
                decodedValue = output
              }
              break
            default:
              decodedValue = output
          }
          
          return `${outputName}: ${decodedValue}`
        } catch {
          // If decoding fails, return the raw output
        }
      }
    }
  }

  // Fallback: try to decode common output patterns
  if (output.length === 66 && output.startsWith('0x')) {
    const value = output.slice(2)
    
    // Check if it's a boolean
    if (value === '0000000000000000000000000000000000000000000000000000000000000001') {
      return 'true'
    } else if (value === '0000000000000000000000000000000000000000000000000000000000000000') {
      return 'false'
    }
    
    // Check if it's a reasonable uint256 value
    try {
      const numValue = parseInt(value, 16)
      if (numValue > 0 && numValue < Number.MAX_SAFE_INTEGER) {
        return numValue.toString()
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Return the full output without truncation
  return output
}
