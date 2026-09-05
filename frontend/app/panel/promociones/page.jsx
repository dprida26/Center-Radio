'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Percent } from 'lucide-react'
import { promotionService, productService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isCurrentlyActive(promo) {
  const now = new Date()
  return promo.is_active && new Date(promo.start_date) <= now && new Date(promo.end_date) >= now
}

export default function PromocionesPage() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPromo, setEditingPromo] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    promotionService.getAll().then(setPromotions).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingPromo(null)
    setShowForm(true)
  }

  const openEdit = (promo) => {
    setEditingPromo(promo)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingPromo(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await promotionService.remove(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 text-sm mt-1">{promotions.length} promoción(es)</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva Promoción
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Percent size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No hay promociones creadas todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onEdit={() => openEdit(promo)}
              onDelete={() => setDeleteTarget(promo)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <PromotionFormModal
          promotion={editingPromo}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          promo={deleteTarget}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function PromotionCard({ promo, onEdit, onDelete }) {
  const active = isCurrentlyActive(promo)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{promo.name}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {active ? 'Activa' : promo.is_active ? 'Fuera de fecha' : 'Inactiva'}
            </span>
          </div>
          {promo.description && <p className="text-sm text-gray-500 mt-1">{promo.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-gray-500 text-xs uppercase font-semibold">Descuento</p>
          <p className="font-semibold text-gray-900">{parseFloat(promo.discount_percent)}%</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase font-semibold">Interés cuotas</p>
          <p className="font-semibold text-gray-900">{parseFloat(promo.interest_percent)}%</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase font-semibold">Desde</p>
          <p className="text-gray-700">{formatDate(promo.start_date)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase font-semibold">Hasta</p>
          <p className="text-gray-700">{formatDate(promo.end_date)}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-gray-500 text-xs uppercase font-semibold mb-1.5">
          Productos ({promo.products_detail?.length || 0})
        </p>
        {promo.products_detail?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {promo.products_detail.map((p) => (
              <span key={p.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Sin productos asignados</p>
        )}
      </div>
    </div>
  )
}

function PromotionFormModal({ promotion, onClose, onSaved }) {
  const isEdit = !!promotion
  const [name, setName] = useState(promotion?.name || '')
  const [description, setDescription] = useState(promotion?.description || '')
  const [discountPercent, setDiscountPercent] = useState(promotion?.discount_percent || 0)
  const [interestPercent, setInterestPercent] = useState(promotion?.interest_percent || 0)
  const [startDate, setStartDate] = useState(
    promotion?.start_date ? promotion.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16)
  )
  const [endDate, setEndDate] = useState(
    promotion?.end_date ? promotion.end_date.slice(0, 16) : new Date().toISOString().slice(0, 16)
  )
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true)
  const [selectedProductIds, setSelectedProductIds] = useState(
    promotion?.products || []
  )

  const [allProducts, setAllProducts] = useState([])
  const [productQuery, setProductQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    productService.getAll(productQuery ? { search: productQuery } : {}).then(setAllProducts)
  }, [productQuery])

  const toggleProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const payload = {
      name,
      description,
      discount_percent: discountPercent,
      interest_percent: interestPercent,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      is_active: isActive,
      products: selectedProductIds,
    }
    try {
      if (isEdit) {
        await promotionService.update(promotion.id, payload)
      } else {
        await promotionService.create(payload)
      }
      onSaved()
    } catch (err) {
      const detail = err?.response?.data
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'No se pudo guardar la promoción.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">% Descuento</label>
              <input
                type="number"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">% Interés Cuotas</label>
              <input
                type="number"
                step="0.01"
                value={interestPercent}
                onChange={(e) => setInterestPercent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Desde</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hasta</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Promoción activa
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Productos ({selectedProductIds.length} seleccionados)
            </label>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {allProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded"
                  />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-gray-500 text-xs">{formatGs(p.price)}</span>
                </label>
              ))}
              {allProducts.length === 0 && (
                <p className="text-xs text-gray-400 italic px-3 py-2">No se encontraron productos.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ promo, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar promoción</h3>
        <p className="text-sm text-gray-600 mb-5">
          ¿Seguro que querés eliminar <strong>{promo.name}</strong>? Esta acción no se puede deshacer.
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
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {busy ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
