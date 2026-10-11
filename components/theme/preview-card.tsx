"use client"

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ThemeMode, ThemeOption } from "./palette"
import { grain } from "./sheen"

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)")
const subscribeSystem = (listener: () => void) => {
  const query = darkQuery()
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}

// A system theme draws the way the OS is set right now; the server has no OS, so it draws light.
function useDrawsDark(mode: ThemeMode) {
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => darkQuery().matches,
    () => false,
  )
  return mode === "system" ? systemDark : mode === "dark"
}

// The card is a slab: thin slices behind the face show as its edge once the ring turns it.
const EDGE_SLICES = 5
const EDGE_STEP = 1.2 // px between slices, so the slab is about 6px thick

/**
 * A theme drawing itself: a small project card in that theme's own tokens, whatever theme the page
 * is in. It sets data-theme on itself (theme.css scopes every theme to [data-theme]), so it only
 * ever styles with tokens and never with `dark:`, which follows the page instead.
 *
 * With `depth`, it becomes a physical card for a 3D parent: the surface, text and button float at
 * their own heights (px times depth) and it gains thickness. Nothing inside may clip, since
 * overflow would flatten the layers back onto the face.
 *
 * With `selectable`, its Select button rises on hover (only where there is hover). `pressed` sinks it;
 * the owner sets it, since a press may come from a touch or a key, which CSS :active misses.
 */
export function ThemePreviewCard({
  theme,
  depth = 0,
  className,
  style,
  selectable = false,
  pressed = false,
  children,
}: {
  theme: ThemeOption
  depth?: number
  selectable?: boolean
  pressed?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode // overlays drawn above every layer, such as glare
}) {
  const dark = useDrawsDark(theme.mode)
  const raised = depth > 0
  const lift = (px: number): CSSProperties | undefined =>
    raised ? { transform: `translateZ(${px * depth}px)` } : undefined

  return (
    <div
      data-theme={theme.name}
      className={cn(
        "relative flex flex-col rounded-[22px] border border-black/[0.07] bg-background p-2 text-foreground select-none",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]",
        dark && "dark border-white/10",
        raised && "transform-3d",
        className,
      )}
      style={{ colorScheme: dark ? "dark" : "light", ...style }}
    >
      {raised &&
        Array.from({ length: EDGE_SLICES }, (_, slice) => (
          <div
            key={slice}
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[22px]"
            style={{
              transform: `translateZ(${-(slice + 1) * EDGE_STEP}px)`,
              // Darker toward the back, so the edge reads as a side in shadow.
              background: `color-mix(in oklab, var(--background), black ${30 + slice * 8}%)`,
            }}
          />
        ))}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[22px]",
          dark ? "opacity-[0.12] mix-blend-screen" : "opacity-[0.07] mix-blend-multiply",
        )}
        style={{ backgroundImage: grain }}
      />

      {/* The page canvas around a card surface, the way the site sits a project card on the background. */}
      <div
        className={cn(
          "relative flex flex-1 flex-col justify-center rounded-[16px] bg-card p-3.5 text-card-foreground",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_10px_24px_-12px_rgb(0_0_0/0.55)]",
          raised && "transform-3d",
        )}
        style={lift(10)}
      >
        <div className="text-center" style={lift(6)}>
          <div className="truncate text-lg leading-tight font-semibold tracking-tight">{theme.label}</div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            Small tools and games, {/* Selected text, the way the theme highlights it. */}
            <span className="rounded-[3px] bg-(--selection) px-0.5 whitespace-nowrap text-(--selection-foreground)">
              built with care
            </span>
            .
          </p>
        </div>

        {/* Status badges: the success color and a quiet secondary surface. */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium" style={lift(8)}>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success">
            <span className="size-1.5 rounded-full bg-current" />
            Live
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">v1.2</span>
        </div>

        <div className="mt-5 flex items-center justify-center" style={lift(14)}>
          <span
            data-select
            className={cn(
              "inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground",
              "shadow-[0_0_0_0_transparent,0_6px_14px_-5px_var(--primary)] transition-[scale,box-shadow,filter] duration-150 ease-out",
              // Hover lights it up in place: brighter, with a soft halo of its own color around it.
              selectable &&
                !pressed &&
                "hover:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_28%,transparent),0_8px_18px_-5px_var(--primary)] hover:brightness-110",
              // Pressed it sinks into the card: shaded inside, its glow pulled in, a touch smaller.
              pressed &&
                "scale-[0.985] shadow-[inset_0_1px_2px_rgb(0_0_0/0.18),0_3px_8px_-4px_var(--primary)] brightness-95 duration-75",
            )}
          >
            Select
          </span>
        </div>
      </div>

      {/* The eight tints the project cards draw from. */}
      <div className="flex items-center justify-between gap-1 px-1.5 pt-2 pb-0.5" style={lift(4)}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((tint) => (
          <span
            key={tint}
            className="h-1.5 flex-1 rounded-full shadow-[inset_0_-1px_0_rgb(0_0_0/0.2)]"
            style={{ background: `var(--tint-${tint})` }}
          />
        ))}
      </div>

      {children && (
        <div className="pointer-events-none absolute inset-0" style={lift(30)}>
          {children}
        </div>
      )}
    </div>
  )
}
