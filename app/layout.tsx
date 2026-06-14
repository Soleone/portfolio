import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export const metadata: Metadata = {
  title: "Dennis Theisen — Full-Stack Web Developer",
  description:
    "Freelance full-stack web developer building accessible, performant web experiences. View selected projects, skills, and get in touch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body
        className="antialiased"
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
