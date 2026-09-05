'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function InstallmentSelector({ price, interestRate = 0, installmentOptions = [3, 6, 12] }) {
  const [selectedInstallments, setSelectedInstallments] = useState(installmentOptions?.[0] || 3)
  const [isOpen, setIsOpen] = useState(false)

  const rate = parseFloat(interestRate) || 0
  const numPrice = parseFloat(price) || 0
  const options = Array.isArray(installmentOptions) ? installmentOptions : [3, 6, 12]

  const calculateInstallment = (months) => {
    const totalWithInterest = numPrice * (1 + rate / 100)
    return totalWithInterest / months
  }

  const formatPrice = (priceValue) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(priceValue)
  }

  const monthlyPayment = calculateInstallment(selectedInstallments)

  return (
    <div className="w-full relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-primary-50 border border-primary-100 rounded-lg px-4 py-2.5 text-left flex items-center justify-between hover:bg-primary-100 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 font-semibold">Pagar en cuotas</p>
          <p className="text-lg font-bold text-primary-700">
            {selectedInstallments}x Gs. {formatPrice(monthlyPayment)}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-primary-700 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto">
            {options.map((months, idx) => {
              const payment = calculateInstallment(months)
              const isSelected = months === selectedInstallments

              return (
                <button
                  key={months}
                  onClick={() => {
                    setSelectedInstallments(months)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                    idx < options.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isSelected ? 'bg-primary-50 border-l-4 border-l-primary' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-5 h-5 text-primary rounded accent-primary flex-shrink-0 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                      {months}x Gs. {formatPrice(payment)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

