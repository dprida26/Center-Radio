'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { auditService } from '@/services/api'

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Creación' },
  { value: 'UPDATE', label: 'Edición' },
  { value: 'DELETE', label: 'Eliminación' },
  { value: 'CUSTOM', label: 'Acción' },
]

const MODEL_OPTIONS = [
  { value: 'Product', label: 'Productos' },
  { value: 'Category', label: 'Categorías' },
  { value: 'Customer', label: 'Clientes' },
  { value: 'Sale', label: 'Ventas' },
  { value: 'Installment', label: 'Cuotas' },
  { value: 'Order', label: 'Pedidos' },
  { value: 'Expense', label: 'Gastos' },
  { value: 'Promotion', label: 'Promociones' },
  { value: 'CompanyInfo', label: 'Info. Empresa' },
  { value: 'User', label: 'Usuarios (login)' },
]

const ACTION_STYLES = {
  CREATE: { icon: Plus, className: 'text-green-600 bg-green-50' },
  UPDATE: { icon: Pencil, className: 'text-blue-600 bg-blue-50' },
  DELETE: { icon: Trash2, className: 'text-red-600 bg-red-50' },
  CUSTOM: { icon: Zap, className: 'text-amber-600 bg-amber-50' },
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ user_id: '', action: '', model_name: '', date_from: '', date_to: '' })
  const [users, setUsers] = useState([])

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    auditService
      .getAll(params)
      .then((data) => {
        setLogs(data.results || data)
        setCount(data.count ?? (data.results || data).length)
      })
      .catch(() => setError('No se pudo cargar el historial de auditoría.'))
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    auditService.getUsers().then(setUsers).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(count / 20))

  const handleFilterChange = (field) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [field]: e.target.value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de operaciones realizadas en el sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Usuario</label>
          <select
            value={filters.user_id}
            onChange={handleFilterChange('user_id')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Acción</label>
          <select
            value={filters.action}
            onChange={handleFilterChange('action')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Módulo</label>
          <select
            value={filters.model_name}
            onChange={handleFilterChange('model_name')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Desde</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={handleFilterChange('date_from')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hasta</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={handleFilterChange('date_to')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-sm text-gray-500 ml-auto">{count} registro(s)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 italic text-sm py-12 text-center">No hay registros con estos filtros.</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Módulo</th>
                  <th className="px-4 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = ACTION_STYLES[log.action] || ACTION_STYLES.CUSTOM
                  const Icon = style.icon
                  return (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-PY')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{log.username || 'Sistema'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.className}`}>
                          <Icon size={11} />
                          {log.action_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.model_name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {log.description || log.object_repr}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {Object.entries(log.changes).map(([field, diff]) => (
                              <li key={field} className="text-xs text-gray-400">
                                <span className="font-medium">{field}</span>: {diff.before ?? '—'} → {diff.after ?? '—'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
