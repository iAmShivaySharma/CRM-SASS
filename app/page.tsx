import Navbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import AnimatedDemo from '@/components/home/AnimatedDemo'
import BentoFeatures from '@/components/home/BentoFeatures'
import HowItWorks from '@/components/home/HowItWorks'
import Competitors from '@/components/home/Competitors'
import Calculator from '@/components/home/Calculator'
import Testimonials from '@/components/home/Testimonials'
import Pricing from '@/components/home/Pricing'
import FAQ from '@/components/home/FAQ'
import CTA from '@/components/home/CTA'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <AnimatedDemo />
      <BentoFeatures />
      <HowItWorks />
      <Competitors />
      <Calculator />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
