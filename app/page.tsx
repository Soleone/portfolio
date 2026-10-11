import { SiteHeader } from "@/components/portfolio/site-header"
import { Hero } from "@/components/portfolio/hero"
import { Projects } from "@/components/portfolio/projects"
import { Skills } from "@/components/portfolio/skills"
import { About } from "@/components/portfolio/about"
import { Contact } from "@/components/portfolio/contact"
import { SiteFooter } from "@/components/portfolio/site-footer"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {/* Project cards pad themselves for their shadow, which spills past the viewport edge. Clip it so it can't scroll the page sideways. */}
      <main className="overflow-x-clip">
        <Hero />
        <Separator />
        <Projects />
        <Separator />
        <Skills />
        <Separator />
        <About />
        <Separator />
        <Contact />
      </main>
      <SiteFooter />
      <Toaster />
    </div>
  )
}
