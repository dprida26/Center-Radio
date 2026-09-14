// Imprime solo el elemento con el id indicado: agrega una hoja de estilos temporal que
// oculta todo lo demás durante la impresión, dispara window.print() y la retira después.
export function printElementById(id) {
  const style = document.createElement('style')
  style.id = 'print-single-card-style'
  style.textContent = `
    @media print {
      body * { visibility: hidden; }
      #${id}, #${id} * { visibility: visible; }
      #${id} { position: absolute; top: 0; left: 0; width: 100%; }
    }
  `
  document.head.appendChild(style)

  const cleanup = () => style.remove()
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}
