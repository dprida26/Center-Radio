'use client'

import { useCompanyInfo } from '@/hooks/useCompanyInfo'

export default function TerminosPage() {
  const { info, loading } = useCompanyInfo()
  const companyName = info?.legal_name || info?.name || 'la empresa'

  if (loading) {
    return <div className="container py-12">Cargando...</div>
  }

  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-graphite mb-8">Términos y Condiciones</h1>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">1. Aceptación de los términos</h2>
          <p>
            Al realizar un pedido a través de este sitio, aceptás los presentes Términos y Condiciones.
            {companyName} se reserva el derecho de modificarlos en cualquier momento.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">2. Pedidos</h2>
          <p>
            Los pedidos realizados a través del sitio no constituyen una venta confirmada hasta que
            {' '}{companyName} se comunique con vos para coordinar la forma de pago, entrega y confirmar
            disponibilidad de stock.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">3. Precios y disponibilidad</h2>
          <p>
            Los precios publicados están sujetos a cambios sin previo aviso y a la disponibilidad de stock
            al momento de la confirmación del pedido.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">4. Formas de pago</h2>
          <p>
            Ofrecemos pago de contado y financiación en cuotas propias, sin necesidad de tarjeta de crédito,
            sujeto a aprobación y coordinación directa con nuestro equipo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">5. Garantía</h2>
          <p>
            Todos los productos cuentan con garantía del fabricante según las condiciones especificadas en
            cada producto. Para hacer válida la garantía, conservá tu comprobante de compra.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">6. Contacto</h2>
          <p>
            Ante cualquier consulta sobre estos términos, podés escribirnos a{' '}
            {info?.email ? <a href={`mailto:${info.email}`} className="text-primary-700 hover:underline">{info.email}</a> : 'nuestro correo de contacto'}.
          </p>
        </section>
      </div>
    </div>
  )
}
