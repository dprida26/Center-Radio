'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Zap, ShieldCheck, Truck, Percent, ArrowRight, ChevronLeft, ChevronRight,
  Tv, Refrigerator, WashingMachine, Microwave, Package,
} from 'lucide-react'
import { productService } from '@/services/api'

const CATEGORY_ICONS = {
  Refrigeradores: Refrigerator,
  Lavadoras: WashingMachine,
  Televisores: Tv,
  Microondas: Microwave,
}

function getIconForCategory(categoryName) {
  return CATEGORY_ICONS[categoryName] || Package
}

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

export default function Hero() {
  const [products, setProducts] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    productService.getOnPromotion().then((data) => setProducts(data.slice(0, 6)))
  }, [])

  useEffect(() => {
    if (products.length < 2) return
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % products.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [products.length])

  const goTo = (idx) => setActiveIndex(((idx % products.length) + products.length) % products.length)

  return (
    <>
      {/* Hero principal */}
      <div className="relative overflow-hidden bg-gradient-to-br from-graphite-dark via-graphite to-graphite-light text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="container relative py-12 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Texto */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-primary-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Percent size={14} />
                Financiación en cuotas disponible
              </span>

              <h1 className="text-4xl lg:text-6xl font-bold leading-[1.15] mb-5 tracking-tight">
                Electrodomésticos
                <span className="block pb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-500">
                  para tu hogar
                </span>
              </h1>

              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Encontrá la mejor selección de electrodomésticos de calidad, con precios
                competitivos y opciones de pago flexibles pensadas para vos.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  href="/productos"
                  className="inline-flex items-center gap-2 bg-primary text-graphite-dark px-7 py-3.5 rounded-xl font-semibold hover:bg-primary-400 transition-colors shadow-lg shadow-primary/20"
                >
                  Ver Productos
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/ofertas"
                  className="inline-flex items-center gap-2 bg-accent text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                >
                  <Zap size={18} className="fill-white" />
                  Ver Ofertas
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span className="flex items-center gap-2">
                  <Truck size={18} className="text-primary-300" />
                  Envío a todo el país
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary-300" />
                  Garantía oficial
                </span>
                <span className="flex items-center gap-2">
                  <Percent size={18} className="text-primary-300" />
                  Cuotas sin tarjeta
                </span>
              </div>
            </div>

            {/* Carrusel de productos en oferta */}
            <div className="px-4 sm:px-0">
              {products.length > 0 ? (
                <ProductCarousel
                  products={products}
                  activeIndex={activeIndex}
                  onPrev={() => goTo(activeIndex - 1)}
                  onNext={() => goTo(activeIndex + 1)}
                  onDotClick={goTo}
                />
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {['Refrigeradores', 'Lavadoras', 'Televisores', 'Microondas'].map((label) => {
                    const Icon = getIconForCategory(label)
                    return (
                      <div
                        key={label}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-3"
                      >
                        <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
                          <Icon size={28} className="text-primary-200" />
                        </div>
                        <span className="text-sm font-medium text-slate-300">{label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ProductCarousel({ products, activeIndex, onPrev, onNext, onDotClick }) {
  const active = products[activeIndex]
  const discount = active.promotions?.[0]?.discount_percent

  return (
    <div className="relative">
      <Link
        href={`/productos/${active.id}`}
        className="group block bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
            <Percent size={12} />
            {discount ? `${parseFloat(discount).toFixed(0)}% OFF` : 'Oferta'}
          </span>
          <span className="text-xs text-slate-400">{active.category_name}</span>
        </div>

        <div className="flex justify-center mb-6">
          {active.first_image ? (
            <div className="w-full h-56 rounded-2xl bg-white p-4 shadow-lg shadow-black/20 flex items-center justify-center overflow-hidden">
              <img
                src={active.first_image}
                alt={active.name}
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              {(() => {
                const Icon = getIconForCategory(active.category_name)
                return <Icon size={48} className="text-primary-200" />
              })()}
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 text-center line-clamp-1">{active.name}</h3>

        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-slate-400 line-through">{formatGs(active.price)}</span>
          <span className="text-xl font-bold text-primary-300">{formatGs(active.discounted_price)}</span>
        </div>
      </Link>

      {products.length > 1 && (
        <>
          <button
            onClick={onPrev}
            aria-label="Producto anterior"
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onNext}
            aria-label="Producto siguiente"
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          <div className="flex justify-center gap-2 mt-5">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onDotClick(idx)}
                aria-label={`Ir al producto ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
