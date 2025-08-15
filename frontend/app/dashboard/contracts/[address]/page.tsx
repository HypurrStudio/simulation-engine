"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Share, Bell, Play, CheckCircle } from "lucide-react";
import Image from "next/image";
import { response as responseData } from "../../../../response";

interface ContractData {
  address: string;
  ContractName?: string;
  Proxy?: string;
  Implementation?: string;
  ABI?: string;
  SourceCode?: string;
  CompilerVersion?: string;
  EVMVersion?: string;
  OptimizationUsed?: boolean;
  Runs?: number;
}

export default function ContractDetailsPage({ params }: { params: { address: string } }) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [activeTab, setActiveTab] = useState("transactions");
  const [activeSubTab, setActiveSubTab] = useState("source-code");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContract = async () => {
      try {
        setIsLoading(true);
        const data = responseData;
        
        if (data.contracts && (data.contracts as any)[params.address]) {
          const contractData = (data.contracts as any)[params.address];
          setContract({
            address: params.address,
            ContractName: contractData.ContractName || "Unknown Contract",
            Proxy: contractData.Proxy,
            Implementation: contractData.Implementation,
            ABI: contractData.ABI,
            SourceCode: contractData.SourceCode,
            CompilerVersion: contractData.CompilerVersion,
            EVMVersion: contractData.EVMVersion,
            OptimizationUsed: contractData.OptimizationUsed,
            Runs: contractData.Runs,
          });
        }
      } catch (error) {
        console.error("Error loading contract:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, [params.address]);

  const getRandomLogo = (address: string) => {
    const hash = address.slice(2).split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
      return a;
    }, 0);
    const shapeNumber = (Math.abs(hash) % 8) + 1;
    return `/shapes/shape${shapeNumber}.png`;
  };

  const getVerificationStatus = (contract: ContractData) => {
    if (contract.SourceCode && contract.SourceCode.trim() !== "") {
      return {
        status: "Verified",
        color: "text-green-400",
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    return {
      status: "Unverified",
      color: "text-gray-400",
      icon: null
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white">Loading contract...</div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-white text-lg mb-2">Contract not found</div>
          <div className="text-gray-400 text-sm mb-4">The contract address {params.address} was not found</div>
          <Button 
            onClick={() => window.location.href = '/dashboard/contracts'} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            Back to Contracts
          </Button>
        </div>
      </div>
    );
  }

  const verificationInfo = getVerificationStatus(contract);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src={getRandomLogo(contract.address)}
              alt="Contract Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {contract.ContractName}
            </div>
            <div className="text-sm text-gray-400 font-mono">
              {contract.address}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`${verificationInfo.color}`}>
              {verificationInfo.icon}
            </span>
            <span className={`text-sm ${verificationInfo.color}`}>
              {verificationInfo.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Play className="h-4 w-4 mr-2" />
            Simulate
          </Button>
        </div>
      </div>

      {/* Contract Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Contract Information */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contract Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">HyperEVM Mainnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white">
                {contract.Proxy === "1" ? "Proxy Contract" : "Standard Contract"}
              </span>
            </div>
            {contract.Proxy === "1" && contract.Implementation ? (
              <div className="flex justify-between">
                <span className="text-gray-400">Implementation:</span>
                <span className="text-white font-mono text-sm">
                  {contract.Implementation}
                </span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-400">Implementation:</span>
                <span className="text-white">-</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">ETH Balance:</span>
              <span className="text-white">0.00 ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deployment Address:</span>
              <span className="text-white font-mono text-sm">
                {contract.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deployment Transaction:</span>
              <span className="text-white font-mono text-sm">0x6dbef6...47274a</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deployment Timestamp:</span>
              <span className="text-white">18/06/2025 13:48:48 UTC</span>
            </div>
          </div>
        </div>

        {/* Right Column - Verification Details */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Verification Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Verification timestamp:</span>
              <span className="text-white">06/08/2025 06:27:41 UTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Optimizations:</span>
              <span className="text-white">
                {contract.OptimizationUsed ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Optimization runs:</span>
              <span className="text-white">
                {contract.Runs || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verification type:</span>
              <span className="text-white">
                {contract.SourceCode && contract.SourceCode.trim() !== "" ? "Public" : "Private"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Solidity version:</span>
              <span className="text-white">^0.8.22</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Compiler:</span>
              <span className="text-white">{contract.CompilerVersion || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">EVM Version:</span>
              <span className="text-white">{contract.EVMVersion || "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subnavbar */}
      <div className="space-y-4">
        {/* Tabs */}
        <div
          className="flex space-x-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {[
            { id: "transactions", label: "Transactions" },
            { id: "simulations", label: "Simulations" },
            { id: "source", label: "Source code" },
            { id: "readwrite", label: "Read/Write" },
            { id: "assets", label: "Assets" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                activeTab === tab.id
                  ? "text-white border-b-2"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              style={{
                borderColor:
                  activeTab === tab.id ? "var(--color-primary)" : "transparent",
              }}
            >
              <div className="flex items-center space-x-2">
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {["All", "Direct", "Internal", "Token transfers", "NFT transfers"].map((filter) => (
                    <Button key={filter} variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                      {filter}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-400">Success</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-400">Failed</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    5m ▼
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    Columns
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    Filters
                  </Button>
                </div>
              </div>
              
              <div className="text-center py-12">
                <div className="text-gray-400">
                  <div className="text-lg mb-2">No transactions found</div>
                  <div className="text-sm">This contract has no transaction history yet</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulations" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">No simulations found</div>
                <div className="text-sm">Run simulations to see results here</div>
              </div>
            </div>
          )}

          {activeTab === "source" && (
            <div className="space-y-4">
              {/* Sub-subnavbar for Source code tab - Different style */}
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="flex space-x-2">
                  {[
                    { id: "source-code", label: "Source code", icon: "📄" },
                    { id: "abi", label: "ABI", icon: "🔧" },
                    { id: "compiler-settings", label: "Compiler Settings", icon: "⚙️" }
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeSubTab === subTab.id
                          ? "bg-purple-600 text-white shadow-lg transform scale-105"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{subTab.icon}</span>
                      <span>{subTab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-subnavbar content */}
              <div className="mt-4">
                {activeSubTab === "source-code" && (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                    {contract.SourceCode && contract.SourceCode.trim() !== "" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-white">Contract Source Code</h4>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Search in files"
                              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                            />
                            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                              Copy
                            </Button>
                          </div>
                        </div>
                        
                        {/* Parse and display multiple contract sources */}
                        {(() => {
                          try {
                            const parsedSource = JSON.parse(contract.SourceCode);
                            if (parsedSource.sources && typeof parsedSource.sources === 'object') {
                              return (
                                <div className="space-y-4">
                                  {/* File explorer sidebar */}
                                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-1">
                                      <div className="bg-gray-800 rounded border border-gray-600 p-3">
                                        <h5 className="text-sm font-semibold text-white mb-3">Source Files</h5>
                                        <div className="space-y-1">
                                          {Object.keys(parsedSource.sources).map((fileName, index) => (
                                            <div
                                              key={fileName}
                                              className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                                                index === 0 ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                                              }`}
                                            >
                                              {fileName.split('/').pop()}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Main code display */}
                                    <div className="lg:col-span-3">
                                      <div className="bg-gray-800 rounded border border-gray-600 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="text-sm text-gray-400">
                                            {Object.keys(parsedSource.sources)[0]}
                                          </span>
                                          <span className="text-xs text-gray-500">Solidity</span>
                                        </div>
                                        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                                          {parsedSource.sources[Object.keys(parsedSource.sources)[0]]?.content || 'No content available'}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {
                            // If not JSON, display as plain text
                            return (
                              <div className="bg-gray-800 rounded border border-gray-600 p-4">
                                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {contract.SourceCode}
                                </pre>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-gray-400">
                          <div className="text-lg mb-2">Source code not available</div>
                          <div className="text-sm">This contract's source code is not verified</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === "abi" && (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Contract ABI</h4>
                      <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                        Copy ABI
                      </Button>
                    </div>
                    {contract.ABI && contract.ABI.trim() !== "" ? (
                      <div className="bg-gray-800 rounded border border-gray-600 p-4">
                        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                          {contract.ABI}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400">
                          <div className="text-sm">ABI not available</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === "compiler-settings" && (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Compiler Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Compiler Version:</span>
                          <span className="text-white font-mono text-sm">
                            {contract.CompilerVersion || "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">EVM Version:</span>
                          <span className="text-white font-mono text-sm">
                            {contract.EVMVersion || "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Optimization:</span>
                          <span className="text-white">
                            {contract.OptimizationUsed ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Optimization Runs:</span>
                          <span className="text-white">
                            {contract.Runs || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Parse and display additional compiler settings from SourceCode JSON */}
                    {(() => {
                      try {
                        if (contract.SourceCode && contract.SourceCode.trim() !== "") {
                          const parsedSource = JSON.parse(contract.SourceCode);
                          if (parsedSource.settings) {
                            return (
                              <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-600">
                                <h5 className="text-md font-semibold text-white mb-3">Advanced Settings</h5>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">EVM Version:</span>
                                    <span className="text-white font-mono">
                                      {parsedSource.settings.evmVersion || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Via IR:</span>
                                    <span className="text-white">
                                      {parsedSource.settings.viaIR ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Bytecode Hash:</span>
                                    <span className="text-white font-mono">
                                      {parsedSource.settings.metadata?.bytecodeHash || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Append CBOR:</span>
                                    <span className="text-white">
                                      {parsedSource.settings.metadata?.appendCBOR ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "readwrite" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">Read/Write functions</div>
                <div className="text-sm">Contract functions will be displayed here</div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">No assets found</div>
                <div className="text-sm">Contract assets will be displayed here</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 