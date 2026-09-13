import html2canvas from 'html2canvas'

function normalizePhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  // Números locales paraguayos suelen guardarse sin código de país (ej. 0981123456).
  // Si no arranca con "595", se asume Paraguay y se antepone el código, quitando el 0 inicial.
  if (digits.startsWith('595')) return digits
  return `595${digits.replace(/^0/, '')}`
}

function downloadAndOpenWhatsApp(blob, fileName, phone) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)

  const normalizedPhone = normalizePhone(phone)
  if (normalizedPhone) {
    // Abre el chat del cliente/proveedor directo; el usuario solo tiene que
    // arrastrar/adjuntar la imagen ya descargada (WhatsApp no permite adjuntar
    // archivos automáticamente desde afuera por seguridad).
    window.open(`https://wa.me/${normalizedPhone}`, 'whatsapp_web_share')
  } else {
    // Nombre de ventana fijo (en vez de "_blank") para que, si ya hay una pestaña de
    // WhatsApp Web abierta, el navegador la reutilice en lugar de abrir una nueva.
    window.open('https://web.whatsapp.com', 'whatsapp_web_share')
  }
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export async function shareReceiptAsImage(elementRef, fileName, phone) {
  // useCORS: el logo de la empresa puede servirse desde un bucket externo (R2/S3);
  // sin esto, html2canvas "mancha" el canvas y toBlob/toDataURL fallan en silencio.
  const canvas = await html2canvas(elementRef, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar la imagen del comprobante.')

  const file = new File([blob], fileName, { type: 'image/png' })

  // navigator.share() con archivos es confiable en celular, pero en desktop (Windows/Chrome)
  // delega al share sheet nativo del sistema operativo, que puede fallar sin avisarle a la
  // página — por eso en desktop vamos directo al fallback de descarga + WhatsApp.
  if (isMobileDevice() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Comprobante de pago' })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }

  downloadAndOpenWhatsApp(blob, fileName, phone)
}
