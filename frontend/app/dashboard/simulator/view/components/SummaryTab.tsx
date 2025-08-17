import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type SummaryTabProps = {
  activeTab: string;
  responseData: any; // { contracts: { [addr]: { ContractName?: string, ... } } }
  decodedTraceTree: any; // root DecodedNode from your decoder
};

export default function SummaryTab({
  activeTab,
  responseData,
  decodedTraceTree,
}: SummaryTabProps) {
  // ---------------- helpers ----------------
  const hasValues = (v: any) =>
    v != null &&
    ((Array.isArray(v) && v.length > 0) ||
      (typeof v === "object" && Object.keys(v).length > 0));

  const prettyJson = (v: any) => JSON.stringify(v, null, 0);

  const getContractName = (contracts: any, address?: string) => {
    if (!contracts || !address) return address || "0x";
    const lower = address.toLowerCase();
    const rec =
      contracts[lower] ??
      contracts[address] ??
      contracts[(address || "").toLowerCase()];
    return rec?.ContractName || address;
  };

  const formatGas = (gas?: string) => {
    if (!gas) return "0";
    const n = Number(gas);
    if (Number.isNaN(n)) return gas;
    return n.toString();
  };

  const formatEth = (ethStr?: string) => {
    if (!ethStr) return "0 HYPE";
    const n = Number(ethStr);
    if (Number.isNaN(n)) return `${ethStr} HYPE`;
    return `${n.toFixed(6)} HYPE`;
  };

  const functionDisplay = (trace: any) => {
    // Priority: decoded name -> selector -> short input -> fallback
    if (trace.functionName) {
      // Extract just the function name without parameters
      const functionName = trace.functionName.split("(")[0];
      return functionName;
    }
    if (trace.functionSelector) return trace.functionSelector; // e.g., 0x313ce567
    if (trace.inputRaw && trace.inputRaw !== "0x")
      return trace.inputRaw.slice(0, 10);
    if (!trace.inputRaw || trace.inputRaw === "0x") return "fallback()";
    return "unknown";
  };

  // Expandable, hover-underline, ellipsized hex viewer (click to expand/collapse)
  const ExpandableHex = ({
    label,
    hex,
    cropSelector = false,
  }: {
    label: string;
    hex: string;
    cropSelector?: boolean;
  }) => {
    // Safely crop the 4-byte selector (first 10 chars "0x" + 8 hex) if requested
    const content = (() => {
      if (!hex || hex === "0x") return "";
      if (!cropSelector) return hex;
      if (hex.length <= 10) return ""; // only selector; no params to show
      return "0x" + hex.slice(10);
    })();

    if (!content) return null;

    const [open, setOpen] = useState(false);
    const previewLen = 96; // characters to show before "…"

    const isLong = content.length > previewLen;
    const preview = isLong ? content.slice(0, previewLen) + "…" : content;

    // Determine color based on label
    const labelColor = label === "input" ? "text-green-300" : "text-orange-300";
    const contentColor = label === "input" ? "text-green-300" : "text-orange-300";

    return (
      <div className="text-xs break-words">
        <span className={labelColor}>{label}: </span>
        {!open ? (
          <span
            className={`${contentColor} ${
              isLong
                ? "underline decoration-dotted hover:decoration-solid cursor-pointer"
                : ""
            } break-all`}
            onClick={() => isLong && setOpen(true)}
            title={isLong ? "Click to expand" : undefined}
          >
            {preview}
          </span>
        ) : (
          <div className="inline-block">
            <span
              className={`${contentColor} break-all cursor-pointer`}
              onClick={() => setOpen(false)}
              title="Click to collapse"
            >
              {content}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ------------- tree renderer -------------
  const DecodedTraceTree = ({
    trace,
    contracts,
    isRoot = false,
    level = 0,
  }: {
    trace: any;
    contracts: any;
    isRoot?: boolean;
    level?: number;
  }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren =
      Array.isArray(trace.children) && trace.children.length > 0;

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

          <div className="text-xs text-gray-300 font-mono flex-1 min-w-0 break-words">
            {/* Root level header */}
            {isRoot && (
              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                <span className="text-orange-400">[Sender]</span>
                <span className="text-white break-all">
                  {getContractName(contracts, trace.from)}
                </span>
                <span className="text-orange-400">{"=>"}</span>
                <span className="text-orange-400">[Receiver]</span>
                <span className="text-white break-all">
                  {getContractName(contracts, trace.to)}
                </span>
              </div>
            )}

            {/* Function call details */}
            <div className="text-blue-300 break-words">
              {!isRoot && (
                <>
                  <span className="text-gray-400">(</span>
                  <span className="text-orange-400">[Receiver] </span>
                  <span className="text-white break-all">
                    {getContractName(contracts, trace.from)}
                  </span>
                  <span className="text-gray-400"> =&gt; </span>
                  <span className="text-white break-all">
                    {getContractName(contracts, trace.to)}
                  </span>
                  <span className="text-gray-400">).</span>
                </>
              )}
              {trace.signature ? (
                <>
                  <span className="text-blue-300 break-all">
                    {trace.functionName || functionDisplay(trace)}
                  </span>
                  <span className="text-gray-400 break-all">
                    {trace.signature.replace(/^[^(]+/, "")}
                  </span>
                </>
              ) : (
                <span className="text-blue-300 break-all">
                  {functionDisplay(trace)}
                </span>
              )}

              <span className="text-gray-500 text-xs ml-2 break-words">
                gas: {formatGas(trace.gasUsed || "0")}
              </span>
            </div>

            {/* Function selector */}
            {trace.functionSelector && (
              <div className="text-gray-400 text-xs break-all">
                selector: {trace.functionSelector}
              </div>
            )}

            {trace.type && (
              <span
                className={"text-indigo-400 text-xs py-0.5 my-3.5 break-all"}
              >
                type: {trace.type}
              </span>
            )}

            {/* Input parameters */}
            {hasValues(trace.inputDecoded) ? (
              <div className="text-green-300 text-xs break-words">
                <span className="text-green-300">input: </span>
                <span className="text-green-300">{prettyJson(trace.inputDecoded)}</span>
              </div>
            ) : (
              // If no decoded input but raw hex present, show hex **without the selector**
              trace.inputRaw &&
              trace.inputRaw !== "0x" && (
                <ExpandableHex label="input" hex={trace.inputRaw} cropSelector />
              )
            )}

            {/* Output values: prefer decoded; else show raw hex if present */}
            {hasValues(trace.outputDecoded) ? (
              <div className="text-orange-300 text-xs break-words">
                <span className="text-orange-300">output: </span>
                <span className="text-orange-300">{prettyJson(trace.outputDecoded)}</span>
              </div>
            ) : (
              trace.outputRaw &&
              trace.outputRaw !== "0x" && <ExpandableHex label="output" hex={trace.outputRaw} />
            )}

            {/* Value transfer (use valueEth/valueWei from decoder) */}
            {trace.valueEth && trace.valueEth !== "0" ? (
              <div className="text-gray-400 text-xs break-words">
                value: {formatEth(trace.valueEth)}
              </div>
            ) : null}

            {/* Error */}
            {trace.error && trace.error !== "" && (
              <div className="text-red-400 text-xs break-words">
                error: {trace.error}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-6 space-y-4">
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
    );
  };

  // --------- summary cards helpers (root only) ----------
  const formatInputForDisplay = (
    inputDecoded: any,
    signature?: string,
    inputRaw?: string
  ) => {
    if (hasValues(inputDecoded)) {
      const formatted: Record<string, any> = {};
      let paramTypes: string[] = [];

      if (signature) {
        const match = signature.match(/\(([^)]*)\)/);
        if (match && match[1]) {
          paramTypes = match[1]
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
        }
      }

      if (Array.isArray(inputDecoded)) {
        inputDecoded.forEach((value: any, index: number) => {
          const typeName = paramTypes[index] || `param${index}`;
          formatted[`${typeName}_${index}`] = value;
        });
      } else if (typeof inputDecoded === "object") {
        Object.entries(inputDecoded).forEach(([k, v]) => {
          formatted[k] = v;
        });
      }
      return formatted;
    }

    // fallback to raw (crop selector)
    if (inputRaw && inputRaw !== "0x") {
      const cropped = inputRaw.length > 10 ? "0x" + inputRaw.slice(10) : "";
      return cropped ? { raw: cropped } : {};
    }
    return {};
  };

  const formatOutputForDisplay = (outputDecoded: any, outputRaw?: string) => {
    if (hasValues(outputDecoded)) {
      const formatted: Record<string, any> = {};
      if (Array.isArray(outputDecoded)) {
        outputDecoded.forEach((value: any, index: number) => {
          formatted[`return${index}`] = value;
        });
      } else if (typeof outputDecoded === "object") {
        Object.entries(outputDecoded).forEach(([k, v]) => {
          formatted[k] = v;
        });
      }
      return formatted;
    }
    
    // If no decoded output, try to show raw output
    if (outputRaw && outputRaw !== "0x") {
      return { raw: outputRaw };
    }
    
    // No output data available
    return {};
  };

  const rootTrace = decodedTraceTree;
  const inputData = rootTrace
    ? formatInputForDisplay(
        rootTrace.inputDecoded,
        rootTrace.signature,
        rootTrace.inputRaw
      )
    : {};
  const outputData = rootTrace
    ? formatOutputForDisplay(rootTrace.outputDecoded, rootTrace.outputRaw)
    : {};

  // ---------------- render ----------------
  return (
    <div className="space-y-4">
      {/* Input / Output cards (only on Summary tab) */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Input</h3>
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: "rgba(30, 30, 30, 0.6)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="space-y-2">
                  <pre
                    className="text-sm text-gray-300 bg-gray-900 p-3 rounded border overflow-x-auto"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <code className="text-blue-300">{`{`}</code>
                    {Object.keys(inputData).length > 0 ? (
                      <>
                        <br />
                        {Object.entries(inputData).map(
                          ([key, value], index) => (
                            <div
                              key={index}
                              className="whitespace-pre-wrap break-all"
                            >
                              <span className="text-gray-400"> </span>
                              <code className="text-green-300">
                                "{String(key).split("_")[0]}"
                              </code>
                              <code className="text-gray-300">: </code>
                              <code className="text-yellow-300">"</code>
                              <code className="text-blue-400">
                                {String(value)}
                              </code>
                              <code className="text-yellow-300">"</code>
                              {index < Object.keys(inputData).length - 1 && (
                                <code className="text-gray-300">,</code>
                              )}
                            </div>
                          )
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500"> // No input</span>
                    )}
                    <code className="text-blue-300">{`}`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Output</h3>
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: "rgba(30, 30, 30, 0.6)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="space-y-2">
                  <pre
                    className="text-sm text-gray-300 bg-gray-900 p-3 rounded border overflow-x-auto"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <code className="text-blue-300">{`{`}</code>
                    {Object.keys(outputData).length > 0 ? (
                      <>
                        <br />
                        {Object.entries(outputData).map(
                          ([key, value], index) => (
                            <div
                              key={index}
                              className="whitespace-pre-wrap break-all"
                            >
                              <span className="text-gray-400"> </span>
                              <code className="text-green-300">"{key}"</code>
                              <code className="text-gray-300">: </code>
                              <code className="text-yellow-300">"</code>
                              <code className="text-blue-400">
                                {String(value)}
                              </code>
                              <code className="text-yellow-300">"</code>
                              {index < Object.keys(outputData).length - 1 && (
                                <code className="text-gray-300">,</code>
                              )}
                            </div>
                          )
                        )}
                      </>
                    ) : null}
                    <br />
                    <code className="text-blue-300">{`}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar placeholder */}
      <div
        className="flex items-center space-x-4 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      />

      {/* Transaction Trace */}
      <div
        className="border"
        style={{
          backgroundColor: "rgba(30, 30, 30, 0.6)",
          borderColor: "var(--border)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="p-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">
              Decoded Transaction Trace
            </h3>
            <div className="w-full">
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
  );
}
