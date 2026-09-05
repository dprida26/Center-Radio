'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShoppingCart, Menu, Phone, Mail, Lock } from 'lucide-react'
import { FaWhatsapp, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'
import { useState } from 'react'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { useCart } from '@/context/CartContext'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { info, loading } = useCompanyInfo()
  const { totalItems } = useCart()
  const router = useRouter()

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    router.push(trimmed ? `/productos?search=${encodeURIComponent(trimmed)}` : '/productos')
  }

  const fallbackConfig = {
    name: 'Tienda Electrodomésticos',
    phone: '+54 9 1234-5678',
    email: 'info@tienda.com',
    whatsapp: '541234567890',
  }

  const displayConfig = info || fallbackConfig

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      {/* Top bar con redes sociales */}
      <div className="bg-graphite text-white py-3 text-sm border-b border-white/5">
        <div className="container flex justify-between items-center">
          <div className="hidden lg:flex gap-6">
            {displayConfig.phone && (
              <span className="flex items-center gap-2 text-slate-300">
                <Phone size={15} className="text-primary" /> {displayConfig.phone}
              </span>
            )}
            {displayConfig.email && (
              <span className="flex items-center gap-2 text-slate-300">
                <Mail size={15} className="text-primary" /> {displayConfig.email}
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center">
            {displayConfig.whatsapp && (
              <a
                href={`https://wa.me/${displayConfig.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:scale-110 py-2"
                style={{ color: '#25D366' }}
                title="Contactar por WhatsApp"
              >
                <FaWhatsapp size={20} />
                <span className="hidden sm:inline text-white">WhatsApp</span>
              </a>
            )}
            <div className="border-l border-white/10 pl-2 flex gap-1">
              {displayConfig.facebook_url && (
                <a
                  href={displayConfig.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:scale-110 p-2.5 flex items-center justify-center"
                  style={{ color: '#1877F2' }}
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
                  className="transition hover:scale-110 p-2.5 flex items-center justify-center"
                  style={{ color: '#E4405F' }}
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
                  className="transition hover:scale-110 p-2.5 flex items-center justify-center"
                  style={{ color: '#1DA1F2' }}
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
                  className="transition hover:scale-110 p-2.5 flex items-center justify-center"
                  style={{ color: '#FF0000' }}
                  title="YouTube"
                >
                  <FaYoutube size={18} />
                </a>
              )}
            </div>
            <Link
              href="/panel/login"
              className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition text-xs border-l border-white/10 pl-4"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Administración</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl font-bold text-graphite min-w-0">
          {displayConfig.logo ? (
            <img src={displayConfig.logo} alt={displayConfig.name} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="flex-shrink-0">🏪</span>
          )}
          <span className="leading-tight">{displayConfig.name}</span>
        </Link>

        <nav className="hidden lg:flex gap-6 items-center font-medium text-graphite-light">
          <Link href="/" className="hover:text-primary transition">
            Inicio
          </Link>
          <Link href="/productos" className="hover:text-primary transition">
            Productos
          </Link>
          <Link href="/categorias" className="hover:text-primary transition">
            Categorías
          </Link>
          <Link href="/contacto" className="hover:text-primary transition">
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <form
            onSubmit={handleSearch}
            className="hidden lg:flex items-center bg-gray-100 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 transition"
          >
            <button type="submit" aria-label="Buscar">
              <Search size={20} className="text-gray-500" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-transparent ml-2 outline-none w-48"
            />
          </form>

          <Link href="/carrito" className="relative p-2" aria-label="Ver carrito">
            <ShoppingCart size={24} className="text-graphite-light" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>

          <button
            className="lg:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden bg-gray-50 border-t py-4 px-4 flex flex-col gap-4">
          <form
            onSubmit={(e) => { handleSearch(e); setMenuOpen(false) }}
            className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200 mb-2"
          >
            <button type="submit" aria-label="Buscar">
              <Search size={20} className="text-gray-500" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-transparent ml-2 outline-none w-full"
            />
          </form>
          <Link href="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link href="/productos" onClick={() => setMenuOpen(false)}>Productos</Link>
          <Link href="/categorias" onClick={() => setMenuOpen(false)}>Categorías</Link>
          <Link href="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
        </nav>
      )}
    </header>
  )
}
