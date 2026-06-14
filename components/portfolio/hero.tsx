import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { profile } from "@/lib/portfolio"
import { ArrowDown, MapPin } from "lucide-react"

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-5xl px-6 pb-16 pt-20 md:pt-28">
      <Badge variant="secondary" className="mb-6 gap-2">
        <span className="inline-block size-2 rounded-full bg-primary" aria-hidden />
        Available for new projects
      </Badge>

      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        {profile.tagline}
      </h1>

      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        {profile.intro}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button size="lg" render={<a href="#work">View my work</a>} />
        <Button variant="outline" size="lg" render={<a href="#contact">Get in touch</a>} />
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          {profile.location}
        </span>
      </div>

      <a
        href="#work"
        className="mt-16 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowDown className="size-4 animate-bounce" />
        Scroll to explore
      </a>
    </section>
  )
}
