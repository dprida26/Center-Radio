import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Hero() {
  return (
    <>
      {/* Banner de ofertas */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={24} className="fill-white" />
            <span className="font-bold text-lg">¡Promociones especiales activas!</span>
          </div>
          <Link href="/ofertas" className="underline hover:opacity-80 transition font-semibold">
            Ver todas las ofertas →
          </Link>
        </div>
      </div>

      {/* Hero principal */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-4">
              Bienvenido a Tienda Electrodomésticos
            </h1>
            <p className="text-xl mb-6 text-blue-100">
              Descubre la mejor selección de electrodomésticos de calidad al mejor precio
            </p>
            <div className="flex gap-4">
              <Link href="/productos" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">
                Ver Productos
              </Link>
              <Link href="/ofertas" className="inline-block bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition flex items-center gap-2">
                <Zap size={20} className="fill-white" />
                Ver Ofertas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
