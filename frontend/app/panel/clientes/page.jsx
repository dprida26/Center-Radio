'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import { customerService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true)
      customerService
        .getAll(search ? { search } : {})
        .then(setCustomers)
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{customers.length} cliente(s)</p>
        </div>
        <Link
          href="/panel/ventas/nueva"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={16} />
          Nueva Venta
        </Link>
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">CI/RUC</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right">Deuda</th>
                <th className="px-5 py-3 font-medium text-right">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/panel/clientes/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.document_number}</td>
                  <td className="px-5 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {parseFloat(c.total_debt) > 0 ? formatGs(c.total_debt) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
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
    </div>
  )
}
