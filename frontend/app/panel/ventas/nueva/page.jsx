'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, Loader2, Trash2, Plus, X } from 'lucide-react'
import { customerService, productService, saleService } from '@/services/api'
import { MoneyInput } from '@/components/panel/MoneyInput'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevaVentaPage() {
  const router = useRouter()

  const [customer, setCustomer] = useState(null)
  const [saleDate, setSaleDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [paymentType, setPaymentType] = useState('CASH')
  const [installmentCount, setInstallmentCount] = useState(3)
  const [interestRate, setInterestRate] = useState(0)
  const [downPayment, setDownPayment] = useState(0)
  const [paymentDay, setPaymentDay] = useState('')
  const [lateFeeRate, setLateFeeRate] = useState(0)
  const [items, setItems] = useState([])
  const [useCustomInstallmentAmount, setUseCustomInstallmentAmount] = useState(false)
  const [customInstallmentAmount, setCustomInstallmentAmount] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 0), 0)
  const total = paymentType === 'INSTALLMENTS' ? subtotal * (1 + interestRate / 100) : subtotal
  const financedAmount = paymentType === 'INSTALLMENTS' ? Math.max(0, total - (parseFloat(downPayment) || 0)) : total
  const suggestedPerInstallment = paymentType === 'INSTALLMENTS' && installmentCount ? financedAmount / installmentCount : null
  const isCustomAmountActive = useCustomInstallmentAmount && parseFloat(customInstallmentAmount) > 0
  const perInstallment = isCustomAmountActive ? parseFloat(customInstallmentAmount) : suggestedPerInstallment
  // Con monto manual, cada cuota vale exactamente ese monto (no se ajusta
  // contra financedAmount): el total en cuotas puede terminar siendo mayor
  // o menor al saldo financiado calculado con la tasa de interés, y eso es
  // una decisión comercial válida del vendedor, no un error.
  const installmentsTotal = isCustomAmountActive ? perInstallment * installmentCount : financedAmount
  const downPaymentExceedsTotal = paymentType === 'INSTALLMENTS' && (parseFloat(downPayment) || 0) > total

  const addItem = (product) => {
    setItems((prev) => {
      if (prev.some((it) => it.product.id === product.id)) return prev
      return [...prev, { product, quantity: 1, unit_price: product.price || 0 }]
    })
  }

  const updateItem = (productId, field, value) => {
    setItems((prev) => prev.map((it) => (it.product.id === productId ? { ...it, [field]: value } : it)))
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId))
  }

  const customAmountInvalid =
    paymentType === 'INSTALLMENTS' && useCustomInstallmentAmount && !(parseFloat(customInstallmentAmount) > 0)

  const canSubmit =
    customer &&
    items.length > 0 &&
    items.every((it) => it.quantity > 0 && it.quantity <= it.product.stock && it.unit_price >= 0) &&
    !downPaymentExceedsTotal &&
    !customAmountInvalid

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        customer: customer.id,
        payment_type: paymentType,
        installment_count: paymentType === 'INSTALLMENTS' ? installmentCount : 1,
        interest_rate: paymentType === 'INSTALLMENTS' ? interestRate : 0,
        down_payment: paymentType === 'INSTALLMENTS' ? (parseFloat(downPayment) || 0) : 0,
        payment_day: paymentType === 'INSTALLMENTS' && paymentDay ? Number(paymentDay) : null,
        late_fee_rate: paymentType === 'INSTALLMENTS' ? (parseFloat(lateFeeRate) || 0) : 0,
        sale_date: saleDate,
        notes,
        items: items.map((it) => ({
          product: it.product.id,
          quantity: Number(it.quantity),
          unit_price: it.unit_price,
        })),
      }
      if (paymentType === 'INSTALLMENTS' && useCustomInstallmentAmount && parseFloat(customInstallmentAmount) > 0) {
        payload.custom_installment_amount = parseFloat(customInstallmentAmount)
      }
      await saleService.create(payload)
      router.push(`/panel/clientes/${customer.id}`)
    } catch (err) {
      const detail = err?.response?.data
      setError(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(' ')
          : 'No se pudo registrar la venta.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
        <p className="text-gray-500 text-sm mt-1">Registrá una venta al contado o en cuotas, con uno o varios productos</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de venta</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
          <ProductPicker onSelect={addItem} />

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-4 min-w-[560px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium whitespace-nowrap">Producto</th>
                    <th className="pb-2 font-medium w-24 whitespace-nowrap">Cantidad</th>
                    <th className="pb-2 font-medium w-36 whitespace-nowrap">Precio Unit.</th>
                    <th className="pb-2 font-medium text-right whitespace-nowrap">Subtotal</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const overStock = it.quantity > it.product.stock
                    return (
                      <tr key={it.product.id} className="border-b last:border-0">
                        <td className="py-2 text-gray-800 whitespace-nowrap">
                          {it.product.name}
                          {overStock && (
                            <p className="text-xs text-red-600">Stock disponible: {it.product.stock}</p>
                          )}
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={1}
                            max={it.product.stock}
                            value={it.quantity}
                            onChange={(e) => updateItem(it.product.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className={`w-20 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              overStock ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                        </td>
                        <td className="py-2">
                          <MoneyInput
                            value={it.unit_price}
                            onChange={(digits) => updateItem(it.product.id, 'unit_price', digits)}
                            className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 text-right text-gray-700 font-medium">
                          {formatGs((it.unit_price || 0) * (it.quantity || 0))}
                        </td>
                        <td className="py-2 text-right">
                          <button onClick={() => removeItem(it.product.id)} className="text-gray-400 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Forma de pago</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentType('CASH')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                paymentType === 'CASH' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Contado</p>
              <p className="text-xs text-gray-500 mt-1">Pago único</p>
            </button>
            <button
              onClick={() => setPaymentType('INSTALLMENTS')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                paymentType === 'INSTALLMENTS' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Cuotas</p>
              <p className="text-xs text-gray-500 mt-1">Financiado</p>
            </button>
          </div>

          {paymentType === 'INSTALLMENTS' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad de cuotas</label>
                <input
                  type="number"
                  min={2}
                  max={24}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Interés (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Entrega inicial (Gs.)</label>
                <MoneyInput
                  value={downPayment}
                  onChange={setDownPayment}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    downPaymentExceedsTotal ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {downPaymentExceedsTotal && (
                  <p className="text-xs text-red-600 mt-1">La entrega inicial no puede superar el total de la venta.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Día de pago mensual</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ej: 10"
                  value={paymentDay}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') return setPaymentDay('')
                    setPaymentDay(Math.min(31, Math.max(1, parseInt(v) || 1)))
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Opcional. Si no se indica, se usa la fecha de venta.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Interés por mora (% mensual)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={lateFeeRate}
                  onChange={(e) => setLateFeeRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Se aplica sobre el saldo de cuotas vencidas.</p>
              </div>
            </div>
          )}

          {paymentType === 'INSTALLMENTS' && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomInstallmentAmount}
                  onChange={(e) => setUseCustomInstallmentAmount(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Definir monto de la cuota manualmente
              </label>
              {useCustomInstallmentAmount ? (
                <div className="mt-2">
                  <MoneyInput
                    placeholder={suggestedPerInstallment ? Math.round(suggestedPerInstallment).toLocaleString('es-PY') : ''}
                    value={customInstallmentAmount}
                    onChange={setCustomInstallmentAmount}
                    className={`w-full max-w-xs px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      customAmountInvalid ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Monto sugerido: {formatGs(suggestedPerInstallment)}. Cada una de las {installmentCount} cuotas
                    tendrá este monto exacto, aunque el total en cuotas difiera del saldo financiado.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Si no se activa, el monto de cada cuota se calcula dividiendo el saldo financiado entre la
                  cantidad de cuotas.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatGs(subtotal)}</span>
          </div>
          {paymentType === 'INSTALLMENTS' && (parseFloat(downPayment) || 0) > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Entrega inicial</span>
              <span>- {formatGs(downPayment)}</span>
            </div>
          )}
          {paymentType === 'INSTALLMENTS' && perInstallment && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>{installmentCount} cuotas de</span>
              <span>{formatGs(perInstallment)}</span>
            </div>
          )}
          {isCustomAmountActive && Math.abs(installmentsTotal - financedAmount) >= 1 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>{installmentsTotal > financedAmount ? 'Recargo vs. saldo financiado' : 'Descuento vs. saldo financiado'}</span>
              <span className={installmentsTotal > financedAmount ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                {installmentsTotal > financedAmount ? '+' : ''}{formatGs(installmentsTotal - financedAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-blue-200 mt-2">
            <span>Total</span>
            <span>{formatGs(paymentType === 'INSTALLMENTS' ? installmentsTotal + (parseFloat(downPayment) || 0) : total)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {submitting ? 'Guardando...' : 'Confirmar Venta'}
        </button>
      </div>

      {showConfirm && (
        <ConfirmSaleModal
          customer={customer}
          paymentType={paymentType}
          installmentCount={installmentCount}
          perInstallment={perInstallment}
          downPayment={downPayment}
          total={paymentType === 'INSTALLMENTS' ? installmentsTotal + (parseFloat(downPayment) || 0) : total}
          submitting={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={async () => {
            await handleSubmit()
            setShowConfirm(false)
          }}
        />
      )}
    </div>
  )
}

function ConfirmSaleModal({ customer, paymentType, installmentCount, perInstallment, downPayment, total, submitting, onCancel, onConfirm }) {
  const isCash = paymentType === 'CASH'
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">Confirmar venta</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Cliente</span>
            <span className="font-medium text-gray-900">{customer?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Forma de pago</span>
            <span className={`font-semibold ${isCash ? 'text-blue-600' : 'text-amber-600'}`}>
              {isCash ? 'Contado' : 'Cuotas'}
            </span>
          </div>
          {!isCash && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Cantidad de cuotas</span>
                <span className="font-medium text-gray-900">{installmentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Monto por cuota</span>
                <span className="font-medium text-gray-900">{formatGs(perInstallment)}</span>
              </div>
              {parseFloat(downPayment) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Entrega inicial</span>
                  <span className="font-medium text-gray-900">{formatGs(downPayment)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">{formatGs(total)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {isCash
            ? '¿Confirmás registrar esta venta al contado?'
            : `¿Confirmás registrar esta venta a ${installmentCount} cuotas?`}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {submitting ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomerPicker({ selected, onSelect }) {
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
      customerService
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
          <p className="font-semibold text-gray-900">{selected.full_name}</p>
          <p className="text-sm text-gray-600">CI/RUC: {selected.document_number}</p>
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
          placeholder="Nombre o CI/RUC..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Buscando...</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-gray-400 italic">No se encontraron clientes con "{query}".</p>
      )}

      <div className="space-y-2">
        {results.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <p className="font-medium text-gray-900">{c.full_name}</p>
            <p className="text-sm text-gray-500">CI/RUC: {c.document_number}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProductPicker({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    setLoading(true)
    const timeout = setTimeout(() => {
      productService
        .getAll({ search: query })
        .then(setResults)
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div>
      <div className="relative mb-2">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar producto para agregar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Buscando...</p>}

      {results.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (p.stock === 0) return
                onSelect(p)
                setQuery('')
                setResults([])
              }}
              disabled={p.stock === 0}
              className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">{p.brand} {p.model}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{formatGs(p.price)}</p>
                  <p className={`text-xs ${p.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}
                  </p>
                </div>
                <Plus size={16} className="text-blue-600" />
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="text-sm text-gray-400 italic">No se encontraron productos con "{query}".</p>
      )}
    </div>
  )
}
