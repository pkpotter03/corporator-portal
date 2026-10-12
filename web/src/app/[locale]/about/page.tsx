import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContentMap } from "@/lib/publicSheetData";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const content = await getContentMap();

  const biography =
    content.biography?.[locale as "en" | "mr"] || content.biography?.en;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      {biography ? (
        <div className="mt-6 whitespace-pre-line text-base leading-7 text-zinc-700 dark:text-zinc-300">
          {biography}
        </div>
      ) : (
        <p className="mt-6 text-zinc-500">{t("empty")}</p>
      )}
    </div>
  );
}
