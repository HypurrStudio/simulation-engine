"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const pathname = usePathname()

  const connectWallet = async () => {
    if (!isConnected) {
      setIsConnected(true)
      setWalletAddress("0x1234...5678")
    } else {
      setIsConnected(false)
      setWalletAddress("")
    }
  }

  // Hide the button if we're on any dashboard route
  const isOnDashboard = pathname?.startsWith('/dashboard')

  return (
    <nav className="flex h-20 w-full items-center justify-between border-b px-6" style={{
      borderColor: 'var(--border)',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <Link href="/" className="flex items-center space-x-3">
        <img src="/logo.png" alt="Hypurr Studio Logo" className="h-12 w-12" /> {/* Logo made bigger */}
        <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Hypurr Studio</span> {/* App name updated */}
      </Link>
      
      {!isOnDashboard && (
        <Link href="/dashboard/simulator">
          <Button 
            className="border-0 px-6 py-2 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)'
            }}
          >
            Go to Dashboard
          </Button>
        </Link>
      )}
    </nav>
  )
}
