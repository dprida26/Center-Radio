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
  footerText,
}) {
  const { main, subtitle } = splitBusinessName(info?.legal_name || info?.name)
  return (
    <div className="ticket-receipt">
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <p style={{ fontWeight: 'bold', fontSize: '15px' }}>{main}</p>
        {subtitle && <p style={{ fontWeight: 'bold', fontSize: '11px' }}>{subtitle}</p>}
        {info?.ruc && <p>RUC: {info.ruc}</p>}
        {info?.address && <p>{info.address}</p>}
        {info?.phone && <p>Tel: {info.phone}</p>}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{title}</p>
      <p style={{ textAlign: 'center' }}>N° {String(receiptId).padStart(6, '0')}</p>
      <p style={{ textAlign: 'center' }}>{formatDate(date)}</p>

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      <p>{partyLabel}: {partyName}</p>
      {partyExtra && <p>{partyExtra}</p>}

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      {items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '1.5mm' }}>
          <p>{item.quantity}x {item.name}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{formatGs(item.unitPrice)} c/u</span>
            <span>{formatGs(item.subtotal)}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
        <span>TOTAL</span>
        <span>{formatGs(total)}</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '3mm 0 2mm' }} />

      <p style={{ textAlign: 'center', fontSize: '9px' }}>
        {footerText || 'No reemplaza la factura legal.'}
      </p>
      <p style={{ textAlign: 'center', marginTop: '2mm' }}>¡Gracias por su compra!</p>
    </div>
  )
}
