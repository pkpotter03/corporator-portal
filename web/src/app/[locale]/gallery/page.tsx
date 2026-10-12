import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGallery, driveLinkToImageUrl } from "@/lib/publicSheetData";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gallery");
  const gallery = await getGallery();

  const photos = gallery
    .map((entry) => ({
      ...entry,
      url: driveLinkToImageUrl(entry.driveLink),
    }))
    .filter((entry) => entry.url !== null);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      {photos.length === 0 ? (
        <p className="mt-6 text-zinc-500">{t("empty")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.driveLink}
              className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={photo.url as string}
                  alt={
                    (locale === "mr" ? photo.captionMr : photo.captionEn) || ""
                  }
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
              {(photo.captionEn || photo.captionMr) && (
                <figcaption className="px-2 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {locale === "mr" ? photo.captionMr : photo.captionEn}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
