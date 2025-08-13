import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Hypurr Studio - Your HyperEVM Sandbox Built for All",
  description: "Accurate Gas & Trace Analysis, Historical & Live State Forking, REST API & SDK Integration",
  generator: 'v0.dev',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "Hypurr Studio - Your HyperEVM Sandbox Built for All",
    description: "Accurate Gas & Trace Analysis, Historical & Live State Forking, REST API & SDK Integration",
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Hypurr Studio Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Hypurr Studio - Your HyperEVM Sandbox Built for All",
    description: "Accurate Gas & Trace Analysis, Historical & Live State Forking, REST API & SDK Integration",
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
