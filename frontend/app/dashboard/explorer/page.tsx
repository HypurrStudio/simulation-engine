"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink, CheckCircle2, Bell, Play, Code, Zap } from "lucide-react"

type Tx = {
  functionName: string
  hash: string
  from: string
  to: string
  time: string
}

const dummyTx: Tx[] = [
  { functionName: "transfer", hash: "0xee2422...9a7ee2", from: "0x229d39...fc2af7", to: "0x338574...4ed10c", time: "just now" },
  { functionName: "stake", hash: "0xcc14d9...1314c2", from: "0x5bb9fa...e59d51", to: "0xcc5fbf...b4ce4e", time: "just now" },
  { functionName: "startBlock", hash: "0xcc5fbf...b4ce4e", from: "0x35323c...e33087", to: "0x000000...0a4b05", time: "just now" },
  { functionName: "transmit", hash: "0x338574...4ed10c", from: "0x5bb9fa...e59d51", to: "0x35323c...e33087", time: "just now" },
  { functionName: "approve", hash: "0x000000...0a4b05", from: "0x000000...0a4b05", to: "0x0d35da...e2b9c2", time: "just now" },
  { functionName: "mint", hash: "0x0d35da...e2b9c2", from: "0x35323c...e33087", to: "0x3b65b7...c04255", time: "just now" },
  { functionName: "burn", hash: "0x3b65b7...c04255", from: "0x2608a8...39ca60", to: "0x81a1fc...aad61d", time: "just now" },
  { functionName: "swap", hash: "0x81a1fc...aad61d", from: "0x092caf...f8c27b", to: "0x6e6a7e...060351", time: "just now" },
  { functionName: "startBlock", hash: "0x6e6a7e...060351", from: "0x000000...0a4b05", to: "0xe12c41...3f3f61", time: "just now" },
  { functionName: "transmit", hash: "0xe12c41...3f3f61", from: "0x0425b5...9f7832", to: "0x229d39...fc2af7", time: "just now" },
]

export default function ExplorerPage() {
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-4 border-b"
           style={{ borderColor: "#2C2C2C" }}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-sm" style={{ backgroundColor: "#17BEBB" }} />
          <h1 className="text-xl font-semibold text-white">Project Explorer</h1>
        </div>

        <div className="flex items-center gap-3">
          {[
            { icon: Bell, label: "Create alert" },
            { icon: Play, label: "Simulate" },
            { icon: Code, label: "Create Node RPC" },
            { icon: Zap,  label: "Create VNet RPC" },
          ].map(({ icon: Icon, label }) => (
            <Button
              key={label}
              variant="ghost"
              className="h-9 px-3 text-[13px] text-gray-200 border rounded-md hover:bg-[#1A1A1A]"
              style={{ borderColor: "#2C2C2C", backgroundColor: "transparent" }}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Share for Contracts (centered) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Contracts</h2>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>

          <div className="rounded-lg border flex items-center justify-center"
               style={{ borderColor: "#2C2C2C", backgroundColor: "#141414", minHeight: "400px" }}>
            <div className="text-center space-y-4 px-6">
              <p className="text-sm text-gray-400 max-w-xs">
                Add contracts to test and monitor behavior. Simulate scenarios to ensure accuracy and reliability.
              </p>
              <Button
                className="h-10 px-6 text-sm"
                style={{ backgroundColor: "#8B5CF6", color: "white" }}
              >
                Add Contract
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Latest transactions (three columns) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Latest transactions</h2>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>

          <div className="rounded-lg border"
               style={{ borderColor: "#2C2C2C", backgroundColor: "#141414" }}>
            <div className="max-h-[580px] overflow-y-auto">
              <ul className="divide-y" style={{ borderColor: "#2C2C2C" }}>
                {dummyTx.map((t, i) => (
                  <li key={i} className="px-4 py-3 grid grid-cols-3 gap-4 items-center">
                    {/* First Column: Function Name + Hash */}
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-white">{t.functionName}</div>
                      <div className="text-xs text-gray-400">{t.hash}</div>
                    </div>
                    
                    {/* Second Column: From + To Addresses */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">
                        <span className="text-gray-500">from: </span>
                        {t.from}
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="text-gray-500">to: </span>
                        {t.to}
                      </div>
                    </div>
                    
                    {/* Third Column: Time (centered) */}
                    <div className="flex justify-center">
                      <span className="text-xs text-gray-500">{t.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
