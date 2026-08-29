'use client'

import Link from 'next/link'
import { Search, ShoppingCart, Menu } from 'lucide-react'
import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'
import { useState } from 'react'
import { useCompanyConfig } from '@/hooks/useCompanyConfig'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { config, loading } = useCompanyConfig()

  const fallbackConfig = {
    company_name: 'Tienda Electrodomésticos',
    phone: '+54 9 1234-5678',
    email: 'info@tienda.com',
    whatsapp_number: '541234567890',
  }

  const displayConfig = config || fallbackConfig

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      {/* Top bar con redes sociales */}
      <div className="bg-gray-900 text-white py-3 text-sm">
        <div className="container flex justify-between items-center">
          <div className="hidden md:flex gap-6">
            <span className="flex items-center gap-2">
              <span className="text-lg">📞</span> {displayConfig.phone}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg">📧</span> {displayConfig.email}
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <a
              href={`https://wa.me/${displayConfig.whatsapp_number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-green-400 transition hover:scale-110"
              title="Contactar por WhatsApp"
            >
              <FaWhatsapp size={20} />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <div className="border-l border-gray-600 pl-4 flex gap-4">
              {displayConfig.facebook_url && (
                <a
                  href={displayConfig.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition hover:scale-110"
                  title="Facebook"
                >
                  <FaFacebook size={18} />
                </a>
              )}
              {displayConfig.instagram_url && (
                <a
                  href={displayConfig.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition hover:scale-110"
                  title="Instagram"
                >
                  <FaInstagram size={18} />
                </a>
              )}
              {displayConfig.twitter_url && (
                <a
                  href={displayConfig.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition hover:scale-110"
                  title="Twitter"
                >
                  <FaTwitter size={18} />
                </a>
              )}
              {displayConfig.youtube_url && (
                <a
                  href={displayConfig.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-500 transition hover:scale-110"
                  title="YouTube"
                >
                  <FaYoutube size={18} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          🏪 {displayConfig.company_name}
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          <Link href="/" className="hover:text-blue-600 transition">
            Inicio
          </Link>
          <Link href="/productos" className="hover:text-blue-600 transition">
            Productos
          </Link>
          <Link href="/categorias" className="hover:text-blue-600 transition">
            Categorías
          </Link>
          <Link href="/contacto" className="hover:text-blue-600 transition">
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={20} className="text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent ml-2 outline-none w-48"
            />
          </div>

          <button className="relative">
            <ShoppingCart size={24} className="text-gray-700" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              0
            </span>
          </button>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-gray-50 border-t py-4 px-4 flex flex-col gap-4">
          <Link href="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link href="/productos" onClick={() => setMenuOpen(false)}>Productos</Link>
          <Link href="/categorias" onClick={() => setMenuOpen(false)}>Categorías</Link>
          <Link href="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
        </nav>
      )}
    </header>
  )
}
