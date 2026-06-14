"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { profile } from "@/lib/portfolio"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { SectionHeading } from "./section-heading"

export function Contact() {
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success("Message sent! I'll get back to you soon.")
      ;(event.target as HTMLFormElement).reset()
    }, 800)
  }

  return (
    <section id="contact" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <SectionHeading label="Contact" title="Let's build something together" />
          <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">
            Have a project in mind or just want to say hi? Drop me a message and I&apos;ll get back
            to you within a day.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {profile.email}
            </a>
            <div className="flex flex-wrap gap-4">
              {profile.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="Jane Doe" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="message">Message</FieldLabel>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell me about your project..."
                rows={5}
                required
              />
            </Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send message"}
              <Send data-icon="inline-end" />
            </Button>
          </FieldGroup>
        </form>
      </div>
    </section>
  )
}
