import ProductGrid from '@/components/ProductGrid'
import Hero from '@/components/Hero'

export default function Home() {
  return (
    <>
      <Hero />
      <div className="container py-12">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Nuestros Productos</h2>
        <ProductGrid />
      </div>
    </>
  )
}
