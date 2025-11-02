// drizzle-orm schema for emp_dept_master
import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const empDeptMaster = mysqlTable('emp_dept_master', {
  id: int('id').primaryKey().autoincrement(),
  emp_id: int('emp_id'),
  dept_id: int('dept_id'),
  status: int('status'),
});
