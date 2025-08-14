export default function GasProfileTab({ responseData }: { responseData: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Gas Profiler</h3>

      {/* Gas Profiler with Blurred Image and Overlay Text */}
      <div className="relative">
        {/* Blurred Gas Profiler Image */}
        <div
          className="blur-sm opacity-60 p-3 rounded-lg border"
          style={{
            backgroundColor: "rgba(30, 30, 30, 0.8)",
            borderColor: "var(--border)",
            minHeight: "150px",
          }}
        >
          {/* Simulated Gas Profiler Content (Blurred) */}
          <div className="space-y-2">
            {/* Total Gas Bar */}
            <div className="space-y-1">
              <div className="text-gray-400 text-sm font-medium">
                Total Gas - 213,547 Gas
              </div>
              <div className="w-full h-3 bg-gray-600 rounded"></div>
            </div>

            {/* Actual Gas Used Bar */}
            <div className="space-y-1">
              <div className="text-gray-400 text-sm font-medium">
                Actual Gas Used - 170,947 Gas
              </div>
              <div className="w-4/5 h-2 bg-gray-500 rounded"></div>
            </div>

            {/* Refunded Gas Bar */}
            <div className="space-y-1">
              <div className="text-gray-400 text-sm font-medium">
                Refunded Gas - 42,600 Gas
              </div>
              <div className="w-1/5 h-2 bg-gray-400 rounded ml-auto"></div>
            </div>

            {/* Nested Gas Breakdown */}
            <div className="ml-4 space-y-1">
              <div className="space-y-1">
                <div className="text-gray-400 text-sm font-medium">
                  Initial Gas - 21,194 Gas
                </div>
                <div className="w-1/10 h-2 bg-gray-400 rounded"></div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400 text-sm font-medium">
                  addFunds - 192,355 Gas
                </div>
                <div className="w-9/10 h-2 bg-gray-500 rounded"></div>

                <div className="ml-4 space-y-1">
                  <div className="text-gray-400 text-sm font-medium">
                    addFunds - 187,483 Gas
                  </div>
                  <div className="w-9/10 h-1 bg-gray-400 rounded"></div>

                  <div className="ml-4 space-y-1">
                    <div className="flex space-x-2">
                      <div className="space-y-1">
                        <div className="text-gray-400 text-xs font-medium">
                          deposit - 23,974 Gas
                        </div>
                        <div className="w-12 h-1 bg-gray-300 rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-400 text-xs font-medium">
                          approve - 24,420 Gas
                        </div>
                        <div className="w-12 h-1 bg-gray-300 rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-400 text-xs font-medium">
                          getEthUsdPrice - 15,234 Gas
                        </div>
                        <div className="w-16 h-1 bg-gray-300 rounded"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-400 text-xs font-medium">
                          exactInputSingle - 80,186 Gas
                        </div>
                        <div className="w-20 h-1 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay Text - Only Feature Dropping Soon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-black bg-opacity-70 p-4 rounded-2xl">
            <div className="text-blue-200 text-lg font-bold">
              Feature dropping soon
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Access List */}
      <div className="p-1 rounded-lg">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-white mb-2">
            Recommended Access List
          </h4>
          <p className="text-gray-400 text-sm mb-2">
            The suggested list of addresses and storage keys to pass for this
            transaction to minimize gas costs.
          </p>
        </div>

        {/* Access List Table */}
        <div
          className="space-y-3 border w-1/2 rounded-xl"
          style={{
            backgroundColor: "rgba(40, 40, 40, 0.6)",
            borderColor: "var(--border)",
          }}
        >
          {responseData.generated_access_list?.map(
            (accessItem: any, index: number) => (
              <div
                key={index}
                className="border-b border-gray-700 pb-1 last:border-b-0 pl-3  "
              >
                {/* Main Address Entry */}
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src="/shapes/shape7.png"
                    alt="Address"
                    className="w-6 h-6 rounded object-cover"
                  />
                  <span className="text-white font-mono text-sm">
                    {accessItem.address
                      ? `${accessItem.address.slice(
                          0,
                          10
                        )}...${accessItem.address.slice(-6)}`
                      : "Unknown Address"}
                  </span>
                </div>

                {/* Storage Keys */}
                {accessItem.storageKeys &&
                  accessItem.storageKeys.length > 0 && (
                    <div className="ml-9 space-y-1">
                      {accessItem.storageKeys.map(
                        (storageKey: string, keyIndex: number) => (
                          <div
                            key={keyIndex}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-4 h-4 text-gray-500">
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                                <path d="M16 21V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v17" />
                              </svg>
                            </div>
                            <span className="text-gray-300 font-mono text-sm break-all">
                              {storageKey || "Unknown Key"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
