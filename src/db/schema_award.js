import { int, mysqlTable, varchar, text, date } from 'drizzle-orm/mysql-core';

export const award = mysqlTable('award', {
  id: int('Id').primaryKey().autoincrement(),
  emp_id: varchar('emp_id', { length: 10 }).notNull(),
  Title: text('Title').notNull(),
  A_date: date('A_date').notNull(),
  Level: varchar('Level', { length: 200 }).notNull(),
  Sponcer: varchar('Sponcer', { length: 40 }).notNull(),
  Spon_Address: text('Spon_Address').notNull(),
});