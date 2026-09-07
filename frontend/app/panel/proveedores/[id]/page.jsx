'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, RotateCcw, Phone, Mail, MapPin, X, Loader2, Pencil, Printer, Package, ChevronDown, ChevronUp } from 'lucide-react'
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

  const handleConfirmPayment = async () => {
    if (!confirmTarget) return
    setBusyId(confirmTarget.id)
    try {
      await purchaseInstallmentService.markPaid(confirmTarget.id, confirmTarget.amount)
      load()
    } finally {
      setBusyId(null)
      setConfirmTarget(null)
    }
  }

  const handleRevert = async (installmentId) => {
    setBusyId(installmentId)
    try {
      await purchaseInstallmentService.revertPayment(installmentId)
      load()
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
            <p className="text-xs text-gray-500 uppercase font-semibold">Deuda Pendiente</p>
            <p className={`text-2xl font-bold ${parseFloat(supplier.total_owed) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatGs(supplier.total_owed)}
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 font-medium text-right">Stock</th>
                    <th className="pb-2 font-medium text-right">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 text-gray-800">{p.name}</td>
                      <td className="py-2 text-right text-gray-600">{p.stock}</td>
                      <td className="py-2 text-right text-gray-600">{formatGs(p.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                onRevert={handleRevert}
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
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Confirmar pago</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Vas a marcar la <strong>cuota {installment.number}</strong> como pagada al proveedor. Esto
          registrará automáticamente un gasto de mercadería. Esta acción se puede deshacer luego si te equivocás.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm mb-5">
          <div className="flex justify-between">
            <span className="text-gray-500">Monto</span>
            <span className="font-semibold text-gray-900">{formatGs(installment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vencimiento</span>
            <span className="font-medium text-gray-700">{installment.due_date}</span>
          </div>
        </div>

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
          <p className="font-bold text-gray-900">{formatGs(purchase.total_amount)}</p>
          {open ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3">
          <table className="w-full text-sm mb-1">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium text-right">Cant.</th>
                <th className="pb-2 font-medium text-right">Costo Unit.</th>
                <th className="pb-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-800">{item.product_name}</td>
                  <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600">{formatGs(item.unit_cost)}</td>
                  <td className="py-2 text-right text-gray-600">{formatGs(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isCash && purchase.purchase_installments?.length > 0 && (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Vencimiento</th>
                  <th className="pb-2 font-medium text-right">Monto</th>
                  <th className="pb-2 font-medium text-center">Estado</th>
                  <th className="pb-2 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {purchase.purchase_installments.map((inst) => {
                  const statusInfo = STATUS_LABELS[inst.status] || STATUS_LABELS.PENDING
                  const isBusy = busyId === inst.id
                  return (
                    <tr key={inst.id} className="border-b last:border-0">
                      <td className="py-2">{inst.number}</td>
                      <td className="py-2">{inst.due_date}</td>
                      <td className="py-2 text-right">{formatGs(inst.amount)}</td>
                      <td className="py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-2 text-right">
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
                              onClick={() => onRevert(inst.id)}
                              disabled={isBusy}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
                              title="Revertir a pendiente"
                            >
                              <RotateCcw size={14} />
                              {isBusy ? 'Deshaciendo...' : 'Deshacer'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onRequestMarkPaid(inst)}
                            disabled={isBusy}
                            className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900 disabled:opacity-50 ml-auto"
                          >
                            <CheckCircle2 size={14} />
                            Marcar pagada
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
