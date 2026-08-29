'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { creditService } from '@/services/api'

export default function InstallmentCalculator({ price, productName, productInterestRate, productInstallmentOptions }) {
  const [selectedInstallments, setSelectedInstallments] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await creditService.getConfig()
        setConfig(data)
        setSelectedInstallments(data.installment_options_list?.[0] || 1)
      } catch (error) {
        console.error('Error fetching credit config:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  if (loading || !config) {
    return <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">Cargando configuración...</div>
  }

  const cashPrice = parseFloat(price)
  const interestRate = productInterestRate !== undefined && productInterestRate !== null ? parseFloat(productInterestRate) : config.interest_rate
  const interestPercentage = interestRate / 100
  const priceWithInterest = cashPrice * (1 + interestPercentage)

  const calculateMonthlyPayment = (principal, months) => {
    return principal / months
  }

  const monthlyPayment = calculateMonthlyPayment(priceWithInterest, selectedInstallments)
  const totalAmount = monthlyPayment * selectedInstallments

  const formatPrice = (value) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Usar opciones del producto si están disponibles, sino las globales
  const installmentOptions = productInstallmentOptions && productInstallmentOptions.length > 0
    ? productInstallmentOptions
    : (config.installment_options_list || [1, 3, 6, 9, 12, 18, 24])

  return (
    <div className="my-4">
      {/* Header - Precio al contado */}
      <div className="bg-green-100 border border-green-300 rounded-t-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <span className="text-sm font-semibold text-gray-700">Compra al</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-green-600">Gs.</span>
          <span className="text-2xl font-bold text-green-600">{formatPrice(cashPrice)}</span>
        </div>
      </div>

      {/* Botón expandible - ó paga en cuotas */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-blue-100 border-x border-blue-300 p-3 flex items-center justify-between text-left font-semibold text-blue-900 hover:bg-blue-50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <span className="text-sm">ó paga en cuotas</span>
        </div>
        <ChevronDown
          size={20}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Lista de cuotas expandible */}
      {expanded && (
        <div className="bg-white border-x border-b border-blue-300 rounded-b-lg p-4">
          <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
            {installmentOptions.map((installment) => {
              const monthlyPay = calculateMonthlyPayment(priceWithInterest, installment)

              return (
                <button
                  key={installment}
                  onClick={() => setSelectedInstallments(installment)}
                  className={`w-full p-3 rounded-lg border-2 transition flex items-center justify-between ${
                    selectedInstallments === installment
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="font-semibold text-gray-900">
                    {installment}x Gs. {formatPrice(monthlyPay)}
                  </span>
                  {selectedInstallments === installment && (
                    <span className="text-lg">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Botón de compra */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-sm">
              Comprar en {selectedInstallments} cuotas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
