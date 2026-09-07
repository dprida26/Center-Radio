import axios from 'axios'

// Detectar URL de API basada en el entorno
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Fallback para desarrollo local
  return 'http://localhost:8000/api/v1'
}

const API_URL = getApiUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const ACCESS_KEY = 'panel_access_token'
const REFRESH_KEY = 'panel_refresh_token'

export const authStorage = {
  getAccess: () => (typeof window !== 'undefined' ? window.localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_KEY) : null),
  setTokens: (access, refresh) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ACCESS_KEY, access)
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(ACCESS_KEY)
    window.localStorage.removeItem(REFRESH_KEY)
  },
}

api.interceptors.request.use((config) => {
  const token = authStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      const refreshToken = authStorage.getRefresh()

      if (!refreshToken) {
        authStorage.clear()
        return Promise.reject(error)
      }

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh/`, { refresh: refreshToken })
            .finally(() => { refreshPromise = null })
        }
        const { data } = await refreshPromise
        authStorage.setTokens(data.access, data.refresh)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        authStorage.clear()
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/panel')) {
          window.location.href = '/panel/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export const authService = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password })
    authStorage.setTokens(data.access, data.refresh)
    return data.user
  },
  logout: () => {
    authStorage.clear()
  },
  me: async () => {
    const { data } = await api.get('/auth/me/')
    return data
  },
}

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

  getOnPromotion: async () => {
    try {
      const { data } = await api.get('/products/on_promotion/')
      return data
    } catch (error) {
      console.error('Error fetching promoted products:', error)
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

  create: async (payload) => {
    const { data } = await api.post('/products/', toProductFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/products/${id}/`, toProductFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  remove: async (id) => {
    await api.delete(`/products/${id}/`)
  },

  uploadImages: async (id, files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    const { data } = await api.post(`/products/${id}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deleteImage: async (productId, imageId) => {
    await api.delete(`/products/${productId}/images/${imageId}/`)
  },

  addStock: async (id, quantity, note = '', supplierId = null) => {
    const { data } = await api.post(`/products/${id}/add_stock/`, { quantity, note, supplier: supplierId })
    return data
  },

  adjustStock: async (id, quantityDelta, reason) => {
    const { data } = await api.post(`/products/${id}/adjust_stock/`, { quantity_delta: quantityDelta, reason })
    return data
  },

  getMovements: async (id) => {
    const { data } = await api.get(`/products/${id}/movimientos/`)
    return data
  },
}

function toProductFormData(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'image') {
      if (value instanceof File) formData.append('image', value)
      return
    }
    if (value !== null && value !== undefined) {
      formData.append(key, value)
    }
  })
  return formData
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

  create: async (payload) => {
    const { data } = await api.post('/categories/', payload)
    return data
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/categories/${id}/`, payload)
    return data
  },

  remove: async (id) => {
    await api.delete(`/categories/${id}/`)
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

  create: async (payload) => {
    const { data } = await api.post('/promotions/', payload)
    return data
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/promotions/${id}/`, payload)
    return data
  },

  remove: async (id) => {
    await api.delete(`/promotions/${id}/`)
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

  update: async (id, payload) => {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'logo') {
        if (value instanceof File) formData.append('logo', value)
        return
      }
      if (value !== null && value !== undefined) {
        formData.append(key, value)
      }
    })
    const { data } = await api.patch(`/company-info/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}

export const customerService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/customers/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/customers/${id}/`)
    return data
  },
  getSales: async (id) => {
    const { data } = await api.get(`/customers/${id}/sales/`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/customers/', payload)
    return data
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/customers/${id}/`, payload)
    return data
  },
}

export const saleService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/sales/', { params })
    return data.results || data
  },
  create: async (payload) => {
    const { data } = await api.post('/sales/', payload)
    return data
  },
}

export const installmentService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/installments/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/installments/${id}/`)
    return data
  },
  markPaid: async (id, paidAmount) => {
    const { data } = await api.post(`/installments/${id}/mark_paid/`, {
      paid_amount: paidAmount,
    })
    return data
  },
  revertPayment: async (id) => {
    const { data } = await api.post(`/installments/${id}/revert_payment/`)
    return data
  },
  getDueReport: async (daysAhead = 7) => {
    const { data } = await api.get('/installments/due_report/', { params: { days_ahead: daysAhead } })
    return data
  },
  getDashboard: async () => {
    const { data } = await api.get('/installments/dashboard/')
    return data
  },
}

export const supplierService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/suppliers/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/suppliers/${id}/`)
    return data
  },
  getPurchases: async (id) => {
    const { data } = await api.get(`/suppliers/${id}/purchases/`)
    return data
  },
  getProducts: async (id) => {
    const { data } = await api.get(`/suppliers/${id}/products/`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/suppliers/', payload)
    return data
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/suppliers/${id}/`, payload)
    return data
  },
}

export const purchaseInvoiceService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/purchase-invoices/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/purchase-invoices/${id}/`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/purchase-invoices/', payload)
    return data
  },
}

export const purchaseInstallmentService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/purchase-installments/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/purchase-installments/${id}/`)
    return data
  },
  markPaid: async (id, paidAmount) => {
    const { data } = await api.post(`/purchase-installments/${id}/mark_paid/`, {
      paid_amount: paidAmount,
    })
    return data
  },
  revertPayment: async (id) => {
    const { data } = await api.post(`/purchase-installments/${id}/revert_payment/`)
    return data
  },
  getDashboard: async () => {
    const { data } = await api.get('/purchase-installments/dashboard/')
    return data
  },
}

export const auditService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/audit-logs/', { params })
    return data
  },
  getUsers: async () => {
    const { data } = await api.get('/audit-logs/users/')
    return data
  },
}

export const reportService = {
  get: async (params = {}) => {
    const { data } = await api.get('/reports/', { params })
    return data
  },
  getHomeDashboard: async () => {
    const { data } = await api.get('/home-dashboard/')
    return data
  },
}

export const expenseService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/expenses/', { params })
    return data.results || data
  },
  create: async (payload) => {
    const isFile = payload.receipt instanceof File
    if (isFile) {
      const formData = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') formData.append(key, value)
      })
      const { data } = await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    }
    const { receipt, ...rest } = payload
    const { data } = await api.post('/expenses/', rest)
    return data
  },
  update: async (id, payload) => {
    const { receipt, ...rest } = payload
    const { data } = await api.patch(`/expenses/${id}/`, rest)
    return data
  },
  delete: async (id) => {
    await api.delete(`/expenses/${id}/`)
  },
}

export const orderService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/orders/', { params })
    return data.results || data
  },
  getById: async (id) => {
    const { data } = await api.get(`/orders/${id}/`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/orders/', payload)
    return data
  },
  setStatus: async (id, status) => {
    const { data } = await api.post(`/orders/${id}/set_status/`, { status })
    return data
  },
  convertToSale: async (id) => {
    const { data } = await api.post(`/orders/${id}/convert_to_sale/`)
    return data
  },
}

export default api
