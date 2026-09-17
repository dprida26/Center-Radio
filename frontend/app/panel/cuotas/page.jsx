'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Clock } from 'lucide-react'
import { installmentService } from '@/services/api'
import Pagination from '@/components/panel/Pagination'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'OVERDUE', label: 'Atrasadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PAID', label: 'Pagadas' },
]

const STATUS_LABELS = {
  PENDING: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  PAID: { label: 'Pagada', className: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Atrasada', className: 'bg-red-100 text-red-700' },
}

export default function CuotasPage() {
  const [installments, setInstallments] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('OVERDUE')

  const load = useCallback(() => {
    setLoading(true)
    installmentService
      .getPage({ page, ...(search ? { search } : {}), ...(status ? { status } : {}) })
      .then((data) => {
        setInstallments(data.results)
        setCount(data.count)
      })
      .finally(() => setLoading(false))
  }, [page, search, status])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(count / 20))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuotas</h1>
        <p className="text-gray-500 text-sm mt-1">{count} cuota(s)</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o CI/RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6 text-center">Cargando...</p>
        ) : installments.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center italic">No se encontraron cuotas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Cliente</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Producto</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Cuota</th>
                  <th className="px-5 py-3 font-medium whitespace-nowrap">Vencimiento</th>
                  <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Monto</th>
                  <th className="px-5 py-3 font-medium text-center whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst) => {
                  const statusInfo = STATUS_LABELS[inst.status] || STATUS_LABELS.PENDING
                  return (
                    <tr key={inst.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Link href={`/panel/clientes/${inst.customer_id}`} className="font-medium text-blue-600 hover:underline">
                          {inst.customer_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{inst.product_name}</td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{inst.number}/{inst.installment_count}</td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{inst.due_date}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatGs(inst.amount)}
                        {inst.status !== 'PAID' && parseFloat(inst.paid_so_far) > 0 && (
                          <div className="text-xs text-amber-600 font-normal">Saldo {formatGs(inst.remaining_amount)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                          {inst.status === 'OVERDUE' && <Clock size={11} />}
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
