import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { collections } from "../../db/schema.js";

const allowedStatuses = new Set(["logged", "pickup_confirmed", "received", "credited"]);

function cleanText(value: unknown, max = 160) {
  return typeof value === "string" ? value.replace(/[<>\u0000-\u001F]/g, "").trim().slice(0, max) : "";
}

function serialize(row: typeof collections.$inferSelect) {
  return {
    ...row,
    gps: { lat: row.gpsLat, lng: row.gpsLng, mocked: row.gpsMocked },
    loggedAt: row.loggedAt.toLocaleString("en-IN"),
    receivedAt: row.receivedAt?.toLocaleString("en-IN") ?? null,
    creditedAt: row.creditedAt?.toLocaleString("en-IN") ?? null,
    synced: true,
  };
}

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const rows = await db.select().from(collections).orderBy(desc(collections.loggedAt)).limit(250);
      return Response.json(rows.map(serialize));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const id = cleanText(body.id, 24);
      const collector = cleanText(body.collector, 100);
      const city = cleanText(body.city, 120);
      const item = cleanText(body.item, 80);
      const loggedWeight = Number(body.loggedWeight);
      if (!id || !collector || !city || !item || !Number.isFinite(loggedWeight) || loggedWeight <= 0) {
        return Response.json({ error: "Invalid collection details" }, { status: 400 });
      }
      const [created] = await db.insert(collections).values({
        id, collector, city, item, loggedWeight,
        weightSource: body.weightSource === "ai_camera" ? "ai_camera" : "manual",
        photoCaptured: Boolean(body.photoCaptured),
        photoHash: cleanText(body.photoHash, 40) || null,
        gpsLat: Number.isFinite(Number(body.gps?.lat)) ? Number(body.gps.lat) : null,
        gpsLng: Number.isFinite(Number(body.gps?.lng)) ? Number(body.gps.lng) : null,
        gpsMocked: Boolean(body.gps?.mocked),
      }).onConflictDoNothing({ target: collections.id }).returning();
      if (created) return Response.json(serialize(created), { status: 201 });
      const [existing] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
      if (!existing) return Response.json({ error: "Collection could not be stored" }, { status: 409 });
      return Response.json(serialize(existing));
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const id = cleanText(body.id, 24);
      const status = cleanText(body.status, 24);
      if (!id || !allowedStatuses.has(status)) {
        return Response.json({ error: "Invalid update" }, { status: 400 });
      }
      const [updated] = await db.update(collections).set({
        status,
        verifiedWeight: Number.isFinite(Number(body.verifiedWeight)) ? Number(body.verifiedWeight) : null,
        anomaly: Boolean(body.anomaly),
        anomalyNote: cleanText(body.anomalyNote, 320),
        points: Number.isInteger(body.points) ? Math.max(0, body.points) : 0,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
        creditedAt: body.creditedAt ? new Date(body.creditedAt) : null,
      }).where(eq(collections.id, id)).returning();
      if (!updated) return Response.json({ error: "Record not found" }, { status: 404 });
      return Response.json(serialize(updated));
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH" } });
  } catch (error) {
    console.error("Collections API error", error);
    return Response.json({ error: "The ledger is temporarily unavailable" }, { status: 500 });
  }
};

export const config: Config = { path: "/api/collections" };
