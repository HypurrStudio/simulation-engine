"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useRouter } from "next/navigation"
import { fetchContractABI, ContractABI, EtherscanFunction, getFunctionDisplayName, encodeFunctionCall } from "@/lib/etherscan"

export default function SimulatorPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    input: "",
    value: "",
    gas: "",
    gasPrice: "",
    blockNumber: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [inputType, setInputType] = useState<"function" | "raw">("function")
  const [usePendingBlock, setUsePendingBlock] = useState(true)
  const [overrideBlockNumber, setOverrideBlockNumber] = useState(false)
  const [transactionParamsExpanded, setTransactionParamsExpanded] = useState(true)
  const [blockHeaderExpanded, setBlockHeaderExpanded] = useState(true)

  // New state for Etherscan integration
  const [contractABI, setContractABI] = useState<ContractABI | null>(null)
  const [isLoadingABI, setIsLoadingABI] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<EtherscanFunction | null>(null)
  const [functionParameters, setFunctionParameters] = useState<Array<{ name: string; type: string; value: string }>>([])

  // Fetch ABI when contract address changes
  useEffect(() => {
    const fetchABI = async () => {
      if (!formData.to.trim()) {
        setContractABI(null)
        setSelectedFunction(null)
        setFunctionParameters([])
        return
      }

      setIsLoadingABI(true)
      try {
        const abi = await fetchContractABI(formData.to)
        setContractABI(abi)
        setSelectedFunction(null)
        setFunctionParameters([])
      } catch (error) {
        console.error('Error fetching ABI:', error)
        setContractABI(null)
      } finally {
        setIsLoadingABI(false)
      }
    }

    // Debounce the API call
    const timeoutId = setTimeout(fetchABI, 1000)
    return () => clearTimeout(timeoutId)
  }, [formData.to])

  // Update function parameters when function is selected
  useEffect(() => {
    if (selectedFunction) {
      const params = selectedFunction.inputs.map((input, index) => ({
        name: input.name || `param${index}`,
        type: input.type,
        value: ""
      }))
      setFunctionParameters(params)
    } else {
      setFunctionParameters([])
    }
  }, [selectedFunction])

  // Update form input when function parameters change
  useEffect(() => {
    if (selectedFunction && functionParameters.length > 0 && contractABI) {
      // Use proper function encoding
      const encodedInput = encodeFunctionCall(selectedFunction.name, functionParameters, contractABI);
      setFormData(prev => ({ ...prev, input: encodedInput }));
    } else if (selectedFunction && functionParameters.length === 0 && contractABI) {
      // Function with no parameters
      const encodedInput = encodeFunctionCall(selectedFunction.name, [], contractABI);
      setFormData(prev => ({ ...prev, input: encodedInput }));
    }
  }, [selectedFunction, functionParameters, contractABI]);

  const convertToHex = (value: string, isDecimal: boolean = false): string => {
    if (!value) return "0x0"
    
    console.log("convertToHex input:", value, "type:", typeof value, "isDecimal:", isDecimal)
    
    if (isDecimal) {
      // Convert decimal HYPE value to hex (multiply by 10^18)
      const num = parseFloat(value)
      if (isNaN(num)) return "0x0"
      const result = "0x" + Math.floor(num * Math.pow(10, 18)).toString(16).toUpperCase()
      console.log("HYPE conversion:", num, "->", result)
      return result
    } else {
      // Convert raw decimal number directly to hex (no multiplication)
      // Use BigInt for large numbers to avoid precision issues
      let num: number | bigint
      try {
        if (value.length > 15) {
          // For very large numbers, use BigInt
          num = BigInt(value)
          const result = "0x" + num.toString(16).toUpperCase()
          console.log("BigInt conversion:", num.toString(), "->", result)
          return result
        } else {
          // For smaller numbers, use parseInt
          num = parseInt(value)
          if (isNaN(num)) return "0x0"
          const result = "0x" + num.toString(16).toUpperCase()
          console.log("Int conversion:", num, "->", result)
          return result
        }
      } catch (error) {
        console.error("Conversion error:", error)
        return "0x0"
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Form Data:", formData)
      console.log("Value before conversion:", formData.value)
      console.log("Value after conversion:", convertToHex(formData.value, false))
      
      const requestBody = {
        from: formData.from,
        to: formData.to,
        input: formData.input,
        value: convertToHex(formData.value, false), // Convert raw value directly to hex (no HYPE conversion)
        gas: convertToHex(formData.gas, false),
        gasPrice: convertToHex(formData.gasPrice, false),
        generateAccessList: true,
        blockNumber: formData.blockNumber ? convertToHex(formData.blockNumber, false) : "latest"
      }

      console.log("Request Body:", requestBody)

      const response = await fetch("https://hypurrstudio.onrender.com/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Simulation response:", responseData);

      // Store the full simulation response
      localStorage.setItem("simulationResponse", JSON.stringify(responseData));

      // Store contracts separately, avoiding duplicates
      if (responseData.contracts) {
        const existingContracts = JSON.parse(localStorage.getItem("contractsStorage") || "{}");
        const newContracts = { ...existingContracts };
        
        // Add new contracts, avoiding duplicates
        Object.entries(responseData.contracts).forEach(([address, contractData]: [string, any]) => {
          if (!existingContracts[address]) {
            newContracts[address] = contractData;
          }
        });
        
        localStorage.setItem("contractsStorage", JSON.stringify(newContracts));
        console.log("Updated contracts storage:", newContracts);
      }

      // Redirect to view page
      router.push("/dashboard/simulator/view");
    } catch (error) {
      console.error("Simulation failed:", error);
      alert("Simulation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFunctionSelect = (functionName: string) => {
    if (contractABI) {
      const func = contractABI.functions.find(f => f.name === functionName)
      setSelectedFunction(func || null)
    }
  }

  const handleParameterChange = (index: number, value: string) => {
    const updatedParams = [...functionParameters]
    updatedParams[index].value = value
    setFunctionParameters(updatedParams)
  }

  // Check if left side is complete
  const isLeftSideComplete = formData.to.trim() !== "" && (
    (inputType === "function" && selectedFunction) ||
    (inputType === "raw" && formData.input.trim() !== "")
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Simulation</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Contract */}
          <div className="space-y-6">
            <Card className="border" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderColor: 'var(--border)', backdropFilter: 'blur(10px)' }}>
              <CardHeader>
                <CardTitle className="text-primary" style={{ color: 'var(--text-primary)' }}>Contract</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Contract Address
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="0x..."
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                      className="border"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                      required
                    />
                    {isLoadingABI && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {contractABI && (
                    <p className="text-xs text-green-400 mt-1">✓ Contract verified on Etherscan</p>
                  )}
                  {formData.to.trim() && !isLoadingABI && !contractABI && (
                    <p className="text-xs text-yellow-400 mt-1">⚠ Contract not verified or not found</p>
                  )}
                </div>

                <div>
                  <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Network
                  </Label>
                  <Select>
                    <SelectTrigger className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}>
                      <SelectValue placeholder="HyperEVM Mainnet" />
                    </SelectTrigger>
                    <SelectContent className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      <SelectItem value="HyperEVM_Mainnet">HyperEVM Mainnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Function Selection - Only show when address is filled */}
                {formData.to.trim() !== "" && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id="function" 
                          name="inputType" 
                          checked={inputType === "function"}
                          onChange={() => setInputType("function")}
                          style={{ accentColor: 'var(--color-primary)' }} 
                        />
                        <Label htmlFor="function" className="text-secondary" style={{ color: 'var(--text-secondary)' }}>
                          Choose function and parameters
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id="raw" 
                          name="inputType" 
                          checked={inputType === "raw"}
                          onChange={() => setInputType("raw")}
                          style={{ accentColor: 'var(--color-primary)' }} 
                        />
                        <Label htmlFor="raw" className="text-secondary" style={{ color: 'var(--text-secondary)' }}>
                          Enter raw input data
                        </Label>
                      </div>
                    </div>
                    
                    {/* Function Selection Option */}
                    {inputType === "function" && (
                      <div>
                        <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                          Select function
                        </Label>
                        {isLoadingABI ? (
                          <div className="flex items-center space-x-2 p-3 border rounded" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-gray-400">Loading functions...</span>
                          </div>
                        ) : contractABI ? (
                          <Select onValueChange={handleFunctionSelect}>
                            <SelectTrigger className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}>
                              <SelectValue placeholder="Select a function" />
                            </SelectTrigger>
                            <SelectContent className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                              {contractABI.functions.map((func, index) => (
                                <SelectItem key={index} value={func.name}>
                                  {getFunctionDisplayName(func)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 border rounded text-sm text-gray-400" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                            Enter a verified contract address to load functions
                          </div>
                        )}

                        {/* Function Parameters - Only show when function is selected */}
                        {selectedFunction && functionParameters.length > 0 && (
                          <div className="mt-4">
                            <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                              Function Parameters
                            </Label>
                            <div className="space-y-2">
                              {functionParameters.map((param, index) => (
                                <div key={index}>
                                  <Label className="text-xs text-gray-400 block mb-1">
                                    {param.name} ({param.type})
                                  </Label>
                                  <Input 
                                    placeholder={`Enter ${param.name}`}
                                    value={param.value}
                                    onChange={(e) => handleParameterChange(index, e.target.value)}
                                    className="border text-sm"
                                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw Input Data Option */}
                    {inputType === "raw" && (
                      <div>
                        <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                          Raw input data
                        </Label>
                        <Textarea 
                          placeholder="Enter raw input data (hex format)"
                          value={formData.input}
                          onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                          className="border"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8, minHeight: '100px' }}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Transaction Parameters */}
          <div className="space-y-6">
            <Card className="border" style={{ 
              backgroundColor: 'rgba(30, 30, 30, 0.6)', 
              borderColor: 'var(--border)', 
              backdropFilter: 'blur(10px)',
              opacity: isLeftSideComplete ? 1 : 0.5,
              pointerEvents: isLeftSideComplete ? 'auto' : 'none'
            }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-primary" style={{ color: 'var(--text-primary)' }}>Transaction Parameters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTransactionParamsExpanded(!transactionParamsExpanded)}
                  style={{ color: 'var(--text-secondary)' }}
                  disabled={!isLeftSideComplete}
                >
                  {transactionParamsExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CardHeader>
              {transactionParamsExpanded && (
                <CardContent className="space-y-4">
                 
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Block Number</Label>
                      <Input
                        placeholder="/"
                        value={formData.blockNumber}
                        onChange={(e) => setFormData({ ...formData, blockNumber: e.target.value })}
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>From</Label>
                    <Input
                      placeholder="0x..."
                      value={formData.from}
                      onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Gas</Label>
                      <Input 
                        defaultValue="8000000"
                        value={formData.gas}
                        onChange={(e) => setFormData({ ...formData, gas: e.target.value })}
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Gas Price</Label>
                      <Input 
                        defaultValue="0"
                        value={formData.gasPrice}
                        onChange={(e) => setFormData({ ...formData, gasPrice: e.target.value })}
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Value</Label>
                    <Input
                      placeholder="Enter raw value (e.g., 41355259822160)"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                      required
                    />
                  </div>
                </CardContent>
              )}
            </Card>
            
            <Button 
              type="submit"
              className="w-full py-3" 
              disabled={!isLeftSideComplete || isLoading}
              style={{ 
                backgroundColor: isLeftSideComplete ? 'var(--btn-primary-bg)' : 'var(--text-secondary)', 
                color: 'var(--btn-primary-text)' 
              }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Simulating...</span>
                </div>
              ) : (
                "Simulate Transaction"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
} 