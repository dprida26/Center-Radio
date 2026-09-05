'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, Building2 } from 'lucide-react'
import { companyInfoService } from '@/services/api'

export default function EmpresaPage() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [logoFile, setLogoFile] = useState(null)

  useEffect(() => {
    companyInfoService.getInfo().then((data) => {
      setInfo(data)
      setLoading(false)
    })
  }, [])

  const setField = (field, value) => setInfo((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = { ...info, ...(logoFile ? { logo: logoFile } : {}) }
      delete payload.id
      delete payload.updated_at
      const updated = await companyInfoService.update(info.id, payload)
      setInfo(updated)
      setLogoFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const detail = err?.response?.data
      setError(typeof detail === 'object' ? Object.values(detail).flat().join(' ') : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (!info) return <p className="text-red-600">No se pudo cargar la información de la empresa.</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 size={24} className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Información de la Empresa</h1>
          <p className="text-gray-500 text-sm mt-1">Datos de contacto y redes sociales de la tienda</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <Section title="General">
          <Field label="Nombre" value={info.name} onChange={(v) => setField('name', v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Acerca de nosotros</label>
            <textarea
              value={info.about_text || ''}
              onChange={(e) => setField('about_text', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
            {info.logo && !logoFile && (
              <img src={info.logo} alt="Logo actual" className="h-16 object-contain mb-2" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
        </Section>

        <Section title="Datos Legales">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Razón Social" value={info.legal_name} onChange={(v) => setField('legal_name', v)} />
            <Field label="RUC" value={info.ruc} onChange={(v) => setField('ruc', v)} />
          </div>
        </Section>

        <Section title="Contacto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono" value={info.phone} onChange={(v) => setField('phone', v)} />
            <Field label="WhatsApp" value={info.whatsapp} onChange={(v) => setField('whatsapp', v)} />
          </div>
          <Field label="Email" value={info.email} onChange={(v) => setField('email', v)} type="email" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
            <textarea
              value={info.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horario de Atención</label>
            <textarea
              value={info.business_hours || ''}
              onChange={(e) => setField('business_hours', e.target.value)}
              rows={2}
              placeholder={'Ej: Lunes a Sábado: 07:00 - 18:00\nDomingos: 07:00 - 12:00'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Podés usar una línea por franja horaria.</p>
          </div>
        </Section>

        <Section title="Redes Sociales">
          <Field label="Facebook" value={info.facebook_url} onChange={(v) => setField('facebook_url', v)} />
          <Field label="Instagram" value={info.instagram_url} onChange={(v) => setField('instagram_url', v)} />
          <Field label="Twitter" value={info.twitter_url} onChange={(v) => setField('twitter_url', v)} />
          <Field label="YouTube" value={info.youtube_url} onChange={(v) => setField('youtube_url', v)} />
          <Field label="LinkedIn" value={info.linkedin_url} onChange={(v) => setField('linkedin_url', v)} />
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
              <Check size={16} />
              Guardado correctamente
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
