import { experience } from "@/lib/portfolio"
import { SectionHeading } from "./section-heading"

export function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="About" title="A bit of background" />

      <div className="mt-10 flex flex-col gap-8">
        {experience.map((item) => (
          <div
            key={item.role}
            className="grid gap-2 border-t border-border pt-6 md:grid-cols-[160px_1fr] md:gap-8"
          >
            <span className="text-sm uppercase tracking-wider text-muted-foreground">
              {item.period}
            </span>
            <div>
              <h3 className="font-semibold tracking-tight">
                {item.role} · <span className="text-muted-foreground">{item.company}</span>
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
