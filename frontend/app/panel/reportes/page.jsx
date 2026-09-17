'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, ShoppingBag, Users, AlertTriangle,
  Package, Loader2, Printer, Truck, Clock, Inbox,
  FileSpreadsheet, Download, UserX, Boxes, CalendarClock,
} from 'lucide-react'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { reportService, installmentService, exportService } from '@/services/api'
import { printElementById } from '@/lib/printCard'

const STATUS_LABELS = { PENDING: 'Pendiente', CONTACTED: 'Contactado', CONVERTED: 'Convertido', DISCARDED: 'Descartado' }

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function ReportesPage() {
  const { info } = useCompanyInfo()
  const [filters, setFilters] = useState({
    date_from: monthStartISO(),
    date_to: todayISO(),
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('ventas')
  const [dueInstallments, setDueInstallments] = useState([])
  const [dueLoading, setDueLoading] = useState(true)

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
    reportService
      .get({ date_from: filters.date_from, date_to: filters.date_to })
      .then(setData)
      .catch(() => setError('No se pudieron cargar los reportes.'))
      .finally(() => setLoading(false))
  }, [filters])

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

      {tab === 'cobranza' && (
        <div className="print:hidden">
          <SimpleDateRangeBar filters={filters} setFilters={setFilters} />
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 print:hidden overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
        {tab === 'ventas' && <ReportesVentas />}

        {tab === 'cobranza' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard
              id="card-mejores-clientes"
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

            <PrintableCard id="card-cobranza-cuotas" className="p-6">
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
            </PrintableCard>
          </div>

          <DueInstallmentsReport installments={dueInstallments} loading={dueLoading} />
        </>
        )}

        {tab === 'proveedores' && <ProveedoresReport />}

        {tab === 'pedidos' && (
          <PrintableCard id="card-pedidos-web" className="p-6">
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
          </PrintableCard>
        )}

        {tab === 'operativos' && <ReportesOperativos />}
        </>
      )}
    </div>
  )
}

const VENTAS_REPORTS = [
  { key: 'listado', label: 'Listado de ventas', icon: ShoppingBag, color: 'blue' },
  { key: 'top_productos', label: 'Productos más vendidos', icon: Package, color: 'amber' },
  { key: 'resumen', label: 'Resumen', icon: TrendingUp, color: 'green' },
]

function useDateRange() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  return [dateFrom, setDateFrom, dateTo, setDateTo]
}

function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        autoComplete="off"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-gray-400 text-xs">a</span>
      <input
        type="date"
        autoComplete="off"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function ReportesVentas() {
  const [reportKey, setReportKey] = useState('listado')

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {VENTAS_REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReportKey(r.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              reportKey === r.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <r.icon size={16} />
            {r.label}
          </button>
        ))}
      </div>

      {reportKey === 'listado' && <ListadoVentasReport />}
      {reportKey === 'top_productos' && <TopProductosReport />}
      {reportKey === 'resumen' && <ResumenVentasReport />}
    </div>
  )
}

function ListadoVentasReport() {
  const [dateFrom, setDateFrom, dateTo, setDateTo] = useDateRange()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewVentas({ date_from: dateFrom, date_to: dateTo })
      .then((data) => setRows(data.results))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.ventas({ date_from: dateFrom, date_to: dateTo })
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={ShoppingBag}
      color="blue"
      title="Listado de ventas"
      description="Detalle de ventas del período: cliente, producto(s), tipo de pago y total."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
      filters={<DateRangeFilter dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay ventas en ese período." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Fecha</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Cliente</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Producto(s)</th>
                <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Tipo de pago</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sale_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.sale_date}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/panel/clientes/${r.customer_id ?? ''}`} className="font-medium text-gray-900">
                      {r.customer_name}
                    </Link>
                    <p className="text-xs text-gray-400">{r.document_number}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.product_name}</td>
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.payment_type === 'INSTALLMENTS' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {r.payment_type_label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

function TopProductosReport() {
  const [dateFrom, setDateFrom, dateTo, setDateTo] = useDateRange()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewTopProductos({ date_from: dateFrom, date_to: dateTo })
      .then((data) => setRows(data.results))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.topProductos({ date_from: dateFrom, date_to: dateTo })
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={Package}
      color="amber"
      title="Productos más vendidos"
      description="Ranking de productos por unidades y monto vendido en el período."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
      filters={<DateRangeFilter dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay ventas en ese período." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Producto</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Unidades</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                  <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">{r.units}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

function ResumenVentasReport() {
  const [dateFrom, setDateFrom, dateTo, setDateTo] = useDateRange()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewResumenVentas({ date_from: dateFrom, date_to: dateTo })
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.resumenVentas({ date_from: dateFrom, date_to: dateTo })
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  const cards = summary ? [
    { label: 'Ingresos totales', value: formatGs(summary.total_revenue), className: 'text-gray-700 bg-gray-100' },
    { label: 'Monto ya recibido', value: formatGs(summary.received_amount), className: 'text-green-600 bg-green-50' },
    { label: 'Créditos pendientes de cobro', value: formatGs(summary.pending_credit), className: 'text-red-600 bg-red-50' },
    { label: 'Cantidad de ventas', value: summary.total_sales, className: 'text-blue-600 bg-blue-50' },
    { label: 'Unidades vendidas', value: summary.total_units, className: 'text-amber-600 bg-amber-50' },
    { label: 'Promedio por venta', value: formatGs(summary.avg_ticket), className: 'text-purple-600 bg-purple-50' },
  ] : []

  return (
    <ReportPanel
      icon={TrendingUp}
      color="green"
      title="Resumen de ventas"
      description="Totales del período: ingresos, cantidad de ventas, unidades y ticket promedio."
      downloading={downloading}
      onExport={handleExport}
      filters={<DateRangeFilter dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-lg p-4 ${c.className}`}>
              <p className="text-xl font-bold">{c.value}</p>
              <p className="text-xs mt-1 opacity-75">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </ReportPanel>
  )
}

function ProveedoresReport() {
  const [dateFrom, setDateFrom, dateTo, setDateTo] = useDateRange()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewDeudaProveedores({ date_from: dateFrom, date_to: dateTo })
      .then((data) => setRows(data.results))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.deudaProveedores({ date_from: dateFrom, date_to: dateTo })
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={Truck}
      color="amber"
      title="Proveedores"
      description="Compras realizadas en el período, saldo pendiente y cuotas atrasadas de esas compras."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
      filters={<DateRangeFilter dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay compras a proveedores en ese período." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Proveedor</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Comprado en el período</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Saldo pendiente</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Cuotas atrasadas</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.supplier_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/panel/proveedores/${r.supplier_id}`} className="font-medium text-blue-600 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.phone || '—'}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.total_purchased)}</td>
                  <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">{formatGs(r.pending_amount)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {r.overdue_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        {r.overdue_count}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.last_purchase_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

const OPERATIVOS_REPORTS = [
  { key: 'mora', label: 'Clientes con mora', icon: UserX, color: 'red' },
  { key: 'stock', label: 'Stock y precios', icon: Boxes, color: 'blue' },
  { key: 'por_cobrar', label: 'Cuotas por cobrar', icon: CalendarClock, color: 'amber' },
]

function ReportesOperativos() {
  const [reportKey, setReportKey] = useState('mora')
  const active = OPERATIVOS_REPORTS.find((r) => r.key === reportKey)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {OPERATIVOS_REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReportKey(r.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              reportKey === r.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <r.icon size={16} />
            {r.label}
          </button>
        ))}
      </div>

      {reportKey === 'mora' && <MoraReport />}
      {reportKey === 'stock' && <StockReport />}
      {reportKey === 'por_cobrar' && <PorCobrarReport />}
    </div>
  )
}

function ReportPanel({ icon: Icon, color, title, description, filters, count, downloading, onExport, children }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            {count !== undefined && (
              <p className="text-xs text-gray-400 mt-1">{count} registro(s)</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {filters}
          <button
            onClick={onExport}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? 'Generando...' : 'Exportar a Excel'}
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

function MoraReport() {
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = { ...(dueFrom ? { due_from: dueFrom } : {}), ...(dueTo ? { due_to: dueTo } : {}) }
    exportService.previewMora(params).then(setRows).finally(() => setLoading(false))
  }, [dueFrom, dueTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      const params = { ...(dueFrom ? { due_from: dueFrom } : {}), ...(dueTo ? { due_to: dueTo } : {}) }
      await exportService.clientesConMora(params)
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={UserX}
      color="red"
      title="Clientes con mora"
      description="Clientes con cuotas atrasadas, ordenados de mayor a menor monto adeudado."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
      filters={<DateRangeFilter dateFrom={dueFrom} setDateFrom={setDueFrom} dateTo={dueTo} setDateTo={setDueTo} />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay clientes con cuotas atrasadas." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Cliente</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">CI/RUC</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Cuotas atrasadas</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Monto atrasado</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Días (más antigua)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/panel/clientes/${r.customer_id}`} className="font-medium text-blue-600 hover:underline">
                      {r.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.document_number}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.phone || '—'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      {r.overdue_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.overdue_amount)}</td>
                  <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">{r.days_overdue}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

function StockReport() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewStock().then(setRows).finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.stockProductos()
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={Boxes}
      color="blue"
      title="Stock y precios"
      description="Productos activos con stock, categoría, proveedor habitual y precios."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay productos activos." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Producto</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Categoría</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Proveedor</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Stock</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Costo</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Precio venta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.brand} {r.model}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.category_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.supplier_name || '—'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.stock <= r.min_stock ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">{formatGs(r.cost_price)}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

function PorCobrarReport() {
  const [dueFrom, setDueFrom] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [dueTo, setDueTo] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    exportService.previewPorCobrar({ due_from: dueFrom, due_to: dueTo })
      .then((data) => setRows(data.results))
      .finally(() => setLoading(false))
  }, [dueFrom, dueTo])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportService.cuotasPorCobrar({ due_from: dueFrom, due_to: dueTo })
    } catch {
      alert('No se pudo generar el reporte.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ReportPanel
      icon={CalendarClock}
      color="amber"
      title="Cuotas por cobrar"
      description="Cuotas pendientes y atrasadas que vencen en el rango elegido."
      count={rows.length}
      downloading={downloading}
      onExport={handleExport}
      filters={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueFrom}
            onChange={(e) => setDueFrom(e.target.value)}
            className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-xs">a</span>
          <input
            type="date"
            value={dueTo}
            onChange={(e) => setDueTo(e.target.value)}
            className="px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No hay cuotas por cobrar en ese período." />
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Cliente</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Producto</th>
                <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Cuota</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Vencimiento</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Monto</th>
                <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{r.customer_name}</p>
                    <p className="text-xs text-gray-400">{r.document_number}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.product_name}</td>
                  <td className="px-5 py-3 text-center text-gray-600 whitespace-nowrap">{r.installment_label}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.due_date}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatGs(r.amount)}</td>
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportPanel>
  )
}

const TABS = [
  { key: 'ventas', label: 'Ventas', icon: BarChart3 },
  { key: 'cobranza', label: 'Cobranza', icon: AlertTriangle },
  { key: 'proveedores', label: 'Proveedores', icon: Truck },
  { key: 'pedidos', label: 'Pedidos', icon: Inbox },
  { key: 'operativos', label: 'Reportes Operativos', icon: FileSpreadsheet },
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
    <PrintableCard id="card-cuotas-por-vencer" className="p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" />
          Cuotas atrasadas y próximas a vencer (7 días)
        </h2>
        <Link href="/panel/cuotas" className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
          Ver todas →
        </Link>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {overdue.length} atrasada(s) · {upcoming.length} por vencer · vista rápida, máximo 30
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
    </PrintableCard>
  )
}

function SimpleDateRangeBar({ filters, setFilters }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Desde</label>
        <input
          type="date"
          autoComplete="off"
          value={filters.date_from}
          onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <span className="text-gray-300 pb-2.5">→</span>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Hasta</label>
        <input
          type="date"
          autoComplete="off"
          value={filters.date_to}
          onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  )
}

function RankingCard({ id, title, icon: Icon, rows, renderRow }) {
  return (
    <PrintableCard id={id} className="p-6">
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
    </PrintableCard>
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
    <div className="min-w-0">
      <p className={`break-words ${small ? 'text-xs text-gray-600' : 'text-xl font-bold text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function PrintableCard({ id, className = '', children }) {
  return (
    <div id={id} className={`relative group bg-white rounded-xl border border-gray-200 print:border-gray-300 print:break-inside-avoid ${className}`}>
      <button
        onClick={() => printElementById(id)}
        title="Imprimir esta tarjeta"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-opacity print:hidden"
      >
        <Printer size={15} />
      </button>
      {children}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 italic py-8 text-center">{text}</p>
}
