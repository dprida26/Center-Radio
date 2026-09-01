'use client'

import { useEffect, useState } from 'react'
import { promotionService, productService } from '@/services/api'
import ProductCard from '@/components/ProductCard'
import { Zap, Search } from 'lucide-react'

export default function OfertasPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [promotions, setPromotions] = useState([])
  const [productsOnPromo, setProductsOnPromo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activePromos, allProducts] = await Promise.all([
          promotionService.getActive(),
          productService.getAll()
        ])

        setPromotions(Array.isArray(activePromos) ? activePromos : [])

        const onPromo = Array.isArray(allProducts)
          ? allProducts.filter(p => p.promotions && p.promotions.length > 0)
          : []
        setProductsOnPromo(onPromo)
      } catch (err) {
        setError('Error al cargar las ofertas')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredProducts = productsOnPromo.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-2xl h-96" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-16">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <Zap size={40} className="fill-white" />
            <h1 className="text-5xl font-bold">¡Ofertas Especiales!</h1>
          </div>
          <p className="text-xl text-red-100">
            Aprovecha nuestras promociones exclusivas con descuentos y opciones de pago flexible
          </p>
        </div>
      </div>

      <div className="container py-12">
        {/* Promociones activas */}
        {promotions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8">Promociones Activas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {promotions.map((promo) => (
                <div key={promo.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg hover:shadow-xl transition">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{promo.name}</h3>
                      <p className="text-gray-600">{promo.description}</p>
                    </div>
                    <div className="bg-red-600 text-white rounded-full p-6 text-center ml-4 flex-shrink-0">
                      <div className="text-4xl font-bold leading-none">
                        {parseInt(promo.discount_percent)}%
                      </div>
                      <div className="text-sm font-semibold">DESCUENTO</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600 text-sm">Interés en cuotas</span>
                        <p className="font-bold text-green-600 text-lg">
                          {parseFloat(promo.interest_percent).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600 text-sm">Válido hasta</span>
                        <p className="font-bold text-gray-900">
                          {new Date(promo.end_date).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar productos en oferta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-600 outline-none text-lg"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
          </div>
        </div>

        {/* Productos en oferta */}
        <div>
          <h2 className="text-3xl font-bold mb-2">Productos en Oferta</h2>
          <p className="text-gray-600 mb-8">
            {filteredProducts.length} de {productsOnPromo.length} productos con descuento especial
          </p>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-gray-600 text-lg">
                {searchQuery ? `No encontramos productos que coincidan con "${searchQuery}"` : 'No hay productos en oferta en este momento'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
