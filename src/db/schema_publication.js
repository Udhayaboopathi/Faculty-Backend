// Fixed schema definition
import { datetime, decimal, int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const publication = mysqlTable('publication', {
  Id: int('Id').primaryKey().autoincrement(),
  emp_id: varchar('emp_id', { length: 10 }).notNull(),
  P_type: varchar('P_type', { length: 30 }).notNull(),
  Title: text('Title').notNull(),
  P_Name: text('P_Name').notNull(),
  P_Level: varchar('P_Level', { length: 20 }).notNull(),
  Author_1: varchar('Author_1', { length: 30 }).notNull(),
  Author_2: text('Author_2'),
  Author_3: text('Author_3'),
  Volume: int('Volume').notNull(),
  Issue: int('Issue').notNull(),
  Page_from: int('Page_from').notNull(),
  Page_to: int('Page_to').notNull(),
  Impact_F: decimal('Impact_F', { precision: 11, scale: 4 }).notNull(),
  Indexing: varchar('Indexing', { length: 80 }),
  Publisher: text('Publisher').notNull(),
  P_year: int('P_year').notNull(),
  P_month: int('P_month'),
  DOI: text('DOI'),
  Webpage: text('Webpage'),
  Paper: varchar('Paper', { length: 300 }),
  UPDATED: datetime('UPDATED').$defaultFn(() => new Date()).notNull(),
});