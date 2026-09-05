'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { productService, orderService } from '@/services/api'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

function formatPrice(price) {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const cart = useCart()
  const { info } = useCompanyInfo()

  const buyNowId = searchParams.get('buyNow')
  const buyNowQty = parseInt(searchParams.get('qty') || '1', 10)

  const [buyNowProduct, setBuyNowProduct] = useState(null)
  const [loadingProduct, setLoadingProduct] = useState(!!buyNowId)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [orderCreated, setOrderCreated] = useState(null)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_document: '',
    customer_address: '',
    payment_type: 'CASH',
    installment_count: 3,
    notes: '',
  })

  useEffect(() => {
    if (!buyNowId) return
    productService.getById(buyNowId)
      .then(setBuyNowProduct)
      .catch(() => setSubmitError('No se pudo cargar el producto para comprar ahora.'))
      .finally(() => setLoadingProduct(false))
  }, [buyNowId])

  const items = useMemo(() => {
    if (buyNowId) {
      if (!buyNowProduct) return []
      return [{
        productId: buyNowProduct.id,
        name: buyNowProduct.name,
        image: buyNowProduct.first_image || null,
        unitPrice: parseFloat(buyNowProduct.discounted_price ?? buyNowProduct.price),
        quantity: buyNowQty,
      }]
    }
    return cart.items
  }, [buyNowId, buyNowProduct, buyNowQty, cart.items])

  const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const buildWhatsAppMessage = (order) => {
    const lines = [
      `Nuevo pedido #${order.id}`,
      `Cliente: ${form.customer_name}`,
      `Teléfono: ${form.customer_phone}`,
      form.customer_address ? `Dirección: ${form.customer_address}` : null,
      '',
      'Productos:',
      ...items.map((item) => `- ${item.quantity}x ${item.name} (Gs. ${formatPrice(item.unitPrice * item.quantity)})`),
      '',
      `Total: Gs. ${formatPrice(totalAmount)}`,
      `Forma de pago: ${form.payment_type === 'INSTALLMENTS' ? `Cuotas (${form.installment_count})` : 'Contado'}`,
      form.notes ? `Notas: ${form.notes}` : null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        ...form,
        installment_count: form.payment_type === 'INSTALLMENTS' ? parseInt(form.installment_count, 10) : 1,
        items: items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      }

      const order = await orderService.create(payload)

      if (!buyNowId) cart.clearCart()

      const whatsappNumber = info?.whatsapp
      if (whatsappNumber) {
        const message = buildWhatsAppMessage(order)
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
      }

      setOrderCreated(order)
    } catch (err) {
      console.error('Error creating order:', err)
      setSubmitError('No se pudo enviar el pedido. Intentá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (orderCreated) {
    return (
      <div className="container py-16 text-center max-w-lg mx-auto">
        <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-graphite mb-2">¡Pedido recibido!</h1>
        <p className="text-gray-600 mb-8">
          Tu pedido #{orderCreated.id} fue registrado. Si no se abrió WhatsApp automáticamente,
          contactanos para coordinar la entrega y forma de pago.
        </p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 bg-primary text-graphite-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-400 transition"
        >
          Seguir comprando
        </Link>
      </div>
    )
  }

  if (loadingProduct) {
    return <div className="container py-16 text-center text-gray-500">Cargando...</div>
  }

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold text-graphite mb-2">No hay productos para comprar</h1>
        <Link href="/productos" className="text-primary-700 font-semibold hover:underline">
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Link href={buyNowId ? `/productos/${buyNowId}` : '/carrito'} className="flex items-center text-primary-700 hover:text-primary-800 mb-6 transition">
        <ArrowLeft size={20} className="mr-2" />
        Volver
      </Link>

      <h1 className="text-3xl font-bold text-graphite mb-8">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-5">
          <h2 className="text-xl font-bold text-graphite">Tus datos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nombre completo *</label>
              <input
                type="text"
                name="customer_name"
                required
                value={form.customer_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Teléfono *</label>
              <input
                type="tel"
                name="customer_phone"
                required
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="09xx xxx xxx"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                name="customer_email"
                value={form.customer_email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">CI/RUC</label>
              <input
                type="text"
                name="customer_document"
                value={form.customer_document}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Dirección de entrega</label>
            <textarea
              name="customer_address"
              value={form.customer_address}
              onChange={handleChange}
              rows="2"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Forma de pago</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment_type"
                  value="CASH"
                  checked={form.payment_type === 'CASH'}
                  onChange={handleChange}
                  className="accent-primary"
                />
                Contado
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment_type"
                  value="INSTALLMENTS"
                  checked={form.payment_type === 'INSTALLMENTS'}
                  onChange={handleChange}
                  className="accent-primary"
                />
                Cuotas
              </label>
            </div>
          </div>

          {form.payment_type === 'INSTALLMENTS' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Cantidad de cuotas</label>
              <select
                name="installment_count"
                value={form.installment_count}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
              >
                {[3, 6, 12].map((n) => (
                  <option key={n} value={n}>{n} cuotas</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Notas (opcional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Alguna aclaración sobre tu pedido..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
            />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Confirmar Pedido'}
          </button>
        </form>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-graphite mb-4">Tu pedido</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}x {item.name}</span>
                  <span className="font-semibold text-graphite">Gs. {formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg text-graphite">
              <span>Total</span>
              <span>Gs. {formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-gray-500">Cargando...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
