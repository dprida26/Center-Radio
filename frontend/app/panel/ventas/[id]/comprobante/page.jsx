'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { saleService } from '@/services/api'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { shareReceiptAsImage } from '@/lib/shareReceipt'
import { FaWhatsapp } from 'react-icons/fa'
import TicketReceiptItems from '@/components/panel/TicketReceiptItems'
import TicketReceipt from '@/components/panel/TicketReceipt'
import { BusinessNameHeader } from '@/components/panel/BusinessNameHeader'

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

export default function ComprobanteVentaPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 p-6">Cargando...</p>}>
      <ComprobanteVentaInner />
    </Suspense>
  )
}

function ComprobanteVentaInner() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const isEntregaInicial = searchParams.get('entrega') === '1'
  const { info } = useCompanyInfo()
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const receiptRef = useRef(null)

  useEffect(() => {
    saleService
      .getById(id)
      .then(setSale)
      .catch(() => setError('No se pudo cargar la venta.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    if (!receiptRef.current) return
    setSharing(true)
    try {
      const fileName = `comprobante-venta-${slugify(sale.customer_name)}-${sale.id}.png`
      await shareReceiptAsImage(receiptRef.current, fileName, sale.customer_phone)
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
  if (error || !sale) return <p className="text-red-600 p-6">{error || 'Venta no encontrada.'}</p>

  if (isEntregaInicial) {
    if (!(parseFloat(sale.down_payment) > 0)) {
      return (
        <div className="p-6 max-w-md">
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            Esta venta no tiene entrega inicial registrada.
          </p>
          <Link
            href={sale.customer ? `/panel/clientes/${sale.customer}` : '/panel/clientes'}
            className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-fit"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>
        </div>
      )
    }
    return (
      <ComprobanteEntregaInicial
        info={info}
        sale={sale}
        receiptRef={receiptRef}
        handleShare={handleShare}
        sharing={sharing}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={sale.customer ? `/panel/clientes/${sale.customer}` : '/panel/clientes'}
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
              <BusinessNameHeader info={info} />
              {info?.ruc && <p className="text-xs text-gray-500">RUC: {info.ruc}</p>}
              {info?.address && <p className="text-xs text-gray-500">{info.address}</p>}
              {info?.phone && <p className="text-xs text-gray-500">Tel: {info.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comprobante de Venta</p>
            <p className="text-sm text-gray-500 mt-1">N° {String(sale.id).padStart(6, '0')}</p>
            <p className="text-sm text-gray-500">Fecha: {formatDate(sale.sale_date)}</p>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cliente</p>
          <p className="font-semibold text-gray-900">{sale.customer_name}</p>
          <p className="text-gray-500">CI/RUC: {sale.customer_document}</p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 font-medium text-right">Cant.</th>
                <th className="px-4 py-2 font-medium text-right">Precio Unit.</th>
                <th className="px-4 py-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatGs(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatGs(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-10">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatGs(sale.total_amount)}</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Este comprobante certifica la venta indicada y no reemplaza la factura legal correspondiente.
        </p>
      </div>

      <TicketReceiptItems
        info={info}
        title="Comprobante de Venta"
        receiptId={sale.id}
        partyLabel="Cliente"
        partyName={sale.customer_name}
        partyExtra={`CI/RUC: ${sale.customer_document}`}
        date={sale.sale_date}
        items={sale.items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        }))}
        total={sale.total_amount}
      />
    </div>
  )
}

function ComprobanteEntregaInicial({ info, sale, receiptRef, handleShare, sharing }) {
  const itemsLabel = sale.items.length <= 1
    ? (sale.items[0]?.product_name || '')
    : `${sale.items.length} productos`
  const financedAmount = Math.max(parseFloat(sale.total_amount) - parseFloat(sale.down_payment), 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={sale.customer ? `/panel/clientes/${sale.customer}` : '/panel/clientes'}
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
              <BusinessNameHeader info={info} />
              {info?.ruc && <p className="text-xs text-gray-500">RUC: {info.ruc}</p>}
              {info?.address && <p className="text-xs text-gray-500">{info.address}</p>}
              {info?.phone && <p className="text-xs text-gray-500">Tel: {info.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recibo de Entrega Inicial</p>
            <p className="text-sm text-gray-500 mt-1">N° {String(sale.id).padStart(6, '0')}</p>
            <p className="text-sm text-gray-500">Fecha: {formatDate(sale.sale_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cliente</p>
            <p className="font-semibold text-gray-900">{sale.customer_name}</p>
            <p className="text-gray-500">CI/RUC: {sale.customer_document}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Producto</p>
            <p className="font-semibold text-gray-900">{itemsLabel}</p>
            <p className="text-gray-500">{sale.installment_count} cuotas</p>
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Entrega Inicial</p>
            <p className="text-2xl font-bold text-gray-900">{formatGs(sale.down_payment)}</p>
          </div>
        </div>
        <div className="flex justify-end mb-10">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase">Saldo a Financiar</p>
            <p className="text-lg font-semibold text-amber-600">{formatGs(financedAmount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-sm pt-24">
          <div>
            <div className="border-t border-gray-400 pt-2">Firma del Cliente</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">{info?.legal_name || info?.name}</div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Este comprobante certifica la entrega inicial indicada y no reemplaza la factura legal correspondiente.
        </p>
      </div>

      <TicketReceipt
        info={info}
        title="Recibo de Entrega Inicial"
        receiptId={sale.id}
        partyLabel="Cliente"
        partyName={sale.customer_name}
        partyExtra={`CI/RUC: ${sale.customer_document}`}
        detailLabel="Producto"
        detailValue={itemsLabel}
        paidDate={sale.sale_date}
        amount={sale.down_payment}
        amountLabel="ENTREGA INICIAL"
        balanceAfter={financedAmount}
        signatureLabel="Firma del Cliente"
      />
    </div>
  )
}
