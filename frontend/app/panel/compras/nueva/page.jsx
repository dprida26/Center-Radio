'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, Loader2, Trash2, Plus, X, PackagePlus } from 'lucide-react'
import { supplierService, productService, categoryService, purchaseInvoiceService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevaCompraPage() {
  const router = useRouter()

  const [supplier, setSupplier] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [paymentType, setPaymentType] = useState('CASH')
  const [installmentCount, setInstallmentCount] = useState(3)
  const [items, setItems] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const total = items.reduce((sum, it) => sum + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity) || 0), 0)
  const perInstallment = paymentType === 'INSTALLMENTS' && installmentCount ? total / installmentCount : null

  const addItem = (product) => {
    setItems((prev) => {
      if (prev.some((it) => it.product.id === product.id)) return prev
      return [...prev, { product, quantity: 1, unit_cost: product.cost_price || 0 }]
    })
  }

  const updateItem = (productId, field, value) => {
    setItems((prev) => prev.map((it) => (it.product.id === productId ? { ...it, [field]: value } : it)))
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId))
  }

  const canSubmit = supplier && items.length > 0 && items.every((it) => it.quantity > 0 && it.unit_cost >= 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        supplier: supplier.id,
        invoice_number: invoiceNumber,
        payment_type: paymentType,
        installment_count: paymentType === 'INSTALLMENTS' ? installmentCount : 1,
        purchase_date: purchaseDate,
        notes,
        items: items.map((it) => ({
          product: it.product.id,
          quantity: Number(it.quantity),
          unit_cost: it.unit_cost,
        })),
      }
      await purchaseInvoiceService.create(payload)
      router.push(`/panel/proveedores/${supplier.id}`)
    } catch (err) {
      const detail = err?.response?.data
      setError(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(' ')
          : 'No se pudo registrar la compra.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Compra a Proveedor</h1>
        <p className="text-gray-500 text-sm mt-1">Registrá una factura de compra al contado o en cuotas</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Proveedor</h3>
          <SupplierPicker selected={supplier} onSelect={setSupplier} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° de Factura (opcional)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de compra</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
          <ProductPicker onSelect={addItem} supplier={supplier} />

          {items.length > 0 && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm mt-4 min-w-[560px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium whitespace-nowrap">Producto</th>
                  <th className="pb-2 font-medium w-24 whitespace-nowrap">Cantidad</th>
                  <th className="pb-2 font-medium w-36 whitespace-nowrap">Costo Unit.</th>
                  <th className="pb-2 font-medium text-right whitespace-nowrap">Subtotal</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.product.id} className="border-b last:border-0">
                    <td className="py-2 text-gray-800 whitespace-nowrap">{it.product.name}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(it.product.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        value={it.unit_cost}
                        onChange={(e) => updateItem(it.product.id, 'unit_cost', e.target.value)}
                        className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 text-right text-gray-700 font-medium">
                      {formatGs((it.unit_cost || 0) * (it.quantity || 0))}
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => removeItem(it.product.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
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
              <p className="text-xs text-gray-500 mt-1">Se registra un gasto de mercadería inmediato</p>
            </button>
            <button
              onClick={() => setPaymentType('INSTALLMENTS')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                paymentType === 'INSTALLMENTS' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Cuotas</p>
              <p className="text-xs text-gray-500 mt-1">El gasto se registra al pagar cada cuota</p>
            </button>
          </div>

          {paymentType === 'INSTALLMENTS' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad de cuotas</label>
              <input
                type="number"
                min={2}
                max={24}
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
          <div className="flex justify-between font-bold text-gray-900 text-base">
            <span>Total</span>
            <span>{formatGs(total)}</span>
          </div>
          {paymentType === 'INSTALLMENTS' && perInstallment && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>{installmentCount} cuotas de</span>
              <span>{formatGs(perInstallment)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {submitting ? 'Guardando...' : 'Confirmar Compra'}
        </button>
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

function ProductPicker({ onSelect, supplier }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    setLoading(true)
    const timeout = setTimeout(() => {
      productService
        .getAll({ search: query, include_inactive: 1 })
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
        <div className="space-y-2 max-h-60 overflow-y-auto mb-2">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p)
                setQuery('')
                setResults([])
              }}
              className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">{p.brand} {p.model}</p>
              </div>
              <Plus size={16} className="text-blue-600" />
            </button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-2">No se encontraron productos con "{query}".</p>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        <PackagePlus size={16} />
        Crear producto nuevo
      </button>

      {creating && (
        <CreateProductModal
          supplier={supplier}
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(product) => {
            onSelect(product)
            setCreating(false)
            setQuery('')
            setResults([])
          }}
        />
      )}
    </div>
  )
}

function CreateProductModal({ supplier, initialName, onCancel, onCreated }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name: initialName || '',
    description: '',
    category: '',
    brand: '',
    model: '',
    price: '',
    cost_price: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    categoryService.getAll().then(setCategories)
  }, [])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const product = await productService.create({
        ...form,
        price: form.price || 0,
        cost_price: form.cost_price || 0,
        stock: 0,
        is_active: true,
        usual_supplier: supplier?.id || null,
      })
      onCreated(product)
    } catch (err) {
      const detail = err?.response?.data
      setError(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(' ')
          : 'No se pudo crear el producto. Verificá los datos.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Crear producto nuevo</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</label>
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
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              rows={2}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={handleChange('category')}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Marca</label>
              <input
                type="text"
                value={form.brand}
                onChange={handleChange('brand')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Modelo</label>
              <input
                type="text"
                value={form.model}
                onChange={handleChange('model')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Precio de Venta</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={handleChange('price')}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Precio de Costo</label>
              <input
                type="number"
                min={0}
                value={form.cost_price}
                onChange={handleChange('cost_price')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            El producto se crea con stock inicial 0 — el stock se sumará automáticamente al confirmar esta compra.
          </p>

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
              {saving ? 'Creando...' : 'Crear y agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
