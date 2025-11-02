import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const experienceMaster = mysqlTable('experience_master', {
  id: int('id').primaryKey().autoincrement(),
  emp_id: int('emp_id').notNull(),
  company: varchar('company', { length: 60 }).notNull(),
  month_from: varchar('month_from', { length: 50 }),
  year_from: varchar('year_from', { length: 50 }),
  month_upto: varchar('month_upto', { length: 50 }),
  year_upto: varchar('year_upto', { length: 50 }),
  role: varchar('role', { length: 60 }),
  status: int('status'),
  Exp_type: varchar('Exp_type', { length: 20 }),
});
