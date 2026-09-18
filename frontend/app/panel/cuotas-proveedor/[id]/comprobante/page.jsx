'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { purchaseInstallmentService } from '@/services/api'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { shareReceiptAsImage } from '@/lib/shareReceipt'
import { FaWhatsapp } from 'react-icons/fa'
import TicketReceipt from '@/components/panel/TicketReceipt'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
  return (
    <Suspense fallback={<p className="text-gray-500 p-6">Cargando...</p>}>
      <ComprobanteCuotaProveedorInner />
    </Suspense>
  )
}

function ComprobanteCuotaProveedorInner() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('pago')
  const { info } = useCompanyInfo()
  const [installment, setInstallment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const receiptRef = useRef(null)

  useEffect(() => {
    purchaseInstallmentService
      .getById(id)
      .then(setInstallment)
      .catch(() => setError('No se pudo cargar la cuota.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    if (!receiptRef.current) return
    setSharing(true)
    try {
      const fileName = `comprobante-${slugify(installment.supplier_name)}-cuota-${installment.number}.png`
      await shareReceiptAsImage(receiptRef.current, fileName, installment.supplier_phone)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Error al compartir comprobante:', err)
        alert('No se pudo compartir el comprobante. Probá con "Imprimir" en su lugar.')
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando...</p>
  if (error || !installment) return <p className="text-red-600 p-6">{error || 'Cuota no encontrada.'}</p>

  if (paymentId) {
    const payment = installment.payments?.find((p) => String(p.id) === String(paymentId))
    if (!payment) {
      return (
        <div className="p-6 max-w-md">
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            No se encontró ese abono.
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
    const paidUpToThis = installment.payments
      .filter((p) => p.id <= payment.id)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    const balanceAfter = Math.max(parseFloat(installment.amount) - paidUpToThis, 0)

    return (
      <ComprobanteAbonoProveedor
        info={info}
        installment={installment}
        payment={payment}
        balanceAfter={balanceAfter}
        receiptRef={receiptRef}
        handleShare={handleShare}
        sharing={sharing}
      />
    )
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <FaWhatsapp size={16} />}
            {sharing ? 'Generando...' : 'Compartir por WhatsApp'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} />
            Imprimir comprobante
          </button>
        </div>
      </div>

      <div ref={receiptRef} className="bg-white border border-gray-200 rounded-xl p-8 print:hidden">
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

        {installment.payments?.length > 1 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Historial de Abonos</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium text-right">Monto Abonado</th>
                </tr>
              </thead>
              <tbody>
                {installment.payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-2 text-right">{formatGs(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

      <TicketReceipt
        info={info}
        title="Comprobante de Pago a Proveedor"
        receiptId={installment.id}
        partyLabel="Proveedor"
        partyName={installment.supplier_name}
        detailLabel="Compra"
        detailValue={installment.invoice_number ? `Factura ${installment.invoice_number}` : `Compra #${installment.purchase_invoice}`}
        detailExtra={`Fecha de compra: ${formatDate(installment.purchase_date)}`}
        installmentNumber={installment.number}
        installmentCount={installment.installment_count}
        dueDate={installment.due_date}
        paidDate={installment.paid_date}
        amount={installment.paid_amount ?? installment.amount}
        paymentsHistory={installment.payments}
        signatureLabel="Firma del Proveedor"
      />
    </div>
  )
}

function ComprobanteAbonoProveedor({ info, installment, payment, balanceAfter, receiptRef, handleShare, sharing }) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <FaWhatsapp size={16} />}
            {sharing ? 'Generando...' : 'Compartir por WhatsApp'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} />
            Imprimir recibo
          </button>
        </div>
      </div>

      <div ref={receiptRef} className="bg-white border border-gray-200 rounded-xl p-8 print:hidden">
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recibo de Abono a Proveedor</p>
            <p className="text-sm text-gray-500 mt-1">N° {String(payment.id).padStart(6, '0')}</p>
            <p className="text-sm text-gray-500">Fecha: {formatDate(payment.payment_date)}</p>
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
            <p className="text-gray-500">Cuota {installment.number} de {installment.installment_count}</p>
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Monto Abonado</p>
            <p className="text-2xl font-bold text-gray-900">{formatGs(payment.amount)}</p>
          </div>
        </div>
        <div className="flex justify-end mb-10">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Saldo Restante de la Cuota</p>
            <p className={`text-lg font-semibold ${balanceAfter > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatGs(balanceAfter)}
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
          Este comprobante certifica el abono indicado y no reemplaza la factura legal correspondiente.
        </p>
      </div>

      <TicketReceipt
        info={info}
        title="Recibo de Abono a Proveedor"
        receiptId={payment.id}
        partyLabel="Proveedor"
        partyName={installment.supplier_name}
        detailLabel="Compra"
        detailValue={installment.invoice_number ? `Factura ${installment.invoice_number}` : `Compra #${installment.purchase_invoice}`}
        installmentNumber={installment.number}
        installmentCount={installment.installment_count}
        dueDate={installment.due_date}
        paidDate={payment.payment_date}
        amount={payment.amount}
        amountLabel="MONTO ABONADO"
        balanceAfter={balanceAfter}
        signatureLabel="Firma del Proveedor"
      />
    </div>
  )
}
