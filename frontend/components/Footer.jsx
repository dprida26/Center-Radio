'use client'

import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function Footer() {
  const { info, loading } = useCompanyInfo()

  if (loading || !info) {
    return <footer className="bg-graphite text-gray-300 py-12">Cargando...</footer>
  }

  return (
    <footer className="bg-graphite text-gray-300">
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
        <div>
          <h3 className="text-white font-bold mb-4">{info.name}</h3>
          <p className="text-sm mb-4">
            {info.about_text || 'Tu tienda online confiable de electrodomésticos de calidad'}
          </p>
          <div className="flex gap-1 text-xl -ml-2">
            {info.whatsapp && (
              <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition hover:scale-125 p-2.5 flex items-center justify-center" title="WhatsApp">
                <FaWhatsapp />
              </a>
            )}
            {info.facebook_url && (
              <a href={info.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition hover:scale-125 p-2.5 flex items-center justify-center" title="Facebook">
                <FaFacebook />
              </a>
            )}
            {info.instagram_url && (
              <a href={info.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition hover:scale-125 p-2.5 flex items-center justify-center" title="Instagram">
                <FaInstagram />
              </a>
            )}
            {info.twitter_url && (
              <a href={info.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition hover:scale-125 p-2.5 flex items-center justify-center" title="Twitter">
                <FaTwitter />
              </a>
            )}
            {info.youtube_url && (
              <a href={info.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition hover:scale-125 p-2.5 flex items-center justify-center" title="YouTube">
                <FaYoutube />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Compañía</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/sobre-nosotros" className="hover:text-white">Sobre Nosotros</a></li>
            <li><a href="/contacto" className="hover:text-white">Contacto</a></li>
            <li><a href="/terminos-y-condiciones" className="hover:text-white">Términos y Condiciones</a></li>
            <li><a href="/politica-de-privacidad" className="hover:text-white">Política de Privacidad</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Contacto</h4>
          <ul className="space-y-2 text-sm">
            {info.phone && <li>📞 {info.phone}</li>}
            {info.email && <li>📧 {info.email}</li>}
            {info.address && <li>📍 {info.address}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 py-6 text-center text-xs sm:text-sm">
        <p>&copy; 2026 {info.legal_name || info.name}. Todos los derechos reservados.</p>
        {info.ruc && <p className="text-gray-500 mt-1">RUC: {info.ruc}</p>}
        <p className="text-gray-500 mt-2">Desarrollado por VazquezTech</p>
      </div>
    </footer>
  )
}
