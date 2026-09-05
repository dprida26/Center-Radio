'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'

export default function SiteChrome({ children }) {
  const pathname = usePathname()
  const isPanel = pathname?.startsWith('/panel')

  if (isPanel) {
    return children
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
