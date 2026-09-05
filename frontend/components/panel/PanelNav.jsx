'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingCart, Store, Percent, Package, Tags, Building2, Inbox, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'

const links = [
  { href: '/panel', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/panel/pedidos', label: 'Pedidos', icon: Inbox },
  { href: '/panel/clientes', label: 'Clientes', icon: Users },
  { href: '/panel/ventas/nueva', label: 'Nueva Venta', icon: ShoppingCart },
  { href: '/panel/productos', label: 'Productos', icon: Package },
  { href: '/panel/categorias', label: 'Categorías', icon: Tags },
  { href: '/panel/promociones', label: 'Promociones', icon: Percent },
  { href: '/panel/empresa', label: 'Info. Empresa', icon: Building2 },
]

export default function PanelNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { info } = useCompanyInfo()

  const isActive = (link) =>
    link.exact ? pathname === link.href : pathname?.startsWith(link.href)

  const handleLogout = () => {
    logout()
    router.replace('/panel/login')
  }

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-gray-800 flex items-center gap-3">
        {info?.logo && (
          <img
            src={info.logo}
            alt={info.name}
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">Panel de Gestión</p>
          <p className="text-xs text-gray-400 mt-1 truncate">{user?.name || 'Tienda Electrodomésticos'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(link)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Store size={18} />
          Ver Tienda
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
