import { int, mysqlTable, varchar, text, date } from 'drizzle-orm/mysql-core';

export const patent = mysqlTable('patent', {
  Id: int('Id').primaryKey().autoincrement(),
  emp_id: varchar('emp_id', { length: 10 }).notNull(),
  Categry: varchar('Categry', { length: 64 }),
  Level: varchar('Level', { length: 100 }),
  Name: varchar('Name', { length: 300 }).notNull(),
  Detail: text('Detail').notNull(),
  Fdate: date('Fdate'),
  Issued: varchar('Issued', { length: 300 }).notNull(),
  Stus: varchar('Stus', { length: 100 }),
  PNumber: varchar('PNumber', { length: 40 }).notNull(),
});
