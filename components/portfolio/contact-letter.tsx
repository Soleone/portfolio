"use client"

import { PenLine, Send } from "lucide-react"
import { Letter, type LetterResult } from "@/components/soleone/letter"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { profile } from "@/lib/portfolio"
import { sendMail } from "@/app/actions/send-mail"

type Draft = { name: string; email: string; message: string }
const blank: Draft = { name: "", email: "", message: "" }

type Props = {
  // Both are for the lab, which plays the animation without writing a letter or sending a real one.
  initial?: Draft
  deliver?: (form: FormData) => Promise<LetterResult>
}

export function ContactLetter({ initial = blank, deliver = sendMail }: Props) {
  return (
    <Letter
      initial={initial}
      deliver={deliver}
      sender={(draft) => draft.name}
      recipient={{ name: profile.name, place: profile.location }}
      stamp={{ label: "Ottawa" }}
      hiddenFields={
        // For bots only: people never see it, so anything in it means the letter is not from one.
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
      }
      sent={({ draft, writeAnother }) => (
        <>
          <span className="text-sm font-medium tracking-wider text-primary uppercase">Sent</span>
          <h3 className="text-2xl font-semibold tracking-tight text-balance">Your mail is on its way.</h3>
          <p className="max-w-sm text-pretty text-muted-foreground">
            Thanks, {draft.name}. I&apos;ll write back to {draft.email} within a day.
          </p>
          <Button variant="outline" className="mt-3" onClick={writeAnother}>
            <PenLine data-icon="inline-start" />
            Write another
          </Button>
        </>
      )}
    >
      {({ live, field, error, pending }) => {
        // Copies must not repeat the live form's ids.
        const id = (name: string) => (live ? name : undefined)
        return (
          <FieldGroup className="relative">
            <Field>
              <FieldLabel htmlFor={id("message")} variant="lead">
                Dear {profile.name},
              </FieldLabel>
              <Textarea
                id={id("message")}
                {...field("message")}
                placeholder="Tell me about your project..."
                required
                variant="underline"
                className="min-h-[120px]"
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={id("name")} variant="eyebrow">
                  From
                </FieldLabel>
                <Input
                  id={id("name")}
                  {...field("name")}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  data-1p-ignore
                  required
                  variant="underline"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={id("email")} variant="eyebrow">
                  Reply to
                </FieldLabel>
                <Input
                  id={id("email")}
                  {...field("email")}
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  data-1p-ignore
                  required
                  variant="underline"
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-4">
              {error && (
                <p role="alert" className="mr-auto text-sm text-pretty text-destructive">
                  {error}
                </p>
              )}
              <Button type={live ? "submit" : "button"} disabled={pending} className="shrink-0">
                {pending ? "Sending..." : "Send mail"}
                <Send data-icon="inline-end" />
              </Button>
            </div>
          </FieldGroup>
        )
      }}
    </Letter>
  )
}
