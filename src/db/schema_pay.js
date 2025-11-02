import {
    int,
    mysqlTable,
    timestamp,
    varchar,
} from "drizzle-orm/mysql-core";

export const pay = mysqlTable("pay", {
  id: int("id").primaryKey().autoincrement(),

  emp_id: int("emp_id").notNull(),

  BASIC: int("BASIC").notNull(),
  PERPAY: int("PERPAY").notNull(),
  GPAY: int("GPAY").notNull(),
  DA: int("DA").notNull(),
  ADA: int("ADA").notNull(),
  HRA: int("HRA").notNull(),
  CCA: int("CCA").notNull(),
  MEDALA: int("MEDALA").notNull(),
  MEDALB: int("MEDALB").notNull(),
  SPLALA: int("SPLALA").notNull(),
  SPLALB: int("SPLALB").notNull(),
  PFSUB: int("PFSUB").notNull(),
  PFLOAN: int("PFLOAN").notNull(),
  SPLPF: int("SPLPF").notNull(),
  FBF: int("FBF").notNull(),
  GROSINSU: int("GROSINSU").notNull(),
  LIC: int("LIC").notNull(),
  FESADV: int("FESADV").notNull(),
  CPSSUB: int("CPSSUB").notNull(),
  HFUND: int("HFUND").notNull(),
  ENDADV: int("ENDADV").notNull(),
  MRGADV: int("MRGADV").notNull(),
  CYADV: int("CYADV").notNull(),
  HSLN: int("HSLN").notNull(),
  VHLN: int("VHLN").notNull(),
  ITAX: int("ITAX").notNull(),
  PTAX: int("PTAX").notNull(),
  BANKLOAN: int("BANKLOAN").notNull(),
  SOCIETY: int("SOCIETY").notNull(),
  COOPTEX: int("COOPTEX").notNull(),
  HDFC: int("HDFC").notNull(),
  OTHERS: int("OTHERS").notNull(),
  QUARENT: int("QUARENT").notNull(),

  GROSS: int("GROSS").notNull(),
  TOTAL_DEDUC: int("TOTAL_DEDUC").notNull(),
  NET_PAY: int("NET_PAY").notNull(),

  month: varchar("month", { length: 20 }).notNull(),

  Daarra: int("Daarra").notNull(),
  Daarrb: int("Daarrb").notNull(),
  SevenArr: int("SevenArr").notNull(),
  SurLeaveSalary: int("SurLeaveSalary").notNull(),
  PromoArr: int("PromoArr").notNull(),
  Pongal_Bonus: int("Pongal_Bonus").notNull(),
  other_all: int("other_all").notNull(),

  payband: varchar("payband", { length: 60 }),

  // CURRENT_TIMESTAMP default
  DateofUpdate: timestamp("DateofUpdate", { mode: "date" })
    .defaultNow(), // works in MySQL

  Designation: varchar("Designation", { length: 200 }),
});