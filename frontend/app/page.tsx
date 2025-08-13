import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 group" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      
      <main className="relative overflow-hidden flex-1 flex items-center justify-center">
        {/* Grid background with hover effect */}
        <div className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-50" style={{
          backgroundImage: `linear-gradient(var(--grid-line-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-color) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.1 // Default subtle opacity
        }}></div>
        
        <div className="relative mx-auto max-w-7xl px-6 flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-8 items-center w-full">
            <div className="flex flex-col justify-center space-y-10">
              <div className="space-y-8">
                <h1 className="text-5xl font-bold leading-[1.1] lg:text-6xl xl:text-7xl">
                  Your HyperEVM Sandbox
                  <br />
                  <span className="bg-gradient-to-r from-[#17BEBB] to-[#75E6DA] bg-clip-text text-transparent">
                    Built for All
                  </span>
                </h1>
                
                <div className="space-y-4 text-lg pl-4 border-l-2" style={{ 
                  color: 'var(--text-secondary)', 
                  borderColor: 'var(--color-primary)' 
                }}>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                    <span>Accurate Gas & Trace Analysis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                    <span>Historical & Live State Forking</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                    <span>REST API & SDK Integration</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-start">
                <Button asChild className="border-0 px-8 py-6 text-lg font-semibold rounded-lg transition-colors" style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)'
                }}>
                  <Link href="/dashboard/simulator">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-center lg:justify-end relative w-full h-full min-h-[700px] overflow-hidden">
              <div className="relative w-[min(100%,_800px)] h-[min(100%,_800px)] flex items-center justify-center">
                {/* Continuous aura directly behind the character */}
                <div className="absolute inset-0 rounded-full blur-3xl animate-aura-pulse" style={{
                  background: `radial-gradient(circle, var(--color-primary)40, var(--color-secondary)20, transparent 70%)`,
                  width: '100%',
                  height: '100%',
                  transform: 'scale(1.1)', // Slightly larger than the cat
                  opacity: 0.7,
                }}></div>

                {/* Sherlock cat with float animation */}
                <img
                  src="/sherlock.png"
                  alt="Sherlock Detective Cat"
                  className="relative z-10 w-full h-full object-contain animate-float"
                />
                
                {/* Small, subtle radial "emitting" glow rings */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-radial-pulse" style={{
                  background: `radial-gradient(circle, var(--color-primary)20, transparent 70%)`,
                  animationDelay: '0s'
                }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full animate-radial-pulse" style={{
                  background: `radial-gradient(circle, var(--color-secondary)25, transparent 70%)`,
                  animationDelay: '0.5s'
                }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full animate-radial-pulse" style={{
                  background: `radial-gradient(circle, var(--color-accent)30, transparent 70%)`,
                  animationDelay: '1s'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
