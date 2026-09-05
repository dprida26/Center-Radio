import './globals.css'
import SiteChrome from '@/components/SiteChrome'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: 'Tienda Electrodomésticos',
  description: 'La mejor tienda online de electrodomésticos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
