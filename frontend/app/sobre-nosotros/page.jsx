'use client'

import { ShieldCheck, Truck, Percent, Users } from 'lucide-react'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

export default function SobreNosotrosPage() {
  const { info, loading } = useCompanyInfo()

  if (loading) {
    return <div className="container py-12">Cargando...</div>
  }

  const companyName = info?.name || 'nuestra tienda'

  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-graphite mb-4">Sobre Nosotros</h1>
      <p className="text-gray-600 text-lg mb-10">
        {info?.about_text || `En ${companyName} trabajamos para ofrecerte los mejores electrodomésticos con precios justos y opciones de pago flexibles.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
            <ShieldCheck size={22} className="text-primary-700" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Garantía Oficial</h3>
          <p className="text-gray-600 text-sm">Todos nuestros productos cuentan con garantía del fabricante.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
            <Percent size={22} className="text-primary-700" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Cuotas Sin Tarjeta</h3>
          <p className="text-gray-600 text-sm">Financiación propia con opciones de pago flexibles.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
            <Truck size={22} className="text-primary-700" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Envío a Todo el País</h3>
          <p className="text-gray-600 text-sm">Coordinamos la entrega de tu producto donde lo necesites.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
            <Users size={22} className="text-primary-700" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Atención Personalizada</h3>
          <p className="text-gray-600 text-sm">Te acompañamos antes, durante y después de tu compra.</p>
        </div>
      </div>

      {(info?.legal_name || info?.ruc || info?.address) && (
        <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-600 space-y-1">
          <h2 className="font-semibold text-graphite mb-2">Datos de la Empresa</h2>
          {info?.legal_name && <p>Razón Social: {info.legal_name}</p>}
          {info?.ruc && <p>RUC: {info.ruc}</p>}
          {info?.address && <p>Dirección: {info.address}</p>}
        </div>
      )}
    </div>
  )
}
