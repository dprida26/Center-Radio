'use client'

import { useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos de tu tienda'

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false)
  const { info, loading } = useCompanyInfo()

  if (loading || !info) return null

  return (
    <>
      {info.whatsapp && (
        <a
          href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-125 z-30 flex items-center justify-center animate-pulse hover:animate-none"
          title="Contactar por WhatsApp"
        >
          <FaWhatsapp size={26} className="sm:hidden" />
          <FaWhatsapp size={32} className="hidden sm:block" />
        </a>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="fixed bottom-24 right-8 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-40 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center gap-2">
            <span>💬 ¡Chatea con nosotros!</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Contacto alternativo - Barra lateral (visible en desktop) */}
      <div className="hidden lg:flex fixed right-0 top-1/2 transform -translate-y-1/2 flex-col gap-4 pr-4 z-30">
        {info.phone && (
          <a
            href={`tel:${info.phone}`}
            className="bg-primary hover:bg-primary-400 text-graphite-dark px-3 py-2 rounded-l-lg shadow-lg transition-all hover:scale-110 text-xs font-semibold whitespace-nowrap flex items-center gap-1"
            title="Llamar"
          >
            <span>📞</span> Llamar
          </a>
        )}
        {info.email && (
          <a
            href={`mailto:${info.email}`}
            className="bg-graphite hover:bg-graphite-light text-white px-3 py-2 rounded-l-lg shadow-lg transition-all hover:scale-110 text-xs font-semibold whitespace-nowrap flex items-center gap-1"
            title="Email"
          >
            <span>📧</span> Email
          </a>
        )}
      </div>
    </>
  )
}
