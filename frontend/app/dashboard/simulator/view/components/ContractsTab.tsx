import { EXPLORER_URL } from "@/utils/constants";
import { ExternalLink } from "lucide-react";

export default function ContractsTab({ responseData }: { responseData: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Contracts</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Contract
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Verification
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(responseData.contracts || {}).map(
              ([address, contract]: [string, any]) => (
                <tr
                  key={address}
                  className="border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src="/shapes/shape3.png"
                        alt="Contract"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <a
                          href={`${EXPLORER_URL}/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium flex items-center gap-1 hover:underline"
                        >
                          {contract.ContractName || "Unverified Contract"}
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                        <div className="text-gray-400 text-sm font-mono">
                          {address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-400 text-sm">Public</span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
