'use client'

import Link from 'next/link'
import { ShoppingCart, Heart, TrendingDown, Check, Zap } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InstallmentSelector } from './InstallmentSelector'
import { useCart } from '@/context/CartContext'

export default function ProductCard({ product }) {
  const [liked, setLiked] = useState(false)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()
  const router = useRouter()

  const handleAddToCart = () => {
    addItem(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleBuyNow = () => {
    router.push(`/checkout?buyNow=${product.id}&qty=1`)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const hasStock = product.stock > 0

  const getInterestPercent = () => {
    if (!product.promotions || product.promotions.length === 0) return 0
    return parseFloat(product.promotions[0].interest_percent) || 0
  }

  const getDiscountPercent = () => {
    if (!product.promotions || product.promotions.length === 0) return 0
    return parseFloat(product.promotions[0].discount_percent) || 0
  }

  const interestPercent = getInterestPercent()
  const discountPercent = getDiscountPercent()
  const originalPrice = product.price
  const finalPrice = product.discounted_price || product.price
  const hasDiscount = discountPercent > 0 && product.discounted_price < product.price

  return (
    <div className="group h-full">
      <div className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 h-full flex flex-col border border-gray-100" style={{ overflow: 'visible' }}>
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
            <span className="bg-graphite/85 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
              {product.category_name}
            </span>
          </div>

          {/* Botón favorito */}
          <button
            onClick={() => setLiked(!liked)}
            className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
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

          {hasDiscount && (
            <div className="absolute top-14 left-3 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingDown size={14} />
              -{discountPercent.toFixed(0)}%
            </div>
          )}

          {hasStock && product.stock <= 5 && (
            <div className="absolute bottom-3 right-3 bg-accent/90 text-white text-xs font-bold px-3 py-1 rounded-full">
              Stock bajo
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-5 flex flex-col flex-grow relative z-0">
          {/* Nombre y marca */}
          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1 group-hover:text-primary-700 transition">
            {product.name}
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            {product.brand} {product.model && `• ${product.model}`}
          </p>

          {/* Precio */}
          <div className="mb-4 flex-grow space-y-2">
            <div>
              {hasDiscount && (
                <div className="text-sm text-gray-500 line-through mb-1">
                  Gs. {formatPrice(originalPrice)}
                </div>
              )}
              <div className={`font-semibold mb-1 ${hasDiscount ? 'text-xl text-accent' : 'text-lg text-gray-900'}`}>
                Gs. {formatPrice(finalPrice)} contado
              </div>
              {hasDiscount && (
                <p className="text-xs text-emerald-600 font-medium">
                  Ahorras Gs. {formatPrice(originalPrice - finalPrice)}
                </p>
              )}
            </div>
            <div className="overflow-visible">
              <InstallmentSelector
                price={finalPrice}
                interestRate={product.installment_interest_rate || 0}
                installmentOptions={product.installment_options_list || [3, 6, 12]}
              />
            </div>
          </div>

          {/* Stock info */}
          {hasStock && (
            <p className="text-xs text-gray-500 mb-4">
              📦 {product.stock} en stock
            </p>
          )}

          {/* Botones */}
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex gap-2">
              <Link
                href={`/productos/${product.id}`}
                className="flex-1 bg-primary text-graphite-dark py-3 rounded-xl text-center hover:bg-primary-400 hover:shadow-lg transition-all font-semibold text-sm"
              >
                Ver Detalles
              </Link>
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 rounded-xl transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                  !hasStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    : added
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!hasStock}
              >
                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                <span className="hidden sm:inline">{added ? 'Añadido' : 'Añadir'}</span>
              </button>
            </div>
            <button
              onClick={handleBuyNow}
              disabled={!hasStock}
              className={`w-full py-2.5 rounded-xl transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                hasStock
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Zap size={16} className="fill-current" />
              Comprar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
