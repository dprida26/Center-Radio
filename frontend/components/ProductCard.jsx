'use client'

import Link from 'next/link'
import { ShoppingCart, Heart, TrendingDown } from 'lucide-react'
import { useState } from 'react'

export default function ProductCard({ product }) {
  const [liked, setLiked] = useState(false)

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const hasStock = product.stock_quantity > 0

  return (
    <div className="group h-full">
      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-full flex flex-col border border-gray-100">
        {/* Imagen */}
        <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {product.first_image ? (
            <img
              src={product.first_image}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-sm">Sin imagen</span>
            </div>
          )}

          {/* Badge de categoría */}
          <div className="absolute top-3 left-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {product.category_name}
            </span>
          </div>

          {/* Botón favorito */}
          <button
            onClick={() => setLiked(!liked)}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
              liked
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/90 text-gray-600 hover:bg-white'
            } shadow-lg`}
          >
            <Heart
              size={20}
              className={liked ? 'fill-current' : ''}
            />
          </button>

          {/* Estado de stock */}
          {!hasStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg">Agotado</span>
            </div>
          )}

          {product.is_on_sale && product.discount_percentage > 0 && (
            <div className="absolute top-14 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              -{product.discount_percentage}%
            </div>
          )}

          {hasStock && product.stock_quantity <= 5 && (
            <div className="absolute bottom-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              Stock bajo
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Nombre y marca */}
          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition">
            {product.name}
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            {product.brand} {product.model && `• ${product.model}`}
          </p>

          {/* Precio */}
          <div className="mb-4 flex-grow">
            <div className="flex items-baseline gap-2 mb-1">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-gray-600">Gs.</span>
                {product.is_on_sale && product.sale_price ? (
                  <>
                    <p className="text-sm line-through text-gray-400">
                      {formatPrice(product.price)}
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {formatPrice(product.sale_price)}
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-bold text-blue-600">
                    {formatPrice(product.price)}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Contado
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
              <TrendingDown size={16} />
              O desde 3 cuotas sin interés
            </div>
          </div>

          {/* Stock info */}
          {hasStock && (
            <p className="text-xs text-gray-500 mb-4">
              📦 {product.stock_quantity} en stock
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-2 mt-auto">
            <Link
              href={`/productos/${product.id}`}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl text-center hover:shadow-lg transition-all font-semibold text-sm"
            >
              Ver Detalles
            </Link>
            <button
              className={`flex-1 py-3 rounded-xl transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                hasStock
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
              }`}
              disabled={!hasStock}
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Añadir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
