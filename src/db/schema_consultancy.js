import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const consultancy = mysqlTable('Consultancy', {
  id: int('id').primaryKey().autoincrement(),
  emp_id: int('emp_id').notNull(),
  Company: varchar('Company', { length: 1000 }).notNull(),
  Amount: varchar('Amount', { length: 20 }).notNull(),
  From: varchar('From', { length: 10 }).notNull(),
});