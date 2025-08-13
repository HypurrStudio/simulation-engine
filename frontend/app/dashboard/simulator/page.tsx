"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from "next/navigation"

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

  const convertToHex = (value: string, isDecimal: boolean = false): string => {
    if (!value) return "0x0"
    
    console.log("convertToHex input:", value, "type:", typeof value, "isDecimal:", isDecimal)
    
    if (isDecimal) {
      // Convert decimal ETH value to hex (multiply by 10^18)
      const num = parseFloat(value)
      if (isNaN(num)) return "0x0"
      const result = "0x" + Math.floor(num * Math.pow(10, 18)).toString(16).toUpperCase()
      console.log("ETH conversion:", num, "->", result)
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
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("Form Data:", formData)
      console.log("Value before conversion:", formData.value)
      console.log("Value after conversion:", convertToHex(formData.value, false))
      
      const requestBody = {
        from: formData.from,
        to: formData.to,
        input: formData.input,
        value: convertToHex(formData.value, false), // Convert raw value directly to hex (no ETH conversion)
        gas: convertToHex(formData.gas, false),
        gasPrice: convertToHex(formData.gasPrice, false),
        generateAccessList: true,
        blockNumber: convertToHex(formData.blockNumber, false)
      }

      console.log("Request Body:", requestBody)

      const response = await fetch("https://hypurrstudio.onrender.com/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseData = await response.json()
      
      // Store the response data in localStorage or pass it to the view page
      localStorage.setItem("simulationResponse", JSON.stringify(responseData))
      
      // Redirect to the view page
      router.push("/dashboard/simulator/view")
    } catch (error) {
      console.error("Simulation failed:", error)
      alert("Simulation failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Check if left side is complete
  const isLeftSideComplete = formData.to.trim() !== "" && (
    (inputType === "function") ||
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
                  <Input
                    placeholder="0x..."
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    className="border"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                    required
                  />
                </div>

                <div>
                  <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Network
                  </Label>
                  <Select>
                    <SelectTrigger className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}>
                      <SelectValue placeholder="Sepolia" />
                    </SelectTrigger>
                    <SelectContent className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      <SelectItem value="sepolia">Sepolia</SelectItem>
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
                        <Select>
                          <SelectTrigger className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent className="border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            <SelectItem value="addFunds">addFunds</SelectItem>
                            <SelectItem value="transfer">transfer</SelectItem>
                            <SelectItem value="approve">approve</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Function Parameters - Only show when function is selected */}
                        <div className="mt-4">
                          <Label className="text-secondary mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                            Function Parameters
                          </Label>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-400 block mb-1">
                                _transactionHash (bytes32)
                              </Label>
                              <Input 
                                placeholder="Enter transaction hash"
                                value={formData.input}
                                onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                                className="border text-sm"
                                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                              />
                            </div>
                          </div>
                        </div>
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
                    {/* <div>
                      <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Tx Index</Label>
                      <Input 
                        placeholder="/"
                        className="border"
                        disabled={!isLeftSideComplete}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                      />
                    </div> */}
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
                      {/* <button className="text-xs mt-1 hover:underline" style={{ color: 'var(--color-primary)' }}>
                        Use custom gas value
                      </button> */}
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
            
            {/* <Card className="border" style={{ 
              backgroundColor: 'rgba(30, 30, 30, 0.6)', 
              borderColor: 'var(--border)', 
              backdropFilter: 'blur(10px)',
              opacity: isLeftSideComplete ? 1 : 0.5,
              pointerEvents: isLeftSideComplete ? 'auto' : 'none'
            }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-primary" style={{ color: 'var(--text-primary)' }}>Block Header Overrides</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBlockHeaderExpanded(!blockHeaderExpanded)}
                  style={{ color: 'var(--text-secondary)' }}
                  disabled={!isLeftSideComplete}
                >
                  {blockHeaderExpanded ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CardHeader>
              {blockHeaderExpanded && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Override Block Number</Label>
                    <Switch 
                      checked={overrideBlockNumber}
                      onCheckedChange={setOverrideBlockNumber}
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: overrideBlockNumber ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Block Number</Label>
                    <Input
                      placeholder="/"
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Override Timestamp</Label>
                    <Switch 
                      checked={false}
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: 'var(--text-secondary)' }}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Timestamp</Label>
                    <Input
                      placeholder="/"
                      className="border"
                      disabled={!isLeftSideComplete}
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', opacity: 0.8 }}
                    />
                  </div>
                </CardContent>
              )}
            </Card> */}
            
            {/* <Card className="border" style={{ 
              backgroundColor: 'rgba(30, 30, 30, 0.6)', 
              borderColor: 'var(--border)', 
              backdropFilter: 'blur(10px)',
              opacity: isLeftSideComplete ? 1 : 0.5,
              pointerEvents: isLeftSideComplete ? 'auto' : 'none'
            }}>
              <CardHeader>
                <CardTitle className="text-primary" style={{ color: 'var(--text-primary)' }}>State Overrides</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No state overrides configured</p>
              </CardContent>
            </Card> */}
            
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