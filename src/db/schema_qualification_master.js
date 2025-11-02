import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const qualificationMaster = mysqlTable('qualification_master', {
  id: int('id').primaryKey().autoincrement(),
  emp_id: int('emp_id').notNull(),
  qualification: varchar('qualification', { length: 60 }).notNull(),
  year_from: varchar('year_from', { length: 50 }),
  year_upto: varchar('year_upto', { length: 50 }),
  mark: varchar('mark', { length: 30 }),
  institute: varchar('institute', { length: 120 }),
  status: varchar('status', { length: 50 }),
  arrange: int('arrange'),
});
