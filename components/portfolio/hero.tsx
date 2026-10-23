"use client"

import { useRef, type PointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { profile } from "@/lib/portfolio"
import { MapPin } from "lucide-react"

export function Hero() {
  const headline = useRef<HTMLHeadingElement>(null)

  // The sheen on the headline follows the pointer anywhere over the hero, not just over the text.
  const track = (event: PointerEvent) => {
    const element = headline.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    element.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`)
    element.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`)
    event.currentTarget.setAttribute("data-pointer", "")
  }
  const untrack = (event: PointerEvent) => event.currentTarget.removeAttribute("data-pointer")

  return (
    <section
      id="top"
      onPointerMove={track}
      onPointerLeave={untrack}
      onPointerCancel={untrack}
      className="group mx-auto max-w-5xl px-6 pb-16 pt-20 md:pt-28"
    >
      <Badge variant="secondary" className="mb-6">
        <span className="relative mr-1 inline-flex size-2" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-success" />
        </span>
        Available for small projects
      </Badge>

      <h1
        ref={headline}
        className="relative max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl"
      >
        {profile.tagline}
        <span
          aria-hidden
          className="hero-sheen pointer-events-none absolute inset-0 select-none opacity-0 transition-opacity duration-500 group-data-pointer:opacity-100"
        >
          {profile.tagline}
        </span>
      </h1>

      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        {profile.intro}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button nativeButton={false} size="lg" render={<a href="#work">View my work</a>} />
        <Button nativeButton={false} variant="outline" size="lg" render={<a href="#contact">Get in touch</a>} />
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          {profile.location}
        </span>
      </div>
    </section>
  )
}
