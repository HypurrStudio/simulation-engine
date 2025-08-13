"use client"

import { Github, Twitter, DiscIcon as Discord, MessageCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t py-12" style={{
      borderColor: 'var(--border)',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Hypurr Studio Logo" className="h-8 w-8" />
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Hypurr Studio</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href="#" 
              className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              aria-label="Twitter"
            >
              <Twitter className="h-6 w-6" />
            </a>
            <a 
              href="#" 
              className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              aria-label="GitHub"
            >
              <Github className="h-6 w-6" />
            </a>
            <a 
              href="#" 
              className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              aria-label="Discord"
            >
              <Discord className="h-6 w-6" />
            </a>
            <a 
              href="#" 
              className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              aria-label="Telegram"
            >
              <MessageCircle className="h-6 w-6" />
            </a>
          </div>
          
          <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p>&copy; 2024 Hypurr Studio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
