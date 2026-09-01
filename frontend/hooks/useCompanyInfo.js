'use client'

import { useEffect, useState } from 'react'
import { companyInfoService } from '@/services/api'

export function useCompanyInfo() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await companyInfoService.getInfo()
        setInfo(data)
      } catch (err) {
        setError(err)
        console.error('Failed to load company info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInfo()
  }, [])

  return { info, loading, error }
}
