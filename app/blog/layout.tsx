import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-16">{children}</main>
      <Footer />
    </>
  )
}
