"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, Plus, Upload, CheckCircle, Info } from "lucide-react";
import Image from "next/image";

/** @jsxImportSource react */
interface ContractData {
  address: string;
  ContractName?: string;
  Proxy?: string;
  Implementation?: string;
  ABI?: string;
  SourceCode?: string;
  CompilerVersion?: string;
  EVMVersion?: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSimulationData, setHasSimulationData] = useState(false);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setIsLoading(true);
        const contractsData = localStorage.getItem("contractsStorage");
        
        if (contractsData) {
          const data = JSON.parse(contractsData);
          setHasSimulationData(true);
          
          if (data && Object.keys(data).length > 0) {
            const contractsList = Object.entries(data).map(([address, contract]: [string, any]) => {
              return {
                address: address,
                ContractName: contract.ContractName || "Unknown Contract",
                Proxy: contract.Proxy,
                Implementation: contract.Implementation,
                ABI: contract.ABI,
                SourceCode: contract.SourceCode,
                CompilerVersion: contract.CompilerVersion,
                EVMVersion: contract.EVMVersion,
              };
            });
            
            setContracts(contractsList);
          } else {
            setContracts([]);
          }
        } else {
          setHasSimulationData(false);
          setContracts([]);
        }
      } catch (error) {
        console.error("Error loading contracts:", error);
        setHasSimulationData(false);
        setContracts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadContracts();
  }, []);

  const getRandomLogo = (contract: ContractData) => {
    // Generate a consistent random number based on contract address
    const hash = contract.address.slice(2).split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
      return a;
    }, 0);
    
    // Use the hash to select a random shape (1-8)
    const shapeNumber = (Math.abs(hash) % 8) + 1;
    return `/shapes/shape${shapeNumber}.png`;
  };

  const getNetworkInfo = () => {
    return {
      name: "HyperEVM Mainnet",
      icon: "🌐",
      color: "text-blue-400",
    };
  };

  const getVerificationStatus = (contract: ContractData) => {
    if (contract.SourceCode && contract.SourceCode.trim() !== "") {
      return {
        status: "Public",
        icon: <CheckCircle className="h-4 w-4" />,
        color: "text-green-400",
      };
    }
    return {
      status: "Private",
      icon: <Info className="h-4 w-4" />,
      color: "text-gray-400",
    };
  };

  const clearContractsStorage = () => {
    localStorage.removeItem("contractsStorage");
    setContracts([]);
    setHasSimulationData(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white">Loading contracts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contracts</h1>
          {hasSimulationData && (
            <p className="text-gray-400 mt-2">
              {contracts.length} contract{contracts.length !== 1 ? 's' : ''} stored from simulations
            </p>
          )}
        </div>
        {hasSimulationData && contracts.length > 0 && (
          <Button 
            onClick={clearContractsStorage}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            Clear All Contracts
          </Button>
        )}
      </div>

      

      {/* Contracts Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Network
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Verification
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {!hasSimulationData ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-lg mb-2">No simulation data found</div>
                      <div className="text-sm">Run a simulation first to see contracts</div>
                      <Button 
                        onClick={() => window.location.href = '/dashboard/simulator'} 
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                      >
                        Go to Simulator
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : contracts.length > 0 ? (
                contracts.map((contract, index) => {
                  const networkInfo = getNetworkInfo();
                  const verificationInfo = getVerificationStatus(contract);
                  
                  return (
                    <tr 
                      key={contract.address} 
                      className="hover:bg-gray-800 cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/contracts/${contract.address}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ">
                            <Image
                              src={getRandomLogo(contract)}
                              alt="Contract Logo"
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {contract.ContractName || "Unknown Contract"}
                            </div>
                            <div className="text-sm text-gray-400 font-mono">
                              {contract.address}
                            </div>
                            {contract.Proxy === "1" && contract.Implementation && (
                              <div className="text-xs text-purple-400">
                                Proxy → {contract.Implementation.slice(0, 10)}...{contract.Implementation.slice(-8)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{networkInfo.icon}</span>
                          <span className={`text-sm ${networkInfo.color}`}>
                            {networkInfo.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`${verificationInfo.color}`}>
                            {verificationInfo.icon}
                          </span>
                          <span className={`text-sm ${verificationInfo.color}`}>
                            {verificationInfo.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-lg mb-2">No contracts found</div>
                      <div className="text-sm">The simulation didn't return any contracts</div>
                      <Button 
                        onClick={() => window.location.href = '/dashboard/simulator'} 
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                      >
                        Run New Simulation
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 