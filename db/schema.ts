import { boolean, doublePrecision, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  collector: text("collector").notNull(),
  city: text("city").notNull(),
  item: text("item").notNull(),
  loggedWeight: doublePrecision("logged_weight").notNull(),
  weightSource: text("weight_source").notNull().default("manual"),
  photoCaptured: boolean("photo_captured").notNull().default(false),
  photoHash: text("photo_hash"),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  gpsMocked: boolean("gps_mocked").notNull().default(false),
  status: text("status").notNull().default("logged"),
  anomaly: boolean("anomaly").notNull().default(false),
  anomalyNote: text("anomaly_note").notNull().default(""),
  verifiedWeight: doublePrecision("verified_weight"),
  points: integer("points").notNull().default(0),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  creditedAt: timestamp("credited_at", { withTimezone: true }),
});
