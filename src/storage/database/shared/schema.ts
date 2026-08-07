import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const authorizations = pgTable(
  "authorizations",
  {
    id: serial().primaryKey(),
    receipt_id: text("receipt_id").notNull().unique(),
    company_name: text("company_name").notNull(),
    candidate_name: text("candidate_name").notNull(),
    id_number_masked: text("id_number_masked").notNull(),
    phone_masked: text("phone_masked").notNull(),
    signature_key: text("signature_key").notNull(),
    authorization_text: text("authorization_text").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("authorizations_receipt_id_idx").on(table.receipt_id),
    index("authorizations_created_at_idx").on(table.created_at),
  ]
);
