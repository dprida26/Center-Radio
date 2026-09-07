'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, Inbox, PackageX, Truck, CheckCircle2 } from 'lucide-react'
import { reportService } from '@/services/api'

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

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return null

  const { pending_orders, customer_installments, supplier_installments, low_stock_products } = data
  const overdueCustomer = customer_installments.filter((i) => i.status === 'OVERDUE')
  const upcomingCustomer = customer_installments.filter((i) => i.status !== 'OVERDUE')
  const overdueSupplier = supplier_installments.filter((i) => i.status === 'OVERDUE')
  const upcomingSupplier = supplier_installments.filter((i) => i.status !== 'OVERDUE')

  const nothingUrgent =
    pending_orders === 0 &&
    customer_installments.length === 0 &&
    supplier_installments.length === 0 &&
    low_stock_products.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
        <p className="text-gray-500 text-sm mt-1">Lo que necesita tu atención hoy</p>
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
          iconColor="text-red-600"
          badge={customer_installments.length}
          emptyText="No hay cuotas atrasadas ni por vencer."
          seeMoreHref="/panel/reportes"
        >
          {overdueCustomer.length > 0 && (
            <InstallmentGroup label={`${overdueCustomer.length} atrasada(s)`} labelClass="text-red-600">
              {overdueCustomer.map((row) => (
                <CustomerInstallmentRow key={row.id} row={row} overdue />
              ))}
            </InstallmentGroup>
          )}
          {upcomingCustomer.length > 0 && (
            <InstallmentGroup label={`${upcomingCustomer.length} vence(n) en 2 días`} labelClass="text-amber-600">
              {upcomingCustomer.map((row) => (
                <CustomerInstallmentRow key={row.id} row={row} />
              ))}
            </InstallmentGroup>
          )}
        </Section>

        <Section
          title="Pagos a proveedores"
          icon={Truck}
          iconColor="text-amber-600"
          badge={supplier_installments.length}
          emptyText="No hay cuotas atrasadas ni por vencer."
          seeMoreHref="/panel/reportes"
        >
          {overdueSupplier.length > 0 && (
            <InstallmentGroup label={`${overdueSupplier.length} atrasada(s)`} labelClass="text-red-600">
              {overdueSupplier.map((row) => (
                <SupplierInstallmentRow key={row.id} row={row} overdue />
              ))}
            </InstallmentGroup>
          )}
          {upcomingSupplier.length > 0 && (
            <InstallmentGroup label={`${upcomingSupplier.length} vence(n) en 2 días`} labelClass="text-amber-600">
              {upcomingSupplier.map((row) => (
                <SupplierInstallmentRow key={row.id} row={row} />
              ))}
            </InstallmentGroup>
          )}
        </Section>

        <Section
          title="Stock bajo"
          icon={PackageX}
          iconColor="text-orange-600"
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

function Section({ title, icon: Icon, iconColor, badge, children, emptyText, seeMoreHref }) {
  const isEmpty = !children || (Array.isArray(children) && children.every((c) => !c))
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {badge > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{badge}</span>
          )}
        </div>
        {seeMoreHref && badge > 0 && (
          <Link href={seeMoreHref} className="text-xs text-blue-600 hover:underline font-medium">
            Ver todo
          </Link>
        )}
      </div>
      {badge === 0 ? <EmptyState text={emptyText} /> : children}
    </div>
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
