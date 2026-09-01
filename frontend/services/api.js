import axios from 'axios'

// Detectar URL de API basada en el entorno
const getApiUrl = () => {
  // En navegador (cliente), siempre usar localhost
  if (typeof window !== 'undefined') {
    return 'http://localhost:8000/api/v1'
  }

  // En servidor (Next.js SSR), usar el servicio de Docker
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Fallback
  return 'http://localhost:8000/api/v1'
}

const API_URL = getApiUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const productService = {
  getAll: async (params = {}) => {
    try {
      const { data } = await api.get('/products/', { params })
      return data.results || data
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/products/${id}/`)
      return data
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  search: async (query) => {
    try {
      const { data } = await api.get('/products/', {
        params: { search: query },
      })
      return data.results || data
    } catch (error) {
      console.error('Error searching products:', error)
      throw error
    }
  },
}

export const categoryService = {
  getAll: async () => {
    try {
      const { data } = await api.get('/categories/')
      return data.results || data
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/categories/${id}/`)
      return data
    } catch (error) {
      console.error('Error fetching category:', error)
      throw error
    }
  },
}

export const promotionService = {
  getAll: async () => {
    try {
      const { data } = await api.get('/promotions/')
      return data.results || data
    } catch (error) {
      console.error('Error fetching promotions:', error)
      throw error
    }
  },

  getActive: async () => {
    try {
      const { data } = await api.get('/promotions/active/')
      return data
    } catch (error) {
      console.error('Error fetching active promotions:', error)
      throw error
    }
  },
}

export const companyConfigService = {
  getConfig: async () => {
    try {
      const { data } = await api.get('/config/')
      return data.results || data
    } catch (error) {
      console.error('Error fetching company config:', error)
      throw error
    }
  },
}

export const companyInfoService = {
  getInfo: async () => {
    try {
      const { data } = await api.get('/company-info/current/')
      return data
    } catch (error) {
      console.error('Error fetching company info:', error)
      throw error
    }
  },
}

export default api
