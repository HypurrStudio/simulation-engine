import {
    
    getContractName,
   
  } from "@/lib/utils";

export default function BalanceStateTab({
  responseData,
}: {
  responseData: any;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Balance Changes</h3>
      <div className="space-y-4">
        {Object.entries(responseData.transaction.balanceDiff || {}).map(
          ([address, balanceData]: [string, any]) => {
            const contractName = getContractName(address, responseData);
            const fromBalance = parseInt(balanceData.from, 16);
            const toBalance = parseInt(balanceData.to, 16);

            return (
              <div
                key={address}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: "rgba(30, 30, 30, 0.6)",
                  borderColor: "var(--border)",
                }}
              >
                {/* Contract Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src="/shapes/shape4.png"
                    alt="Contract"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <div>
                    <div className="text-white font-medium">
                      {contractName || "Unknown Contract"}
                    </div>
                    <div className="text-gray-400 text-sm font-mono">
                      {address}
                    </div>
                  </div>
                </div>

                {/* Balance Change */}
                <div className="flex items-center space-x-3">
                  <span className="text-red-400 font-mono">{fromBalance}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-400 font-mono">{toBalance}</span>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
