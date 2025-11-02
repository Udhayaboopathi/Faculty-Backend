// drizzle-orm schema for role_masterrole
import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';

export const roleMaster = mysqlTable('role_master', {
  id: int('id').primaryKey().autoincrement(),
  dept_id: int('dept_id'),
  role: varchar('role', { length: 60 }),
  logo: varchar('logo', { length: 250 }),
  status: int('status')
});
