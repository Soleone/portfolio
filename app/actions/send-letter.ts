"use server"

import { Resend } from "resend"

export type SendResult = { ok: true } | { ok: false; error: string }

// Until soleone.xyz is verified in Resend, its shared sender only delivers to the Resend account's own address.
const to = process.env.CONTACT_TO ?? "dev@soleone.xyz"
const from = process.env.CONTACT_FROM ?? "Portfolio <onboarding@resend.dev>"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function sendLetter(form: FormData): Promise<SendResult> {
  // A field people never see. Bots fill it in, and get told it worked.
  if (String(form.get("website") ?? "")) return { ok: true }

  // No line breaks in anything that ends up in a header.
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim()
  const email = String(form.get("email") ?? "").trim()
  const message = String(form.get("message") ?? "").trim()

  if (!name || name.length > 100) return { ok: false, error: "Please sign with your name." }
  if (!emailPattern.test(email) || email.length > 200) return { ok: false, error: "That reply address doesn't look right." }
  if (!message || message.length > 5000) return { ok: false, error: "The letter needs a message, under 5000 characters." }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error("sendLetter: RESEND_API_KEY is not set")
    return { ok: false, error: "The mailbox isn't set up yet. Please try again later." }
  }

  const { error } = await new Resend(key).emails.send({
    from,
    to,
    replyTo: email,
    subject: `Letter from ${name}`,
    text: `${message}\n\n${name}\n${email}`,
  })
  if (error) {
    console.error("sendLetter:", error)
    return { ok: false, error: "The letter couldn't be sent. Please try again in a moment." }
  }
  return { ok: true }
}
