"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"


export default function TransactionsPage() {
  const [txHash, setTxHash] = useState("")
  const router = useRouter()
  const pathname = usePathname()

  const handleSearch = () => {
    if (!txHash.trim()) return
    router.push(`${pathname}/${txHash.trim()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold mb-4">Transactions</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Enter transaction hash to see detailed view
      </p>

      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Enter transaction hash (0x...)"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch}
          className="border-0 px-6 py-2 rounded-lg font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)'
          }}
        >
          Search
        </Button>
      </div>
    </div>
  )
}
