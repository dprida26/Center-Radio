export function InstallmentsCalculator({ price, interestPercent = 0, installments = 3 }) {
  if (!price || !interestPercent) {
    return <span className="text-sm text-gray-600">Precio: ${price?.toFixed(2)}</span>
  }

  const totalWithInterest = price * (1 + interestPercent / 100)
  const monthlyPayment = totalWithInterest / installments

  return (
    <div className="text-sm space-y-1">
      <div className="font-semibold text-blue-600">
        ${price.toFixed(2)} al contado
      </div>
      <div className="text-gray-600">
        o {installments} cuotas de <span className="font-semibold text-green-600">${monthlyPayment.toFixed(2)}</span>
      </div>
    </div>
  )
}
