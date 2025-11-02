import { date, int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const forigenvisite = mysqlTable('forigenvisite', {
  Id: int('Id').primaryKey().autoincrement(),
  emp_id: varchar('emp_id', { length: 10 }).notNull(),
  Company: varchar('Company', { length: 40 }),
  Purpose: text('Purpose'),
  DFrom: date('DFrom'),
  DTo: date('DTo'),
  Agency: text('Agency'),
  Invitation: varchar('Invitation', { length: 300 }),
  Certificate: varchar('Certificate', { length: 300 }),
});
