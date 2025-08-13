"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react"
import { CallTraceItem, DisplayTraceItem, parseCallTrace, formatAddress, formatGas, formatValue, getFunctionName, getContractName, getContractABI, decodeFunctionInput, decodeFunctionOutput } from "@/lib/utils"

export default function SimulatorViewPage() {
  const router = useRouter()
  const [responseData, setResponseData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("summary")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedStorageSections, setExpandedStorageSections] = useState<Set<string>>(new Set())
  const [inputOutputToggle, setInputOutputToggle] = useState<"none" | "input" | "output">("none")

  useEffect(() => {
    // Get the simulation response from localStorage
    const storedResponse = localStorage.getItem("simulationResponse")
    if (storedResponse) {
      try {
        const parsedResponse = JSON.parse(storedResponse)
        setResponseData(parsedResponse)
        
        // Initialize expanded items for the call trace
        if (parsedResponse.transaction?.callTrace) {
          const trace = parseCallTrace(parsedResponse.transaction.callTrace, true)
          const allIds = new Set<string>()
          const collectIds = (items: DisplayTraceItem[]) => {
            items.forEach(item => {
              allIds.add(item.id)
              if (item.calls && item.calls.length > 0) {
                collectIds(item.calls)
              }
            })
          }
          collectIds(trace)
          setExpandedItems(allIds)
        }
      } catch (error) {
        console.error("Failed to parse stored response:", error)
        alert("Failed to load simulation data. Please try again.")
        router.push("/dashboard/simulator")
      }
    } else {
      alert("No simulation data found. Please run a simulation first.")
      router.push("/dashboard/simulator")
    }
  }, [router])

  if (!responseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "contracts", label: "Contracts" },
    { id: "events", label: "Balance state" },
    { id: "state", label: "Storage state" },
    { id: "gas-profiler", label: "Gas Profiler" }
  ]

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleStorageSection = (address: string) => {
    setExpandedStorageSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(address)) {
        newSet.delete(address)
      } else {
        newSet.add(address)
      }
      return newSet
    })
  }

  const renderTraceItem = (item: DisplayTraceItem, isMainTransaction: boolean = false, level: number = 0) => {
    const hasChildren = item.calls && item.calls.length > 0
    const decodedInput = decodeFunctionInput(item.input, item.to, responseData)
    const decodedOutput = decodeFunctionOutput(item.output, item.to, responseData)
    const isExpanded = expandedItems.has(item.id)
    
    return (
      <div key={item.id} className="space-y-2">
        <div className="flex items-start space-x-2">
          {/* Collapsible arrow */}
          <button
            onClick={() => toggleExpanded(item.id)}
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
              <div className="w-3 h-3" /> // Placeholder for alignment
            )}
          </button>
          
          <div className="text-xs text-gray-300 font-mono flex-1 min-w-0">
            {/* Main transaction shows [Sender] and [Receiver] tags */}
            {isMainTransaction && (
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-orange-400">[Sender]</span>
                <span className="text-white">{getContractName(item.from, responseData)}</span>
                <span className="text-orange-400">{'=>'}</span>
                <span className="text-orange-400">[Receiver]</span>
                <span className="text-white">{getContractName(item.to, responseData)}</span>
              </div>
            )}
            
            {/* Function call in the format: ([Receiver] ContractName => ContractName).functionName(...) */}
            <div className="text-blue-300">
              <span className="text-gray-400">([Receiver] </span>
              <span className="text-white">{getContractName(item.from, responseData)}</span>
              <span className="text-gray-400"> =&gt; </span>
              <span className="text-white">{getContractName(item.to, responseData)}</span>
              <span className="text-gray-400">).</span>
              <span className="text-blue-300">{decodedInput.functionName}</span>
              {decodedInput.decodedParams && (
                <span className="text-gray-400">
                  ({decodedInput.decodedParams})
                </span>
              )}
              <span className="text-gray-500 text-xs ml-2">
                gas: {formatGas(item.gasUsed)}
              </span>
            </div>
            
            {/* Output with => arrow when available */}
            {decodedOutput && decodedOutput !== '' && (
              <div className="text-orange-400 overflow-x-auto">
                <span className="whitespace-nowrap">=&gt; ({decodedOutput})</span>
              </div>
            )}
            
            {/* Value transfer */}
            {item.value !== "0x0" && (
              <div className="text-gray-400">
                value: {formatValue(item.value)} ETH
              </div>
            )}
          </div>
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="ml-6 space-y-2">
            {item.calls.map(child => renderTraceItem(child, false, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-white">Simulation</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          
          
          
          
          
          
          <Button variant="ghost" className="text-white hover:bg-gray-800">
            Re-Simulate
          </Button>
          
         
        </div>
      </div>

      {/* Middle Simulation Details Section */}
      <div className="border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)', backdropFilter: 'blur(10px)' }}>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Transaction Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Network</span>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-white">Sepolia</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">Success</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Block</span>
                <span className="text-sm text-white font-mono">{responseData.transaction.blockHeader?.number || '0'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Timestamp</span>
                <span className="text-sm text-white">
                  {responseData.transaction.timestamp ? 
                    `${Math.floor((Date.now() - parseInt(responseData.transaction.timestamp, 16) * 1000) / (1000 * 60 * 60 * 24))} days ago (${new Date(parseInt(responseData.transaction.timestamp, 16) * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${new Date(parseInt(responseData.transaction.timestamp, 16) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})` 
                    : 'Unknown'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">From</span>
                <div className="flex items-center space-x-2">
                  <img src="/shapes/shape1.png" alt="From" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-sm text-white font-mono">{responseData.transaction.from ? `${responseData.transaction.from.slice(0, 6)}...${responseData.transaction.from.slice(-6)}` : 'Unknown'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">To</span>
                <div className="flex items-center space-x-2">
                  <img src="/shapes/shape2.png" alt="To" className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-sm text-white">{getContractName(responseData.transaction.to, responseData)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Function</span>
                <span className="text-sm text-white font-mono">{decodeFunctionInput(responseData.transaction.input, responseData.transaction.to, responseData).functionName}()</span>
              </div>
            </div>

            {/* Right Column - Transaction Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Value</span>
                <span className="text-sm text-white">{formatValue(responseData.transaction.value)} ETH</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tx Fee</span>
                <span className="text-sm text-white">0 ETH</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tx Type</span>
                <span className="text-sm text-white">-</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Gas Price</span>
                <span className="text-sm text-white">0 Wei (0 ETH)</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Gas Used</span>
                <span className="text-sm text-white">
                  {responseData.transaction.blockHeader?.gasUsed ? 
                    `${formatGas(responseData.transaction.blockHeader.gasUsed)} / ${formatGas(responseData.transaction.gas)} (${Math.round((parseInt(responseData.transaction.blockHeader.gasUsed, 16) / parseInt(responseData.transaction.gas, 16)) * 100)}%)` 
                    : 'Unknown'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Nonce</span>
                <span className="text-sm text-white font-mono">456</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Raw Input</span>
                <span className="text-sm text-white font-mono break-all text-right max-w-xs">{responseData.transaction.input}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Content Section */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex space-x-1 border-b" style={{ borderColor: 'var(--border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as string)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white border-b-2'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{
                borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent'
              }}
            >
              <div className="flex items-center space-x-2">
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Summary Tab Content */}
        {activeTab === "summary" && (
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
                          <br />
                          <span className="text-gray-400">  </span>
                          <code className="text-green-300">"_transactionHash"</code>
                          <code className="text-gray-300">: </code>
                          <code className="text-yellow-300">"</code>
                          <code className="text-blue-400">{responseData.transaction.input.slice(10)}</code>
                          <code className="text-yellow-300">"</code>
                          <br />
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
                          <code className="text-blue-300">{`{}`}</code>
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
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      {responseData.transaction?.callTrace ? parseCallTrace(responseData.transaction.callTrace, true).map((item, index) => renderTraceItem(item, index === 0, 0)) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Tab Content Placeholder */}
        {activeTab !== "summary" && (
          <div className="mt-6">
            {activeTab === "events" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Balance Changes</h3>
                <div className="space-y-4">
                  {Object.entries(responseData.transaction.balanceDiff || {}).map(([address, balanceData]: [string, any]) => {
                    const contractName = getContractName(address, responseData)
                    const fromBalance = parseInt(balanceData.from, 16)
                    const toBalance = parseInt(balanceData.to, 16)
                    
                    return (
                      <div key={address} className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)' }}>
                        {/* Contract Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <img src="/shapes/shape4.png" alt="Contract" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="text-white font-medium">{contractName || 'Unknown Contract'}</div>
                            <div className="text-gray-400 text-sm font-mono">{address}</div>
                          </div>
                        </div>
                        
                        {/* Balance Change */}
                        <div className="flex items-center space-x-3">
                          <span className="text-red-400 font-mono">{fromBalance}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-400 font-mono">{toBalance}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : activeTab === "state" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Storage State Changes</h3>
                <div className="space-y-4">
                  {Object.entries(responseData.transaction.storageDiff || {}).map(([address, storageChanges]: [string, any]) => {
                    const contractName = getContractName(address, responseData)
                    const changeCount = Object.keys(storageChanges).length
                    
                    return (
                      <div key={address} className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)' }}>
                        {/* Contract Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <img src="/shapes/shape5.png" alt="Contract" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="text-white font-medium">Address</div>
                            <div className="text-gray-400 text-sm font-mono">{address}</div>
                          </div>
                        </div>
                        
                        {/* Raw State Changes Section */}
                        <div className="space-y-3">
                          <div className="text-gray-300 cursor-pointer flex items-center space-x-2" onClick={() => toggleStorageSection(address)}>
                            {expandedStorageSections.has(address) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{expandedStorageSections.has(address) ? 'Hide' : 'Show'} raw state changes ({changeCount})</span>
                          </div>
                          
                          {/* Storage Changes - Hidden by default */}
                          <div className={`space-y-3 ${expandedStorageSections.has(address) ? 'block' : 'hidden'}`}>
                            {Object.entries(storageChanges).map(([key, changeData]: [string, any]) => (
                              <div key={key} className="space-y-2">
                                <div className="text-gray-400 text-sm">
                                  <span className="font-medium">Key:</span> {key}
                                </div>
                                <div className="text-gray-400 text-sm pl-4">
                                  <span className="font-medium">Before:</span> {changeData.from}
                                </div>
                                <div className="text-gray-400 text-sm pl-4">
                                  <span className="font-medium">After:</span> {changeData.to}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : activeTab === "contracts" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Contracts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Contract</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(responseData.contracts || {}).map(([address, contract]: [string, any]) => (
                        <tr key={address} className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img src="/shapes/shape3.png" alt="Contract" className="w-8 h-8 rounded-lg object-cover" />
                              <div>
                                <div className="text-white font-medium">{contract.ContractName || 'Unknown'}</div>
                                <div className="text-gray-400 text-sm font-mono">{address}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-400 text-sm">Public</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === "gas-profiler" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Gas Profiler</h3>
                
                {/* Gas Profiler with Blurred Image and Overlay Text */}
                <div className="relative">
                  {/* Blurred Gas Profiler Image */}
                  <div className="blur-sm opacity-60 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.8)', borderColor: 'var(--border)', minHeight: '150px' }}>
                    {/* Simulated Gas Profiler Content (Blurred) */}
                    <div className="space-y-2">
                      {/* Total Gas Bar */}
                      <div className="space-y-1">
                        <div className="text-gray-400 text-sm font-medium">Total Gas - 213,547 Gas</div>
                        <div className="w-full h-3 bg-gray-600 rounded"></div>
                      </div>
                      
                      {/* Actual Gas Used Bar */}
                      <div className="space-y-1">
                        <div className="text-gray-400 text-sm font-medium">Actual Gas Used - 170,947 Gas</div>
                        <div className="w-4/5 h-2 bg-gray-500 rounded"></div>
                      </div>
                      
                      {/* Refunded Gas Bar */}
                      <div className="space-y-1">
                        <div className="text-gray-400 text-sm font-medium">Refunded Gas - 42,600 Gas</div>
                        <div className="w-1/5 h-2 bg-gray-400 rounded ml-auto"></div>
                      </div>
                      
                      {/* Nested Gas Breakdown */}
                      <div className="ml-4 space-y-1">
                        <div className="space-y-1">
                          <div className="text-gray-400 text-sm font-medium">Initial Gas - 21,194 Gas</div>
                          <div className="w-1/10 h-2 bg-gray-400 rounded"></div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-gray-400 text-sm font-medium">addFunds - 192,355 Gas</div>
                          <div className="w-9/10 h-2 bg-gray-500 rounded"></div>
                          
                          <div className="ml-4 space-y-1">
                            <div className="text-gray-400 text-sm font-medium">addFunds - 187,483 Gas</div>
                            <div className="w-9/10 h-1 bg-gray-400 rounded"></div>
                            
                            <div className="ml-4 space-y-1">
                              <div className="flex space-x-2">
                                <div className="space-y-1">
                                  <div className="text-gray-400 text-xs font-medium">deposit - 23,974 Gas</div>
                                  <div className="w-12 h-1 bg-gray-300 rounded"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-gray-400 text-xs font-medium">approve - 24,420 Gas</div>
                                  <div className="w-12 h-1 bg-gray-300 rounded"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-gray-400 text-xs font-medium">getEthUsdPrice - 15,234 Gas</div>
                                  <div className="w-16 h-1 bg-gray-300 rounded"></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-gray-400 text-xs font-medium">exactInputSingle - 80,186 Gas</div>
                                  <div className="w-20 h-1 bg-gray-300 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Overlay Text - Only Feature Dropping Soon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-black bg-opacity-70 p-4 rounded-2xl">
                      <div className="text-blue-200 text-lg font-bold">Feature dropping soon</div>
                    </div>
                  </div>
                </div>
                
                {/* Recommended Access List */}
                <div className="p-1 rounded-lg">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-white mb-2">Recommended Access List</h4>
                    <p className="text-gray-400 text-sm mb-2">The suggested list of addresses and storage keys to pass for this transaction to minimize gas costs.</p>
                  </div>
                  
                  {/* Access List Table */}
                  <div className="space-y-3 border w-1/2 rounded-xl" style={{ backgroundColor: 'rgba(40, 40, 40, 0.6)', borderColor: 'var(--border)' }}>
                    {responseData.generated_access_list?.map((accessItem: any, index: number) => (
                      <div key={index} className="border-b border-gray-700 pb-1 last:border-b-0 pl-3  ">
                        {/* Main Address Entry */}
                        <div className="flex items-center space-x-3 mb-2">
                          <img src="/shapes/shape7.png" alt="Address" className="w-6 h-6 rounded object-cover" />
                          <span className="text-white font-mono text-sm">
                            {accessItem.address ? `${accessItem.address.slice(0, 10)}...${accessItem.address.slice(-6)}` : 'Unknown Address'}
                          </span>
                        </div>
                        
                        {/* Storage Keys */}
                        {accessItem.storageKeys && accessItem.storageKeys.length > 0 && (
                          <div className="ml-9 space-y-1">
                            {accessItem.storageKeys.map((storageKey: string, keyIndex: number) => (
                              <div key={keyIndex} className="flex items-center space-x-2">
                                <div className="w-4 h-4 text-gray-500">
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
                                    <path d="M16 21V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v17"/>
                                  </svg>
                                </div>
                                <span className="text-gray-300 font-mono text-sm break-all">
                                  {storageKey || 'Unknown Key'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                Content for {tabs.find(t => t.id === activeTab)?.label} tab will appear here
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 