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
 * Versión angosta del comprobante, pensada para impresora térmica de
 * tickets (58mm). Se mantiene oculta en pantalla (ver .ticket-receipt en
 * globals.css) y solo se hace visible al imprimir, mientras el
 * comprobante ancho normal (usado en pantalla y para compartir por
 * WhatsApp) se oculta con print:hidden.
 */
export default function TicketReceipt({
  info,
  title,
  receiptId,
  partyLabel,
  partyName,
  partyExtra,
  detailLabel,
  detailValue,
  detailExtra,
  installmentNumber,
  installmentCount,
  dueDate,
  paidDate,
  amount,
  amountLabel = 'TOTAL PAGADO',
  balanceAfter,
  balanceLabel = 'Saldo restante',
  paymentsHistory,
  signatureLabel,
}) {
  return (
    <div className="ticket-receipt">
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <p style={{ fontWeight: 'bold' }}>{info?.legal_name || info?.name}</p>
        {info?.ruc && <p>RUC: {info.ruc}</p>}
        {info?.address && <p>{info.address}</p>}
        {info?.phone && <p>Tel: {info.phone}</p>}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{title}</p>
      <p style={{ textAlign: 'center' }}>N° {String(receiptId).padStart(6, '0')}</p>

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      <p>{partyLabel}: {partyName}</p>
      {partyExtra && <p>{partyExtra}</p>}
      <p>{detailLabel}: {detailValue}</p>
      {detailExtra && <p>{detailExtra}</p>}

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      {installmentCount !== undefined && (
        <p>Cuota: {installmentNumber} de {installmentCount}</p>
      )}
      {dueDate !== undefined && <p>Vencimiento: {formatDate(dueDate)}</p>}
      <p>Fecha de pago: {formatDate(paidDate)}</p>

      <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

      {paymentsHistory?.length > 1 && (
        <>
          <p style={{ fontWeight: 'bold' }}>Historial de abonos:</p>
          {paymentsHistory.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatDate(p.payment_date)}</span>
              <span>{formatGs(p.amount)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
        </>
      )}

      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>
        {amountLabel}
      </p>
      <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>
        {formatGs(amount)}
      </p>
      {balanceAfter !== undefined && (
        <p style={{ textAlign: 'center', fontSize: '10px' }}>
          {balanceLabel}: {formatGs(balanceAfter)}
        </p>
      )}

      <div style={{ borderTop: '1px dashed #000', margin: '3mm 0 2mm' }} />

      <p style={{ textAlign: 'center', marginTop: '6mm' }}>_____________________</p>
      <p style={{ textAlign: 'center' }}>{signatureLabel}</p>

      <p style={{ textAlign: 'center', marginTop: '3mm', fontSize: '9px' }}>
        No reemplaza la factura legal.
      </p>
    </div>
  )
}
