'use client'

import { usePathname } from 'next/navigation'
import PanelGuard from '@/components/panel/PanelGuard'

export default function PanelLayoutClient({ children }) {
  const pathname = usePathname()
  // Next.js App Router mantiene en su router cache el árbol de React (y su
  // estado interno: filtros, rangos de fecha, etc.) de rutas ya visitadas
  // por varios minutos. Sin este key, volver a una ruta como /panel/reportes
  // reutiliza la instancia vieja en vez de montarla de cero, así que filtros
  // que el usuario cambió antes quedan "pegados" al volver a entrar.
  return <PanelGuard key={pathname}>{children}</PanelGuard>
}
