"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import SummaryTab from "./components/SummaryTab";
import ContractsTab from "./components/ContractsTab";
import BalanceStateTab from "./components/BalanceStateTab";
import GasProfileTab from "./components/GasProfileTab";
import StorageStateTab from "./components/StorageStateTab";
import TransactionDetails from "./components/TransactionDetails";
import EventsTab from "./components/EventsTab";
import { RotateCcw } from "lucide-react"; // add at top

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

const ensure0x = (v?: string) =>
  v && (v.startsWith("0x") || v.startsWith("0X")) ? v : `0x${v ?? "0"}`;

const toHex = (value?: string): string => {
  const s = (value || "").trim();
  if (!s) return "0x0";
  if (s.startsWith("0x") || s.startsWith("0X")) return s;
  try {
    // prefer bigint for large numbers
    const bi = BigInt(s);
    return "0x" + bi.toString(16);
  } catch {
    const n = Number(s);
    if (!Number.isFinite(n)) return "0x0";
    return "0x" + Math.trunc(n).toString(16);
  }
};

const parseStateOverrides = (sp: URLSearchParams) => {
  const raw = sp.get("stateOverrides");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      { balance?: string; stateDiff?: Record<string, string> }
    >;

    const normalized: Record<
      string,
      { balance?: string; stateDiff?: Record<string, string> }
    > = {};
    for (const [addr, obj] of Object.entries(parsed)) {
      normalized[addr] = {
        balance: obj.balance ? toHex(obj.balance) : undefined,
        stateDiff: obj.stateDiff
          ? Object.fromEntries(
              Object.entries(obj.stateDiff).map(([k, v]) => [
                ensure0x(k),
                toHex(v),
              ])
            )
          : undefined,
      };
    }
    return normalized;
  } catch {
    return {};
  }
};

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
    let cancelled = false;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1) Read query params
        const sp = new URLSearchParams(window.location.search);

        // 2) Build request body for backend
        const requestBody = {
          from: sp.get("from") || "",
          to: sp.get("to") || "",
          input: sp.get("input") || "0x",
          value: toHex(sp.get("value") || "0"),
          gas: toHex(sp.get("gas") || "0"),
          gasPrice: toHex(sp.get("gasPrice") || "0"),
          generateAccessList: true,
          blockNumber: sp.get("block") ? toHex(sp.get("block")!) : "latest",
          // stateObjects consumed directly by backend
          stateObjects: parseStateOverrides(sp),
        };

        // 3) Call backend
        const res = await fetch(`${BACKEND}/api/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        // 4) Set response in state
        setResponseData(data);

        // 5) Append contracts to contractsStorage (merge)
        if (data.contracts) {
          const existing = JSON.parse(
            localStorage.getItem("contractsStorage") || "{}"
          );
          const merged = { ...existing, ...data.contracts };
          localStorage.setItem("contractsStorage", JSON.stringify(merged));
        }

        // 6) Decode call trace with manual decoder (proxy-aware)
        try {
          const { TraceDecoderManual } = await import(
            "@/utils/decodeCallTrace"
          );

          const contracts: Record<string, any> = {};
          if (data.contracts) {
            Object.entries(data.contracts).forEach(
              ([addr, contract]: [string, any]) => {
                contracts[addr] = {
                  address: addr,
                  ABI: contract.ABI,
                  Implementation: contract.Implementation,
                  Proxy:
                    contract.Proxy || (contract.Implementation ? "1" : "0"),
                };
              }
            );
          }

          const manual = new TraceDecoderManual(contracts);

          // convert trace shape
          const convertCallTrace = (trace: any): any => ({
            from: trace.from || "",
            to: trace.to || "",
            input: trace.input || "0x",
            output: trace.output || "0x",
            gas: trace.gas,
            gasUsed: trace.gasUsed ?? trace.gas_used, // tolerate either field
            error: trace.error || "",
            value: trace.value,
            type: trace.type,
            calls: Array.isArray(trace.calls)
              ? trace.calls.map(convertCallTrace)
              : undefined,
          });

          const rawRoot = data.transaction?.callTrace?.[0]
            ? convertCallTrace(data.transaction.callTrace[0])
            : null;

          if (rawRoot) {
            const decoded = await manual.decodeTrace(rawRoot);
            if (!cancelled) setDecodedTraceTree(decoded);
          } else {
            if (!cancelled) setDecodedTraceTree(null);
          }
        } catch (e) {
          console.error("Trace decode error:", e);
          if (!cancelled) setDecodedTraceTree(null);
        }
      } catch (e: any) {
        console.error("Failed to load simulation:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load simulation");
          setResponseData(null);
          setDecodedTraceTree(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
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
            onClick={() => (window.location.href = "/dashboard/simulator")}
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
            onClick={() => (window.location.href = "/dashboard/simulator")}
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

        <Button
          className="border-0 px-4 py-2 rounded-xl font-semibold transition-colors flex items-center space-x-2"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
          onClick={() => {
            const url = window.location.href.replace("/view?", "?");
            window.location.href = url;
          }}
          
        >
          <RotateCcw className="h-4 w-4" />
          <span>Re-simulate</span>
        </Button>
      </div>

      {/* Middle Simulation Details Section */}
      <TransactionDetails
        responseData={responseData}
        decodedTraceTree={decodedTraceTree}
      />

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
            ) : activeTab === "events" ? (
              <EventsTab responseData={responseData} />
            ) : (
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
