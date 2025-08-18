import {
    getContractName,
    formatGas,
    formatValue,
    decodeFunctionInput,
  } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export default function TransactionDetails({ responseData, decodedTraceTree }: { responseData: any, decodedTraceTree: any }) {
  const shortenHex = (hex: string, start = 18, end = 15) => {
    if (!hex) return "";
    if (hex.length <= start + end) return hex;
    return `${hex.slice(0, start)}...${hex.slice(-end)}`;
  };

  // Check for errors in the root callTrace
  const checkForErrors = () => {
    const rootTrace = responseData.transaction?.callTrace?.[0];
    if (!rootTrace) return null;
    
    // Check if there's an error field in the root trace
    if (rootTrace.error) {
      return {
        hasError: true,
        message: rootTrace.error
      };
    }
    
    // Check if output indicates an error (empty output might indicate revert)
    // if (rootTrace.output === "0x" && rootTrace.gas_used === "0x0") {
    //   return {
    //     hasError: true,
    //     message: "Transaction reverted"
    //   };
    // }
    
    return {
      hasError: false,
      message: null
    };
  };

  const errorInfo = checkForErrors();
  const isSuccess = !errorInfo?.hasError;

  // Get gas price from transaction
  // console.log(responseData);
  const gasPrice = responseData.transaction?.gasPrice || "0x0";
  const gasPriceInWei = parseInt(gasPrice, 16);
  const gasPriceInEth = gasPriceInWei / 1e18;

  // Get nonce from block header
  const nonce = responseData.transaction?.blockHeader?.nonce || "0x0";

  return (
    <div
      className="border"
      style={{
        backgroundColor: "rgba(30, 30, 30, 0.6)",
        borderColor: "var(--border)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Transaction Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Network</span>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-white">HyperEVM Mainnet</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status</span>
              <div className="flex items-center space-x-2">
                {isSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Success</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">
                      {errorInfo?.message || "Error"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Block</span>
              <span className="text-sm text-white font-mono">
                {parseInt(responseData.transaction.blockHeader?.number) || "0"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Timestamp</span>
              <span className="text-sm text-white">
                {responseData.transaction.timestamp
                  ? `${Math.floor(
                      (Date.now() -
                        parseInt(responseData.transaction.timestamp, 16) *
                          1000) /
                        (1000 * 60 * 60 * 24)
                    )} days ago (${new Date(
                      parseInt(responseData.transaction.timestamp, 16) * 1000
                    ).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                    })} ${new Date(
                      parseInt(responseData.transaction.timestamp, 16) * 1000
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })})`
                  : "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">From</span>
              <div className="flex items-center space-x-2">
                <img
                  src="/shapes/shape1.png"
                  alt="From"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-sm text-white font-mono">
                  {responseData.transaction.from
                    ? `${responseData.transaction.from.slice(
                        0,
                        6
                      )}...${responseData.transaction.from.slice(-6)}`
                    : "Unknown"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">To</span>
              <div className="flex items-center space-x-2">
                <img
                  src="/shapes/shape2.png"
                  alt="To"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span className="text-sm text-white">
                  {getContractName(responseData.transaction.to, responseData)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Function</span>
              <span className="text-sm text-white font-mono">
                {decodedTraceTree?.functionName || decodedTraceTree?.functionSelector}()
              </span>
            </div>
          </div>

          {/* Right Column - Transaction Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Value</span>
              <span className="text-sm text-white">
                {formatValue(responseData.transaction.value)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Tx Fee</span>
              <span className="text-sm text-white">
                {responseData?.transaction?.callTrace?.[0]?.gasUsed
                  ? (() => {
                      const gasUsed = parseInt(responseData.transaction.callTrace[0].gasUsed, 16);
                      const gasPrice = parseInt(responseData.transaction.gasPrice || "0", 16);
                      const feeWei = gasUsed * gasPrice;
                      const feeEth = feeWei / 1e18; // assuming HYPE uses 18 decimals like ETH

                      return `${feeEth.toFixed(12)} HYPE`;
                    })()
                  : "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Gas Price</span>
              <span className="text-sm text-white">
                {gasPriceInWei > 0 
                  ? `${gasPriceInWei.toLocaleString()} Wei (${gasPriceInEth.toFixed(12)} HYPE)`
                  : "0 Wei (0 HYPE)"
                }
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Gas Used</span>
              <span className="text-sm text-white">
                {responseData?.transaction?.callTrace[0]?.gasUsed
                  ? `${formatGas(
                      responseData?.transaction?.callTrace[0]?.gasUsed
                    )} / ${formatGas(
                      responseData.transaction.gas
                    )} (${Math.round(
                      (parseInt(
                        responseData?.transaction?.callTrace[0]?.gasUsed,
                        16
                      ) /
                        parseInt(responseData.transaction.gas, 16)) *
                        100
                    )}%)`
                  : "Unknown"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Nonce</span>
              <span className="text-sm text-white font-mono">
                {parseInt(nonce, 16)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Raw Input</span>
              <span className="text-sm text-white font-mono break-all text-right max-w-xs">
                {shortenHex(responseData.transaction.input)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
