// drizzle-orm schema for emp_role_master
import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const empRoleMaster = mysqlTable('emp_role_master', {
  id: int('id').primaryKey().autoincrement(),
  emp_id: int('emp_id'),
  role_id: int('role_id'),
  status: int('status'),
});
