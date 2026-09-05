'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Search, Package, ImagePlus } from 'lucide-react'
import { productService, categoryService } from '@/services/api'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

export default function ProductosPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    productService
      .getAll({ include_inactive: 1, ...(search ? { search } : {}) })
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    categoryService.getAll().then(setCategories)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [load])

  const openCreate = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingProduct(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await productService.remove(deleteTarget.id)
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
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} producto(s)</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Producto
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, marca, modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm p-6 text-center">Cargando...</p>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <Package size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No se encontraron productos.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium text-right">Precio</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3 font-medium text-center">Estado</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.brand} {p.model}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.category_name}</td>
                  <td className="px-5 py-3 text-right">{formatGs(p.price)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={p.stock === 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          product={deleteTarget}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function ProductFormModal({ product, categories, onClose, onSaved }) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [price, setPrice] = useState(product?.price || '')
  const [categoryId, setCategoryId] = useState(product?.category || categories[0]?.id || '')
  const [brand, setBrand] = useState(product?.brand || '')
  const [model, setModel] = useState(product?.model || '')
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [installmentOptions, setInstallmentOptions] = useState(product?.installment_options || '3,6,12')
  const [interestRate, setInterestRate] = useState(product?.installment_interest_rate || 0)
  const [existingImages, setExistingImages] = useState(product?.images || [])
  const [newImageFiles, setNewImageFiles] = useState([])
  const [deletingImageId, setDeletingImageId] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleAddFiles = (files) => {
    setNewImageFiles((prev) => [...prev, ...Array.from(files)])
  }

  const handleRemoveNewFile = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExistingImage = async (imageId) => {
    if (!isEdit) return
    setDeletingImageId(imageId)
    try {
      await productService.deleteImage(product.id, imageId)
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch {
      setError('No se pudo eliminar la imagen.')
    } finally {
      setDeletingImageId(null)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    const payload = {
      name,
      description,
      price,
      category: categoryId,
      brand,
      model,
      stock,
      is_active: isActive,
      installment_options: installmentOptions,
      installment_interest_rate: interestRate,
    }
    try {
      let savedProduct
      if (isEdit) {
        savedProduct = await productService.update(product.id, payload)
      } else {
        savedProduct = await productService.create(payload)
      }
      if (newImageFiles.length > 0) {
        await productService.uploadImages(savedProduct.id, newImageFiles)
      }
      onSaved()
    } catch (err) {
      const detail = err?.response?.data
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio (Gs.)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Opciones de cuotas</label>
              <input
                type="text"
                value={installmentOptions}
                onChange={(e) => setInstallmentOptions(e.target.value)}
                placeholder="3,6,12"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">% Interés cuotas</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Imágenes</label>

            {(existingImages.length > 0 || newImageFiles.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden group">
                    <img src={img.image_url} alt="" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deletingImageId === img.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </button>
                  </div>
                ))}
                {newImageFiles.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden group">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-contain" />
                    <span className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-white text-[10px] text-center py-0.5">Nueva</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer w-fit">
              <ImagePlus size={16} />
              Agregar imágenes
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) handleAddFiles(e.target.files)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Producto activo (visible en la tienda)
          </label>

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
            disabled={saving || !name || !price || !categoryId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ product, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar producto</h3>
        <p className="text-sm text-gray-600 mb-5">
          ¿Seguro que querés eliminar <strong>{product.name}</strong>? Esta acción no se puede deshacer.
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
