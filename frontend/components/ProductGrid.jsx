'use client'

import { useEffect, useState, useMemo } from 'react'
import { productService } from '@/services/api'
import ProductCard from './ProductCard'

export default function ProductGrid({ searchQuery = '', filters = {} }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        Mostrando <span className="font-bold text-gray-900">{filteredProducts.length}</span> de <span className="font-bold text-gray-900">{products.length}</span> productos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}
