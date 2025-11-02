// drizzle-orm schema for leave table
import {
  date,
  decimal,
  int,
  mysqlTable,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const leave = mysqlTable("leave", {
  id: int("id").primaryKey().autoincrement(),
  LTYPE: varchar("LTYPE", { length: 10 }),
  EMP_ID: int("EMP_ID"),
  ROLE_ID: int("ROLE_ID"),
  LFROM: date("LFROM"),
  LTO: date("LTO"),
  INCHARGE: varchar("INCHARGE", { length: 20 }),
  RESON: varchar("RESON", { length: 300 }),
  TOTAL: decimal("TOTAL", { precision: 10, scale: 2 }),
  status: tinyint("status"),
  Daytype: varchar("Daytype", { length: 10 }),
  Session: varchar("Session", { length: 2 }),
  Timing: varchar("Timing", { length: 20 }),
  cancel: tinyint("cancel"),
  cancel_reason: varchar("cancel_reason", { length: 200, nullable: true }),
});
