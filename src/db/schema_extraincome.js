import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const extraincome = mysqlTable("extraincome", {
  UID: int("UID").autoincrement().primaryKey(),
  id: int("id"),                           // employee id (matches employeeMaster.id)
  name: varchar("name", { length: 200 }),
  desig: varchar("desig", { length: 200 }),
  dept: varchar("dept", { length: 200 }),

  // DA arrear 1
  daone: varchar("daone", { length: 11 }).default("0"),
  cpsdaone: varchar("cpsdaone", { length: 11 }).default("0"),
  daoneit: int("daoneit"),

  // DA arrear 2
  datwo: varchar("datwo", { length: 11 }).default("0"),
  cpsdatwo: varchar("cpsdatwo", { length: 11 }).default("0"),
  datwoit: int("datwoit"),

  // EL / Bonus
  el: varchar("el", { length: 11 }).default("0"),
  elit: int("elit"),
  bonus: varchar("bonus", { length: 11 }).default("0"),

  // Promotion arrear
  proarr: varchar("proarr", { length: 11 }).default("0"),
  cpsproarr: varchar("cpsproarr", { length: 11 }).default("0"),
  proarrit: int("proarrit"),

  // Increment arrear
  incarr: varchar("incarr", { length: 11 }).default("0"),
  cpsincarr: varchar("cpsincarr", { length: 11 }).default("0"),
  increit: int("increit"),

  // AGP & CAS
  agparr: varchar("agparr", { length: 11 }).default("0"),
  cascps: int("cascps"),
  casarrit: int("casarrit"),
  cpsagparr: varchar("cpsagparr", { length: 11 }).default("0"),

  // Additional tax & others (used in bottom rows)
  additax: varchar("additax", { length: 11 }).default("0"),
  other: varchar("other", { length: 11 }).default("0"),

  // Financial year label like "2023-2024"
  fyear: varchar("fyear", { length: 8 }),
});