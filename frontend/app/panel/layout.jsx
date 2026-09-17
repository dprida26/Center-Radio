import PanelLayoutClient from './PanelLayoutClient'

export const metadata = {
  title: 'Panel de Gestión — Tienda Electrodomésticos',
}

export default function PanelLayout({ children }) {
  return <PanelLayoutClient>{children}</PanelLayoutClient>
}
