import { splitBusinessName } from '@/lib/businessName'

export function BusinessNameHeader({ info }) {
  const { main, subtitle } = splitBusinessName(info?.legal_name || info?.name)
  return (
    <div>
      <p className="font-bold text-gray-900 text-xl leading-tight">{main}</p>
      {subtitle && <p className="font-bold text-gray-700 text-sm leading-tight">{subtitle}</p>}
    </div>
  )
}
