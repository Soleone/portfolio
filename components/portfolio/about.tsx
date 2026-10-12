import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { experience, focusAreas, profile, values } from "@/lib/portfolio"
import { SectionHeading } from "./section-heading"

export function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="About" title="What I care about" />

      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        {profile.bio}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {values.map((value) => (
          <Card key={value.label}>
            <CardHeader>
              <CardTitle>{value.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-pretty leading-relaxed text-muted-foreground">{value.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mt-16 text-xl font-semibold tracking-tight">Areas I'm passionate about</h3>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {focusAreas.map((area) => (
          <Card key={area.label}>
            <CardHeader>
              <CardTitle>{area.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-pretty leading-relaxed text-muted-foreground">{area.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 flex flex-col gap-8">
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
