import { int, mysqlTable } from "drizzle-orm/mysql-core";

export const da_percentage = mysqlTable("da_percentage", {
    id: int("id").primaryKey().autoincrement(),
    da_percent: int("da_percent"),
});
