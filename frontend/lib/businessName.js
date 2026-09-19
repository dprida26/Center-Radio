const SUBTITLE_WORDS = ['Electrodomésticos', 'Electrodomesticos']

/**
 * Divide el nombre del negocio en línea principal + subtítulo cuando
 * detecta una palabra conocida (ej. "Center Radio Electrodomésticos" ->
 * "Center Radio" / "Electrodomésticos"). Si no la encuentra, devuelve
 * todo como línea principal sin subtítulo.
 */
export function splitBusinessName(fullName) {
  const name = (fullName || '').trim()
  for (const word of SUBTITLE_WORDS) {
    const idx = name.toLowerCase().lastIndexOf(word.toLowerCase())
    if (idx > 0) {
      return {
        main: name.slice(0, idx).trim(),
        subtitle: name.slice(idx).trim(),
      }
    }
  }
  return { main: name, subtitle: '' }
}
