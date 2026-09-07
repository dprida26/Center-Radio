'use client'

import { useEffect, useState, useMemo } from 'react'
import { productService } from '@/services/api'
import ProductCard from './ProductCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 12

export default function ProductGrid({ searchQuery = '', filters = {} }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAll(filters)
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(`Error al cargar productos: ${err.message}`)
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filters])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    const query = searchQuery.toLowerCase()
    return products.filter((product) =>
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.model.toLowerCase().includes(query) ||
      product.category_name.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, filters])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, currentPage])

  const goToPage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-2xl h-96" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-red-50 rounded-2xl border-2 border-red-200">
        <p className="text-red-600 text-lg font-bold mb-2">{error}</p>
        <p className="text-gray-600">Verifica que el backend Django está corriendo en http://localhost:8000</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 text-lg">No hay productos disponibles</p>
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 text-lg">No encontramos productos que coincidan con "<span className="font-semibold">{searchQuery}</span>"</p>
        <p className="text-gray-500 text-sm mt-2">Intenta con otro término de búsqueda</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-600 mb-6">
        Mostrando <span className="font-bold text-gray-900">{paginatedProducts.length}</span> de <span className="font-bold text-gray-900">{filteredProducts.length}</span> productos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                p === currentPage
                  ? 'bg-primary text-graphite-dark shadow-md'
                  : 'border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Página siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  )
}
