'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, Store } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

export default function PanelLoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const { info } = useCompanyInfo()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/panel')
    }
  }, [authLoading, isAuthenticated, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      router.replace('/panel')
    } catch (err) {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {info?.logo ? (
            <img
              src={info.logo}
              alt={info.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">Panel de Gestión</h1>
          <p className="text-gray-400 text-sm mt-1">Acceso administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <a href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition">
          <Store size={14} />
          Volver a la tienda
        </a>
      </div>
    </div>
  )
}
