import { Request, Response } from "express";

type NominatimSearchResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

const CALI_BOUNDS = {
  minLat: 3.3,
  maxLat: 3.52,
  minLon: -76.63,
  maxLon: -76.44,
};

function normalizeAddressQuery(input: string): string {
  let normalized = input.toLowerCase().trim();

  normalized = normalized
    .replace(/\bcra\b|\bcra\.\b|\bkr\b|\bkr\.\b|\bkra\b/g, "carrera")
    .replace(/\bcl\b|\bcl\.\b/g, "calle")
    .replace(/\bav\b|\bav\.\b/g, "avenida")
    .replace(/\bno\b|\bnro\b|\bnum\b|\bnúmero\b|\bnumero\b/g, "#")
    .replace(/\bn\b(?=\s*\d)/g, "#")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function buildQueryVariants(query: string): string[] {
  const normalized = normalizeAddressQuery(query);
  const compact = normalized.replace(/\s+/g, " ").trim();

  return Array.from(
    new Set(
      [
        query.trim(),
        normalized,
        compact,
        normalized.replace(/\s*-\s*/g, "-"),
      ].filter(Boolean),
    ),
  ).slice(0, 4);
}

function isInsideCali(lat: number, lon: number): boolean {
  return (
    lat >= CALI_BOUNDS.minLat &&
    lat <= CALI_BOUNDS.maxLat &&
    lon >= CALI_BOUNDS.minLon &&
    lon <= CALI_BOUNDS.maxLon
  );
}

function scoreResult(
  displayName: string,
  street: string,
  query: string,
): number {
  const display = displayName.toLowerCase();
  const streetValue = street.toLowerCase();
  const normalizedQuery = normalizeAddressQuery(query);

  let score = 0;

  if (display.includes("cali") || streetValue.includes("cali")) score += 10;
  if (
    display.includes(normalizedQuery) ||
    streetValue.includes(normalizedQuery)
  )
    score += 30;

  const tokens = normalizedQuery
    .split(" ")
    .filter((token) => token.length >= 2);
  for (const token of tokens) {
    if (display.includes(token) || streetValue.includes(token)) {
      score += 4;
    }
  }

  if (
    /\d+\s*[-#]\s*\d+/.test(display) ||
    /\d+\s*[-#]\s*\d+/.test(streetValue)
  ) {
    score += 25;
  }

  if (streetValue.includes("carrera") || streetValue.includes("calle")) {
    score += 10;
  }

  return score;
}

export class GeocodeController {
  static async search(req: Request, res: Response) {
    const query = String(req.query.q ?? "").trim();
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(12, requestedLimit))
      : 8;

    if (!query || query.length < 3) {
      res.json({ data: [] });
      return;
    }

    const queryVariants = buildQueryVariants(query);

    try {
      const results = await Promise.all(
        queryVariants.map(async (variant) => {
          const url = new URL("https://nominatim.openstreetmap.org/search");
          url.searchParams.set("q", `${variant}, Cali, Colombia`);
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("addressdetails", "1");
          url.searchParams.set("limit", String(Math.max(8, limit)));
          url.searchParams.set("countrycodes", "co");
          url.searchParams.set("viewbox", "-76.62,3.51,-76.45,3.31");
          url.searchParams.set("bounded", "1");

          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Delivery-GO/1.0 (contact: soporte@deliverygo.local)",
              "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
            },
          });

          if (!response.ok) {
            return [] as NominatimSearchResult[];
          }

          return (await response.json()) as NominatimSearchResult[];
        }),
      );

      const mergedRaw = results.flat();

      const data = mergedRaw
        .map((item) => {
          const resolvedCity =
            item.address?.city ??
            item.address?.town ??
            item.address?.village ??
            "";
          const houseNumber = item.address?.house_number?.trim() ?? "";
          const road = item.address?.road?.trim() ?? "";
          const street = [road, houseNumber].filter(Boolean).join(" ").trim();
          const latitude = Number(item.lat ?? 0);
          const longitude = Number(item.lon ?? 0);

          return {
            displayName: item.display_name ?? "",
            street,
            neighborhood:
              item.address?.neighbourhood ??
              item.address?.suburb ??
              item.address?.city_district ??
              "",
            city: resolvedCity,
            latitude,
            longitude,
          };
        })
        .filter((item) => {
          const cityValue = item.city.toLowerCase();
          const displayValue = item.displayName.toLowerCase();
          return (
            (cityValue.includes("cali") || displayValue.includes("cali")) &&
            isInsideCali(item.latitude, item.longitude)
          );
        })
        .sort((a, b) => {
          const scoreA = scoreResult(a.displayName, a.street, query);
          const scoreB = scoreResult(b.displayName, b.street, query);
          return scoreB - scoreA;
        })
        .filter((item, index, array) => {
          const key = `${item.latitude.toFixed(6)}|${item.longitude.toFixed(6)}`;
          return (
            array.findIndex(
              (candidate) =>
                `${candidate.latitude.toFixed(6)}|${candidate.longitude.toFixed(6)}` ===
                key,
            ) === index
          );
        })
        .slice(0, limit);

      res.json({ data });
    } catch {
      res.status(500).json({ error: "Error al consultar el geocoder" });
    }
  }

  static async reverse(req: Request, res: Response) {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ error: "Coordenadas inválidas" });
      return;
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Delivery-GO/1.0 (contact: soporte@deliverygo.local)",
          "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
        },
      });

      if (!response.ok) {
        res.status(502).json({ error: "No se pudo consultar el geocoder" });
        return;
      }

      const raw = (await response.json()) as NominatimSearchResult;
      res.json({
        displayName: raw.display_name ?? "",
        street: raw.address?.road ?? "",
        neighborhood:
          raw.address?.neighbourhood ??
          raw.address?.suburb ??
          raw.address?.city_district ??
          "",
        city:
          raw.address?.city ?? raw.address?.town ?? raw.address?.village ?? "",
        latitude,
        longitude,
      });
    } catch {
      res.status(500).json({ error: "Error al consultar el geocoder" });
    }
  }
}
