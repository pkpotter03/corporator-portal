import { getTranslations } from "next-intl/server";
import { getContentMap } from "@/lib/publicSheetData";

export default async function Footer({ locale }: { locale: "en" | "mr" }) {
  const t = await getTranslations("footer");
  const content = await getContentMap();

  const phone = content.officePhone?.[locale] || content.officePhone?.en;
  const email = content.officeEmail?.[locale] || content.officeEmail?.en;
  const address = content.officeAddress?.[locale] || content.officeAddress?.en;

  return (
    <footer className="mt-auto border-t border-black/10 bg-white py-8 dark:border-white/10 dark:bg-black">
      <div className="mx-auto max-w-5xl px-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-400">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t("contact")}</p>
        <ul className="mt-2 space-y-1">
          {address && (
            <li>
              {t("office")}: {address}
            </li>
          )}
          {phone && (
            <li>
              {t("phone")}: {phone}
            </li>
          )}
          {email && (
            <li>
              {t("email")}: {email}
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}
