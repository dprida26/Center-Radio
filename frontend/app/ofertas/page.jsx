'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProductGrid from '@/components/ProductGrid'
import { ArrowLeft, Zap } from 'lucide-react'

export default function OfertasPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="flex items-center text-blue-600 hover:text-blue-700 mb-6 transition">
            <ArrowLeft size={20} className="mr-2" />
            Volver al inicio
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={40} className="text-red-600 fill-red-600" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Ofertas Especiales
              </h1>
            </div>
            <p className="text-gray-600 text-lg">Aprovecha nuestras mejores promociones en electrodomésticos</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-2 flex gap-2 max-w-2xl">
            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-4">
              <input
                type="text"
                placeholder="Buscar en ofertas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full py-3 text-gray-700"
              />
            </div>
            <button className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 rounded-lg hover:shadow-lg transition font-semibold">
              Buscar
            </button>
          </div>
        </div>

        {/* Grid de Productos en Oferta */}
        <ProductGrid searchQuery={searchQuery} filters={{ is_on_sale: true }} />
      </div>
    </div>
  )
}
