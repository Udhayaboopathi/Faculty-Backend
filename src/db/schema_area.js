import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const area = mysqlTable('area', {
  Sno: int('Sno').primaryKey().autoincrement(),
  emp_id: varchar('emp_id', { length: 10 }).notNull(),
  area: varchar('area', { length: 50 }),
});
