'use client'

import { useEffect, useState } from 'react'
import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'
import { companyService } from '@/services/api'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function Footer() {
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

  if (loading || !config) {
    return <footer className="bg-gray-900 text-gray-300 py-12">Cargando...</footer>
  }

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="text-white font-bold mb-4">{config.company_name}</h3>
          <p className="text-sm mb-4">
            Tu tienda online confiable de electrodomésticos de calidad
          </p>
          <div className="flex gap-4 text-xl">
            <a href={`https://wa.me/${config.whatsapp_number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition hover:scale-125" title="WhatsApp">
              <FaWhatsapp />
            </a>
            {config.facebook_url && (
              <a href={config.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition hover:scale-125" title="Facebook">
                <FaFacebook />
              </a>
            )}
            {config.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition hover:scale-125" title="Instagram">
                <FaInstagram />
              </a>
            )}
            {config.twitter_url && (
              <a href={config.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition hover:scale-125" title="Twitter">
                <FaTwitter />
              </a>
            )}
            {config.youtube_url && (
              <a href={config.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition hover:scale-125" title="YouTube">
                <FaYoutube />
              </a>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Productos</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">Refrigeradores</a></li>
            <li><a href="#" className="hover:text-white">Lavadoras</a></li>
            <li><a href="#" className="hover:text-white">Televisores</a></li>
            <li><a href="#" className="hover:text-white">Microondas</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Compañía</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">Sobre Nosotros</a></li>
            <li><a href="#" className="hover:text-white">Contacto</a></li>
            <li><a href="#" className="hover:text-white">Términos y Condiciones</a></li>
            <li><a href="#" className="hover:text-white">Política de Privacidad</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contacto</h4>
          <ul className="space-y-2 text-sm">
            <li>📞 {config.phone}</li>
            <li>📧 {config.email}</li>
            <li>📍 {config.city}, {config.country}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-700 pt-8 text-center text-sm">
        <p>&copy; 2026 {config.company_name}. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
