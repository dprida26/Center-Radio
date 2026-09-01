'use client'

import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function Footer() {
  const { info, loading } = useCompanyInfo()

  if (loading || !info) {
    return <footer className="bg-gray-900 text-gray-300 py-12">Cargando...</footer>
  }

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="text-white font-bold mb-4">{info.name}</h3>
          <p className="text-sm mb-4">
            {info.about_text || 'Tu tienda online confiable de electrodomésticos de calidad'}
          </p>
          <div className="flex gap-4 text-xl">
            {info.whatsapp && (
              <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition hover:scale-125" title="WhatsApp">
                <FaWhatsapp />
              </a>
            )}
            {info.facebook_url && (
              <a href={info.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition hover:scale-125" title="Facebook">
                <FaFacebook />
              </a>
            )}
            {info.instagram_url && (
              <a href={info.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition hover:scale-125" title="Instagram">
                <FaInstagram />
              </a>
            )}
            {info.twitter_url && (
              <a href={info.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition hover:scale-125" title="Twitter">
                <FaTwitter />
              </a>
            )}
            {info.youtube_url && (
              <a href={info.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition hover:scale-125" title="YouTube">
                <FaYoutube />
              </a>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Productos</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/categorias" className="hover:text-white">Refrigeradores</a></li>
            <li><a href="/categorias" className="hover:text-white">Lavadoras</a></li>
            <li><a href="/categorias" className="hover:text-white">Televisores</a></li>
            <li><a href="/categorias" className="hover:text-white">Microondas</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Compañía</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white">Sobre Nosotros</a></li>
            <li><a href="/contacto" className="hover:text-white">Contacto</a></li>
            <li><a href="#" className="hover:text-white">Términos y Condiciones</a></li>
            <li><a href="#" className="hover:text-white">Política de Privacidad</a></li>
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
      <div className="border-t border-gray-700 pt-8 text-center text-sm">
        <p>&copy; 2026 {info.name}. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
