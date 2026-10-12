import { ContactLetter } from "./contact-letter"
import { SectionHeading } from "./section-heading"

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <SectionHeading label="Contact" title="Let's build something together" />
          <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">
            Have a project in mind or just want to say hi? Drop me a message and I&apos;ll get back
            to you within a day.
          </p>
        </div>

        <ContactLetter />
      </div>
    </section>
  )
}
