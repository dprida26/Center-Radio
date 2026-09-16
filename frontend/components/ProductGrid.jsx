'use client'

import { useEffect, useState } from 'react'
import { productService } from '@/services/api'
import ProductCard from './ProductCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 12

export default function ProductGrid({ searchQuery = '', filters = {} }) {
  const [products, setProducts] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, filtersKey])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params = { ...filters, page, page_size: PAGE_SIZE }
        if (searchQuery.trim()) params.search = searchQuery.trim()
        const data = await productService.getPage(params)
        setProducts(data.results || [])
        setCount(data.count || 0)
      } catch (err) {
        setError(`Error al cargar productos: ${err.message}`)
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, searchQuery, page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const goToPage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const visiblePages = (() => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })()

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

  if (count === 0) {
    return (
      <div className="text-center py-16">
        {searchQuery.trim() ? (
          <>
            <p className="text-gray-600 text-lg">No encontramos productos que coincidan con "<span className="font-semibold">{searchQuery}</span>"</p>
            <p className="text-gray-500 text-sm mt-2">Intenta con otro término de búsqueda</p>
          </>
        ) : (
          <p className="text-gray-600 text-lg">No hay productos disponibles</p>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-600 mb-6">
        Mostrando <span className="font-bold text-gray-900">{products.length}</span> de <span className="font-bold text-gray-900">{count}</span> productos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>

          {visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => goToPage(1)}
                className="w-9 h-9 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm transition"
              >
                1
              </button>
              {visiblePages[0] > 2 && <span className="text-gray-400 px-1">…</span>}
            </>
          )}

          {visiblePages.map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                p === page
                  ? 'bg-primary text-graphite-dark shadow-md'
                  : 'border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              {p}
            </button>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-gray-400 px-1">…</span>}
              <button
                onClick={() => goToPage(totalPages)}
                className="w-9 h-9 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm transition"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
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
