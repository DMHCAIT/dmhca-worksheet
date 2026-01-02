import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ReactQueryProvider } from '@/lib/providers/ReactQueryProvider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Reduce aggressive preloading
  fallback: ['system-ui', 'arial']
})

export const metadata = {
  title: 'DMHCA Work Tracker - Employee Management System',
  description: 'Complete work tracking and project management application',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={inter.className}>
        {/* Skip Link for Screen Readers */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <ReactQueryProvider>
          <AuthProvider>
            <div id="app-root" className="min-h-screen bg-gray-50">
              <main id="main-content" className="min-h-screen">
                {children}
              </main>
            </div>
            
            {/* Toast Notifications with ARIA Live Region */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            {/* Global ARIA Live Region for Announcements */}
            <div 
              id="aria-live-announcer"
              aria-live="polite" 
              aria-atomic="true" 
              className="sr-only"
            ></div>
            
            {/* Assertive Announcer for Critical Messages */}
            <div 
              id="aria-assertive-announcer"
              aria-live="assertive" 
              aria-atomic="true" 
              className="sr-only"
            ></div>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}