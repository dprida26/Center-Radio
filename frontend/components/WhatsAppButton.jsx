'use client'

import { useState, useEffect } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { companyService } from '@/services/api'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos de tu tienda'

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await companyService.getConfig()
        setConfig(data)
      } catch (error) {
        console.error('Error fetching company config:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  if (loading || !config) return null

  return (
    <>
      {/* Botón flotante principal */}
      <a
        href={`https://wa.me/${config.whatsapp_number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-125 z-40 flex items-center justify-center animate-pulse hover:animate-none"
        title="Contactar por WhatsApp"
      >
        <FaWhatsapp size={32} />
      </a>

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
        <a
          href={`tel:${config.phone}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-l-lg shadow-lg transition-all hover:scale-110 text-xs font-semibold whitespace-nowrap flex items-center gap-1"
          title="Llamar"
        >
          <span>📞</span> Llamar
        </a>
        <a
          href={`mailto:${config.email}`}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-l-lg shadow-lg transition-all hover:scale-110 text-xs font-semibold whitespace-nowrap flex items-center gap-1"
          title="Email"
        >
          <span>📧</span> Email
        </a>
      </div>
    </>
  )
}
