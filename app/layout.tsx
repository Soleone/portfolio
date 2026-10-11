import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { cn } from "@/lib/utils";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  defaultThemeIsDark,
  themeOptions,
  themeScript,
  themeStyles,
} from "@/components/theme/registry";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export const metadata: Metadata = {
  metadataBase: new URL("https://soleone.xyz"),
  title: "Dennis Theisen - Full-Stack Web Developer",
  description:
    "Freelance full-stack web developer building accessible, performant web experiences. View selected projects, skills, and get in touch.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "https://soleone.xyz",
    siteName: "Dennis Theisen Portfolio",
    title: "Dennis Theisen - Full-Stack Web Developer",
    description:
      "Freelance full-stack web developer building accessible, performant web experiences. View selected projects, skills, and get in touch.",
    type: "website",
  },
};

// Browser chrome starts on the default theme's canvas; the theme provider keeps it in step afterwards.
export const viewport: Viewport = {
  themeColor: themeOptions.find((theme) => theme.name === DEFAULT_THEME)?.canvas,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The server renders the default theme; the script in <head> swaps in the visitor's stored
  // choice before first paint.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={DEFAULT_THEME}
      className={cn("font-sans", inter.variable, defaultThemeIsDark && "dark")}
    >
      <head>
        {/* The site ships its own themes. This keeps Dark Reader from restyling them, which would
            also rewrite inline styles before hydration and break it. */}
        <meta name="darkreader-lock" />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider themes={themeOptions} storageKey={THEME_STORAGE_KEY}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
