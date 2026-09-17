'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Inbox, PackageX, Truck, CheckCircle2, Loader2, ShoppingCart, PackagePlus, Wallet } from 'lucide-react'
import { reportService } from '@/services/api'

const UPCOMING_DAYS = 2

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${dateStr}T00:00:00`)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

export default function PanelDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    reportService
      .getHomeDashboard()
      .then(setData)
      .catch(() => setError('No se pudo cargar el panel.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }
  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return null

  const {
    pending_orders, customer_installments, supplier_installments, low_stock_products,
    customer_installments_count = customer_installments.length,
    supplier_installments_count = supplier_installments.length,
  } = data
  const overdueCustomer = customer_installments.filter((i) => i.status === 'OVERDUE')
  const upcomingCustomer = customer_installments.filter((i) => i.status !== 'OVERDUE')
  const overdueSupplier = supplier_installments.filter((i) => i.status === 'OVERDUE')
  const upcomingSupplier = supplier_installments.filter((i) => i.status !== 'OVERDUE')

  const nothingUrgent =
    pending_orders === 0 &&
    customer_installments_count === 0 &&
    supplier_installments_count === 0 &&
    low_stock_products.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-gray-500 text-sm mt-1">Lo que necesita tu atención hoy</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <QuickActionCard href="/panel/ventas/nueva" icon={ShoppingCart} label="Nueva Venta" iconClass="text-blue-600 bg-blue-50" />
        <QuickActionCard href="/panel/compras/nueva" icon={PackagePlus} label="Nueva Compra" iconClass="text-gray-600 bg-gray-100" />
        <QuickActionCard href="/panel/clientes" icon={Wallet} label="Registrar un pago" iconClass="text-emerald-600 bg-emerald-50" />
      </div>

      {nothingUrgent && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-5">
          <CheckCircle2 size={24} className="text-green-600" />
          <p className="text-green-800 font-semibold">Todo al día. No hay pendientes urgentes.</p>
        </div>
      )}

      {pending_orders > 0 && (
        <Link
          href="/panel/pedidos"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Inbox size={20} className="text-amber-700" />
            <p className="text-amber-800 font-semibold">
              Tenés {pending_orders} pedido{pending_orders > 1 ? 's' : ''} nuevo{pending_orders > 1 ? 's' : ''} sin revisar
            </p>
          </div>
          <span className="text-sm text-amber-700 font-medium">Ver bandeja →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Cobranza a clientes"
          icon={AlertTriangle}
          urgency={overdueCustomer.length > 0 ? 'high' : customer_installments_count > 0 ? 'medium' : 'none'}
          badge={customer_installments_count}
          emptyText="No hay cuotas atrasadas ni por vencer."
          seeMoreHref="/panel/reportes?tab=cobranza"
        >
          {overdueCustomer.length > 0 && (
            <InstallmentGroup label={`${overdueCustomer.length} atrasada(s)`} labelClass="text-red-600">
              {overdueCustomer.map((row) => (
                <CustomerInstallmentRow key={row.id} row={row} overdue />
              ))}
            </InstallmentGroup>
          )}
          {upcomingCustomer.length > 0 && (
            <InstallmentGroup label={`${upcomingCustomer.length} vence(n) en ${UPCOMING_DAYS}d`} labelClass="text-amber-600">
              {upcomingCustomer.map((row) => (
                <CustomerInstallmentRow key={row.id} row={row} />
              ))}
            </InstallmentGroup>
          )}
          {customer_installments_count > customer_installments.length && (
            <p className="text-xs text-gray-400 text-center pt-2">
              Mostrando las {customer_installments.length} más urgentes de {customer_installments_count} en total.
            </p>
          )}
        </Section>

        <Section
          title="Pagos a proveedores"
          icon={Truck}
          urgency={overdueSupplier.length > 0 ? 'high' : supplier_installments_count > 0 ? 'medium' : 'none'}
          badge={supplier_installments_count}
          emptyText="No hay cuotas atrasadas ni por vencer."
          seeMoreHref="/panel/reportes?tab=proveedores"
        >
          {overdueSupplier.length > 0 && (
            <InstallmentGroup label={`${overdueSupplier.length} atrasada(s)`} labelClass="text-red-600">
              {overdueSupplier.map((row) => (
                <SupplierInstallmentRow key={row.id} row={row} overdue />
              ))}
            </InstallmentGroup>
          )}
          {upcomingSupplier.length > 0 && (
            <InstallmentGroup label={`${upcomingSupplier.length} vence(n) en ${UPCOMING_DAYS}d`} labelClass="text-amber-600">
              {upcomingSupplier.map((row) => (
                <SupplierInstallmentRow key={row.id} row={row} />
              ))}
            </InstallmentGroup>
          )}
          {supplier_installments_count > supplier_installments.length && (
            <p className="text-xs text-gray-400 text-center pt-2">
              Mostrando las {supplier_installments.length} más urgentes de {supplier_installments_count} en total.
            </p>
          )}
        </Section>

        <Section
          title="Stock bajo"
          icon={PackageX}
          urgency={low_stock_products.some((p) => p.stock === 0) ? 'high' : low_stock_products.length > 0 ? 'medium' : 'none'}
          badge={low_stock_products.length}
          emptyText="No hay productos con stock bajo."
        >
          {low_stock_products.length > 0 && (
            <ul className="space-y-2">
              {low_stock_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <Link href="/panel/productos" className="text-blue-600 hover:underline">
                    {p.name}
                  </Link>
                  <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {p.stock === 0 ? 'Sin stock' : `${p.stock} unidad(es)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}

const URGENCY_STYLES = {
  high: { border: 'border-red-200', iconBg: 'bg-red-50 text-red-600' },
  medium: { border: 'border-amber-200', iconBg: 'bg-amber-50 text-amber-600' },
  none: { border: 'border-gray-200', iconBg: 'bg-gray-100 text-gray-500' },
}

function Section({ title, icon: Icon, urgency = 'none', badge, children, emptyText, seeMoreHref }) {
  const style = URGENCY_STYLES[urgency]
  return (
    <div className={`bg-white rounded-xl border p-5 ${style.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon size={18} />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">{title}</h2>
            {badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{badge}</span>
            )}
          </div>
        </div>
        {seeMoreHref && badge > 0 && (
          <Link href={seeMoreHref} className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
            Ver todo
          </Link>
        )}
      </div>
      {badge === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="max-h-80 overflow-y-auto pr-1">{children}</div>
      )}
    </div>
  )
}

function QuickActionCard({ href, icon: Icon, label, iconClass }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={20} />
      </div>
      <span className="font-semibold text-gray-900 text-sm">{label}</span>
    </Link>
  )
}

function InstallmentGroup({ label, labelClass, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className={`text-xs font-semibold uppercase mb-2 ${labelClass}`}>{label}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function CustomerInstallmentRow({ row, overdue }) {
  const days = daysUntil(row.due_date)
  return (
    <li className="flex items-center justify-between text-sm">
      <div className="min-w-0">
        <Link href={`/panel/clientes/${row.customer_id}`} className="text-blue-600 hover:underline font-medium truncate">
          {row.customer_name}
        </Link>
        <p className="text-xs text-gray-500 truncate">{row.product_name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-gray-900">{formatGs(row.amount)}</p>
        <p className={`text-xs ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
          {overdue ? `Atrasada ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `Vence en ${days}d`}
        </p>
      </div>
    </li>
  )
}

function SupplierInstallmentRow({ row, overdue }) {
  const days = daysUntil(row.due_date)
  return (
    <li className="flex items-center justify-between text-sm">
      <div className="min-w-0">
        <Link href={`/panel/proveedores/${row.supplier_id}`} className="text-blue-600 hover:underline font-medium truncate">
          {row.supplier_name}
        </Link>
        <p className="text-xs text-gray-500 truncate">Cuota {row.number}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-gray-900">{formatGs(row.amount)}</p>
        <p className={`text-xs ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
          {overdue ? `Atrasada ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `Vence en ${days}d`}
        </p>
      </div>
    </li>
  )
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 italic py-4 text-center">{text}</p>
}

