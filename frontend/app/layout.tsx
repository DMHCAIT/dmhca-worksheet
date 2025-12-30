import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Work Tracker - Employee Management System',
  description: 'Complete work tracking and project management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}