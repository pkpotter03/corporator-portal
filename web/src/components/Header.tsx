"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import NextLink from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";

const links = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/gallery", key: "gallery" },
] as const;

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Corporator Portal
        </Link>
        <nav className="flex items-center gap-4">
          {links.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors hover:text-accent ${
                pathname === href ? "font-semibold text-accent" : ""
              }`}
            >
              {t(key)}
            </Link>
          ))}
          {/* Plain next/link, not the locale-aware one: /staff isn't under
              [locale] and shouldn't get an /en or /mr prefix. */}
          <NextLink
            href="/staff/login"
            className="text-sm text-zinc-500 transition-colors hover:text-accent dark:text-zinc-400"
          >
            Staff Use
          </NextLink>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
