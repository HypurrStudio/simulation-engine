"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import SummaryTab from "@/app/dashboard/simulator/[slug]/view/components/SummaryTab";
import ContractsTab from "@/app/dashboard/simulator/[slug]/view/components/ContractsTab";
import BalanceStateTab from "@/app/dashboard/simulator/[slug]/view/components/BalanceStateTab";
import GasProfileTab from "@/app/dashboard/simulator/[slug]/view/components/GasProfileTab";
import StorageStateTab from "@/app/dashboard/simulator/[slug]/view/components/StorageStateTab";
import TransactionDetails from "@/app/dashboard/simulator/[slug]/view/components/TransactionDetails";
import EventsTab from "../../simulator/[slug]/view/components/EventsTab";

export default function TransactionTracePage() {
  const router = useRouter();
  const params = useParams<{ hash: string }>();
  const txHash = params?.hash || "";

  const [responseData, setResponseData] = useState<any>(null);
  const [decodedTraceTree, setDecodedTraceTree] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("summary");
  const [expandedStorageSections, setExpandedStorageSections] = useState<
    Set<string>
  >(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build API URL (configure base via NEXT_PUBLIC_TRACE_API_BASE when not localhost)

  const url = `${
    process.env.NEXT_PUBLIC_BACKEND_URL
  }/api/trace/tx?txHash=${encodeURIComponent(txHash)}`;

  useEffect(() => {
    if (!txHash) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("API response:", data);
        setResponseData(data);

        // Decode trace using your manual decoder (proxy-aware)
        try {
          const { TraceDecoderManual } = await import(
            "@/utils/decodeCallTrace"
          );

          // build a proxy-aware contracts map
          const contracts: Record<string, any> = {};
          Object.entries(data.contracts ?? {}).forEach(
            ([addr, contract]: [string, any]) => {
              const rec = {
                address: addr,
                ABI: contract.ABI,
                Implementation: contract.Implementation,
                Proxy: contract.Proxy || (contract.Implementation ? "1" : "0"),
              };
              contracts[addr] = rec;

              // ⭐ new: also key the ABI by implementation address so the decoder can find it
              if (contract.Implementation && contract.ABI) {
                const implAddr = String(contract.Implementation);
                if (!contracts[implAddr]) {
                  contracts[implAddr] = {
                    address: implAddr,
                    ABI: contract.ABI,
                    Proxy: "0",
                  };
                }
              }
            }
          );

          const manual = new TraceDecoderManual(contracts);

          // Convert callTrace item to decoder format (defensive)
          // wherever you have convertCallTrace:
          const convertCallTrace = (trace: any): any => ({
            from: trace?.from || "",
            to: trace?.to || "",
            input: trace?.input || "0x",
            output: trace?.output || "0x",
            gas: trace?.gas ?? trace?.gasUsed ?? trace?.gas_used,           // ← add fallbacks
            gasUsed: trace?.gas_used ?? trace?.gasUsed ?? trace?.gas,       // ← add fallbacks
            error: trace?.error || "",
            value: trace?.value,
            type: trace?.type,
            calls: Array.isArray(trace?.calls) ? trace.calls.map(convertCallTrace) : undefined,
          });

          // Your API returns the same shape as simulator: data.transaction.callTrace = [root...]
          const rawRoot = data.transaction?.callTrace?.[0]
            ? convertCallTrace(data.transaction.callTrace[0])
            : null;

          if (rawRoot) {
            const decoded = await manual.decodeTrace(rawRoot);
            setDecodedTraceTree(decoded);
          } else {
            setDecodedTraceTree(null);
          }
        } catch (e) {
          console.error("Trace decode error:", e);
          // non-fatal: keep the raw response visible even if decode fails
          setDecodedTraceTree(null);
        }
      } catch (e: any) {
        console.error("Failed to load trace:", e);
        setError(e?.message || "Failed to load trace");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [txHash, url]);

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
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  };

  // ---- UI states ----

  if (!txHash) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-yellow-400 text-xl mb-4">⚠️ No Hash</div>
          <div className="text-white mb-4">
            Provide a transaction hash in the URL.
          </div>
          <Button
            onClick={() => router.push("/transactions")}
            className="border-0 px-6 py-2 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
            }}
          >
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <div className="text-white">Loading transaction trace…</div>
        </div>
      </div>
    );
  }

  if (error || !responseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <div className="text-white mb-4">
            {error || "Failed to load trace"}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => router.refresh()}
              className="border-0 px-6 py-2 rounded-lg font-semibold transition-colors"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              Retry
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/transactions")}
              className="text-white hover:bg-gray-800"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-white">Transaction Trace</h1>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-400 break-all">
            Tx Hash: {txHash}
          </span>
        </div>
      </div>

      {/* Core details (reusing same component set) */}
      <TransactionDetails
        responseData={responseData}
        decodedTraceTree={decodedTraceTree}
      />

      {/* Tabs */}
      <div className="space-y-4">
        <div
          className="flex space-x-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {tabs.map((tab) => (
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

        {/* Content */}
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
