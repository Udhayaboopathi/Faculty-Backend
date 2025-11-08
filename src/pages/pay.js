import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { da_percentage } from "../db/schema_da_percentage.js";
import { departmentMaster } from "../db/schema_department_master.js";
import { empDeptMaster } from "../db/schema_emp_dept_master.js";
import { empRoleMaster } from "../db/schema_emp_role_master.js";
import { extraincome } from "../db/schema_extraincome.js";
import { employeeMasterNonTeaching } from "../db/schema_non_teaching.js";
import { pay } from "../db/schema_pay.js";
import { roleMaster } from "../db/schema_role_master.js";
import { employeeMaster } from "../db/schema_teaching.js";

export const getPayDetails = async (req, res) => {
  const current_user = req.user;
  const { month } = req.query; // assuming frontend sends ?month=2022-03

  try {
    // Try fetching from teaching table first
    let payDetails = await db
      .select({
        ...pay,
        employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))`,
        Department: departmentMaster.department,
        Designation: roleMaster.role,
        PanNo: employeeMaster.pan_no,
        DOB: employeeMaster.dob,
        DOJ: employeeMaster.doj,
        DOR: employeeMaster.resume,
        PAYLevel: employeeMaster.bank_no,
      })
      .from(pay)
      .leftJoin(employeeMaster, eq(pay.emp_id, employeeMaster.id))
      .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, employeeMaster.id))
      .leftJoin(
        departmentMaster,
        eq(departmentMaster.id, empDeptMaster.dept_id)
      )
      .leftJoin(empRoleMaster, eq(empRoleMaster.emp_id, employeeMaster.id))
      .leftJoin(roleMaster, eq(roleMaster.id, empRoleMaster.role_id))
      .where(and(eq(pay.emp_id, current_user.EMP_ID), eq(pay.month, month)));

    // If not found or name/designation missing, try non-teaching
    if (
      !payDetails.length ||
      (!payDetails[0].employeeName && !payDetails[0].Designation)
    ) {
      payDetails = await db
        .select({
          ...pay,
          employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMasterNonTeaching.first_name}, ${employeeMasterNonTeaching.last_name}))`,
          Department: employeeMasterNonTeaching.dept,
          Designation: employeeMasterNonTeaching.designation,
          PanNo: employeeMasterNonTeaching.pan_no,
          DOB: employeeMasterNonTeaching.dob,
          DOJ: employeeMasterNonTeaching.doj,
          DOR: employeeMasterNonTeaching.resume,
          PAYLevel: employeeMasterNonTeaching.bank_no,
        })
        .from(pay)
        .leftJoin(
          employeeMasterNonTeaching,
          eq(pay.emp_id, employeeMasterNonTeaching.id)
        )
        .where(and(eq(pay.emp_id, current_user.EMP_ID), eq(pay.month, month)));
    }

    res.json({ success: true, payDetails });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export async function getPayDetailsAdmin(req, res) {
  const { empId, month } = req.query; // expecting ?empId=123&month=2022-03

  if (!empId || !month) {
    return res
      .status(400)
      .json({ success: false, message: "empId and month are required" });
  }

  try {
    // Try fetching from teaching table first
    let payDetails = await db
      .select({
        ...pay,
        employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))`,
        Department: departmentMaster.department,
        Designation: roleMaster.role,
        PanNo: employeeMaster.pan_no,
        DOB: employeeMaster.dob,
        DOJ: employeeMaster.doj,
        DOR: employeeMaster.resume,
        PAYLevel: employeeMaster.bank_no,
      })
      .from(pay)
      .leftJoin(employeeMaster, eq(pay.emp_id, employeeMaster.id))
      .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, employeeMaster.id))
      .leftJoin(
        departmentMaster,
        eq(departmentMaster.id, empDeptMaster.dept_id)
      )
      .leftJoin(empRoleMaster, eq(empRoleMaster.emp_id, employeeMaster.id))
      .leftJoin(roleMaster, eq(roleMaster.id, empRoleMaster.role_id))
      .where(and(eq(pay.emp_id, Number(empId)), eq(pay.month, month)));

    // If not found or name/designation missing, try non-teaching
    if (
      !payDetails.length ||
      (!payDetails[0].employeeName && !payDetails[0].Designation)
    ) {
      payDetails = await db
        .select({
          ...pay,
          employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMasterNonTeaching.first_name}, ${employeeMasterNonTeaching.last_name}))`,
          Department: employeeMasterNonTeaching.dept,
          Designation: employeeMasterNonTeaching.designation,
          PanNo: employeeMasterNonTeaching.pan_no,
          DOB: employeeMasterNonTeaching.dob,
          DOJ: employeeMasterNonTeaching.doj,
          DOR: employeeMasterNonTeaching.resume,
          PAYLevel: employeeMasterNonTeaching.bank_no,
        })
        .from(pay)
        .leftJoin(
          employeeMasterNonTeaching,
          eq(pay.emp_id, employeeMasterNonTeaching.id)
        )
        .where(and(eq(pay.emp_id, Number(empId)), eq(pay.month, month)));
    }

    res.json({ success: true, payDetails });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

/* ----------------------- helpers ----------------------- */
const N = (v) => (v === "" || v == null ? 0 : Number(v));

/**
 * POST /api/pay
 * Body accepts your field names. No calculations for DA, HRA, etc.
 * All values are saved as received from frontend.
 */
export const postPayDetails = async (req, res) => {
  try {
    const adminId = req.user?.EMP_ID;
    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (adminId !== 1) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only admin can post pay details",
      });
    }

    const daPercentage = await db
      .select()
      .from(da_percentage)
      .orderBy(asc(da_percentage.id))
      .limit(1);
    if (!daPercentage.length) {
      return res.status(500).json({
        success: false,
        message: "DA percentage not configured in the system",
      });
    }
    // use the actual column name `da_percent`
    const da_percent = daPercentage[0].da_percent || 0;
    const {
      empId, // employee ID to post for
      month,
      // Earnings block (UI left)
      basic,
      perpay,
      gpay,
      da,
      ada,
      hra,
      cca,
      medala,
      medalb,
      splala,
      splalb,
      Daarra,
      DaArrb,
      SevenArr,
      SurLeaveSalary,
      PromoArr,
      Pongal_Bonus,
      other_all,

      // Deductions block (UI right)
      pfsub,
      pfloan,
      splpf,
      fbf,
      grosinsu,
      lic,
      fesadv,
      cpssub,
      hfund,
      endadv,
      mrgadv,
      cyadv,
      hsln,
      vhln,
      itax,
      ptax,
      bankloan,
      society,
      cooptex,
      hdfc,
      others,
      quarent,

      gross,
      total_deduc,
      net_pay,
    } = req.body || {};

    if (!empId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized staff" });
    if (!month)
      return res
        .status(400)
        .json({ success: false, message: "month is required" });

    // Validate DA allowing for small rounding/format differences
    const expectedDA = Math.round(N(basic) * da_percent / 100);
    if (Math.abs(expectedDA - N(da)) > 0.5) {
      return res.status(400).json({
        success: false,
        message: `DA should be ${da_percent}% of Basic. Expected: ${expectedDA}, Got: ${N(da)}`,
      });
    }

    // Get payband (bank_no) from employeeMaster
    // Get role_id from empDeptMaster, then get role from roleMaster
    const empData = await db
      .select({
        payband: employeeMaster.bank_no,
        designation: sql`COALESCE(${roleMaster.role}, '')`.as("designation"),
      })
      .from(employeeMaster)
      .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, employeeMaster.id))
      .leftJoin(roleMaster, eq(roleMaster.id, empDeptMaster.role_id))
      .where(eq(employeeMaster.id, empId))
      .limit(1);

    const payband = empData[0]?.payband ?? null;
    const designation = empData[0]?.designation ?? "";

    // Build the record using input values only
    const row = {
      emp_id: empId,
      month,
      BASIC: N(basic),
      PERPAY: N(perpay),
      GPAY: N(gpay),
      DA: N(da),
      ADA: N(ada),
      HRA: N(hra),
      CCA: N(cca),
      MEDALA: N(medala),
      MEDALB: N(medalb),
      SPLALA: N(splala),
      SPLALB: N(splalb),

      PFSUB: N(pfsub),
      PFLOAN: N(pfloan),
      SPLPF: N(splpf),
      FBF: N(fbf),
      GROSINSU: N(grosinsu),
      LIC: N(lic),
      FESADV: N(fesadv),
      CPSSUB: N(cpssub),
      HFUND: N(hfund),
      ENDADV: N(endadv),
      MRGADV: N(mrgadv),
      CYADV: N(cyadv),
      HSLN: N(hsln),
      VHLN: N(vhln),
      ITAX: N(itax),
      PTAX: N(ptax),
      BANKLOAN: N(bankloan),
      SOCIETY: N(society),
      COOPTEX: N(cooptex),
      HDFC: N(hdfc),
      OTHERS: N(others),
      QUARENT: N(quarent),

      GROSS: N(gross),
      TOTAL_DEDUC: N(total_deduc),
      NET_PAY: N(net_pay),

      Daarra: N(Daarra),
      Daarrb: N(DaArrb),
      SevenArr: N(SevenArr),
      SurLeaveSalary: N(SurLeaveSalary),
      PromoArr: N(PromoArr),
      Pongal_Bonus: N(Pongal_Bonus),
      other_all: N(other_all),

      payband,
      Designation: designation, // Fixed: Use capital D to match schema
    };

    await db.insert(pay).values(row);

    // Return the saved record
    const saved = await db
      .select()
      .from(pay)
      .where(and(eq(pay.emp_id, empId), eq(pay.month, month)))
      .limit(1);

    return res.json({
      success: true,
      data: saved[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const bulkUploadPay = async (req, res) => {
  try {
    const adminId = req.user?.EMP_ID;
    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (adminId !== 1) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only admin can bulk upload pay details",
      });
    }

    const records = Array.isArray(req.body) ? req.body : [];
    if (!records.length)
      return res
        .status(400)
        .json({ success: false, message: "No records provided" });

    // Get DA percentage from database
    const daPercentage = await db
      .select()
      .from(da_percentage)
      .orderBy(asc(da_percentage.id))
      .limit(1);
    if (!daPercentage.length) {
      return res.status(500).json({
        success: false,
        message: "DA percentage not configured in the system",
      });
    }
    const da_percent = daPercentage[0].da_percent || 0;

    const results = [];
    for (const rec of records) {
      const {
        empId,
        month,
        basic,
        perpay,
        gpay,
        da,
        ada,
        hra,
        cca,
        medala,
        medalb,
        splala,
        splalb,
        Daarra,
        DaArrb,
        payband,
        designation,
        SevenArr,
        SurLeaveSalary,
        PromoArr,
        Pongal_Bonus,
        other_all,
        pfsub,
        pfloan,
        splpf,
        fbf,
        grosinsu,
        lic,
        fesadv,
        cpssub,
        hfund,
        endadv,
        mrgadv,
        cyadv,
        hsln,
        vhln,
        itax,
        ptax,
        bankloan,
        society,
        cooptex,
        hdfc,
        others,
        quarent,
        gross,
        total_deduc,
        net_pay,
      } = rec || {};

      if (!empId || !month) {
        results.push({
          success: false,
          empId,
          month,
          message: "empId and month are required",
        });
        continue;
      }

      // Validate DA calculation (allow small rounding differences)
      const expectedDA = Math.round(N(basic) * da_percent / 100);
      if (Math.abs(expectedDA - N(da)) > 0.5) {
        results.push({
          success: false,
          empId,
          month,
          message: `DA should be ${da_percent}% of Basic. Expected: ${expectedDA}, Got: ${N(da)}`,
        });
        continue;
      }

      // Get payband and designation
      const empData = await db
        .select({
          payband: employeeMaster.bank_no,
          designation: sql`COALESCE(${roleMaster.role}, '')`.as("designation"),
        })
        .from(employeeMaster)
        .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, employeeMaster.id))
        .leftJoin(roleMaster, eq(roleMaster.id, empDeptMaster.role_id))
        .where(eq(employeeMaster.id, empId))
        .limit(1);


      const row = {
        emp_id: empId,
        month,
        BASIC: N(basic),
        PERPAY: N(perpay),
        GPAY: N(gpay),
        DA: N(da),
        ADA: N(ada),
        HRA: N(hra),
        CCA: N(cca),
        MEDALA: N(medala),
        MEDALB: N(medalb),
        SPLALA: N(splala),
        SPLALB: N(splalb),
        PFSUB: N(pfsub),
        PFLOAN: N(pfloan),
        SPLPF: N(splpf),
        FBF: N(fbf),
        GROSINSU: N(grosinsu),
        LIC: N(lic),
        FESADV: N(fesadv),
        CPSSUB: N(cpssub),
        HFUND: N(hfund),
        ENDADV: N(endadv),
        MRGADV: N(mrgadv),
        CYADV: N(cyadv),
        HSLN: N(hsln),
        VHLN: N(vhln),
        ITAX: N(itax),
        PTAX: N(ptax),
        BANKLOAN: N(bankloan),
        SOCIETY: N(society),
        COOPTEX: N(cooptex),
        HDFC: N(hdfc),
        OTHERS: N(others),
        QUARENT: N(quarent),
        GROSS: N(gross),
        TOTAL_DEDUC: N(total_deduc),
        NET_PAY: N(net_pay),
        Daarra: N(Daarra),
        Daarrb: N(DaArrb),
        SevenArr: N(SevenArr),
        SurLeaveSalary: N(SurLeaveSalary),
        PromoArr: N(PromoArr),
        Pongal_Bonus: N(Pongal_Bonus),
        other_all: N(other_all),
        payband,
        Designation: designation, // Fixed: Use capital D to match schema
      };

      try {
        await db.insert(pay).values(row);
        const saved = await db
          .select()
          .from(pay)
          .where(and(eq(pay.emp_id, empId), eq(pay.month, month)))
          .limit(1);
        results.push({ success: true, data: saved[0] });
      } catch (err) {
        results.push({ success: false, empId, month, error: err.message });
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const pick = (body, camel, upper) =>
  body?.[camel] !== undefined ? body[camel] : body?.[upper];

export const editPayDetails = async (req, res) => {
  try {
    const adminId = req.user?.EMP_ID;
    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (adminId !== 1) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only admin can edit pay details",
      });
    }

    // accept id OR (empId + month)
    const payIdRaw = pick(req.body, "id", "id");
    const empId = pick(req.body, "empId", "emp_id");
    const month = pick(req.body, "month", "month");

    if (!payIdRaw && !(empId && month)) {
      return res.status(400).json({
        success: false,
        message: "Provide either id or both empId and month",
      });
    }

    // IMPORTANT: cast id to correct type (Number if your schema uses integer)
    const payId = payIdRaw ? Number(payIdRaw) : null;

    // where clause
    const targetWhere = payId
      ? eq(pay.id, payId)
      : and(eq(pay.emp_id, empId), eq(pay.month, month));

    // ensure exists
    const existing = await db.select().from(pay).where(targetWhere).limit(1);
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Pay record not found" });
    }

    // optionally refresh payband/designation if empId given
    let payband, designation;
    if (empId) {
      const empData = await db
        .select({
          payband: employeeMaster.bank_no,
          designation: roleMaster.role,
        })
        .from(employeeMaster)
        .leftJoin(empRoleMaster, eq(empRoleMaster.emp_id, employeeMaster.id))
        .leftJoin(roleMaster, eq(roleMaster.id, empRoleMaster.role_id))
        .where(eq(employeeMaster.id, empId))
        .limit(1);

      payband = empData[0]?.payband ?? null;
      designation = empData[0]?.designation ?? "";
    }

    const updateRow = {};
    const setIfProvided = (k, v, numeric = false) => {
      if (v !== undefined) updateRow[k] = numeric ? N(v) : v;
    };

    // identifiers
    setIfProvided("emp_id", empId);
    setIfProvided("month", month);

    // Earnings (accept both cases)
    setIfProvided("BASIC", pick(req.body, "basic", "BASIC"), true);
    setIfProvided("PERPAY", pick(req.body, "perpay", "PERPAY"), true);
    setIfProvided("GPAY", pick(req.body, "gpay", "GPAY"), true);
    setIfProvided("DA", pick(req.body, "da", "DA"), true);
    setIfProvided("ADA", pick(req.body, "ada", "ADA"), true);
    setIfProvided("HRA", pick(req.body, "hra", "HRA"), true);
    setIfProvided("CCA", pick(req.body, "cca", "CCA"), true);
    setIfProvided("MEDALA", pick(req.body, "medala", "MEDALA"), true);
    setIfProvided("MEDALB", pick(req.body, "medalb", "MEDALB"), true);
    setIfProvided("SPLALA", pick(req.body, "splala", "SPLALA"), true);
    setIfProvided("SPLALB", pick(req.body, "splalb", "SPLALB"), true);

    // Deductions
    setIfProvided("PFSUB", pick(req.body, "pfsub", "PFSUB"), true);
    setIfProvided("PFLOAN", pick(req.body, "pfloan", "PFLOAN"), true);
    setIfProvided("SPLPF", pick(req.body, "splpf", "SPLPF"), true);
    setIfProvided("FBF", pick(req.body, "fbf", "FBF"), true);
    setIfProvided("GROSINSU", pick(req.body, "grosinsu", "GROSINSU"), true);
    setIfProvided("LIC", pick(req.body, "lic", "LIC"), true);
    setIfProvided("FESADV", pick(req.body, "fesadv", "FESADV"), true);
    setIfProvided("CPSSUB", pick(req.body, "cpssub", "CPSSUB"), true);
    setIfProvided("HFUND", pick(req.body, "hfund", "HFUND"), true);
    setIfProvided("ENDADV", pick(req.body, "endadv", "ENDADV"), true);
    setIfProvided("MRGADV", pick(req.body, "mrgadv", "MRGADV"), true);
    setIfProvided("CYADV", pick(req.body, "cyadv", "CYADV"), true);
    setIfProvided("HSLN", pick(req.body, "hsln", "HSLN"), true);
    setIfProvided("VHLN", pick(req.body, "vhln", "VHLN"), true);
    setIfProvided("ITAX", pick(req.body, "itax", "ITAX"), true);
    setIfProvided("PTAX", pick(req.body, "ptax", "PTAX"), true);
    setIfProvided("BANKLOAN", pick(req.body, "bankloan", "BANKLOAN"), true);
    setIfProvided("SOCIETY", pick(req.body, "society", "SOCIETY"), true);
    setIfProvided("COOPTEX", pick(req.body, "cooptex", "COOPTEX"), true);
    setIfProvided("HDFC", pick(req.body, "hdfc", "HDFC"), true);
    setIfProvided("OTHERS", pick(req.body, "others", "OTHERS"), true);
    setIfProvided("QUARENT", pick(req.body, "quarent", "QUARENT"), true);

    // Totals
    setIfProvided("GROSS", pick(req.body, "gross", "GROSS"), true);
    setIfProvided(
      "TOTAL_DEDUC",
      pick(req.body, "total_deduc", "TOTAL_DEDUC"),
      true
    );
    setIfProvided("NET_PAY", pick(req.body, "net_pay", "NET_PAY"), true);

    // Arrears / bonuses
    setIfProvided("Daarra", pick(req.body, "Daarra", "Daarra"), true);
    setIfProvided("Daarrb", pick(req.body, "DaArrb", "Daarrb"), true);
    setIfProvided("SevenArr", pick(req.body, "SevenArr", "SevenArr"), true);
    setIfProvided(
      "SurLeaveSalary",
      pick(req.body, "SurLeaveSalary", "SurLeaveSalary"),
      true
    );
    setIfProvided("PromoArr", pick(req.body, "PromoArr", "PromoArr"), true);
    setIfProvided(
      "Pongal_Bonus",
      pick(req.body, "Pongal_Bonus", "Pongal_Bonus"),
      true
    );
    setIfProvided("other_all", pick(req.body, "other_all", "other_all"), true);

    if (payband !== undefined) setIfProvided("payband", payband);
    if (designation !== undefined)
      setIfProvided("Designation", designation ?? ""); // Fixed: Use capital D to match schema

    if (Object.keys(updateRow).length === 0) {
      return res.json({
        success: true,
        message: "No changes provided",
        data: existing[0],
      });
    }

    await db.update(pay).set(updateRow).where(targetWhere);

    // re-select by id if we have it (most robust), otherwise by (emp_id, month)
    const finalWhere = payId
      ? eq(pay.id, payId)
      : and(
          eq(pay.emp_id, updateRow.emp_id ?? empId),
          eq(pay.month, updateRow.month ?? month)
        );

    const updated = await db.select().from(pay).where(finalWhere).limit(1);
    return res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

function monthToFY(ym) {
  // normalize and validate "YYYY-MM" (allow single-digit month too)
  if (typeof ym !== "string" && typeof ym !== "number") return null;
  const s = String(ym).trim();
  const m = s.match(/^(\d{4})\s*-\s*(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mon = Number(m[2]);
  if (!Number.isInteger(y) || !Number.isInteger(mon) || mon < 1 || mon > 12)
    return null;
  return mon >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export const getPayFinancialYears = async (req, res) => {
  try {
    const empId = req.query?.empId ? Number(req.query.empId) : null;

    let q = db.select({ month: pay.month }).from(pay);
    if (empId) q = q.where(eq(pay.emp_id, empId));

    const rows = await q;

    const set = new Set();
    for (const r of rows) {
      // ensure month exists and is valid, monthToFY returns null for invalids
      const fy = monthToFY(r?.month);
      if (fy) set.add(fy);
    }

    // sort descending by start year (e.g., 2025-2026, 2024-2025, ...)
    const years = Array.from(set).sort((a, b) => {
      const ay = Number(a.slice(0, 4));
      const by = Number(b.slice(0, 4));
      return by - ay;
    });

    // return as value/label pairs (UI-ready)
    return res.json({
      success: true,
      years: years.map((y) => ({ value: y, label: y })),
    });
  } catch (err) {
    console.error("getPayFinancialYears error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

function fyToRange(fy) {
  // accepts "2021-2022" or "2021 - 2022"
  const m = String(fy).match(/^\s*(\d{4})\s*-\s*(\d{4})\s*$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (end !== start + 1) return null;
  return { fromMonth: `${start}-03`, toMonth: `${end}-02` };
}

function monthsBetween(fromMonth, toMonth) {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const out = [];
  let y = fy,
    m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[m - 1]}_${y}`;
}

const NN = (v) => (v == null ? 0 : Number(v));

export const getPayrollStatementAdmin = async (req, res) => {
  try {
    const fy = req.query?.fy;
    const empId = req.query?.empId ? Number(req.query.empId) : null;
    if (!fy)
      return res
        .status(400)
        .json({ success: false, message: "fy (e.g., 2023-2024) is required" });
    if (!empId)
      return res
        .status(400)
        .json({ success: false, message: "empId is required" });

    const range = fyToRange(fy);
    if (!range)
      return res
        .status(400)
        .json({ success: false, message: "fy must be like 2023-2024" });
    const monthList = monthsBetween(range.fromMonth, range.toMonth);

    // --- monthly rows ---
    const rowsRaw = await db
      .select({
        month: pay.month,
        BASIC: pay.BASIC,
        GPAY: pay.GPAY,
        DA: pay.DA,
        HRA: pay.HRA,
        CCA: pay.CCA,
        MEDALA: pay.MEDALA,
        other_all: pay.other_all,
        GROSSall: sql`${pay.BASIC} + ${pay.GPAY} + ${pay.DA} + ${pay.HRA} + ${pay.CCA} + ${pay.MEDALA} + ${pay.other_all}`,
        UPFCPF: sql`IF(${pay.PFSUB} = 0, ${pay.CPSSUB}, ${pay.PFSUB})`,
        FBF: pay.FBF,
        SPLPF: pay.SPLPF,
        LIC: pay.LIC,
        ITAX: pay.ITAX,
        PTAX: pay.PTAX,
        HFUND: pay.HFUND,
        REC_COMM: sql`IFNULL(${pay.BANKLOAN}, 0)`,
        RLFv: pay.HDFC,
        OTHERS: pay.OTHERS,
        QUARENT: pay.QUARENT,
        TOTAL_DED: sql`
          IF(${pay.PFSUB} = 0, ${pay.CPSSUB}, ${pay.PFSUB})
          + ${pay.FBF} + ${pay.SPLPF} + ${pay.LIC} + ${pay.ITAX} + ${pay.PTAX} + ${pay.HFUND}
          + IFNULL(${pay.BANKLOAN}, 0) + IFNULL(${pay.HDFC}, 0) + ${pay.OTHERS} + ${pay.QUARENT}
        `,
        Daarra: pay.Daarra,
        Daarrb: pay.Daarrb,
        SurLeaveSalary: pay.SurLeaveSalary,
        Pongal_Bonus: pay.Pongal_Bonus,
        PromoArr: pay.PromoArr,
        SevenArr: pay.SevenArr,
      })
      .from(pay)
      .where(and(eq(pay.emp_id, empId), inArray(pay.month, monthList)))
      .orderBy(asc(pay.month));

    // group per month
    const byMonth = new Map();
    for (const r of rowsRaw) {
      const key = r.month;
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          MONTH: monthLabel(key),
          BASIC: 0,
          GPDP: 0,
          DA: 0,
          HRA: 0,
          CCA: 0,
          MA: 0,
          OA: 0,
          GROSS_AMOUNT: 0,
          UPF_CPS: 0,
          FBF: 0,
          SPF: 0,
          LIC: 0,
          IT: 0,
          PT: 0,
          HF: 0,
          REC_COMM: 0,
          RLF: 0,
          OTHERS_IF_ANY: 0,
          QUARENT: 0,
          TOTAL_DEDUCTION: 0,
        });
      }
      const row = byMonth.get(key);
      row.BASIC += NN(r.BASIC);
      row.GPDP += NN(r.GPAY);
      row.DA += NN(r.DA);
      row.HRA += NN(r.HRA);
      row.CCA += NN(r.CCA);
      row.MA += NN(r.MEDALA);
      row.OA += NN(r.other_all);
      row.GROSS_AMOUNT += NN(r.GROSSall);

      row.UPF_CPS += NN(r.UPFCPF);
      row.FBF += NN(r.FBF);
      row.SPF += NN(r.SPLPF);
      row.LIC += NN(r.LIC);
      row.IT += NN(r.ITAX);
      row.PT += NN(r.PTAX);
      row.HF += NN(r.HFUND);
      row.REC_COMM += NN(r.REC_COMM);
      row.RLF += NN(r.RLFv);
      row.OTHERS_IF_ANY += NN(r.OTHERS);
      row.QUARENT += NN(r.QUARENT);

      row.TOTAL_DEDUCTION += NN(r.TOTAL_DED);
    }

    const rows = monthList
      .filter((m) => byMonth.has(m))
      .map((m) => byMonth.get(m));
    const lastYear = (() => {
      const parts = String(fy).split("-");
      return parts.length === 2 ? Number(parts[1]) : null;
    })();

    // --- bottom rows from `extraincome` (empId + fy) ---
    const extra = await db
      .select({
        daone: extraincome.daone,
        cpsdaone: extraincome.cpsdaone,
        datwo: extraincome.datwo,
        cpsdatwo: extraincome.cpsdatwo,
        el: extraincome.el,
        bonus: extraincome.bonus,
        proarr: extraincome.proarr,
        cpsproarr: extraincome.cpsproarr,
        incarr: extraincome.incarr,
        cpsincarr: extraincome.cpsincarr,
        agparr: extraincome.agparr,
        cascps: extraincome.cascps,
        other: extraincome.other,
        additax: extraincome.additax,
      })
      .from(extraincome)
      .where(and(eq(extraincome.id, empId), eq(extraincome.fyear, lastYear)))
      .limit(1);

    const E = extra[0] || {};

    // Use values from extraincome for DA ARR-1 and DA ARR-2
    const da1 = NN(E.daone);
    const da1pf = NN(E.cpsdaone) || Math.round(da1 * 0.1);
    const da2 = NN(E.datwo);
    const da2pf = NN(E.cpsdatwo) || Math.round(da2 * 0.1);

    // Add DA ARR-1 and DA ARR-2 as bottom rows
    const bottomRows = [
      { LABEL: "DA ARR-1", GROSS_AMOUNT: da1, UPF_CPS: da1pf },
      { LABEL: "DA ARR-2", GROSS_AMOUNT: da2, UPF_CPS: da2pf },
      { LABEL: "EL", GROSS_AMOUNT: NN(E.el) },
      { LABEL: "BONUS", GROSS_AMOUNT: NN(E.bonus) },
      {
        LABEL: "PRO.ARR",
        GROSS_AMOUNT: NN(E.proarr),
        UPF_CPS: NN(E.cpsproarr),
      },
      {
        LABEL: "INC.ARR",
        GROSS_AMOUNT: NN(E.incarr),
        UPF_CPS: NN(E.cpsincarr),
      },
      { LABEL: "CAS Arr.", GROSS_AMOUNT: NN(E.agparr), UPF_CPS: NN(E.cascps) },
      { LABEL: "Add Alw.", GROSS_AMOUNT: 0, OA: 0 },
      { LABEL: "OTHERS", OTHERS_IF_ANY: NN(E.other) },
    ];

    const extraGross =
      NN(E.daone) + // DA ARR-1
      NN(E.datwo) + // DA ARR-2
      NN(E.el) + // EL
      NN(E.bonus) + // BONUS
      NN(E.proarr) + // PRO.ARR
      NN(E.incarr) + // INC.ARR
      NN(E.agparr) + // CAS Arr.
      NN(E.other); // OTHERS

    // grand totals: add DA ARR-1 and DA ARR-2 from extraincome
    const grandTotal = rows.reduce(
      (t, r) => {
        const add = (k) => {
          t[k] = (t[k] ?? 0) + NN(r[k]);
        };
        [
          "BASIC",
          "GPDP",
          "DA",
          "HRA",
          "CCA",
          "MA",
          "OA",
          "GROSS_AMOUNT",
          "UPF_CPS",
          "FBF",
          "SPF",
          "LIC",
          "IT",
          "PT",
          "HF",
          "REC_COMM",
          "RLF",
          "OTHERS_IF_ANY",
          "QUARENT",
        ].forEach(add);
        t.TOTAL_DEDUCTION = (t.TOTAL_DEDUCTION ?? 0) + NN(r.TOTAL_DEDUCTION);
        return t;
      },
      { TOTAL_DEDUCTION: 0 }
    );

    // Add DA ARR-1, DA ARR-2, and OTHERS from extraincome to grand total
    grandTotal.GROSS_AMOUNT += extraGross;

    grandTotal.UPF_CPS += da1pf + da2pf;
    return res.json({ success: true, fy, empId, rows, bottomRows, grandTotal });
  } catch (err) {
    console.error("getPayDrawn error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
};

export const getPayrollStatementUser = async (req, res) => {
  try {
    const fy = req.query?.fy;
    const empId = req.user.EMP_ID ? Number(req.user.EMP_ID) : null;
    if (!fy)
      return res
        .status(400)
        .json({ success: false, message: "fy (e.g., 2023-2024) is required" });
    if (!empId)
      return res
        .status(400)
        .json({ success: false, message: "empId is required" });

    const range = fyToRange(fy);
    if (!range)
      return res
        .status(400)
        .json({ success: false, message: "fy must be like 2023-2024" });
    const monthList = monthsBetween(range.fromMonth, range.toMonth);

    // --- monthly rows ---
    const rowsRaw = await db
      .select({
        month: pay.month,
        BASIC: pay.BASIC,
        GPAY: pay.GPAY,
        DA: pay.DA,
        HRA: pay.HRA,
        CCA: pay.CCA,
        MEDALA: pay.MEDALA,
        other_all: pay.other_all,
        GROSSall: sql`${pay.BASIC} + ${pay.GPAY} + ${pay.DA} + ${pay.HRA} + ${pay.CCA} + ${pay.MEDALA} + ${pay.other_all}`,
        UPFCPF: sql`IF(${pay.PFSUB} = 0, ${pay.CPSSUB}, ${pay.PFSUB})`,
        FBF: pay.FBF,
        SPLPF: pay.SPLPF,
        LIC: pay.LIC,
        ITAX: pay.ITAX,
        PTAX: pay.PTAX,
        HFUND: pay.HFUND,
        REC_COMM: sql`IFNULL(${pay.BANKLOAN}, 0)`,
        RLFv: pay.HDFC,
        OTHERS: pay.OTHERS,
        QUARENT: pay.QUARENT,
        TOTAL_DED: sql`
          IF(${pay.PFSUB} = 0, ${pay.CPSSUB}, ${pay.PFSUB})
          + ${pay.FBF} + ${pay.SPLPF} + ${pay.LIC} + ${pay.ITAX} + ${pay.PTAX} + ${pay.HFUND}
          + IFNULL(${pay.BANKLOAN}, 0) + IFNULL(${pay.HDFC}, 0) + ${pay.OTHERS} + ${pay.QUARENT}
        `,
        Daarra: pay.Daarra,
        Daarrb: pay.Daarrb,
        SurLeaveSalary: pay.SurLeaveSalary,
        Pongal_Bonus: pay.Pongal_Bonus,
        PromoArr: pay.PromoArr,
        SevenArr: pay.SevenArr,
      })
      .from(pay)
      .where(and(eq(pay.emp_id, empId), inArray(pay.month, monthList)))
      .orderBy(asc(pay.month));

    // group per month
    const byMonth = new Map();
    for (const r of rowsRaw) {
      const key = r.month;
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          MONTH: monthLabel(key),
          BASIC: 0,
          GPDP: 0,
          DA: 0,
          HRA: 0,
          CCA: 0,
          MA: 0,
          OA: 0,
          GROSS_AMOUNT: 0,
          UPF_CPS: 0,
          FBF: 0,
          SPF: 0,
          LIC: 0,
          IT: 0,
          PT: 0,
          HF: 0,
          REC_COMM: 0,
          RLF: 0,
          OTHERS_IF_ANY: 0,
          QUARENT: 0,
          TOTAL_DEDUCTION: 0,
        });
      }
      const row = byMonth.get(key);
      row.BASIC += NN(r.BASIC);
      row.GPDP += NN(r.GPAY);
      row.DA += NN(r.DA);
      row.HRA += NN(r.HRA);
      row.CCA += NN(r.CCA);
      row.MA += NN(r.MEDALA);
      row.OA += NN(r.other_all);
      row.GROSS_AMOUNT += NN(r.GROSSall);

      row.UPF_CPS += NN(r.UPFCPF);
      row.FBF += NN(r.FBF);
      row.SPF += NN(r.SPLPF);
      row.LIC += NN(r.LIC);
      row.IT += NN(r.ITAX);
      row.PT += NN(r.PTAX);
      row.HF += NN(r.HFUND);
      row.REC_COMM += NN(r.REC_COMM);
      row.RLF += NN(r.RLFv);
      row.OTHERS_IF_ANY += NN(r.OTHERS);
      row.QUARENT += NN(r.QUARENT);

      row.TOTAL_DEDUCTION += NN(r.TOTAL_DED);
    }

    const rows = monthList
      .filter((m) => byMonth.has(m))
      .map((m) => byMonth.get(m));
    const lastYear = (() => {
      const parts = String(fy).split("-");
      return parts.length === 2 ? Number(parts[1]) : null;
    })();

    // --- bottom rows from `extraincome` (empId + fy) ---
    const extra = await db
      .select({
        daone: extraincome.daone,
        cpsdaone: extraincome.cpsdaone,
        datwo: extraincome.datwo,
        cpsdatwo: extraincome.cpsdatwo,
        el: extraincome.el,
        bonus: extraincome.bonus,
        proarr: extraincome.proarr,
        cpsproarr: extraincome.cpsproarr,
        incarr: extraincome.incarr,
        cpsincarr: extraincome.cpsincarr,
        agparr: extraincome.agparr,
        cascps: extraincome.cascps,
        other: extraincome.other,
        additax: extraincome.additax,
      })
      .from(extraincome)
      .where(and(eq(extraincome.id, empId), eq(extraincome.fyear, lastYear)))
      .limit(1);

    const E = extra[0] || {};

    // Use values from extraincome for DA ARR-1 and DA ARR-2
    const da1 = NN(E.daone);
    const da1pf = NN(E.cpsdaone) || Math.round(da1 * 0.1);
    const da2 = NN(E.datwo);
    const da2pf = NN(E.cpsdatwo) || Math.round(da2 * 0.1);

    // Add DA ARR-1 and DA ARR-2 as bottom rows
    const bottomRows = [
      { LABEL: "DA ARR-1", GROSS_AMOUNT: da1, UPF_CPS: da1pf },
      { LABEL: "DA ARR-2", GROSS_AMOUNT: da2, UPF_CPS: da2pf },
      { LABEL: "EL", GROSS_AMOUNT: NN(E.el) },
      { LABEL: "BONUS", GROSS_AMOUNT: NN(E.bonus) },
      {
        LABEL: "PRO.ARR",
        GROSS_AMOUNT: NN(E.proarr),
        UPF_CPS: NN(E.cpsproarr),
      },
      {
        LABEL: "INC.ARR",
        GROSS_AMOUNT: NN(E.incarr),
        UPF_CPS: NN(E.cpsincarr),
      },
      { LABEL: "CAS Arr.", GROSS_AMOUNT: NN(E.agparr), UPF_CPS: NN(E.cascps) },
      { LABEL: "Add Alw.", GROSS_AMOUNT: 0, OA: 0 },
      { LABEL: "OTHERS", OTHERS_IF_ANY: NN(E.other) },
    ];

    const extraGross =
      NN(E.daone) + // DA ARR-1
      NN(E.datwo) + // DA ARR-2
      NN(E.el) + // EL
      NN(E.bonus) + // BONUS
      NN(E.proarr) + // PRO.ARR
      NN(E.incarr) + // INC.ARR
      NN(E.agparr) + // CAS Arr.
      NN(E.other); // OTHERS

    // grand totals: add DA ARR-1 and DA ARR-2 from extraincome
    const grandTotal = rows.reduce(
      (t, r) => {
        const add = (k) => {
          t[k] = (t[k] ?? 0) + NN(r[k]);
        };
        [
          "BASIC",
          "GPDP",
          "DA",
          "HRA",
          "CCA",
          "MA",
          "OA",
          "GROSS_AMOUNT",
          "UPF_CPS",
          "FBF",
          "SPF",
          "LIC",
          "IT",
          "PT",
          "HF",
          "REC_COMM",
          "RLF",
          "OTHERS_IF_ANY",
          "QUARENT",
        ].forEach(add);
        t.TOTAL_DEDUCTION = (t.TOTAL_DEDUCTION ?? 0) + NN(r.TOTAL_DEDUCTION);
        return t;
      },
      { TOTAL_DEDUCTION: 0 }
    );

    // Add DA ARR-1, DA ARR-2, and OTHERS from extraincome to grand total
    grandTotal.GROSS_AMOUNT += extraGross;

    grandTotal.UPF_CPS += da1pf + da2pf;
    return res.json({ success: true, fy, empId, rows, bottomRows, grandTotal });
  } catch (err) {
    console.error("getPayDrawn error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
};

export async function setDaPercentage(req, res) {
  try {
    const adminId = req.user?.EMP_ID;
    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (adminId !== 1) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only admin can set DA percentage",
      });
    }

    const percentageRaw = req.body?.da_percent;
    if (percentageRaw === undefined || percentageRaw === null) {
      return res
        .status(400)
        .json({ success: false, message: "DA percentage is required" });
    }
    const percentage = Number(percentageRaw);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        message: "percentage must be a number between 0 and 100",
      });
    }

    console.log(`Setting DA percentage to ${percentage}%`);

    // Update
    const existing = await db
      .select()
      .from(da_percentage)
      .where(eq(da_percentage.id, 1))
      .limit(1);

    if (existing.length === 0) {
      // insert
      await db
        .insert(da_percentage)
        .values({ id: 1, da_percent: percentage });
    } 
    else {
      // update
      await db
        .update(da_percentage)
        .set({ da_percent: percentage })
        .where(eq(da_percentage.id, 1));
    }
    return res.json({ success: true, da_percent: percentage });
  } catch (err) {
    console.error("setDaPercentage error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}