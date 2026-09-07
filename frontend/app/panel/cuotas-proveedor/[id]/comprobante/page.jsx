'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { purchaseInstallmentService } from '@/services/api'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function ComprobanteCuotaProveedorPage() {
  const { id } = useParams()
  const { info } = useCompanyInfo()
  const [installment, setInstallment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    purchaseInstallmentService
      .getById(id)
      .then(setInstallment)
      .catch(() => setError('No se pudo cargar la cuota.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-500 p-6">Cargando...</p>
  if (error || !installment) return <p className="text-red-600 p-6">{error || 'Cuota no encontrada.'}</p>

  if (installment.status !== 'PAID') {
    return (
      <div className="p-6 max-w-md">
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          Esta cuota todavía no fue marcada como pagada, por lo que no se puede emitir el comprobante.
        </p>
        <Link
          href={installment.supplier_id ? `/panel/proveedores/${installment.supplier_id}` : '/panel/proveedores'}
          className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-fit"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={installment.supplier_id ? `/panel/proveedores/${installment.supplier_id}` : '/panel/proveedores'}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Printer size={16} />
          Imprimir comprobante
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 print:border-0 print:rounded-none print:p-0">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center gap-3">
            {info?.logo && (
              <img src={info.logo} alt={info.name} className="w-14 h-14 object-contain" />
            )}
            <div>
              <p className="font-bold text-gray-900 text-lg">{info?.legal_name || info?.name}</p>
              {info?.ruc && <p className="text-xs text-gray-500">RUC: {info.ruc}</p>}
              {info?.address && <p className="text-xs text-gray-500">{info.address}</p>}
              {info?.phone && <p className="text-xs text-gray-500">Tel: {info.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comprobante de Pago a Proveedor</p>
            <p className="text-sm text-gray-500 mt-1">N° {String(installment.id).padStart(6, '0')}</p>
            <p className="text-sm text-gray-500">Fecha: {formatDate(installment.paid_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Proveedor</p>
            <p className="font-semibold text-gray-900">{installment.supplier_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Compra</p>
            <p className="font-semibold text-gray-900">
              {installment.invoice_number ? `Factura ${installment.invoice_number}` : `Compra #${installment.purchase_invoice}`}
            </p>
            <p className="text-gray-500">Fecha de compra: {formatDate(installment.purchase_date)}</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Cuota</th>
                <th className="px-4 py-2 font-medium">Vencimiento</th>
                <th className="px-4 py-2 font-medium">Fecha de Pago</th>
                <th className="px-4 py-2 font-medium text-right">Monto Pagado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3">{installment.number} de {installment.installment_count}</td>
                <td className="px-4 py-3">{formatDate(installment.due_date)}</td>
                <td className="px-4 py-3">{formatDate(installment.paid_date)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatGs(installment.paid_amount ?? installment.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-10">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Pagado</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatGs(installment.paid_amount ?? installment.amount)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-sm pt-10">
          <div>
            <div className="border-t border-gray-400 pt-2">Firma del Proveedor</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">{info?.legal_name || info?.name}</div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Este comprobante certifica el pago de la cuota indicada y no reemplaza la factura legal correspondiente.
        </p>
      </div>
    </div>
  )
}
