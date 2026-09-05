'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { customerService, productService, saleService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

const STEPS = ['Cliente', 'Producto', 'Forma de Pago', 'Confirmar']

export default function NuevaVentaPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [customer, setCustomer] = useState(null)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [paymentType, setPaymentType] = useState('CASH')
  const [installmentCount, setInstallmentCount] = useState(null)
  const [interestRate, setInterestRate] = useState(0)
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const installmentOptions = useMemo(() => {
    if (!product) return [3, 6, 12]
    return product.installment_options_list?.length ? product.installment_options_list : [3, 6, 12]
  }, [product])

  useEffect(() => {
    if (product) {
      setInterestRate(paymentType === 'INSTALLMENTS' ? parseFloat(product.installment_interest_rate) || 0 : 0)
      if (paymentType === 'INSTALLMENTS' && !installmentCount) {
        setInstallmentCount(installmentOptions[0])
      }
    }
  }, [product, paymentType, installmentOptions, installmentCount])

  const subtotal = (product ? parseFloat(product.price) : 0) * quantity
  const total = paymentType === 'INSTALLMENTS' ? subtotal * (1 + interestRate / 100) : subtotal
  const monthlyPayment = paymentType === 'INSTALLMENTS' && installmentCount ? total / installmentCount : null

  const canGoNext = () => {
    if (step === 0) return !!customer
    if (step === 1) return !!product && quantity > 0 && quantity <= product.stock
    if (step === 2) return paymentType === 'CASH' || (paymentType === 'INSTALLMENTS' && installmentCount)
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const sale = await saleService.create({
        customer: customer.id,
        product: product.id,
        quantity,
        unit_price: product.price,
        payment_type: paymentType,
        installment_count: paymentType === 'INSTALLMENTS' ? installmentCount : 1,
        interest_rate: paymentType === 'INSTALLMENTS' ? interestRate : 0,
        sale_date: saleDate,
        notes,
      })
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
        <p className="text-gray-500 text-sm mt-1">Registrá una venta al contado o en cuotas</p>
      </div>

      <StepIndicator step={step} />

      <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[360px]">
        {step === 0 && <CustomerStep selected={customer} onSelect={setCustomer} />}
        {step === 1 && (
          <ProductStep
            selected={product}
            onSelect={setProduct}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
        )}
        {step === 2 && (
          <PaymentStep
            product={product}
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            installmentOptions={installmentOptions}
            installmentCount={installmentCount}
            onInstallmentCountChange={setInstallmentCount}
            interestRate={interestRate}
            onInterestRateChange={setInterestRate}
            saleDate={saleDate}
            onSaleDateChange={setSaleDate}
            notes={notes}
            onNotesChange={setNotes}
            subtotal={subtotal}
            total={total}
            monthlyPayment={monthlyPayment}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            customer={customer}
            product={product}
            quantity={quantity}
            paymentType={paymentType}
            installmentCount={installmentCount}
            interestRate={interestRate}
            saleDate={saleDate}
            subtotal={subtotal}
            total={total}
            monthlyPayment={monthlyPayment}
          />
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-0 transition-colors"
        >
          <ArrowLeft size={16} />
          Atrás
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canGoNext()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {submitting ? 'Guardando...' : 'Confirmar Venta'}
          </button>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ step }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, idx) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                idx < step
                  ? 'bg-green-600 text-white'
                  : idx === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx < step ? <Check size={14} /> : idx + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${idx === step ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 ${idx < step ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function CustomerStep({ selected, onSelect }) {
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
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Cliente seleccionado</h3>
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{selected.full_name}</p>
            <p className="text-sm text-gray-600">CI/RUC: {selected.document_number}</p>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Buscar cliente</h3>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
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

function ProductStep({ selected, onSelect, quantity, onQuantityChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timeout = setTimeout(() => {
      productService
        .getAll(query ? { search: query } : {})
        .then(setResults)
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  if (selected) {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Producto seleccionado</h3>
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-gray-900">{selected.name}</p>
            <p className="text-sm text-gray-600">
              {formatGs(selected.price)} · Stock: {selected.stock}
            </p>
          </div>
          <button onClick={() => onSelect(null)} className="text-sm text-blue-600 hover:underline font-medium">
            Cambiar
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
        <input
          type="number"
          min={1}
          max={selected.stock}
          value={quantity}
          onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {quantity > selected.stock && (
          <p className="text-sm text-red-600 mt-1.5">Stock insuficiente. Disponible: {selected.stock}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Buscar producto</h3>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          type="text"
          placeholder="Nombre, marca, modelo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Buscando...</p>}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {results.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            disabled={p.stock === 0}
            className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">{p.name}</p>
              <p className="text-sm text-gray-500">{p.brand} {p.model}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatGs(p.price)}</p>
              <p className={`text-xs ${p.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PaymentStep({
  product, paymentType, onPaymentTypeChange,
  installmentOptions, installmentCount, onInstallmentCountChange,
  interestRate, onInterestRateChange,
  saleDate, onSaleDateChange, notes, onNotesChange,
  subtotal, total, monthlyPayment,
}) {
  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-900">Forma de pago</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onPaymentTypeChange('CASH')}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            paymentType === 'CASH' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="font-semibold text-gray-900">Contado</p>
          <p className="text-xs text-gray-500 mt-1">Pago único</p>
        </button>
        <button
          onClick={() => onPaymentTypeChange('INSTALLMENTS')}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            paymentType === 'INSTALLMENTS' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="font-semibold text-gray-900">Cuotas</p>
          <p className="text-xs text-gray-500 mt-1">Financiado</p>
        </button>
      </div>

      {paymentType === 'INSTALLMENTS' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad de cuotas</label>
            <select
              value={installmentCount || ''}
              onChange={(e) => onInstallmentCountChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {installmentOptions.map((n) => (
                <option key={n} value={n}>{n} cuotas</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Interés (%)</label>
            <input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => onInterestRateChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de venta</label>
        <input
          type="date"
          value={saleDate}
          onChange={(e) => onSaleDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatGs(subtotal)}</span>
        </div>
        {paymentType === 'INSTALLMENTS' && monthlyPayment && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>{installmentCount} cuotas de</span>
            <span>{formatGs(monthlyPayment)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-blue-200 mt-2">
          <span>Total</span>
          <span>{formatGs(total)}</span>
        </div>
      </div>
    </div>
  )
}

function ConfirmStep({ customer, product, quantity, paymentType, installmentCount, interestRate, saleDate, subtotal, total, monthlyPayment }) {
  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-900">Confirmar venta</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Cliente" value={customer?.full_name} />
        <InfoRow label="CI/RUC" value={customer?.document_number} />
        <InfoRow label="Producto" value={product?.name} />
        <InfoRow label="Cantidad" value={quantity} />
        <InfoRow label="Forma de pago" value={paymentType === 'CASH' ? 'Contado' : `${installmentCount} cuotas`} />
        {paymentType === 'INSTALLMENTS' && <InfoRow label="Interés" value={`${interestRate}%`} />}
        <InfoRow label="Fecha" value={saleDate} />
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatGs(subtotal)}</span>
        </div>
        {paymentType === 'INSTALLMENTS' && monthlyPayment && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>{installmentCount} cuotas de</span>
            <span>{formatGs(monthlyPayment)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 text-lg pt-1 border-t border-green-200 mt-2">
          <span>Total a pagar</span>
          <span>{formatGs(total)}</span>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-gray-500 text-xs uppercase font-semibold">{label}</p>
      <p className="text-gray-900 font-medium">{value ?? '—'}</p>
    </div>
  )
}
