'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { supplierService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    supplierService
      .getAll(search ? { search } : {})
      .then(setSuppliers)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">{suppliers.length} proveedor(es)</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, contacto, teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6 text-center">Cargando...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center italic">No se encontraron proveedores.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right">Deuda</th>
                <th className="px-5 py-3 font-medium text-right">Atraso</th>
                <th className="px-5 py-3 font-medium text-right">Productos</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/panel/proveedores/${s.id}`} className="font-medium text-blue-600 hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.contact_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.phone || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {parseFloat(s.total_owed) > 0 ? formatGs(s.total_owed) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.overdue_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        {s.overdue_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{s.product_count}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{s.total_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <CreateSupplierModal
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function CreateSupplierModal({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    ruc: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await supplierService.create(form)
      onCreated()
    } catch (err) {
      setError('No se pudo crear el proveedor. Verificá los datos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Nuevo proveedor</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre / Razón Social</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Persona de Contacto</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={handleChange('contact_name')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</label>
            <input
              type="text"
              value={form.phone}
              onChange={handleChange('phone')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={handleChange('address')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">RUC</label>
            <input
              type="text"
              value={form.ruc}
              onChange={handleChange('ruc')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={handleChange('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onClick={onCancel}
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
              {saving ? 'Guardando...' : 'Crear proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
