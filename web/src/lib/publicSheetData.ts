import Papa from "papaparse";

/**
 * Content/Gallery come from Sheets "Publish to web" CSV links — public by
 * design, safe to fetch with a plain unauthenticated request. See the
 * `People` data in sheetsApi.ts for the sensitive-data path, which is
 * handled differently.
 */

export type ContentEntry = {
  key: string;
  en: string;
  mr: string;
};

export type GalleryEntry = {
  driveLink: string;
  captionEn: string;
  captionMr: string;
  sortOrder: number;
};

async function fetchCsv(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet CSV (${res.status}): ${url}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

export async function getContent(): Promise<ContentEntry[]> {
  const url = process.env.CONTENT_CSV_URL;
  if (!url) return [];
  const rows = await fetchCsv(url);
  return rows
    .filter((r) => r.Key)
    .map((r) => ({
      key: r.Key.trim(),
      en: (r.EN ?? "").trim(),
      mr: (r.MR ?? "").trim(),
    }));
}

export async function getContentMap(): Promise<Record<string, { en: string; mr: string }>> {
  const entries = await getContent();
  return Object.fromEntries(entries.map((e) => [e.key, { en: e.en, mr: e.mr }]));
}

export async function getGallery(): Promise<GalleryEntry[]> {
  const url = process.env.GALLERY_CSV_URL;
  if (!url) return [];
  const rows = await fetchCsv(url);
  return rows
    .filter((r) => r["Drive Share Link"])
    .map((r) => ({
      driveLink: r["Drive Share Link"].trim(),
      captionEn: (r["Caption EN"] ?? "").trim(),
      captionMr: (r["Caption MR"] ?? "").trim(),
      sortOrder: Number(r["Sort Order"] ?? 0) || 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Converts a Google Drive "share link" (.../file/d/FILE_ID/view) into a
 * directly-embeddable thumbnail URL. More reliable for hotlinking than the
 * older `uc?export=view` pattern, which Google often blocks.
 */
export function driveLinkToImageUrl(driveLink: string, width = 1000): string | null {
  const match = driveLink.match(/\/file\/d\/([^/]+)/) ?? driveLink.match(/[?&]id=([^&]+)/);
  const fileId = match?.[1];
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}
