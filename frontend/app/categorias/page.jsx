'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowLeft, Package,
  Tv, Refrigerator, WashingMachine, Microwave, AirVent, CookingPot,
} from 'lucide-react'
import { categoryService } from '@/services/api'

const CATEGORY_ICONS = {
  Refrigeradores: Refrigerator,
  Lavadoras: WashingMachine,
  Televisores: Tv,
  Microondas: Microwave,
  Cocinas: CookingPot,
  'Aires Acondicionados': AirVent,
}

function getIconForCategory(name) {
  return CATEGORY_ICONS[name] || Package
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll()
        setCategories(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-graphite-dark via-graphite to-graphite-light text-white">
        <div className="container py-14">
          <Link href="/" className="inline-flex items-center text-primary-300 hover:text-primary-200 mb-6 transition text-sm font-medium">
            <ArrowLeft size={18} className="mr-1.5" />
            Volver al inicio
          </Link>
          <h1 className="text-4xl lg:text-5xl font-bold mb-3">Categorías</h1>
          <p className="text-slate-300 text-lg max-w-xl">
            Explorá nuestro catálogo organizado por tipo de electrodoméstico y encontrá justo lo que necesitás.
          </p>
        </div>
      </div>

      <div className="container py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay categorías disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = getIconForCategory(category.name)
              return (
                <Link
                  key={category.id}
                  href={`/productos?category=${category.id}`}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-primary-100 transition-all duration-300 overflow-hidden"
                >
                  <div className="p-7 flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:scale-105 transition-all duration-300">
                      <Icon size={26} className="text-primary-700 group-hover:text-graphite-dark transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-graphite mb-1 truncate">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {category.product_count || 0} producto{category.product_count === 1 ? '' : 's'}
                      </p>
                      <div className="flex items-center gap-1.5 text-sm text-primary-700 font-semibold">
                        Ver productos
                        <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
