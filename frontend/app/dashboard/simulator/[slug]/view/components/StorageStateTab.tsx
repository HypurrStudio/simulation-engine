import {
    getContractName,
  } from "@/lib/utils";
  import { useState } from "react"
  import { ChevronDown, ChevronRight } from "lucide-react"
  
export default function ContractsTab({ responseData, toggleStorageSection, expandedStorageSections }: { 
    responseData: any, 
    toggleStorageSection: (address: string) => void,
    expandedStorageSections: Set<string>
  })  {

    return (
        <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Storage State Changes
        </h3>
        <div className="space-y-4">
          {Object.entries(
            responseData.transaction.storageDiff || {}
          ).map(([address, storageChanges]: [string, any]) => {
            const contractName = getContractName(address, responseData);
            const changeCount = Object.keys(storageChanges).length;

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
                    src="/shapes/shape5.png"
                    alt="Contract"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <div>
                    <div className="text-white font-medium">
                      Address
                    </div>
                    <div className="text-gray-400 text-sm font-mono">
                      {address}
                    </div>
                  </div>
                </div>

                {/* Raw State Changes Section */}
                <div className="space-y-3">
                  <div
                    className="text-gray-300 cursor-pointer flex items-center space-x-2"
                    onClick={() => toggleStorageSection(address)}
                  >
                    {expandedStorageSections.has(address) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>
                      {expandedStorageSections.has(address)
                        ? "Hide"
                        : "Show"}{" "}
                      raw state changes ({changeCount})
                    </span>
                  </div>

                  {/* Storage Changes - Hidden by default */}
                  <div
                    className={`space-y-3 ${
                      expandedStorageSections.has(address)
                        ? "block"
                        : "hidden"
                    }`}
                  >
                    {Object.entries(storageChanges).map(
                      ([key, changeData]: [string, any]) => (
                        <div key={key} className="space-y-2">
                          <div className="text-gray-400 text-sm">
                            <span className="font-medium">Key:</span>{" "}
                            {key}
                          </div>
                          <div className="text-gray-400 text-sm pl-4">
                            <span className="font-medium">Before:</span>{" "}
                            {changeData.from}
                          </div>
                          <div className="text-gray-400 text-sm pl-4">
                            <span className="font-medium">After:</span>{" "}
                            {changeData.to}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  )
}