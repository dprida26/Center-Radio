'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProductGrid from '@/components/ProductGrid'
import { Search, ArrowLeft, X } from 'lucide-react'
import { categoryService } from '@/services/api'

function ProductosContent() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('category')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [categoryName, setCategoryName] = useState(null)

  useEffect(() => {
    if (!categoryId) {
      setCategoryName(null)
      return
    }
    categoryService.getById(categoryId).then((cat) => setCategoryName(cat.name)).catch(() => setCategoryName(null))
  }, [categoryId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="flex items-center text-primary-700 hover:text-primary-800 mb-6 transition">
            <ArrowLeft size={20} className="mr-2" />
            Volver al inicio
          </Link>

          <div className="mb-8">
            <h1 className="text-5xl font-bold text-graphite mb-2">
              {categoryName || 'Nuestros Productos'}
            </h1>
            <p className="text-gray-600 text-lg">
              {categoryName
                ? `Explorá nuestra selección de ${categoryName.toLowerCase()}`
                : 'Descubre nuestra amplia variedad de electrodomésticos'}
            </p>
            {categoryId && (
              <Link
                href="/productos"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary-700 hover:text-primary-800 font-medium"
              >
                <X size={14} />
                Quitar filtro de categoría
              </Link>
            )}
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
            <button className="bg-primary text-graphite-dark px-8 rounded-lg hover:bg-primary-400 hover:shadow-lg transition font-semibold">
              Buscar
            </button>
          </div>
        </div>

        {/* Grid de Productos */}
        <ProductGrid searchQuery={searchQuery} filters={categoryId ? { category_id: categoryId } : {}} />
      </div>
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-gray-500">Cargando...</div>}>
      <ProductosContent />
    </Suspense>
  )
}
