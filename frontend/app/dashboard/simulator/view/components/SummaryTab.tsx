import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

export default function SummaryTab({ activeTab, responseData, decodedTraceTree }: { 
  activeTab: string, 
  responseData: any, 
  decodedTraceTree: any 
}) {
    const DecodedTraceTree = ({ trace, contracts, isRoot = false, level = 0 }: { 
        trace: any, 
        contracts: any, 
        isRoot?: boolean, 
        level?: number 
      }) => {
        const [isExpanded, setIsExpanded] = useState(true) // Always expanded
        const hasChildren = trace.children && trace.children.length > 0
        
        const getContractName = (address: string) => {
          if (!contracts || !address) return address || '0x'
          const contract = contracts[address.toLowerCase()]
          return contract?.ContractName || address
        }
        
        const formatValue = (value: string) => {
          if (!value || value === "0") return "0 ETH"
          const wei = BigInt(value)
          const eth = Number(wei) / 1e18
          return `${eth.toFixed(6)} ETH`
        }
        
        const formatGas = (gas: string) => {
          if (!gas) return "0"
          return parseInt(gas).toLocaleString()
        }
        
        return (
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              {/* Collapsible arrow */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 flex-shrink-0 w-4 h-4 flex items-center justify-center"
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  )
                ) : (
                  <div className="w-3 h-3" />
                )}
              </button>
              
              <div className="text-xs text-gray-300 font-mono flex-1 min-w-0">
                            {/* Root level shows [Sender] and [Receiver] tags */}
                {isRoot && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-orange-400">[Sender]</span>
                    <span className="text-white">{getContractName(trace.from)}</span>
                    <span className="text-orange-400">{'=>'}</span>
                    <span className="text-orange-400">[Receiver]</span>
                    <span className="text-white">{getContractName(trace.to)}</span>
                  </div>
                )}
                
                {/* Function call details */}
                <div className="text-blue-300">
                  {!isRoot && (
                    <>
                      <span className="text-gray-400">([</span>
                      <span className="text-white">{getContractName(trace.from)}</span>
                      <span className="text-gray-400"> =&gt; </span>
                      <span className="text-white">{getContractName(trace.to)}</span>
                      <span className="text-gray-400">).</span>
                    </>
                  )}
                  <span className="text-blue-300">{trace.functionName || '0x'}</span>                 
                  {trace.signature && (
                    <span className="text-gray-400">
                      ({trace.signature})
                    </span>
                  )}
                  <span className="text-gray-500 text-xs ml-2">
                    gas: {formatGas(trace.gasUsed || '0')}
                  </span>
                </div>
                
                {/* Function selector */}
                {trace.functionSelector && (
                  <div className="text-gray-400 text-xs">
                    selector: {trace.functionSelector}
                  </div>
                )}
                
                {/* Input parameters */}
                {trace.inputDecoded && trace.inputDecoded.length > 0 && (
                  <div className="text-green-300 text-xs">
                    input: {JSON.stringify(trace.inputDecoded)}
                  </div>
                )}
                
                {/* Output values */}
                {trace.outputDecoded && trace.outputDecoded.length > 0 && (
                  <div className="text-orange-300 text-xs">
                    output: {JSON.stringify(trace.outputDecoded)}
                  </div>
                )}
                {/* Value transfer */}
                {trace.value && trace.value !== "0" && (
                  <div className="text-gray-400 text-xs">
                    value: {formatValue(trace.value)}
                  </div>
                )}

                {/* Error */}
                {trace.error && trace.error != "" && (
                  <div className="text-red-400 text-xs">
                    error: {trace.error}
                  </div>
                )}
              </div>
            </div>
            
            {/* Render children if expanded */}
            {hasChildren && isExpanded && (
              <div className="ml-6 space-y-2">
                {trace.children.map((child: any, index: number) => (
                  <DecodedTraceTree 
                    key={`${child.from}-${child.to}-${index}`}
                    trace={child} 
                    contracts={contracts}
                    isRoot={false}
                    level={level + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )
      }

    // Function to format input parameters for display
    const formatInputForDisplay = (inputDecoded: any) => {
      if (!inputDecoded || !Array.isArray(inputDecoded)) return {};

      const formatted: any = {};
      const rootTrace = decodedTraceTree;
      let paramTypes: string[] = [];

      // Extract parameter types from signature
      if (rootTrace?.signature) {
        const match = rootTrace.signature.match(/\(([^)]*)\)/);
        if (match && match[1]) {
          paramTypes = match[1]
            .split(',')
            .map((p: string) => p.trim())
            .filter(Boolean);
        }
      }

      // Map decoded inputs with unique keys
      inputDecoded.forEach((value: any, index: number) => {
        const typeName = paramTypes[index] || `param${index}`;
        formatted[`${typeName}_${index}`] = value;
      });

      return formatted;
    };

    // Function to format output values for display
    const formatOutputForDisplay = (outputDecoded: any) => {
      if (!outputDecoded || !Array.isArray(outputDecoded)) return {};
      
      const formatted: any = {};
      outputDecoded.forEach((value: any, index: number) => {
        formatted[`return${index}`] = value;
      });
      
      return formatted;
    };

    // Get input and output data from root trace
    const rootTrace = decodedTraceTree;
    const inputData = rootTrace ? formatInputForDisplay(rootTrace.inputDecoded) : {};
    const outputData = rootTrace ? formatOutputForDisplay(rootTrace.outputDecoded) : {};

    return (
    <div className="space-y-4">
      {/* Input and Output Section - Only visible on Summary tab */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Input</h3>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)' }}>
                <div className="space-y-2">
                  <pre className="text-sm text-gray-300 bg-gray-900 p-3 rounded border overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
                    <code className="text-blue-300">{`{`}</code>
                    {Object.keys(inputData).length > 0 ? (
                      <>
                        <br />
                        {Object.entries(inputData).map(([key, value], index) => (
                          <div key={index}>
                            <span className="text-gray-400">  </span>
                            <code className="text-green-300">"{key.split('_')[0]}"</code>
                            <code className="text-gray-300">: </code>
                            <code className="text-yellow-300">"</code>
                            <code className="text-blue-400">{String(value)}</code>
                            <code className="text-yellow-300">"</code>
                            {index < Object.keys(inputData).length - 1 && <code className="text-gray-300">,</code>}
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="text-gray-500">  // No input parameters</span>
                    )}
                    <code className="text-blue-300">{`}`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Output</h3>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)' }}>
                <div className="space-y-2">
                  <pre className="text-sm text-gray-300 bg-gray-900 p-3 rounded border" style={{ borderColor: 'var(--border)' }}>
                    <code className="text-blue-300">{`{`}</code>
                    {Object.keys(outputData).length > 0 ? (
                      <>
                        <br />
                        {Object.entries(outputData).map(([key, value], index) => (
                          <div key={index}>
                            <span className="text-gray-400">  </span>
                            <code className="text-green-300">"{key}"</code>
                            <code className="text-gray-300">: </code>
                            <code className="text-yellow-300">"</code>
                            <code className="text-blue-400">{String(value)}</code>
                            <code className="text-yellow-300">"</code>
                            {index < Object.keys(outputData).length - 1 && <code className="text-gray-300">,</code>}
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="text-gray-500">  // No output values</span>
                    )}
                    <br />
                    <code className="text-blue-300">{`}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Search and Filters */}
      <div className="flex items-center space-x-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        
        
        
      </div>

      {/* Transaction Trace */}
      <div className="border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)', backdropFilter: 'blur(10px)' }}>
        <div className="p-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Decoded Transaction Trace</h3>
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {decodedTraceTree ? (
                  <DecodedTraceTree 
                    trace={decodedTraceTree} 
                    contracts={responseData.contracts}
                    isRoot={true}
                  />
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    Decoding transaction trace...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
