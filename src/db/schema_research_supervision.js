import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const researchSupervision = mysqlTable('research_supervision', {
  id: int('Id').primaryKey().autoincrement(),
  emp_id: int('emp_id').notNull(),
  Degree: varchar('Degree', { length: 10 }).notNull(),
  Award: int('Award').notNull(),
  Submit: int('Submit').notNull(),
  Guide: int('Guide').notNull(),
});