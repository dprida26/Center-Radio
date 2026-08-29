'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { categoryService } from '@/services/api'

export default function CategoriasPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll()
        setCategories(data.results || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const categoryIcons = {
    refrigerator: '❄️',
    washer: '🧺',
    stove: '🍳',
    microwave: '🔥',
    tv: '📺',
    air_conditioner: '❄️',
  }

  if (loading) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-40 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold mb-8">Categorías</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/productos?category=${category.id}`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden group cursor-pointer"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 h-32 flex items-center justify-center group-hover:scale-105 transition">
              <span className="text-6xl">
                {categoryIcons[category.code] || '📦'}
              </span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {category.name}
              </h3>
              <p className="text-gray-600">
                {category.product_count || 0} productos
              </p>
              <div className="mt-4 text-blue-600 font-semibold group-hover:underline">
                Ver productos →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
