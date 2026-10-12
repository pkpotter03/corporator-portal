import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getContentMap } from "@/lib/publicSheetData";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const content = await getContentMap();

  const name = content.name?.[locale as "en" | "mr"] || content.name?.en;
  const tagline =
    content.tagline?.[locale as "en" | "mr"] ||
    content.tagline?.en ||
    t("taglineFallback");

  return (
    <div className="flex flex-1 flex-col items-center">
      <section className="flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6">
        <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-accent shadow-lg sm:h-72 sm:w-72">
          <Image
            src="/images/hero-portrait.jpg"
            alt={name ?? "Portrait"}
            fill
            sizes="(min-width: 640px) 18rem, 14rem"
            className="object-cover"
            priority
          />
        </div>
        {name && <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{name}</h1>}
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">{tagline}</p>
        <Link
          href="/about"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          {t("heroCta")}
        </Link>
      </section>
    </div>
  );
}
