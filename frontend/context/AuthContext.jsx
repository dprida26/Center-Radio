'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authService, authStorage } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = authStorage.getAccess()
    if (!token) {
      setLoading(false)
      return
    }
    authService
      .me()
      .then(setUser)
      .catch(() => authStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const userData = await authService.login(username, password)
    setUser(userData)
    return userData
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
