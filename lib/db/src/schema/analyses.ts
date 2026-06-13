import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  structureType: text("structure_type").notNull(),
  severity: text("severity").notNull().default("none"),
  status: text("status").notNull().default("pending"),
  defectCount: integer("defect_count"),
  confidenceScore: real("confidence_score"),
  analysisSpeedMs: integer("analysis_speed_ms"),
  originalImageUrl: text("original_image_url"),
  maskedImageUrl: text("masked_image_url"),
  defectTypes: text("defect_types"),
  notes: text("notes"),
  buildingAge: integer("building_age"),
  numberOfFloors: integer("number_of_floors"),
  materialType: text("material_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
