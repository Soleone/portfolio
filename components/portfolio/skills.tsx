import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { skillGroups } from "@/lib/portfolio"
import { SectionHeading } from "./section-heading"

export function Skills() {
  return (
    <section id="skills" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="Toolkit" title="Skills & technologies" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {skillGroups.map((group) => (
          <Card key={group.label}>
            <CardHeader>
              <CardTitle className="text-base">{group.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
