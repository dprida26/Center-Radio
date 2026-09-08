'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import PanelNav from '@/components/panel/PanelNav'

export default function PanelGuard({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/panel/login'
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      router.replace('/panel/login')
    }
  }, [loading, isAuthenticated, isLoginPage, router])

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

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
        <PanelNav open={navOpen} onClose={() => setNavOpen(false)} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden print:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
          <button
            onClick={() => setNavOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-1"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <p className="font-semibold text-gray-900">Panel de Gestión</p>
        </div>
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:max-w-none print:p-0">{children}</div>
        </main>
      </div>
    </div>
  )
}
