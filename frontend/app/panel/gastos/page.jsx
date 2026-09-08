'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Receipt, Plus, Pencil, Trash2, X, Loader2, Paperclip, ChevronDown } from 'lucide-react'
import { expenseService } from '@/services/api'

const CATEGORY_OPTIONS = [
  { value: 'RENT', label: 'Alquiler' },
  { value: 'UTILITIES', label: 'Servicios (luz, agua, internet)' },
  { value: 'SALARIES', label: 'Sueldos' },
  { value: 'MERCHANDISE', label: 'Mercadería' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Otros' },
]

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function formatMonthLabel(key) {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = date.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    const params = categoryFilter ? { category: categoryFilter } : {}
    expenseService
      .getAll(params)
      .then(setExpenses)
      .catch(() => setError('No se pudieron cargar los gastos.'))
      .finally(() => setLoading(false))
  }, [categoryFilter])

  useEffect(() => {
    load()
  }, [load])

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  const groupedByMonth = useMemo(() => {
    const groups = {}
    for (const exp of expenses) {
      const key = monthKey(exp.expense_date)
      if (!groups[key]) groups[key] = []
      groups[key].push(exp)
    }
    return Object.entries(groups)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, items]) => ({
        key,
        label: formatMonthLabel(key),
        items: items.sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1)),
        total: items.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
      }))
  }, [expenses])

  const toggleMonth = (key) => setCollapsedMonths((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await expenseService.delete(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Receipt size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
            <p className="text-gray-500 text-sm mt-1">Registro de egresos operativos del negocio</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Gasto
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <p className="text-sm text-gray-600">
          Total mostrado: <span className="font-bold text-gray-900">{formatGs(total)}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : expenses.length === 0 ? (
        <p className="text-gray-400 italic text-sm py-12 text-center">No hay gastos registrados en este filtro.</p>
      ) : (
        <div className="space-y-4">
          {groupedByMonth.map((group) => {
            const isCollapsed = !!collapsedMonths[group.key]
            return (
              <div key={group.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleMonth(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="font-semibold text-gray-900 text-sm">{group.label}</span>
                    <span className="text-xs text-gray-400">({group.items.length} gasto{group.items.length !== 1 ? 's' : ''})</span>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{formatGs(group.total)}</span>
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-gray-500 border-t border-gray-100">
                        <th className="px-4 py-2.5 font-medium whitespace-nowrap">Fecha</th>
                        <th className="px-4 py-2.5 font-medium whitespace-nowrap">Categoría</th>
                        <th className="px-4 py-2.5 font-medium whitespace-nowrap">Descripción</th>
                        <th className="px-4 py-2.5 font-medium text-right whitespace-nowrap">Monto</th>
                        <th className="px-4 py-2.5 font-medium text-right whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((exp) => (
                        <tr key={exp.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{exp.expense_date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              {exp.category_display}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="flex items-center gap-1.5">
                              {exp.description || <span className="text-gray-300 italic">Sin descripción</span>}
                              {exp.receipt_url && (
                                <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" title="Ver comprobante">
                                  <Paperclip size={13} className="text-blue-500" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatGs(exp.amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                              <button
                                onClick={() => { setEditingExpense(exp); setModalOpen(true) }}
                                className="text-gray-400 hover:text-blue-600"
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(exp)}
                                className="text-gray-400 hover:text-red-600"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar gasto</h3>
            <p className="text-sm text-gray-600 mb-5">
              ¿Seguro que querés eliminar este gasto de {formatGs(deleteTarget.amount)}? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseModal({ expense, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: expense?.amount || '',
    category: expense?.category || 'OTHER',
    description: expense?.description || '',
    expense_date: expense?.expense_date || todayISO(),
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, ...(receiptFile ? { receipt: receiptFile } : {}) }
      if (expense) {
        await expenseService.update(expense.id, payload)
      } else {
        await expenseService.create(payload)
      }
      onSaved()
    } catch (err) {
      setError('No se pudo guardar el gasto. Verificá los datos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{expense ? 'Editar gasto' : 'Nuevo gasto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Monto (Gs.)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.amount ? Number(form.amount).toLocaleString('es-PY') : ''}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '')
                  setForm((f) => ({ ...f, amount: digitsOnly }))
                }}
                required
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={handleChange('expense_date')}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={handleChange('category')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Ej: Factura de luz de septiembre"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Comprobante (opcional)</label>
            {expense?.receipt_url && !receiptFile && (
              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mb-1.5">
                Ver comprobante actual
              </a>
            )}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
