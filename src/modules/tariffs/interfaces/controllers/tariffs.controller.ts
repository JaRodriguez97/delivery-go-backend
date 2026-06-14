import { Request, Response } from "express";
import { PrismaTariffsRepository } from "../../infrastructure/repositories/prisma-tariffs.repository";

const repo = new PrismaTariffsRepository();

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
  }>;
};

async function calculateRoadDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<number | null> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
  );
  url.searchParams.set("overview", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Delivery-GO/1.0 (contact: soporte@deliverygo.local)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OsrmRouteResponse;
    if (payload.code !== "Ok" || !payload.routes?.length) {
      return null;
    }

    const meters = Number(payload.routes[0]?.distance ?? NaN);
    if (!Number.isFinite(meters) || meters <= 0) {
      return null;
    }

    return meters / 1000;
  } catch {
    return null;
  }
}

const CALI_BOUNDS = {
  minLat: 3.2,
  maxLat: 3.6,
  minLon: -76.7,
  maxLon: -76.3,
};

function isInsideCaliBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= CALI_BOUNDS.minLat &&
    latitude <= CALI_BOUNDS.maxLat &&
    longitude >= CALI_BOUNDS.minLon &&
    longitude <= CALI_BOUNDS.maxLon
  );
}

function normalizeCoordinatesForCali(
  latitude: number,
  longitude: number,
): {
  latitude: number;
  longitude: number;
} {
  if (isInsideCaliBounds(latitude, longitude)) {
    return { latitude, longitude };
  }

  if (isInsideCaliBounds(longitude, latitude)) {
    return { latitude: longitude, longitude: latitude };
  }

  return { latitude, longitude };
}

export class TariffsController {
  static async list(_req: Request, res: Response) {
    try {
      const tariffs = await repo.getTariffs();
      res.json({ data: tariffs });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tarifas" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const tariff = await repo.getTariffById(req.params.id as string);
      if (!tariff) {
        res.status(404).json({ error: "Tarifa no encontrada" });
        return;
      }
      res.json(tariff);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tarifa" });
    }
  }

  static async history(req: Request, res: Response) {
    try {
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
      const history = await repo.getTariffChangeHistory(limit);
      res.json({ data: history });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener historial de tarifas" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const result = await repo.createTariff(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear tarifa" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await repo.updateTariff(req.params.id as string, req.body);
      res.json({ message: "Tarifa actualizada" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar tarifa" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await repo.deleteTariff(req.params.id as string);
      res.json({ message: "Tarifa desactivada" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar tarifa" });
    }
  }

  static async calculate(req: Request, res: Response) {
    try {
      const rawDistance = Number(req.query.distance);
      const rawOriginLat = Number(req.query.originLat);
      const rawOriginLon = Number(req.query.originLon);
      const rawDestinationLat = Number(req.query.destinationLat);
      const rawDestinationLon = Number(req.query.destinationLon);

      let distance: number;

      const hasCoordinatePayload =
        Number.isFinite(rawOriginLat) &&
        Number.isFinite(rawOriginLon) &&
        Number.isFinite(rawDestinationLat) &&
        Number.isFinite(rawDestinationLon);

      if (hasCoordinatePayload) {
        const origin = normalizeCoordinatesForCali(rawOriginLat, rawOriginLon);
        const destination = normalizeCoordinatesForCali(
          rawDestinationLat,
          rawDestinationLon,
        );

        if (
          !isInsideCaliBounds(origin.latitude, origin.longitude) ||
          !isInsideCaliBounds(destination.latitude, destination.longitude)
        ) {
          res.status(400).json({
            error:
              "Coordenadas fuera de Cali. Verifica la ubicación actual y la dirección seleccionada.",
          });
          return;
        }

        const roadDistance = await calculateRoadDistanceKm(origin, destination);

        distance =
          roadDistance ??
          calculateHaversineKm(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude,
          );

        distance = Math.round(distance * 100) / 100;

        if (distance > 120) {
          res.status(400).json({
            error:
              "Distancia fuera de rango esperado para Cali. Reintenta con una dirección válida.",
          });
          return;
        }
      } else {
        distance = rawDistance;
      }

      if (!Number.isFinite(distance) || distance < 0) {
        res.status(400).json({ error: "Distancia inválida" });
        return;
      }

      const result = await repo.calculateFee(distance);
      if (!result) {
        res.status(404).json({ error: "No hay tarifa activa configurada" });
        return;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al calcular tarifa" });
    }
  }
}
