"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import {
  DisplayTraceItem,
  parseCallTrace,
  formatGas,
  formatValue,
  getContractName,
  decodeFunctionInput,
  decodeFunctionOutput,
} from "@/lib/utils";
import SummaryTab from "./components/SummaryTab";
import ContractsTab from "./components/ContractsTab";
import BalanceStateTab from "./components/BalanceStateTab";
import GasProfileTab from "./components/GasProfileTab";
import StorageStateTab from "./components/StorageStateTab";
import TransactionDetails from "./components/TransactionDetails";
import EventsTab from "./components/EventsTab";
import {response } from "../../../../response"

export default function SimulatorViewPage() {
  const [responseData, setResponseData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedStorageSections, setExpandedStorageSections] = useState<
    Set<string>
  >(new Set());
  const [decodedTraceTree, setDecodedTraceTree] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSimulationData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the simulation response data from localStorage
        const simulationResponse = localStorage.getItem("simulationResponse");
        
        if (!simulationResponse) {
          throw new Error('No simulation data found. Please run a simulation first.');
        }

        const data = JSON.parse(simulationResponse);
        setResponseData(data);

        // Initialize expanded items for the call trace
        if (data.transaction?.callTrace) {
          const trace = parseCallTrace(data.transaction.callTrace, true);
          const allIds = new Set<string>();
          const collectIds = (items: DisplayTraceItem[]) => {
            items.forEach((item) => {
              allIds.add(item.id);
              if (item.calls && item.calls.length > 0) {
                collectIds(item.calls);
              }
            });
          };
          collectIds(trace);
        }

        // Decode the call trace using the new comprehensive decoder
        const decodeAndLog = async () => {
          try {
            // Use the new TraceDecoderManual class
            const { TraceDecoderManual } = await import("@/utils/decodeCallTrace");

            // Convert response data to the format expected by TraceDecoderManual
            const contracts: Record<string, any> = {};
            if (data.contracts) {
              Object.entries(data.contracts).forEach(
                ([addr, contract]: [string, any]) => {
                  contracts[addr] = {
                    address: addr,
                    ABI: contract.ABI,
                    Implementation: contract.Implementation,
                    Proxy: contract.Proxy || (contract.Implementation ? "1" : "0"),
                  };
                }
              );
            }

            const manual = new TraceDecoderManual(contracts);

            // Convert callTrace to the expected format
            const convertCallTrace = (trace: any): any => ({
              from: trace.from || "",
              to: trace.to || "",
              input: trace.input || "0x",
              output: trace.output || "0x",
              gas: trace.gas,
              gasUsed: trace.gas_used,
              error: trace.error || "",
              value: trace.value,
              calls: trace.calls ? trace.calls?.map(convertCallTrace) : undefined,
            });

            const rawTrace = data.transaction?.callTrace
              ? convertCallTrace(data.transaction.callTrace[0])
              : null;

            if (rawTrace) {
              const decodedData = await manual.decodeTrace(rawTrace);

              // Store the decoded trace for display
              setDecodedTraceTree(decodedData);

              console.log("decodedData", decodedData);

              const logNode = (node: any, level: number = 0, index: number = 0) => {
                const indent = "  ".repeat(level);
                const prefix = level === 0 ? "ROOT" : `${index}`;

                // Recursively log all children
                if (node.children && node.children.length > 0) {
                  node.children.forEach((child: any, childIndex: number) => {
                    logNode(child, level + 1, childIndex);
                  });
                }
              };

              if (Array.isArray(decodedData)) {
                // Handle array case
                decodedData.forEach((root, index) => {
                  logNode(root);
                });
              } else {
                // Handle single node case
                logNode(decodedData);
              }
            }
          } catch (error) {
            console.error("Failed to decode call trace:", error);
          }
        };

        decodeAndLog();
      } catch (err) {
        console.error("Error loading simulation data:", err);
        setError(err instanceof Error ? err.message : 'Failed to load simulation data');
      } finally {
        setIsLoading(false);
      }
    };

    loadSimulationData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white">Loading simulation data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <div className="text-white mb-4">{error}</div>
          <Button 
            onClick={() => window.location.href = '/dashboard/simulator'} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Simulator
          </Button>
        </div>
      </div>
    );
  }

  if (!responseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-yellow-400 text-xl mb-4">⚠️ No Data</div>
          <div className="text-white">No simulation data available</div>
          <Button 
            onClick={() => window.location.href = '/dashboard/simulator'} 
            className="bg-blue-600 hover:bg-blue-700 mt-4"
          >
            Run Simulation
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "contracts", label: "Contracts" },
    { id: "balance", label: "Balance state" },
    { id: "storage", label: "Storage state" },
    { id: "events", label: "Events" },
    { id: "gas-profiler", label: "Gas Profiler" },
  ];

  const toggleStorageSection = (address: string) => {
    setExpandedStorageSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-white">Simulation</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-gray-800"
            onClick={() => window.location.href = '/dashboard/simulator'}
          >
            New Simulation
          </Button>
        </div>
      </div>

      {/* Middle Simulation Details Section */}
      <TransactionDetails responseData={responseData} decodedTraceTree={decodedTraceTree} />

      {/* Bottom Content Section */}
      <div className="space-y-4">
        {/* Tabs */}
        <div
          className="flex space-x-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as string)}
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

        {/* Summary Tab Content */}
        {activeTab === "summary" && (
          <SummaryTab
            activeTab={activeTab}
            responseData={responseData}
            decodedTraceTree={decodedTraceTree}
          />
        )}
        {activeTab !== "summary" && (
          <div className="mt-6">
            {activeTab === "balance" ? (
              <BalanceStateTab responseData={responseData} />
            ) : activeTab === "storage" ? (
              <StorageStateTab
                responseData={responseData}
                toggleStorageSection={toggleStorageSection}
                expandedStorageSections={expandedStorageSections}
              />
            ) : activeTab === "contracts" ? (
              <ContractsTab responseData={responseData} />
            ) : activeTab === "gas-profiler" ? (
              <GasProfileTab responseData={responseData} />
            ): activeTab === "events" ? (
              <EventsTab responseData={responseData} />
            ) 
             : (
              <p className="text-gray-400 text-center">
                Content for {tabs.find((t) => t.id === activeTab)?.label} tab
                will appear here
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
