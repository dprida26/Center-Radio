'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, AlertTriangle,
  Package, Loader2, Printer, TrendingDown, Wallet, Truck, Clock, Inbox,
} from 'lucide-react'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { reportService, categoryService, installmentService } from '@/services/api'

const PAYMENT_LABELS = { CASH: 'Contado', INSTALLMENTS: 'Cuotas' }
const STATUS_LABELS = { PENDING: 'Pendiente', CONTACTED: 'Contactado', CONVERTED: 'Convertido', DISCARDED: 'Descartado' }
const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function formatGsCompact(value) {
  const n = parseFloat(value) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function formatPeriod(period) {
  const d = new Date(`${period}T00:00:00`)
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthsAgoISO(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

const QUICK_RANGES = [
  { label: '30 días', from: () => monthsAgoISO(1) },
  { label: '3 meses', from: () => monthsAgoISO(3) },
  { label: '6 meses', from: () => monthsAgoISO(6) },
  { label: '12 meses', from: () => monthsAgoISO(12) },
]

export default function ReportesPage() {
  const { info } = useCompanyInfo()
  const [filters, setFilters] = useState({
    date_from: monthsAgoISO(3),
    date_to: todayISO(),
    category_id: '',
    payment_type: '',
  })
  const [categories, setCategories] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('ventas')
  const [dueInstallments, setDueInstallments] = useState([])
  const [dueLoading, setDueLoading] = useState(true)

  useEffect(() => {
    categoryService.getAll().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setDueLoading(true)
    installmentService
      .getDueReport(7)
      .then(setDueInstallments)
      .catch(() => {})
      .finally(() => setDueLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = {
      date_from: filters.date_from,
      date_to: filters.date_to,
      ...(filters.category_id ? { category_id: filters.category_id } : {}),
      ...(filters.payment_type ? { payment_type: filters.payment_type } : {}),
    }
    reportService
      .get(params)
      .then(setData)
      .catch(() => setError('No se pudieron cargar los reportes.'))
      .finally(() => setLoading(false))
  }, [filters])

  const paymentPieData = useMemo(() => {
    if (!data) return []
    return data.by_payment_type.map((row) => ({
      name: PAYMENT_LABELS[row.payment_type] || row.payment_type,
      value: parseFloat(row.total),
    }))
  }, [data])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.sales_over_time.map((row) => ({
      period: formatPeriod(row.period),
      total: parseFloat(row.total),
      count: row.count,
    }))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
            <p className="text-gray-500 text-sm mt-1">Análisis de ventas, cobranza y comportamiento de clientes</p>
          </div>
        </div>
        {data && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} />
            Imprimir
          </button>
        )}
      </div>

      {data && (
        <div className="hidden print:flex items-center justify-between border-b border-gray-300 pb-4 mb-2">
          <div className="flex items-center gap-3">
            {info?.logo && <img src={info.logo} alt={info.name} className="w-12 h-12 object-contain" />}
            <div>
              <p className="font-bold text-gray-900">{info?.legal_name || info?.name}</p>
              <p className="text-xs text-gray-500">Reporte de Ventas y Cobranza</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Período: {filters.date_from} a {filters.date_to}</p>
            <p>Generado: {todayISO()}</p>
          </div>
        </div>
      )}

      <div className="print:hidden">
        <FiltersBar filters={filters} setFilters={setFilters} categories={categories} />
      </div>

      <div className="flex gap-1 border-b border-gray-200 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'cobranza' && dueInstallments.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                {dueInstallments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
        {tab === 'ventas' && (
        <>
          <SummaryCards data={data} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-3">
            <div className="lg:col-span-2 print:col-span-2 bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas en el tiempo</h2>
              {chartData.length === 0 ? (
                <EmptyState text="No hay ventas en el período seleccionado." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatGsCompact} tick={{ fontSize: 12 }} width={50} />
                    <Tooltip formatter={(value) => formatGs(value)} labelFormatter={(l) => `Período: ${l}`} />
                    <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Contado vs Cuotas</h2>
              {paymentPieData.length === 0 ? (
                <EmptyState text="Sin datos." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={paymentPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={75}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatGs(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard
              title="Productos más vendidos"
              icon={Package}
              rows={data.top_products}
              renderRow={(row) => (
                <>
                  <span className="text-gray-700">{row.name}</span>
                  <span className="text-gray-500 text-xs">{row.units} uds.</span>
                  <span className="font-semibold text-gray-900">{formatGs(row.total)}</span>
                </>
              )}
            />
            <RankingCard
              title="Categorías más vendidas"
              icon={BarChart3}
              rows={data.top_categories}
              renderRow={(row) => (
                <>
                  <span className="text-gray-700">{row.name}</span>
                  <span className="text-gray-500 text-xs">{row.units} uds.</span>
                  <span className="font-semibold text-gray-900">{formatGs(row.total)}</span>
                </>
              )}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" />
              Gastos por categoría
            </h2>
            {data.expenses_by_category.length === 0 ? (
              <EmptyState text="No hay gastos registrados en este período." />
            ) : (
              <ul className="space-y-2.5">
                {data.expenses_by_category.map((row) => (
                  <li key={row.category} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm">
                    <span className="text-gray-700">{row.category_display}</span>
                    <span className="text-gray-500 text-xs">{row.count} gasto(s)</span>
                    <span className="font-semibold text-gray-900">{formatGs(row.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
        )}

        {tab === 'cobranza' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard
              title="Mejores clientes (por monto comprado)"
              icon={Users}
              rows={data.top_customers}
              renderRow={(row) => (
                <>
                  <Link href={`/panel/clientes/${row.customer_id}`} className="text-blue-600 hover:underline">
                    {row.name}
                  </Link>
                  <span className="text-gray-500 text-xs">{row.purchases} compra(s)</span>
                  <span className="font-semibold text-gray-900">{formatGs(row.total)}</span>
                </>
              )}
            />

            <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                Cobranza de cuotas
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <CollectionBox label="Pagado" value={data.collections.paid} className="bg-green-50 text-green-700" />
                <CollectionBox label="Pendiente" value={data.collections.pending} className="bg-amber-50 text-amber-700" />
                <CollectionBox label="Atrasado" value={data.collections.overdue} className="bg-red-50 text-red-700" />
              </div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Clientes con mayor deuda</h3>
              {data.top_debtors.length === 0 ? (
                <EmptyState text="No hay deudas pendientes." />
              ) : (
                <ul className="space-y-2">
                  {data.top_debtors.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <Link href={`/panel/clientes/${c.id}`} className="text-blue-600 hover:underline truncate">
                        {c.full_name}
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.overdue_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            {c.overdue_count} atrasada(s)
                          </span>
                        )}
                        <span className="font-semibold text-gray-900">{formatGs(c.debt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DueInstallmentsReport installments={dueInstallments} loading={dueLoading} />
        </>
        )}

        {tab === 'proveedores' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Truck size={16} className="text-amber-500" />
              Cuentas por pagar a proveedores
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <CollectionBox label="Pagado" value={data.payables.paid} className="bg-green-50 text-green-700" />
              <CollectionBox label="Pendiente" value={data.payables.pending} className="bg-amber-50 text-amber-700" />
              <CollectionBox label="Atrasado" value={data.payables.overdue} className="bg-red-50 text-red-700" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Proveedores con mayor deuda</h3>
            {data.top_creditors.length === 0 ? (
              <EmptyState text="No hay deudas pendientes con proveedores." />
            ) : (
              <ul className="space-y-2">
                {data.top_creditors.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <Link href={`/panel/proveedores/${s.id}`} className="text-blue-600 hover:underline truncate">
                      {s.name}
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.overdue_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          {s.overdue_count} atrasada(s)
                        </span>
                      )}
                      <span className="font-semibold text-gray-900">{formatGs(s.debt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'pedidos' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Pedidos web (bandeja de entrada)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MiniStat label="Total pedidos" value={data.orders.total} />
              <MiniStat label="Convertidos en venta" value={data.orders.converted} />
              <MiniStat label="Tasa de conversión" value={`${data.orders.conversion_rate}%`} />
              <MiniStat
                label="Por estado"
                value={data.orders.by_status.map((s) => `${STATUS_LABELS[s.status] || s.status}: ${s.count}`).join(' · ') || '-'}
                small
              />
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}

const TABS = [
  { key: 'ventas', label: 'Ventas', icon: BarChart3 },
  { key: 'cobranza', label: 'Cobranza', icon: AlertTriangle },
  { key: 'proveedores', label: 'Proveedores', icon: Truck },
  { key: 'pedidos', label: 'Pedidos', icon: Inbox },
]

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${dateStr}T00:00:00`)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

function DueInstallmentsReport({ installments, loading }) {
  const overdue = installments.filter((i) => i.status === 'OVERDUE')
  const upcoming = installments.filter((i) => i.status !== 'OVERDUE')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <Clock size={16} className="text-amber-500" />
        Cuotas atrasadas y próximas a vencer (7 días)
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        {overdue.length} atrasada(s) · {upcoming.length} por vencer
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : installments.length === 0 ? (
        <EmptyState text="No hay cuotas atrasadas ni próximas a vencer." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium text-center">Cuota</th>
                <th className="pb-2 font-medium">Vencimiento</th>
                <th className="pb-2 font-medium text-right">Monto</th>
                <th className="pb-2 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const days = daysUntil(inst.due_date)
                const isOverdue = inst.status === 'OVERDUE'
                return (
                  <tr key={inst.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/panel/clientes/${inst.customer_id}`} className="text-blue-600 hover:underline font-medium">
                        {inst.customer_name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600">{inst.product_name}</td>
                    <td className="py-2 text-center text-gray-600">{inst.number}/{inst.installment_count}</td>
                    <td className="py-2 text-gray-600">{inst.due_date}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{formatGs(inst.amount)}</td>
                    <td className="py-2 text-center">
                      {isOverdue ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Atrasada ({Math.abs(days)}d)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          {days === 0 ? 'Vence hoy' : `Vence en ${days}d`}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FiltersBar({ filters, setFilters, categories }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
      <div className="flex gap-1">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setFilters((f) => ({ ...f, date_from: r.from(), date_to: todayISO() }))}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {r.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Desde</label>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hasta</label>
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</label>
        <select
          value={filters.category_id}
          onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de pago</label>
        <select
          value={filters.payment_type}
          onChange={(e) => setFilters((f) => ({ ...f, payment_type: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="CASH">Contado</option>
          <option value="INSTALLMENTS">Cuotas</option>
        </select>
      </div>
    </div>
  )
}

function SummaryCards({ data }) {
  const netProfit = parseFloat(data.summary.net_profit)
  const cards = [
    { label: 'Ingresos totales', value: formatGs(data.summary.total_revenue), icon: DollarSign, className: 'text-green-600 bg-green-50' },
    { label: 'Gastos', value: formatGs(data.summary.total_expenses), icon: TrendingDown, className: 'text-red-600 bg-red-50' },
    {
      label: 'Ganancia neta', value: formatGs(data.summary.net_profit), icon: Wallet,
      className: netProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50',
    },
    { label: 'Ventas', value: data.summary.total_sales, icon: ShoppingBag, className: 'text-blue-600 bg-blue-50' },
    { label: 'Ticket promedio', value: formatGs(data.summary.avg_ticket), icon: TrendingUp, className: 'text-purple-600 bg-purple-50' },
    { label: 'Unidades vendidas', value: data.summary.total_units, icon: Package, className: 'text-amber-600 bg-amber-50' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:break-inside-avoid">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 print:border-gray-300">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.className}`}>
            <c.icon size={18} />
          </div>
          <p className="text-xl font-bold text-gray-900">{c.value}</p>
          <p className="text-xs text-gray-500 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

function RankingCard({ title, icon: Icon, rows, renderRow }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 print:border-gray-300 print:break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Icon size={16} className="text-gray-400" />
        {title}
      </h2>
      {rows.length === 0 ? (
        <EmptyState text="Sin datos en este período." />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm">
              {renderRow(row)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CollectionBox({ label, value, className }) {
  return (
    <div className={`rounded-lg p-3 text-center ${className}`}>
      <p className="text-xs font-semibold uppercase opacity-75">{label}</p>
      <p className="font-bold text-sm mt-1">{formatGs(value)}</p>
    </div>
  )
}

function MiniStat({ label, value, small }) {
  return (
    <div>
      <p className={small ? 'text-xs text-gray-600' : 'text-xl font-bold text-gray-900'}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 italic py-8 text-center">{text}</p>
}
