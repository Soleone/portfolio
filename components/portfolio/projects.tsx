import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { projects } from "@/lib/portfolio"
import { ArrowUpRight } from "lucide-react"
import { SectionHeading } from "./section-heading"

export function Projects() {
  return (
    <section id="work" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="Selected work" title="Projects I'm proud of" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {projects.map((project, index) => (
          <Card
            key={project.title}
            className={`group overflow-hidden pt-0 transition-colors hover:border-primary/50 ${
              index === 0 ? "sm:col-span-2" : ""
            }`}
          >
            <a href={project.href} className="block">
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
                <Image
                  src={project.image || "/placeholder.svg"}
                  alt={`${project.title} project screenshot`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                    {project.title}
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <span className="shrink-0 text-sm text-muted-foreground">{project.year}</span>
                </div>
                <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </a>
          </Card>
        ))}
      </div>
    </section>
  )
}
