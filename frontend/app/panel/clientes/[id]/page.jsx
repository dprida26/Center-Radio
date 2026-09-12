'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, RotateCcw, Phone, Mail, MapPin, X, Loader2, Pencil, Printer, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { customerService, installmentService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

const STATUS_LABELS = {
  PENDING: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  PAID: { label: 'Pagada', className: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Atrasada', className: 'bg-red-100 text-red-700' },
}

export default function ClienteDetallePage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [editing, setEditing] = useState(false)
  const [locationCopied, setLocationCopied] = useState(false)

  const handleCopyLocation = async () => {
    try {
      await navigator.clipboard.writeText(customer.maps_location_url)
      setLocationCopied(true)
      setTimeout(() => setLocationCopied(false), 2000)
    } catch {
      alert('No se pudo copiar el link.')
    }
  }

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([customerService.getById(id), customerService.getSales(id)])
      .then(([customerData, salesData]) => {
        setCustomer(customerData)
        setSales(salesData)
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
      await installmentService.markPaid(confirmTarget.id, confirmTarget.amount)
      load()
    } finally {
      setBusyId(null)
      setConfirmTarget(null)
    }
  }

  const handleRevert = async (installmentId) => {
    setBusyId(installmentId)
    try {
      await installmentService.revertPayment(installmentId)
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (!customer) return <p className="text-red-600">Cliente no encontrado.</p>

  return (
    <div className="space-y-6">
      <Link href="/panel/clientes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={16} />
        Volver a Clientes
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Editar datos del cliente"
              >
                <Pencil size={16} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1">CI/RUC: {customer.document_number}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {customer.phone && (
                <span className="flex items-center gap-1.5"><Phone size={14} /> {customer.phone}</span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} /> {customer.email}</span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {customer.address}</span>
              )}
              {customer.maps_location_url && (
                <span className="flex items-center gap-2">
                  <a
                    href={customer.maps_location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline"
                  >
                    <MapPin size={14} /> Ver ubicación en Maps
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLocation}
                    title="Copiar link de ubicación"
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    {locationCopied ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-green-600 text-xs">Copiado</span>
                      </>
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-semibold">Deuda Pendiente</p>
            <p className={`text-2xl font-bold ${parseFloat(customer.total_debt) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatGs(customer.total_debt)}
            </p>
            {customer.overdue_count > 0 && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {customer.overdue_count} cuota(s) atrasada(s)
              </span>
            )}
          </div>
        </div>

        {(customer.id_document_image || customer.economic_activity || customer.reference1_name || customer.reference2_name) && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Datos para evaluación de crédito</p>
            <div className="flex flex-wrap gap-6">
              {customer.id_document_image && (
                <a href={customer.id_document_image} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={customer.id_document_image}
                    alt="Foto de cédula"
                    className="w-32 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                  />
                </a>
              )}
              <div className="space-y-2 text-sm">
                {customer.economic_activity && (
                  <p><span className="text-gray-500">Actividad económica:</span> <span className="text-gray-800 font-medium">{customer.economic_activity}</span></p>
                )}
                {customer.reference1_name && (
                  <p>
                    <span className="text-gray-500">Referencia 1:</span>{' '}
                    <span className="text-gray-800 font-medium">{customer.reference1_name}</span>
                    {customer.reference1_phone && <span className="text-gray-600"> — {customer.reference1_phone}</span>}
                    {customer.reference1_relation && <span className="text-gray-400 italic"> ({customer.reference1_relation})</span>}
                  </p>
                )}
                {customer.reference2_name && (
                  <p>
                    <span className="text-gray-500">Referencia 2:</span>{' '}
                    <span className="text-gray-800 font-medium">{customer.reference2_name}</span>
                    {customer.reference2_phone && <span className="text-gray-600"> — {customer.reference2_phone}</span>}
                    {customer.reference2_relation && <span className="text-gray-400 italic"> ({customer.reference2_relation})</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Compras</h2>
        {sales.length === 0 ? (
          <p className="text-gray-400 italic text-sm">Este cliente no tiene compras registradas.</p>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                onRequestMarkPaid={setConfirmTarget}
                onRevert={handleRevert}
                busyId={busyId}
              />
            ))}
          </div>
        )}
      </div>

      {confirmTarget && (
        <ConfirmPaymentModal
          installment={confirmTarget}
          busy={busyId === confirmTarget.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {editing && (
        <EditCustomerModal
          customer={customer}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setCustomer(updated)
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

function EditCustomerModal({ customer, onCancel, onSaved }) {
  const [form, setForm] = useState({
    full_name: customer.full_name || '',
    document_number: customer.document_number || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    maps_location_url: customer.maps_location_url || '',
    economic_activity: customer.economic_activity || '',
    reference1_name: customer.reference1_name || '',
    reference1_phone: customer.reference1_phone || '',
    reference1_relation: customer.reference1_relation || '',
    reference2_name: customer.reference2_name || '',
    reference2_phone: customer.reference2_phone || '',
    reference2_relation: customer.reference2_relation || '',
  })
  const [idDocumentImage, setIdDocumentImage] = useState(null)
  const [removeIdDocumentImage, setRemoveIdDocumentImage] = useState(false)
  const [confirmingRemoveImage, setConfirmingRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formLocationCopied, setFormLocationCopied] = useState(false)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        ...(idDocumentImage
          ? { id_document_image: idDocumentImage }
          : removeIdDocumentImage
          ? { id_document_image: '' }
          : {}),
      }
      const updated = await customerService.update(customer.id, payload)
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
          <h3 className="text-lg font-bold text-gray-900">Editar cliente</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={handleChange('full_name')}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CI/RUC</label>
            <input
              type="text"
              value={form.document_number}
              onChange={handleChange('document_number')}
              required
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
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ubicación (link de Google Maps)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.maps_location_url}
                onChange={handleChange('maps_location_url')}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.maps_location_url && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(form.maps_location_url)
                      setFormLocationCopied(true)
                      setTimeout(() => setFormLocationCopied(false), 2000)
                    } catch {
                      alert('No se pudo copiar el link.')
                    }
                  }}
                  title="Copiar link de ubicación"
                  className="shrink-0 flex items-center gap-1 px-3 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                >
                  {formLocationCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Actividad Económica</label>
            <input
              type="text"
              value={form.economic_activity}
              onChange={handleChange('economic_activity')}
              placeholder="Ej: Comerciante, empleado, albañil..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Foto de Cédula</label>

            {idDocumentImage ? (
              <div className="relative w-28 h-20 border border-gray-200 rounded-lg overflow-hidden group mb-2">
                <img src={URL.createObjectURL(idDocumentImage)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setIdDocumentImage(null)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Quitar imagen seleccionada"
                >
                  <X size={12} />
                </button>
              </div>
            ) : customer.id_document_image && !removeIdDocumentImage ? (
              <div className="relative w-28 h-20 border border-gray-200 rounded-lg overflow-hidden group mb-2">
                <img src={customer.id_document_image} alt="Foto de cédula" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setConfirmingRemoveImage(true)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Quitar foto"
                >
                  <X size={12} />
                </button>
              </div>
            ) : removeIdDocumentImage ? (
              <p className="text-xs text-gray-400 italic mb-2">Se quitará la foto al guardar.</p>
            ) : null}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setIdDocumentImage(e.target.files?.[0] || null)
                setRemoveIdDocumentImage(false)
              }}
              className="text-sm"
            />
          </div>

          {confirmingRemoveImage && (
            <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Quitar foto de cédula</h3>
                <p className="text-sm text-gray-600 mb-5">
                  ¿Seguro que querés quitar la foto de cédula de este cliente?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingRemoveImage(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveIdDocumentImage(true)
                      setConfirmingRemoveImage(false)
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Quitar foto
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Referencia personal 1</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                placeholder="Nombre"
                value={form.reference1_name}
                onChange={handleChange('reference1_name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.reference1_phone}
                onChange={handleChange('reference1_phone')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Relación (ej: hermano, vecino)"
              value={form.reference1_relation}
              onChange={handleChange('reference1_relation')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Referencia personal 2</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                placeholder="Nombre"
                value={form.reference2_name}
                onChange={handleChange('reference2_name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.reference2_phone}
                onChange={handleChange('reference2_phone')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Relación (ej: hermano, vecino)"
              value={form.reference2_relation}
              onChange={handleChange('reference2_relation')}
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

function ConfirmPaymentModal({ installment, busy, onCancel, onConfirm }) {
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
          Vas a marcar la <strong>cuota {installment.number}</strong> como pagada. Esta acción se puede
          deshacer luego si te equivocás.
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

function SaleCard({ sale, onRequestMarkPaid, onRevert, busyId }) {
  const isCash = sale.payment_type === 'CASH'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <p className="font-semibold text-gray-900">{sale.product_name}</p>
          <p className="text-xs text-gray-500">
            {sale.sale_date} · {isCash ? 'Contado' : `${sale.installment_count} cuotas`} · Cant: {sale.quantity}
          </p>
        </div>
        <p className="font-bold text-gray-900">{formatGs(sale.total_amount)}</p>
      </div>

      {!isCash && sale.installments?.length > 0 && (
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
            {sale.installments.map((inst) => {
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
                          href={`/panel/cuotas/${inst.id}/comprobante`}
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
  )
}
