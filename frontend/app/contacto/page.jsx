'use client'

import { useState, useEffect } from 'react'
import { Mail, MapPin } from 'lucide-react'
import { FaWhatsapp, FaPhone } from 'react-icons/fa'
import { companyService } from '@/services/api'

const WHATSAPP_MESSAGE = 'Hola, me gustaría consultar sobre los electrodomésticos'

export default function ContactoPage() {
  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await companyService.getConfig()
        setConfig(data)
      } catch (error) {
        console.error('Error fetching company config:', error)
      } finally {
        setConfigLoading(false)
      }
    }
    fetchConfig()
  }, [])

  if (configLoading || !config) {
    return <div className="container py-12">Cargando configuración...</div>
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Formulario enviado:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    }, 3000)
  }

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold mb-4">Contacto</h1>
      <p className="text-gray-600 mb-12">¿Tienes preguntas? Nos encantaría escucharte.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition hover:scale-105">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="font-semibold text-lg mb-2">Teléfono</h3>
          <a href={`tel:${config.phone}`} className="text-blue-600 font-semibold hover:underline">
            {config.phone}
          </a>
          <p className="text-gray-600 text-sm mt-2">{config.business_hours}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition hover:scale-105">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="font-semibold text-lg mb-2">WhatsApp</h3>
          <a
            href={`https://wa.me/${config.whatsapp_number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 font-semibold hover:underline flex items-center gap-2"
          >
            <FaWhatsapp size={20} />
            Chatea con nosotros
          </a>
          <p className="text-gray-600 text-sm mt-2">Respuesta inmediata</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition hover:scale-105">
          <div className="text-4xl mb-4">📧</div>
          <h3 className="font-semibold text-lg mb-2">Email</h3>
          <a href={`mailto:${config.email}`} className="text-orange-600 font-semibold hover:underline">
            {config.email}
          </a>
          <p className="text-gray-600 text-sm mt-2">Respuesta en 24 horas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Envíanos un mensaje</h2>

          {submitted && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6">
              ✓ Mensaje enviado correctamente. Te responderemos pronto.
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
              placeholder="Tu nombre"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
              placeholder="tu@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
              placeholder="(595) 21 000-0000"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Asunto</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
              placeholder="Asunto del mensaje"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Mensaje</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows="5"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
              placeholder="Tu mensaje aquí..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Enviar Mensaje
          </button>
        </form>

        {/* Mapa/Info adicional */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">¿Por qué elegir nuestra tienda?</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Productos de Calidad</h3>
                <p className="text-gray-600 text-sm">
                  Seleccionamos cuidadosamente cada producto
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Envío Rápido</h3>
                <p className="text-gray-600 text-sm">
                  Entrega en 2-3 días en Asunción
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Garantía</h3>
                <p className="text-gray-600 text-sm">
                  Todos nuestros productos tienen garantía
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Atención al Cliente</h3>
                <p className="text-gray-600 text-sm">
                  Soporte disponible 24/7 para ti
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
