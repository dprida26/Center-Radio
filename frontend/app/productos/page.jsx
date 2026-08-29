'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProductGrid from '@/components/ProductGrid'
import { Search, ArrowLeft } from 'lucide-react'

export default function ProductosPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="container py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="flex items-center text-blue-600 hover:text-blue-700 mb-6 transition">
            <ArrowLeft size={20} className="mr-2" />
            Volver al inicio
          </Link>

          <div className="mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
              Nuestros Productos
            </h1>
            <p className="text-gray-600 text-lg">Descubre nuestra amplia variedad de electrodomésticos</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-2 flex gap-2 max-w-2xl">
            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-4">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, marca o modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent ml-3 outline-none w-full py-3 text-gray-700"
              />
            </div>
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 rounded-lg hover:shadow-lg transition font-semibold">
              Buscar
            </button>
          </div>
        </div>

        {/* Grid de Productos */}
        <ProductGrid searchQuery={searchQuery} />
      </div>
    </div>
  )
}
