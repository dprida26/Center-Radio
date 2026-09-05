'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Phone, Mail, MapPin, FileText, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { orderService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  CONTACTED: 'Contactado',
  CONVERTED: 'Convertido',
  DISCARDED: 'Descartado',
}

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  CONVERTED: 'bg-emerald-100 text-emerald-700',
  DISCARDED: 'bg-gray-100 text-gray-500',
}

export default function PedidosPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadOrders = () => {
    setLoading(true)
    orderService
      .getAll(statusFilter ? { status: statusFilter } : {})
      .then(setOrders)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleSetStatus = async (order, status) => {
    setBusyId(order.id)
    setActionError(null)
    try {
      const updated = await orderService.setStatus(order.id, status)
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)))
    } catch (err) {
      setActionError('No se pudo actualizar el estado del pedido.')
    } finally {
      setBusyId(null)
    }
  }

  const handleConvert = async (order) => {
    setBusyId(order.id)
    setActionError(null)
    try {
      const result = await orderService.convertToSale(order.id)
      setOrders((prev) => prev.map((o) => (o.id === order.id ? result.order : o)))
    } catch (err) {
      setActionError(err.response?.data?.error || 'No se pudo convertir el pedido en venta.')
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {orders.length} pedido(s){statusFilter ? '' : ` — ${pendingCount} pendiente(s)`}
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'CONTACTED', 'CONVERTED', 'DISCARDED'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status ? STATUS_LABELS[status] : 'Todos'}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6 text-center">Cargando...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center italic">No hay pedidos.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => {
              const isExpanded = expandedId === order.id
              const isBusy = busyId === order.id

              return (
                <div key={order.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_STYLES[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          #{order.id} — {order.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{order.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="font-bold text-gray-900">{formatGs(order.total_amount)}</span>
                      {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone size={14} className="text-gray-400" />
                          <a href={`tel:${order.customer_phone}`} className="hover:underline">{order.customer_phone}</a>
                        </div>
                        {order.customer_email && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail size={14} className="text-gray-400" />
                            <a href={`mailto:${order.customer_email}`} className="hover:underline">{order.customer_email}</a>
                          </div>
                        )}
                        {order.customer_address && (
                          <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                            {order.customer_address}
                          </div>
                        )}
                        {order.customer_document && (
                          <div className="text-gray-700">CI/RUC: {order.customer_document}</div>
                        )}
                        <div className="text-gray-700">
                          Pago: {order.payment_type === 'INSTALLMENTS' ? `Cuotas (${order.installment_count})` : 'Contado'}
                        </div>
                      </div>

                      {order.notes && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 mb-4 bg-white border border-gray-100 rounded-lg p-3">
                          <FileText size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                          {order.notes}
                        </div>
                      )}

                      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between px-4 py-2.5 border-b last:border-b-0 border-gray-100 text-sm">
                            <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                            <span className="font-medium text-gray-900">{formatGs(item.subtotal)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-2.5 bg-gray-50 font-bold text-sm">
                          <span>Total</span>
                          <span>{formatGs(order.total_amount)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'PENDING' && (
                          <button
                            disabled={isBusy}
                            onClick={() => handleSetStatus(order, 'CONTACTED')}
                            className="text-sm px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                          >
                            Marcar como contactado
                          </button>
                        )}
                        {order.status !== 'CONVERTED' && order.status !== 'DISCARDED' && (
                          <>
                            <button
                              disabled={isBusy}
                              onClick={() => handleConvert(order)}
                              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                              Convertir en venta
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => handleSetStatus(order, 'DISCARDED')}
                              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Descartar
                            </button>
                          </>
                        )}
                        {order.status === 'CONVERTED' && order.linked_sale_customer_id && (
                          <Link
                            href={`/panel/clientes/${order.linked_sale_customer_id}`}
                            className="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Ver venta generada →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
