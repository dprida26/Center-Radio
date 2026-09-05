'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, TrendingUp, Wallet, Inbox } from 'lucide-react'
import { installmentService, orderService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function formatMonth(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
}

export default function PanelDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    installmentService
      .getDashboard()
      .then(setData)
      .catch(() => setError('No se pudo cargar el dashboard.'))
      .finally(() => setLoading(false))

    orderService
      .getAll({ status: 'PENDING' })
      .then((orders) => setPendingOrders(orders.length))
      .catch(() => {})
  }, [])

  if (loading) return <p className="text-gray-500">Cargando dashboard...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return null

  const { totals, sales_by_month, top_debtors, upcoming_installments, overdue_installments } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Cobranzas</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general de ventas y cuotas</p>
      </div>

      {pendingOrders > 0 && (
        <Link
          href="/panel/pedidos"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Inbox size={20} className="text-amber-700" />
            <p className="text-amber-800 font-semibold">
              Tenés {pendingOrders} pedido{pendingOrders > 1 ? 's' : ''} nuevo{pendingOrders > 1 ? 's' : ''} sin revisar
            </p>
          </div>
          <span className="text-sm text-amber-700 font-medium">Ver bandeja →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          label="Pendiente de Cobro"
          value={formatGs(totals.total_pending)}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Atrasado"
          value={formatGs(totals.total_overdue)}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Cobrado"
          value={formatGs(totals.total_paid)}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Clientes con Mayor Deuda">
          {top_debtors.length === 0 ? (
            <EmptyState text="No hay clientes con deuda pendiente." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium text-right">Deuda</th>
                  <th className="pb-2 font-medium text-right">Atrasadas</th>
                </tr>
              </thead>
              <tbody>
                {top_debtors.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/panel/clientes/${c.id}`} className="text-blue-600 hover:underline">
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{formatGs(c.debt)}</td>
                    <td className={`py-2 text-right ${c.overdue_count > 0 ? 'text-red-600 font-semibold' : ''}`}>
                      {c.overdue_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Ventas por Mes">
          {sales_by_month.length === 0 ? (
            <EmptyState text="No hay ventas registradas." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Mes</th>
                  <th className="pb-2 font-medium text-right">Ventas</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales_by_month.map((row) => (
                  <tr key={row.month} className="border-b last:border-0">
                    <td className="py-2 capitalize">{formatMonth(row.month)}</td>
                    <td className="py-2 text-right">{row.count}</td>
                    <td className="py-2 text-right">{formatGs(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Cuotas Atrasadas" icon={AlertTriangle} iconColor="text-red-600">
          {overdue_installments.length === 0 ? (
            <EmptyState text="No hay cuotas atrasadas." />
          ) : (
            <InstallmentTable rows={overdue_installments} highlight="red" />
          )}
        </Section>

        <Section title="Próximos Vencimientos (7 días)" icon={Clock} iconColor="text-amber-600">
          {upcoming_installments.length === 0 ? (
            <EmptyState text="No hay vencimientos próximos." />
          ) : (
            <InstallmentTable rows={upcoming_installments} highlight="amber" />
          )}
        </Section>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={16} className={iconColor} />}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 italic py-4 text-center">{text}</p>
}

function InstallmentTable({ rows, highlight }) {
  const highlightClass = highlight === 'red' ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="pb-2 font-medium">Cliente</th>
          <th className="pb-2 font-medium">Producto</th>
          <th className="pb-2 font-medium text-right">Monto</th>
          <th className="pb-2 font-medium text-right">Vence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b last:border-0">
            <td className="py-2">
              <Link href={`/panel/clientes/${row.customer_id}`} className="text-blue-600 hover:underline">
                {row.customer_name}
              </Link>
            </td>
            <td className="py-2 text-gray-600">{row.product_name}</td>
            <td className="py-2 text-right">{formatGs(row.amount)}</td>
            <td className={`py-2 text-right ${highlightClass}`}>{row.due_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
