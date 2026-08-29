'use client'

import { useState, useEffect } from 'react'
import { companyService } from '@/services/api'

export function useCompanyConfig() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await companyService.getConfig()
        setConfig(data)
      } catch (err) {
        console.error('Error fetching company config:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  return { config, loading, error }
}
