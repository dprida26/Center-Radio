import PanelGuard from '@/components/panel/PanelGuard'

export const metadata = {
  title: 'Panel de Gestión — Tienda Electrodomésticos',
}

export default function PanelLayout({ children }) {
  return <PanelGuard>{children}</PanelGuard>
}
