import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const departmentMaster = mysqlTable("department_master", {
  id: int("id").primaryKey().autoincrement(),
  department: varchar("department", { length: 60 }),
  logo: varchar("logo", { length: 250 }),
  status: int("status"),
});