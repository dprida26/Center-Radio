'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { productService } from '@/services/api'
import { Heart, ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { InstallmentSelector } from '@/components/InstallmentSelector'
import { useCart } from '@/context/CartContext'
import ProductCard from '@/components/ProductCard'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liked, setLiked] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState([])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getById(params.id)
        setProduct(data)
      } catch (err) {
        setError('No se pudo cargar el producto')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  useEffect(() => {
    if (!product?.category) return
    productService
      .getAll({ category_id: product.category })
      .then((data) => {
        const items = Array.isArray(data) ? data : []
        setRelatedProducts(items.filter((p) => p.id !== product.id).slice(0, 4))
      })
      .catch(() => setRelatedProducts([]))
  }, [product?.category, product?.id])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handlePrevImage = () => {
    if (product?.images?.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))
    }
  }

  const handleNextImage = () => {
    if (product?.images?.length > 0) {
      setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))
    }
  }

  const handleAddToCart = () => {
    addItem(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleBuyNow = () => {
    router.push(`/checkout?buyNow=${product.id}&qty=1`)
  }

  const getCurrentImage = () => {
    if (!product?.images || product.images.length === 0) return product?.first_image
    return product.images[currentImageIndex]?.image_url || product.first_image
  }

  if (loading) {
    return (
      <div className="container py-12">
        <div className="bg-gray-200 animate-pulse h-96 rounded-lg"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error || 'Producto no encontrado'}</p>
          <Link href="/productos" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Volver a productos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Link href="/productos" className="flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver a productos
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-full bg-gray-100 rounded-lg h-96 flex items-center justify-center group">
            <button
              onClick={() => setLiked(!liked)}
              className={`absolute top-3 right-3 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
                liked ? 'bg-red-100' : 'bg-white/90 hover:bg-white'
              } shadow-lg`}
            >
              <Heart
                size={22}
                className={liked ? 'text-red-500 fill-red-500' : 'text-gray-600'}
              />
            </button>
            {getCurrentImage() ? (
              <>
                <img
                  src={getCurrentImage()}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-lg"
                />
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      aria-label="Imagen anterior"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-opacity"
                    >
                      <ChevronLeft size={24} className="text-gray-800" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      aria-label="Imagen siguiente"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-opacity"
                    >
                      <ChevronRight size={24} className="text-gray-800" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                      {currentImageIndex + 1} / {product.images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500">
                <p>Imagen no disponible</p>
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`Ver imagen ${idx + 1}`}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentImageIndex ? 'border-primary' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div>
          <div className="mb-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
              {product.category_name}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

          <div className="mb-6">
            <p className="text-gray-600 mb-1">Marca: <span className="font-semibold">{product.brand}</span></p>
            <p className="text-gray-600">Modelo: <span className="font-semibold">{product.model}</span></p>
          </div>

          <div className="border-t border-b py-4 mb-6">
            {product.discounted_price < product.price && (
              <p className="text-gray-400 line-through text-lg mb-1">
                Gs. {formatPrice(product.price)}
              </p>
            )}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-semibold text-gray-600">Gs.</span>
              <p className="text-4xl font-bold text-primary">
                {formatPrice(product.discounted_price ?? product.price)}
              </p>
            </div>
            {product.stock > 0 ? (
              <p className="text-green-600 font-semibold">
                ✓ {product.stock} disponibles en stock
              </p>
            ) : (
              <p className="text-red-600 font-semibold">✗ Producto agotado</p>
            )}
          </div>

          {product.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <p className="text-gray-700">{product.description}</p>
            </div>
          )}


          <div className="mb-6">
            <InstallmentSelector
              price={product.discounted_price ?? product.price}
              interestRate={product.installment_interest_rate || 0}
              installmentOptions={product.installment_options_list || [3, 6, 12]}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                product.stock <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-primary text-graphite-dark hover:bg-primary-400'
              }`}
            >
              {added ? <Check size={20} /> : <ShoppingCart size={20} />}
              {added ? 'Agregado' : 'Agregar al Carrito'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                product.stock <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              Comprar Ahora
            </button>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
