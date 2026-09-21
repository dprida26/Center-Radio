'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, Loader2, FileMinus2 } from 'lucide-react'
import { supplierService, purchaseInvoiceService, creditNoteService } from '@/services/api'
import { MoneyInput } from '@/components/panel/MoneyInput'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevaNotaCreditoPage() {
  const router = useRouter()

  const [supplier, setSupplier] = useState(null)
  const [scope, setScope] = useState('single') // 'single' | 'multi'
  const [invoice, setInvoice] = useState(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([])
  const [creditNoteNumber, setCreditNoteNumber] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [returnQty, setReturnQty] = useState({})
  const [isManual, setIsManual] = useState(false)
  const [manualAmount, setManualAmount] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const items = invoice
    ? invoice.items
        .map((it) => ({ ...it, returnQuantity: parseInt(returnQty[it.id]) || 0 }))
        .filter((it) => it.returnQuantity > 0)
    : []

  const itemsTotal = items.reduce((sum, it) => sum + parseFloat(it.unit_cost) * it.returnQuantity, 0)
  const total = (scope === 'multi' || isManual) ? (parseFloat(manualAmount) || 0) : itemsTotal

  const canSubmit =
    !submitting &&
    (scope === 'multi'
      ? selectedInvoiceIds.length >= 2 && parseFloat(manualAmount) > 0
      : invoice && (isManual ? parseFloat(manualAmount) > 0 : items.length > 0))

  const handleSelectInvoice = (inv) => {
    setInvoice(inv)
    setReturnQty({})
  }

  const toggleInvoiceSelection = (invId) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload =
        scope === 'multi'
          ? {
              supplier: supplier.id,
              invoice_ids: selectedInvoiceIds,
              credit_note_number: creditNoteNumber,
              issue_date: issueDate,
              reason,
              notes,
              manual_amount: parseFloat(manualAmount),
            }
          : {
              purchase_invoice: invoice.id,
              credit_note_number: creditNoteNumber,
              issue_date: issueDate,
              reason,
              notes,
              ...(isManual
                ? { manual_amount: parseFloat(manualAmount) }
                : {
                    items: items.map((it) => ({
                      product: it.product,
                      quantity: it.returnQuantity,
                      unit_cost: it.unit_cost,
                    })),
                  }),
            }
      await creditNoteService.create(payload)
      router.push(`/panel/proveedores/${supplier.id}`)
    } catch (err) {
      const detail = err?.response?.data
      setError(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(' ')
          : 'No se pudo registrar la nota de crédito.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const showDetailsForm = scope === 'multi' ? selectedInvoiceIds.length >= 2 : !!invoice

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Nota de Crédito</h1>
        <p className="text-gray-500 text-sm mt-1">
          Devolución de mercadería o descuento en dinero de una compra: reduce la deuda del proveedor con esa(s) factura(s).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Proveedor</h3>
          <SupplierPicker
            selected={supplier}
            onSelect={(s) => {
              setSupplier(s)
              setInvoice(null)
              setSelectedInvoiceIds([])
              setReturnQty({})
            }}
          />
        </div>

        {supplier && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Alcance de la nota de crédito</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setScope('single')
                  setSelectedInvoiceIds([])
                }}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  scope === 'single' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900 text-sm">Una factura</p>
                <p className="text-xs text-gray-500 mt-0.5">Devolución de productos o descuento sobre una compra puntual</p>
              </button>
              <button
                onClick={() => {
                  setScope('multi')
                  setInvoice(null)
                  setIsManual(false)
                }}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  scope === 'multi' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900 text-sm">Varias facturas</p>
                <p className="text-xs text-gray-500 mt-0.5">Descuento repartido proporcionalmente entre facturas del mismo día</p>
              </button>
            </div>
          </div>
        )}

        {supplier && scope === 'single' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Factura de compra</h3>
            <InvoicePicker supplier={supplier} selected={invoice} onSelect={handleSelectInvoice} />
          </div>
        )}

        {supplier && scope === 'multi' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Facturas incluidas (elegí al menos 2)</h3>
            <InvoiceMultiPicker supplier={supplier} selectedIds={selectedInvoiceIds} onToggle={toggleInvoiceSelection} />
          </div>
        )}

        {showDetailsForm && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">N° de Nota de Crédito (opcional)</label>
                <input
                  type="text"
                  value={creditNoteNumber}
                  onChange={(e) => setCreditNoteNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de emisión</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Producto defectuoso, error de facturación, descuento comercial..."
                value={reason}
                onChange={(e) => setReason(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {scope === 'single' && (
              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isManual}
                    onChange={(e) => setIsManual(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Nota de crédito por descuento (sin devolución de mercadería)
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Activá esto si la nota es solo un descuento en dinero, sin identificar productos ni cantidades devueltas. No afecta el stock.
                </p>
              </div>
            )}

            {scope === 'multi' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto total del descuento (Gs.)</label>
                <MoneyInput
                  value={manualAmount}
                  onChange={setManualAmount}
                  className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Se reparte proporcionalmente al saldo pendiente de cada factura seleccionada.
                </p>
              </div>
            ) : isManual ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto del descuento (Gs.)</label>
                <MoneyInput
                  value={manualAmount}
                  onChange={setManualAmount}
                  className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Productos a devolver</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium whitespace-nowrap">Producto</th>
                        <th className="pb-2 font-medium whitespace-nowrap">Comprado</th>
                        <th className="pb-2 font-medium w-28 whitespace-nowrap">Cant. a devolver</th>
                        <th className="pb-2 font-medium text-right whitespace-nowrap">Costo Unit.</th>
                        <th className="pb-2 font-medium text-right whitespace-nowrap">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((it) => {
                        const qty = parseInt(returnQty[it.id]) || 0
                        return (
                          <tr key={it.id} className="border-b last:border-0">
                            <td className="py-2 text-gray-800 whitespace-nowrap">{it.product_name}</td>
                            <td className="py-2 text-gray-500 whitespace-nowrap">{it.quantity}</td>
                            <td className="py-2">
                              <input
                                type="number"
                                min={0}
                                max={it.quantity}
                                value={returnQty[it.id] ?? ''}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(it.quantity, parseInt(e.target.value) || 0))
                                  setReturnQty((prev) => ({ ...prev, [it.id]: v }))
                                }}
                                className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 text-right text-gray-600 whitespace-nowrap">{formatGs(it.unit_cost)}</td>
                            <td className="py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                              {formatGs(parseFloat(it.unit_cost) * qty)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.toUpperCase())}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total de la nota de crédito</span>
                <span>{formatGs(total)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {scope === 'multi'
                  ? 'Se repartirá proporcionalmente y reducirá la deuda pendiente de cada factura elegida (desde la última cuota hacia atrás), sin afectar el stock.'
                  : isManual
                  ? 'Se reducirá la deuda pendiente de esta factura (desde la última cuota hacia atrás), sin afectar el stock.'
                  : 'Se descontará del stock y se reducirá la deuda pendiente de esta factura (desde la última cuota hacia atrás).'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileMinus2 size={16} />}
              {submitting ? 'Guardando...' : 'Emitir Nota de Crédito'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SupplierPicker({ selected, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => {
      setLoading(true)
      supplierService
        .getAll({ search: query })
        .then(setResults)
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  if (selected) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{selected.name}</p>
          {selected.contact_name && <p className="text-sm text-gray-600">Contacto: {selected.contact_name}</p>}
        </div>
        <button onClick={() => onSelect(null)} className="text-sm text-blue-600 hover:underline font-medium">
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Nombre o contacto del proveedor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Buscando...</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-gray-400 italic">No se encontraron proveedores con "{query}".</p>
      )}

      <div className="space-y-2">
        {results.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">{s.name}</p>
            {s.contact_name && <p className="text-sm text-gray-500">{s.contact_name}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

function useSupplierInvoices(supplier) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    purchaseInvoiceService
      .getAll({ supplier: supplier.id, page_size: 100 })
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [supplier])

  return { invoices, loading }
}

function InvoicePicker({ supplier, selected, onSelect }) {
  const { invoices, loading } = useSupplierInvoices(supplier)

  if (selected) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">
            {selected.invoice_number || `Compra #${selected.id}`}
          </p>
          <p className="text-sm text-gray-600">
            {selected.purchase_date} · {formatGs(selected.total_amount)}
          </p>
        </div>
        <button onClick={() => onSelect(null)} className="text-sm text-blue-600 hover:underline font-medium">
          Cambiar
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-gray-400 italic">Este proveedor no tiene compras registradas.</p>
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {invoices.map((inv) => (
        <button
          key={inv.id}
          onClick={() => onSelect(inv)}
          className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-900">{inv.invoice_number || `Compra #${inv.id}`}</p>
            <p className="text-sm text-gray-500">{inv.purchase_date} · {inv.items.length} producto(s)</p>
          </div>
          <p className="font-semibold text-gray-900">{formatGs(inv.total_amount)}</p>
        </button>
      ))}
    </div>
  )
}

function InvoiceMultiPicker({ supplier, selectedIds, onToggle }) {
  const { invoices, loading } = useSupplierInvoices(supplier)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-gray-400 italic">Este proveedor no tiene compras registradas.</p>
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {invoices.map((inv) => {
        const checked = selectedIds.includes(inv.id)
        return (
          <button
            key={inv.id}
            onClick={() => onToggle(inv.id)}
            className={`w-full text-left border-2 rounded-lg p-3 transition-colors flex items-center justify-between gap-3 ${
              checked ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={checked} onChange={() => {}} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <p className="font-medium text-gray-900">{inv.invoice_number || `Compra #${inv.id}`}</p>
                <p className="text-sm text-gray-500">{inv.purchase_date} · {inv.items.length} producto(s)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatGs(inv.total_amount)}</p>
              {parseFloat(inv.remaining_amount) > 0 && (
                <p className="text-xs text-amber-600">Saldo: {formatGs(inv.remaining_amount)}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
