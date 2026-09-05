'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import PanelNav from '@/components/panel/PanelNav'

export default function PanelGuard({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/panel/login'
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      router.replace('/panel/login')
    }
  }, [loading, isAuthenticated, isLoginPage, router])

  if (isLoginPage) {
    return children
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="print:hidden">
        <PanelNav />
      </div>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  )
}
