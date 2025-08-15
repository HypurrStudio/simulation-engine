"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  // change this if your Explorer route is different
  const explorerRoot = { href: "/dashboard/explorer", label: "Explorer" }

  const subItems = [
    { href: "/dashboard/transactions",  label: "Transactions", disabled: true },
    { href: "/dashboard/contracts",     label: "Contracts", disabled: false },
    { href: "/dashboard/simulator",     label: "Simulator", disabled: false },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <aside
      className="w-64 h-screen border-r"
      style={{ backgroundColor: "#121212", borderColor: "#2C2C2C" }}
    >
      <div className="p-6">
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-not-allowed opacity-50"
          style={{
            color: "#E0E0E0",
            backgroundColor: "transparent",
          }}
          title="Feature coming soon!"
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ color: "#17BEBB" }}
          >
            <Globe className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">{explorerRoot.label}</span>
        </div>

        {/* Subs (no icons) with vertical connector */}
        <div className="relative mt-1 ml-4">
          <div
            className="absolute left-0 top-0 bottom-0 w-px"
            style={{ backgroundColor: "#3A3A3A" }}
          />
          <nav className="space-y-1">
            {subItems.map((item) => (
              <div key={item.href}>
                {item.disabled ? (
                  <div
                    className="flex items-center pl-6 py-2 text-sm font-medium rounded-md transition-colors relative cursor-not-allowed opacity-50"
                    style={{
                      color: "#A0A0A0",
                      backgroundColor: "transparent",
                    }}
                    title="Feature coming soon"
                  >
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="flex items-center pl-6 py-2 text-sm font-medium rounded-md transition-colors relative"
                    style={{
                      color: isActive(item.href) ? "#FFFFFF" : "#A0A0A0",
                      backgroundColor: isActive(item.href) ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    {isActive(item.href) && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                        style={{ backgroundColor: "#17BEBB" }}
                      />
                    )}
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}
 