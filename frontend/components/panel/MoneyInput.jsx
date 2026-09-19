'use client'

function formatThousands(digits) {
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('es-PY')
}

export function MoneyInput({ value, onChange, className = '', placeholder, ...rest }) {
  const displayValue = formatThousands(String(value ?? '').replace(/\D/g, ''))

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  )
}
