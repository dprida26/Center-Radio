'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Plus, X, Loader2 } from 'lucide-react'
import { customerService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    customerService
      .getAll(search ? { search } : {})
      .then(setCustomers)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{customers.length} cliente(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            Nuevo Cliente
          </button>
          <Link
            href="/panel/ventas/nueva"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={16} />
            Nueva Venta
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, CI/RUC, teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6 text-center">Cargando...</p>
        ) : customers.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center italic">No se encontraron clientes.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium whitespace-nowrap">Nombre</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">CI/RUC</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Deuda</th>
                <th className="px-5 py-3 font-medium text-right whitespace-nowrap">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/panel/clientes/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{c.document_number}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {parseFloat(c.total_debt) > 0 ? formatGs(c.total_debt) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {c.overdue_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        {c.overdue_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {creating && (
        <CreateCustomerModal
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

function CreateCustomerModal({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    full_name: '',
    document_number: '',
    phone: '',
    email: '',
    address: '',
    maps_location_url: '',
    economic_activity: '',
    reference1_name: '',
    reference1_phone: '',
    reference1_relation: '',
    reference2_name: '',
    reference2_phone: '',
    reference2_relation: '',
  })
  const [idDocumentImage, setIdDocumentImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await customerService.create({ ...form, id_document_image: idDocumentImage })
      onCreated()
    } catch (err) {
      const detail = err?.response?.data
      setError(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(' ')
          : 'No se pudo crear el cliente. Verificá los datos.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Nuevo cliente</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre Completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={handleChange('full_name')}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CI/RUC</label>
            <input
              type="text"
              value={form.document_number}
              onChange={handleChange('document_number')}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dirección</label>
            <textarea
              value={form.address}
              onChange={handleChange('address')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ubicación (link de Google Maps)</label>
            <input
              type="url"
              value={form.maps_location_url}
              onChange={handleChange('maps_location_url')}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Actividad Económica</label>
            <input
              type="text"
              value={form.economic_activity}
              onChange={handleChange('economic_activity')}
              placeholder="Ej: Comerciante, empleado, albañil..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Foto de Cédula (opcional)</label>
            {idDocumentImage && (
              <div className="relative w-28 h-20 border border-gray-200 rounded-lg overflow-hidden group mb-2">
                <img src={URL.createObjectURL(idDocumentImage)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setIdDocumentImage(null)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Quitar imagen seleccionada"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdDocumentImage(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Referencia personal 1</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                placeholder="Nombre"
                value={form.reference1_name}
                onChange={handleChange('reference1_name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.reference1_phone}
                onChange={handleChange('reference1_phone')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Relación (ej: hermano, vecino)"
              value={form.reference1_relation}
              onChange={handleChange('reference1_relation')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Referencia personal 2</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                placeholder="Nombre"
                value={form.reference2_name}
                onChange={handleChange('reference2_name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.reference2_phone}
                onChange={handleChange('reference2_phone')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Relación (ej: hermano, vecino)"
              value={form.reference2_relation}
              onChange={handleChange('reference2_relation')}
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
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
