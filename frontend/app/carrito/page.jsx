'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react'
import { useCart } from '@/context/CartContext'

function formatPrice(price) {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function CarritoPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, totalAmount } = useCart()

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingCart size={56} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-graphite mb-2">Tu carrito está vacío</h1>
        <p className="text-gray-600 mb-8">Agregá productos para verlos aquí</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 bg-primary text-graphite-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-400 transition"
        >
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Link href="/productos" className="flex items-center text-primary-700 hover:text-primary-800 mb-6 transition">
        <ArrowLeft size={20} className="mr-2" />
        Seguir comprando
      </Link>

      <h1 className="text-3xl font-bold text-graphite mb-8">Tu Carrito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <ShoppingCart size={24} className="text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-graphite">{item.name}</h3>
                  <p className="text-primary-700 font-bold">Gs. {formatPrice(item.unitPrice)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:flex-shrink-0">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-2 hover:bg-gray-100 rounded-l-lg transition"
                    aria-label="Restar cantidad"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-2 hover:bg-gray-100 rounded-r-lg transition"
                    aria-label="Sumar cantidad"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  aria-label="Eliminar producto"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-graphite mb-4">Resumen</h2>
            <div className="flex justify-between text-gray-600 mb-2">
              <span>Subtotal</span>
              <span>Gs. {formatPrice(totalAmount)}</span>
            </div>
            <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between font-bold text-lg text-graphite mb-6">
              <span>Total</span>
              <span>Gs. {formatPrice(totalAmount)}</span>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition"
            >
              Finalizar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
