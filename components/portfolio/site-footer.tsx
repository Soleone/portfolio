import { profile } from "@/lib/portfolio"
import { GithubIcon } from "./github-icon"
import { LinkedinIcon, XIcon } from "./social-icons"

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  GitHub: GithubIcon,
  LinkedIn: LinkedinIcon,
  "X / Twitter": XIcon,
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {profile.name}. Built with love.
        </p>
        <div className="flex flex-wrap gap-5">
          {profile.socials.map((social) => {
            const Icon = socialIcons[social.label]
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {Icon ? <Icon className="size-5" /> : social.label}
              </a>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
