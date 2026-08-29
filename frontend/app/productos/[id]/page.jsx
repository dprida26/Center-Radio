'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { productService } from '@/services/api'
import { Heart, ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import InstallmentCalculator from '@/components/InstallmentCalculator'

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liked, setLiked] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={24} className="text-gray-800" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={24} className="text-gray-800" />
                    </button>
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
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === currentImageIndex ? 'border-blue-600' : 'border-gray-300'
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

          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-600 mb-1">Marca: <span className="font-semibold">{product.brand}</span></p>
              <p className="text-gray-600">Modelo: <span className="font-semibold">{product.model}</span></p>
            </div>
            <button
              onClick={() => setLiked(!liked)}
              className={`p-3 rounded-full ${
                liked ? 'bg-red-100' : 'bg-gray-100'
              } transition`}
            >
              <Heart
                size={24}
                className={liked ? 'text-red-500 fill-red-500' : 'text-gray-600'}
              />
            </button>
          </div>

          <div className="border-t border-b py-4 mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-semibold text-gray-600">Gs.</span>
              <p className="text-4xl font-bold text-blue-600">
                {formatPrice(product.price)}
              </p>
            </div>
            {product.stock_quantity > 0 ? (
              <p className="text-green-600 font-semibold">
                ✓ {product.stock_quantity} disponibles en stock
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


          <InstallmentCalculator
            price={product.price}
            productName={product.name}
            productInterestRate={product.installment_interest_rate}
            productInstallmentOptions={product.installment_options_list}
          />

          <div className="flex gap-4">
            <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <ShoppingCart size={20} />
              Agregar al Carrito
            </button>
            <button className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
              Comprar Ahora
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Envío gratis en compras mayores a Gs. 500.000
          </p>
        </div>
      </div>

      {/* Productos relacionados */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
        <p className="text-gray-600">Próximamente: más productos de la misma categoría</p>
      </div>
    </div>
  )
}
