import { int, mysqlTable, text } from 'drizzle-orm/mysql-core';

export const webPages = mysqlTable('webpages', {
  Id: int('Id').primaryKey().autoincrement(),
  emp_id: int('emp_id').notNull(),
  Webpage: text('Webpage'),
  Google: text('Google'),
  VIDWAN: text('VIDWAN'),
  SCOPUS: text('SCOPUS'),
  Publons: text('Publons'),
});
