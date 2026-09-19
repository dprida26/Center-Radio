import { splitBusinessName } from '@/lib/businessName'

function formatGs(value) {
  return `Gs. ${Math.round(parseFloat(value) || 0).toLocaleString('es-PY')}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Variante de TicketReceipt para comprobantes con múltiples ítems (venta
 * al contado con uno o más productos), en vez de una única cuota.
 * Mismo contenedor .ticket-receipt (58mm, oculto en pantalla, visible al
 * imprimir) definido en globals.css.
 */
export default function TicketReceiptItems({
  info,
  title,
  receiptId,
  partyLabel,
  partyName,
  partyExtra,
  date,
  items,
  total,
}) {
  const { main, subtitle } = splitBusinessName(info?.legal_name || info?.name)
  return (
    <div className="ticket-receipt">
      <div style={{ textAlign: 'center', marginBottom: '1.5mm' }}>
        <p style={{ fontWeight: 'bold', fontSize: '13px' }}>{main}</p>
        {subtitle && <p style={{ fontWeight: 'bold', fontSize: '10px' }}>{subtitle}</p>}
        {info?.ruc && <p style={{ fontSize: '8px' }}>RUC: {info.ruc}</p>}
        {info?.address && <p style={{ fontSize: '8px' }}>{info.address}</p>}
        {info?.phone && <p style={{ fontSize: '8px' }}>Tel: {info.phone}</p>}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '1.5mm 0' }} />

      <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{title}</p>
      <p style={{ textAlign: 'center', fontSize: '8px' }}>N° {String(receiptId).padStart(6, '0')}</p>
      <p style={{ textAlign: 'center', fontSize: '8px' }}>{formatDate(date)}</p>

      <div style={{ borderTop: '1px dashed #000', margin: '1.5mm 0' }} />

      <p>{partyLabel}: {partyName}</p>
      {partyExtra && <p style={{ fontSize: '8px' }}>{partyExtra}</p>}

      <div style={{ borderTop: '1px dashed #000', margin: '1.5mm 0' }} />

      {items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '1.5mm' }}>
          <p>{item.quantity}x {item.name}</p>
          <p style={{ fontSize: '8px' }}>{formatGs(item.unitPrice)} c/u = {formatGs(item.subtotal)}</p>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #000', margin: '1.5mm 0' }} />

      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>TOTAL</p>
      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>{formatGs(total)}</p>
      <div style={{ marginTop: '10mm' }} />
    </div>
  )
}
