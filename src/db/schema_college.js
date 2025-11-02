import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const college = pgTable('college', {
    Id: serial('Id').primaryKey(),
    Name: varchar('Name', { length: 500 }),
});