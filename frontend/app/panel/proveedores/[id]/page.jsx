'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, RotateCcw, Phone, Mail, MapPin, X, Loader2, Pencil, Printer, Package, ChevronDown, ChevronUp, FileMinus2 } from 'lucide-react'
import Link from 'next/link'
import { supplierService, purchaseInstallmentService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

const STATUS_LABELS = {
  PENDING: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  PAID: { label: 'Pagada', className: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Atrasada', className: 'bg-red-100 text-red-700' },
}

export default function ProveedorDetallePage() {
  const { id } = useParams()
  const [supplier, setSupplier] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [revertTarget, setRevertTarget] = useState(null)
  const [editing, setEditing] = useState(false)
  const [productsOpen, setProductsOpen] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([supplierService.getById(id), supplierService.getPurchases(id), supplierService.getProducts(id)])
      .then(([supplierData, purchasesData, productsData]) => {
        setSupplier(supplierData)
        setPurchases(purchasesData)
        setProducts(productsData)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleConfirmPayment = async (amount, paymentDate) => {
    if (!confirmTarget) return
    setBusyId(confirmTarget.id)
    try {
      const result = await purchaseInstallmentService.markPaid(confirmTarget.id, amount, paymentDate)
      load()
      setConfirmTarget(null)
      if (result.overpaid_unapplied && parseFloat(result.overpaid_unapplied) > 0) {
        alert(`Se registró el pago. Sobraron Gs. ${Math.round(parseFloat(result.overpaid_unapplied)).toLocaleString('es-PY')} que no se pudieron aplicar porque ya no quedan cuotas pendientes en esta compra.`)
      } else if (result.affected_installments?.length > 1) {
        alert(`Pago registrado. El excedente se aplicó automáticamente a ${result.affected_installments.length - 1} cuota(s) siguiente(s).`)
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'No se pudo registrar el pago.')
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirmRevert = async () => {
    if (!revertTarget) return
    setBusyId(revertTarget.id)
    try {
      await purchaseInstallmentService.revertPayment(revertTarget.id)
      load()
      setRevertTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (!supplier) return <p className="text-red-600">Proveedor no encontrado.</p>

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0)

  return (
    <div className="space-y-6">
      <Link href="/panel/proveedores" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} />
        Volver a Proveedores
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Editar datos del proveedor"
              >
                <Pencil size={16} />
              </button>
            </div>
            {supplier.contact_name && <p className="text-gray-500 text-sm mt-1">Contacto: {supplier.contact_name}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {supplier.phone && (
                <span className="flex items-center gap-1.5"><Phone size={14} /> {supplier.phone}</span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} /> {supplier.email}</span>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {supplier.address}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-semibold">Deuda Original</p>
            <p className="text-lg font-semibold text-gray-500">
              {formatGs(supplier.total_credit_purchases)}
            </p>
            <p className="text-xs text-gray-500 uppercase font-semibold mt-2">Saldo Pendiente</p>
            <p className={`text-2xl font-bold ${parseFloat(supplier.total_owed_remaining) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatGs(supplier.total_owed_remaining)}
            </p>
            {supplier.overdue_count > 0 && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {supplier.overdue_count} cuota(s) atrasada(s)
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={() => setProductsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 text-left mb-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package size={18} className="text-gray-400" />
            Productos de este proveedor
            {products.length > 0 && (
              <span className="text-sm font-normal text-gray-400">({products.length})</span>
            )}
          </h2>
          {productsOpen ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>
        {productsOpen && (
          products.length === 0 ? (
            <p className="text-gray-400 italic text-sm">No hay productos con este proveedor como habitual.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap gap-6 mb-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Tipos de producto</p>
                  <p className="text-xl font-bold text-gray-900">{products.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Stock total</p>
                  <p className="text-xl font-bold text-gray-900">{totalStock}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3 font-medium whitespace-nowrap">Producto</th>
                    <th className="pb-2 pr-3 font-medium text-right whitespace-nowrap">Stock</th>
                    <th className="pb-2 font-medium text-right whitespace-nowrap">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-gray-800 whitespace-nowrap">{p.name}</td>
                      <td className="py-2 pr-3 text-right text-gray-600 whitespace-nowrap">{p.stock}</td>
                      <td className="py-2 text-right text-gray-600 whitespace-nowrap">{formatGs(p.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Compras
          {purchases.length > 0 && (
            <span className="text-sm font-normal text-gray-400"> ({purchases.length})</span>
          )}
        </h2>
        {purchases.length === 0 ? (
          <p className="text-gray-400 italic text-sm">Este proveedor no tiene compras registradas.</p>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase, index) => (
              <PurchaseInvoiceCard
                key={purchase.id}
                purchase={purchase}
                onRequestMarkPaid={setConfirmTarget}
                onRevert={setRevertTarget}
                busyId={busyId}
                defaultOpen={index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {confirmTarget && (
        <ConfirmSupplierPaymentModal
          installment={confirmTarget}
          busy={busyId === confirmTarget.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {revertTarget && (
        <ConfirmRevertModal
          installment={revertTarget}
          busy={busyId === revertTarget.id}
          onCancel={() => setRevertTarget(null)}
          onConfirm={handleConfirmRevert}
        />
      )}

      {editing && (
        <EditSupplierModal
          supplier={supplier}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setSupplier(updated)
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

function EditSupplierModal({ supplier, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: supplier.name || '',
    contact_name: supplier.contact_name || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
    ruc: supplier.ruc || '',
    notes: supplier.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await supplierService.update(supplier.id, form)
      onSaved(updated)
    } catch (err) {
      setError('No se pudieron guardar los cambios. Verificá los datos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Editar proveedor</h3>
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
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmSupplierPaymentModal({ installment, busy, onCancel, onConfirm }) {
  const remaining = parseFloat(installment.remaining_amount ?? installment.amount)
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))

  const numericAmount = parseFloat(amount) || 0
  const diff = numericAmount - remaining
  const isPartial = numericAmount > 0 && numericAmount < remaining
  const isOverpaid = numericAmount > remaining

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Registrar pago</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Cuota</span>
            <span className="font-medium text-gray-700">{installment.number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Saldo pendiente</span>
            <span className="font-semibold text-gray-900">{formatGs(remaining)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vencimiento</span>
            <span className="font-medium text-gray-700">{installment.due_date}</span>
          </div>
        </div>

        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Monto a registrar</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha del pago</label>
        <input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        {isPartial && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Pago parcial: quedará un saldo de {formatGs(remaining - numericAmount)} pendiente en esta cuota.
          </p>
        )}
        {isOverpaid && (
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
            El excedente de {formatGs(diff)} se aplicará automáticamente a la siguiente cuota pendiente.
          </p>
        )}
        {!isPartial && !isOverpaid && numericAmount > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            Se registrará automáticamente un gasto de mercadería por este pago.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(numericAmount, paymentDate)}
            disabled={busy || numericAmount <= 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {busy ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmRevertModal({ installment, busy, onCancel, onConfirm }) {
  const isPartial = installment.status !== 'PAID'
  const amountToUndo = isPartial ? installment.paid_so_far : installment.paid_amount

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {isPartial ? 'Deshacer abono' : 'Deshacer pago'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {isPartial
            ? <>Vas a borrar el abono de <strong>{formatGs(amountToUndo)}</strong> registrado en la cuota {installment.number}. La cuota volverá a quedar sin ningún pago y se eliminará el/los gasto(s) de mercadería generado(s).</>
            : <>Vas a revertir el pago de la cuota {installment.number}. Volverá a quedar pendiente y se eliminará el gasto de mercadería generado.</>}
          {' '}Esta acción no se puede deshacer.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            {busy ? 'Deshaciendo...' : 'Sí, deshacer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PurchaseInvoiceCard({ purchase, onRequestMarkPaid, onRevert, busyId, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const isCash = purchase.payment_type === 'CASH'
  const pendingCount = purchase.purchase_installments?.filter((i) => i.status !== 'PAID').length || 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between flex-wrap gap-2 text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">
            {purchase.invoice_number ? `Factura ${purchase.invoice_number}` : `Compra #${purchase.id}`}
          </p>
          <p className="text-xs text-gray-500">
            {purchase.purchase_date} · {isCash ? 'Contado' : `${purchase.installment_count} cuotas`}
            {!isCash && pendingCount > 0 && ` · ${pendingCount} pendiente(s)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-gray-900">{formatGs(purchase.total_amount)}</p>
            {!isCash && parseFloat(purchase.remaining_amount) > 0 && (
              <p className="text-xs text-amber-600 font-medium">Saldo: {formatGs(purchase.remaining_amount)}</p>
            )}
          </div>
          {open ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3">
          <div className="overflow-x-auto">
          <table className="w-full text-sm mb-1 min-w-[420px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium whitespace-nowrap">Producto</th>
                <th className="pb-2 font-medium text-right whitespace-nowrap">Cant.</th>
                <th className="pb-2 font-medium text-right whitespace-nowrap">Costo Unit.</th>
                <th className="pb-2 font-medium text-right whitespace-nowrap">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-800 whitespace-nowrap">{item.product_name}</td>
                  <td className="py-2 text-right text-gray-600 whitespace-nowrap">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600 whitespace-nowrap">{formatGs(item.unit_cost)}</td>
                  <td className="py-2 text-right text-gray-600 whitespace-nowrap">{formatGs(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {purchase.credit_notes?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1.5">
                <FileMinus2 size={13} />
                Notas de crédito
              </p>
              <div className="space-y-2">
                {purchase.credit_notes.map((cn) => {
                  const isMulti = cn.allocated_amount_for_invoice !== null && cn.allocated_amount_for_invoice !== undefined
                  const amountForThisInvoice = isMulti ? cn.allocated_amount_for_invoice : cn.total_amount
                  return (
                  <div key={cn.id} className="border border-red-100 bg-red-50/60 rounded-lg p-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {cn.credit_note_number || `NC #${cn.id}`}
                        <span className="text-xs font-normal text-gray-500 ml-2">{cn.issue_date}</span>
                      </p>
                      <p className="text-sm font-bold text-red-700">- {formatGs(amountForThisInvoice)}</p>
                    </div>
                    {cn.reason && <p className="text-xs text-gray-500 mt-0.5">Motivo: {cn.reason}</p>}
                    {isMulti && (
                      <p className="text-xs text-gray-500 mt-1.5 italic">
                        Descuento por Gs. {formatGs(cn.total_amount)} repartido entre {cn.invoice_allocations.length} facturas de este proveedor.
                      </p>
                    )}
                    {!isMulti && cn.items.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1.5 italic">Descuento sin devolución de mercadería.</p>
                    )}
                    {!isMulti && cn.items.length > 0 && (
                    <ul className="text-xs text-gray-600 mt-1.5 space-y-0.5">
                      {cn.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span>{formatGs(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {!isCash && purchase.purchase_installments?.length > 0 && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3 min-w-[480px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3 font-medium whitespace-nowrap">#</th>
                  <th className="pb-2 pr-3 font-medium whitespace-nowrap">Vencimiento</th>
                  <th className="pb-2 pr-3 font-medium text-right whitespace-nowrap">Monto</th>
                  <th className="pb-2 pr-3 font-medium text-center whitespace-nowrap">Estado</th>
                  <th className="pb-2 font-medium text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody>
                {purchase.purchase_installments.map((inst) => {
                  const statusInfo = STATUS_LABELS[inst.status] || STATUS_LABELS.PENDING
                  const isBusy = busyId === inst.id
                  return (
                    <tr key={inst.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{inst.number}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{inst.due_date}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        {formatGs(inst.amount)}
                        {inst.status !== 'PAID' && parseFloat(inst.paid_so_far) > 0 && (
                          <div className="text-xs text-amber-600 font-medium">
                            Abonado {formatGs(inst.paid_so_far)} · Saldo {formatGs(inst.remaining_amount)}
                          </div>
                        )}
                        {inst.payments?.length > 0 && (
                          <ul className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                            {inst.payments.map((p) => (
                              <li key={p.id} className="flex items-center justify-end gap-1.5">
                                <span>
                                  {formatGs(p.amount)} el {p.payment_date}
                                  {p.created_by_name ? ` · ${p.created_by_name}` : ''}
                                </span>
                                <Link
                                  href={`/panel/cuotas-proveedor/${inst.id}/comprobante?pago=${p.id}`}
                                  className="text-blue-600 hover:text-blue-800 shrink-0"
                                  title="Ver e imprimir recibo de este abono"
                                >
                                  <Printer size={12} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {inst.status === 'PAID' ? (
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/panel/cuotas-proveedor/${inst.id}/comprobante`}
                              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                              title="Ver e imprimir comprobante"
                            >
                              <Printer size={14} />
                              Comprobante
                            </Link>
                            <button
                              onClick={() => onRevert(inst)}
                              disabled={isBusy}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
                              title="Revertir a pendiente"
                            >
                              <RotateCcw size={14} />
                              {isBusy ? 'Deshaciendo...' : 'Deshacer'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {parseFloat(inst.paid_so_far) > 0 && (
                              <button
                                onClick={() => onRevert(inst)}
                                disabled={isBusy}
                                className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
                                title="Deshacer el abono parcial registrado"
                              >
                                <RotateCcw size={14} />
                                {isBusy ? 'Deshaciendo...' : 'Deshacer abono'}
                              </button>
                            )}
                            <button
                              onClick={() => onRequestMarkPaid(inst)}
                              disabled={isBusy}
                              className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900 disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                              Registrar pago
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
