'use client'

import { useCompanyInfo } from '@/hooks/useCompanyInfo'

export default function PoliticaPrivacidadPage() {
  const { info, loading } = useCompanyInfo()
  const companyName = info?.legal_name || info?.name || 'la empresa'

  if (loading) {
    return <div className="container py-12">Cargando...</div>
  }

  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-graphite mb-8">Política de Privacidad</h1>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">1. Información que recopilamos</h2>
          <p>
            Cuando realizás un pedido, recopilamos los datos que nos proporcionás: nombre, teléfono, email,
            dirección de entrega y, opcionalmente, número de documento. Solo se usan para gestionar tu compra.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">2. Uso de la información</h2>
          <p>
            Utilizamos tus datos exclusivamente para contactarte, coordinar la entrega y forma de pago de tu
            pedido, y para brindarte atención relacionada con tu compra. No compartimos tu información con
            terceros con fines comerciales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">3. Comunicación por WhatsApp</h2>
          <p>
            Al enviar un pedido, podés ser redirigido a WhatsApp para confirmar los detalles con nuestro
            equipo. Esta comunicación queda sujeta a las políticas de privacidad de WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">4. Conservación de datos</h2>
          <p>
            Conservamos tus datos mientras exista una relación comercial activa o mientras sea necesario para
            cumplir obligaciones legales o fiscales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-graphite mb-2">5. Tus derechos</h2>
          <p>
            Podés solicitar en cualquier momento la actualización o eliminación de tus datos personales
            contactando a {companyName} por los medios indicados en la sección de Contacto.
          </p>
        </section>
      </div>
    </div>
  )
}
