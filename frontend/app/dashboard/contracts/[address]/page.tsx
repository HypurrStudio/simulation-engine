"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { MoreHorizontal, Share, Bell, Play, CheckCircle } from "lucide-react";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

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

export default function ContractDetailsPage({
  params,
}: {
  params: { address: string };
}) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [activeTab, setActiveTab] = useState("source");
  const [activeSubTab, setActiveSubTab] = useState("source-code");
  const [activeSourceFile, setActiveSourceFile] = useState<string>("");
  const [parsedSourceCode, setParsedSourceCode] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>("0.00");

  const fetchBalance = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_HYPEREVM_RPC_URL);
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(parseFloat(balanceEth).toFixed(4));
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0.00");
    }
  };

  useEffect(() => {
    const loadContract = async () => {
      try {
        setIsLoading(true);
        const contractsData = localStorage.getItem("contractsStorage");
        
        if (contractsData) {
          const data = JSON.parse(contractsData);
          
          if (data && (data as any)[params.address]) {
            // Type casting for indexing
            const contractData = (data as any)[params.address];
            await fetchBalance(params.address);
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

            // Parse SourceCode if it exists
            if (
              contractData.SourceCode &&
              contractData.SourceCode.trim() !== ""
            ) {
              try {
                // Handle double curly braces wrapping
                let sourceCodeToParse = contractData.SourceCode;
                if (
                  sourceCodeToParse.startsWith("{{") &&
                  sourceCodeToParse.endsWith("}}")
                ) {
                  sourceCodeToParse = sourceCodeToParse.slice(1, -1); // Remove {{ and }}
                }

                const parsed = JSON.parse(sourceCodeToParse);
                // console.log("Parsed source code:", parsed);
                if (parsed.sources && typeof parsed.sources === "object") {
                  // console.log("Sources found:", Object.keys(parsed.sources));
                  setParsedSourceCode(parsed);
                  // Set the first file as active
                  const firstFile = Object.keys(parsed.sources)[0];
                  // console.log("First file:", firstFile);
                  setActiveSourceFile(firstFile);
                }
              } catch (e) {
                console.log("Error parsing SourceCode:", e);
                // If not JSON, keep as plain text
                setParsedSourceCode(null);
              }
            } else {
              console.log("No SourceCode found in contract data");
            }
          } else {
            // Contract not found
            setContract(null);
          }
        } else {
          // No contracts data
          setContract(null);
        }
      } catch (error) {
        console.error("Error loading contract:", error);
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadContract();
  }, [params.address]);

  const getRandomLogo = (address: string) => {
    // Generate a consistent random number based on contract address
    const hash = address
      .slice(2)
      .split("")
      .reduce((a, b) => {
        a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
        return a;
      }, 0);

    // Use the hash to select a random shape (1-8)
    const shapeNumber = (Math.abs(hash) % 8) + 1;
    return `/shapes/shape${shapeNumber}.png`;
  };

  const getVerificationStatus = (contract: ContractData) => {
    if (contract.SourceCode && contract.SourceCode.trim() !== "") {
      return {
        status: "Verified",
        color: "text-green-400",
        icon: <CheckCircle className="h-4 w-4" />,
      };
    }
    return {
      status: "Unverified",
      color: "text-gray-400",
      icon: null,
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
          <div className="text-red-400 text-xl mb-4">❌ Contract Not Found</div>
          <div className="text-white">
            Contract with address {params.address} not found
          </div>
        </div>
      </div>
    );
  }

  // TEST MESSAGE - REMOVE THIS LATER
  // console.log("CONTRACT DETAILS PAGE LOADED!");
  // console.log("Contract:", contract);
  // console.log("Active tab:", activeTab);
  // console.log("Active sub tab:", activeSubTab);

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
        </div>

        <div className="flex  space-x-2">
          <span className={`${verificationInfo.color}`}>
            {verificationInfo.icon}
          </span>
          <span className={`text-sm ${verificationInfo.color}`}>
            {verificationInfo.status}
          </span>
        </div>
      </div>

      {/* Contract Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: "rgba(30, 30, 30, 0.6)",
            borderColor: "var(--border)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-2">
            Contract Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">HyperEVM Mainnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white">
                {contract.Proxy === "1"
                  ? "Proxy Contract"
                  : "Standard Contract"}
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
              <span className="text-gray-400">HYPE Balance:</span>
              <span className="text-white">{balance} HYPE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deployment Address:</span>
              <span className="text-white font-mono text-sm">
                {contract.address}
              </span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-gray-400">Deployment Transaction:</span>
              <span className="text-white font-mono text-sm">
                0x6dbef6...47274a
              </span>
            </div> */}
            {/* <div className="flex justify-between">
              <span className="text-gray-400">Deployment Timestamp:</span>
              <span className="text-white">18/06/2025 13:48:48 UTC</span>
            </div> */}
          </div>
        </div>

        {/* Right Column - Verification Details */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: "rgba(30, 30, 30, 0.6)",
            borderColor: "var(--border)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-2">
            Verification Details
          </h3>
          <div className="space-y-2">
            {/* <div className="flex justify-between">
              <span className="text-gray-400">Verification timestamp:</span>
              <span className="text-white">06/08/2025 06:27:41 UTC</span>
            </div> */}
            <div className="flex justify-between">
              <span className="text-gray-400">Optimizations:</span>
              <span className="text-white">
                {contract.OptimizationUsed ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Optimization runs:</span>
              <span className="text-white">{contract.Runs || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verification type:</span>
              <span className="text-white">
                {contract.SourceCode && contract.SourceCode.trim() !== ""
                  ? "Public"
                  : "Private"}
              </span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-gray-400">Solidity version:</span>
              <span className="text-white">^0.8.22</span>
            </div> */}
            <div className="flex justify-between">
              <span className="text-gray-400">Compiler:</span>
              <span className="text-white">
                {contract.CompilerVersion || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">EVM Version:</span>
              <span className="text-white">
                {contract.EVMVersion || "Unknown"}
              </span>
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
            
            { id: "source", label: "Source code" },
            { id: "transactions", label: "Transactions" },
            { id: "readwrite", label: "Read/Write" },
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
              <div className="flex items-center justify-between"></div>

              <div className="text-center py-12">
                <div className="text-gray-400">
                  <div className="text-lg mb-2">Coming Soon</div>
                  {/* <div className="text-sm">
                    This contract has no transaction history yet
                  </div> */}
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulations" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">No simulations found</div>
                <div className="text-sm">
                  Run simulations to see results here
                </div>
              </div>
            </div>
          )}

          {activeTab === "source" && (
            <div className="space-y-4">
              {/* Sub-subnavbar for Source code tab - Different style */}
              <div className=" rounded-lg p-2">
                <div className="flex space-x-2">
                  {[
                    { id: "source-code", label: "Source code" },
                    { id: "abi", label: "ABI" },
                    {
                      id: "compiler-settings",
                      label: "Compiler Settings",
                    },
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id)}
                      className={`flex items-center space-x-2 px-4 py-1 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeSubTab === subTab.id
                          ? "shadow-lg transform scale-105"
                          : " text-gray-300 hover:bg-gray-600 hover:text-white"
                      }`}
                      style={
                        activeSubTab === subTab.id
                          ? {
                              backgroundColor: "var(--btn-primary-bg)",
                              color: "var(--btn-primary-text)",
                            }
                          : {
                              backgroundColor: "rgba(30, 30, 30, 0.6)",
                              borderColor: "var(--border)",
                              backdropFilter: "blur(10px)",
                            }
                      }
                    >
                      <span>{subTab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-subnavbar content */}
              <div className="mt-4">
                {activeSubTab === "source-code" && (
                  <div
                    className=" rounded-lg border  p-4"
                    style={{
                      backgroundColor: "rgba(30, 30, 30, 0.6)",
                      borderColor: "var(--border)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white">
                          Contract Source Code
                        </h4>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Search in files"
                            className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-300 hover:text-white"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Dummy source code with sidebar */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {/* File sidebar */}
                        <div className="lg:col-span-1">
                          <div className="bg-black rounded border border-gray-600 p-3">
                            <h5 className="text-sm font-semibold text-white mb-3">
                              Source Code
                            </h5>
                            <div className="space-y-1">
                              {parsedSourceCode?.sources ? (
                                Object.keys(parsedSourceCode.sources).map(
                                  (filePath) => {
                                    const fileName =
                                      filePath.split("/").pop() || filePath;
                                    const isActive =
                                      activeSourceFile === filePath;
                                    return (
                                      <div
                                        key={filePath}
                                        onClick={() =>
                                          setActiveSourceFile(filePath)
                                        }
                                        className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                                          isActive
                                            ? "shadow-lg transform scale-105"
                                            : "text-gray-300 hover:bg-gray-700"
                                        }`}
                                        style={
                                          isActive
                                            ? {
                                                backgroundColor:
                                                  "var(--btn-primary-bg)",
                                                color:
                                                  "var(--btn-primary-text)",
                                              }
                                            : {}
                                        }
                                      >
                                        <div className="flex items-center space-x-2">
                                          <span className="truncate">
                                            {fileName}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                )
                              ) : (
                                <div className="text-xs text-gray-400">
                                  No sources found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Main code display */}
                        <div className="lg:col-span-4">
                          <div className="bg-black rounded border border-gray-600 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-400">
                                {activeSourceFile
                                  ? activeSourceFile.split("/").pop() ||
                                    activeSourceFile
                                  : parsedSourceCode?.sources
                                  ? Object.keys(parsedSourceCode.sources)[0]
                                      ?.split("/")
                                      .pop()
                                  : "No file selected"}
                              </span>
                              <span className="text-xs text-gray-500">
                                Solidity
                              </span>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                              <SyntaxHighlighter
                                language="solidity"
                                style={tomorrow}
                                customStyle={{
                                  margin: 0,
                                  backgroundColor: "transparent",
                                  fontSize: "13px",
                                  lineHeight: "1.4",
                                }}
                              >
                                {(() => {
                                  // Prefer parsed multi-file JSON if available
                                  if (parsedSourceCode?.sources) {
                                    const fileKey =
                                      activeSourceFile ||
                                      Object.keys(
                                        parsedSourceCode.sources
                                      )[0] ||
                                      "";
                                    const content =
                                      parsedSourceCode.sources[fileKey]
                                        ?.content || "No content available";
                                    return content;
                                  }
                                  // Fallback: raw single-string SourceCode (unparsed)
                                  return (
                                    contract.SourceCode ||
                                    "No content available"
                                  );
                                })()}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === "abi" && (
                  <div
                    className="rounded-lg border  p-4"
                    style={{
                      backgroundColor: "rgba(30, 30, 30, 0.6)",
                      borderColor: "var(--border)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">
                        Contract ABI
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-300 hover:text-white"
                      >
                        Copy ABI
                      </Button>
                    </div>
                    {contract.ABI && contract.ABI.trim() !== "" ? (
                      <div className="bg-black rounded border border-gray-600 p-4">
                        <SyntaxHighlighter
                          language="json"
                          style={tomorrow}
                          customStyle={{
                            margin: 0,
                            backgroundColor: "transparent",
                            fontSize: "13px",
                            lineHeight: "1.4",
                          }}
                        >
                          {(() => {
                            try {
                              // Try to parse and beautify the ABI
                              const parsedABI = JSON.parse(contract.ABI);
                              return JSON.stringify(parsedABI, null, 2);
                            } catch (e) {
                              // If parsing fails, return the original ABI
                              return contract.ABI;
                            }
                          })()}
                        </SyntaxHighlighter>
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
                  <div
                    className=" rounded-lg border  p-4"
                    style={{
                      backgroundColor: "rgba(30, 30, 30, 0.6)",
                      borderColor: "var(--border)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Compiler Settings
                    </h4>

                    {parsedSourceCode?.settings ? (
                      <div className="space-y-6">
                        {/* Raw Settings JSON */}
                        <div className="p-4 bg-black rounded border border-gray-600">
                          <SyntaxHighlighter
                            language="json"
                            style={tomorrow}
                            customStyle={{
                              margin: 0,
                              backgroundColor: "transparent",
                              fontSize: "12px",
                              lineHeight: "1.3",
                            }}
                          >
                            {JSON.stringify(parsedSourceCode.settings, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400">
                          <div className="text-sm">
                            No compiler settings available
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "readwrite" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">Read/Write functions</div>
                <div className="text-sm">
                  Contract functions will be displayed here
                </div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg mb-2">No assets found</div>
                <div className="text-sm">
                  Contract assets will be displayed here
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
