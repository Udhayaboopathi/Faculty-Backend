import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { departmentMaster } from "../db/schema_department_master.js";
import { empDeptMaster } from "../db/schema_emp_dept_master.js";
import { empRoleMaster } from "../db/schema_emp_role_master.js";
import { extraincome } from "../db/schema_extraincome.js";
import { pay } from "../db/schema_pay.js";
import { roleMaster } from "../db/schema_role_master.js";
import { employeeMaster } from "../db/schema_teaching.js";

export async function getSalaryTaxStatement(req, res) {
  const empId = req.query?.empId ? Number(req.query.empId) : null;
  const fy = req.query?.fy;
  const empType = req.query?.empType || 'TEA'; // TEA or NON
  
  if (!empId || !fy)
    return res.status(400).json({ error: "empId and fy required" });

  try {
    let emp, age = 0;
    
    // 1. Get employee details based on type
    if (empType === 'TEA') {
      emp = await db
        .select({
          name: sql`CONCAT(${employeeMaster.first_name}, ' ', COALESCE(${employeeMaster.last_name}, ''))`,
          designation: roleMaster.role,
          department: departmentMaster.department,
          pan_no: employeeMaster.pan_no,
          mobile: employeeMaster.mobile_1,
          dob: employeeMaster.dob,
          place: employeeMaster.place,
          pass_no: employeeMaster.pass_no,
          bank_no: employeeMaster.bank_no,
        })
        .from(employeeMaster)
        .leftJoin(empRoleMaster, eq(empRoleMaster.emp_id, employeeMaster.id))
        .leftJoin(roleMaster, eq(roleMaster.id, empRoleMaster.role_id))
        .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, employeeMaster.id))
        .leftJoin(departmentMaster, eq(departmentMaster.id, empDeptMaster.dept_id))
        .where(eq(employeeMaster.id, empId))
        .limit(1);
    } else {
      // Non-teaching employee
      const { employeeMasterNonTeaching } = await import("../db/schema_non_teaching.js");
      emp = await db
        .select({
          name: sql`CONCAT(${employeeMasterNonTeaching.first_name}, ' ', COALESCE(${employeeMasterNonTeaching.last_name}, ''))`,
          designation: employeeMasterNonTeaching.designation,
          department: employeeMasterNonTeaching.dept,
          pan_no: employeeMasterNonTeaching.pan_no,
          mobile: employeeMasterNonTeaching.mobile_1,
          dob: employeeMasterNonTeaching.dob,
          place: employeeMasterNonTeaching.place,
          pass_no: employeeMasterNonTeaching.pass_no,
          bank_no: employeeMasterNonTeaching.bank_no,
        })
        .from(employeeMasterNonTeaching)
        .where(eq(employeeMasterNonTeaching.id, empId))
        .limit(1);
    }

    if (!emp || emp.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Calculate age from DOB
    age = emp[0].dob ? calculateAge(emp[0].dob) : 0;

    // 2. Get pay rows for the year
    const range = fyToRange(fy);
    const payRows = await db
      .select()
      .from(pay)
      .where(
        and(
          eq(pay.emp_id, empId),
          gte(pay.month, range.fromMonth),
          lte(pay.month, range.toMonth)
        )
      );

    // 3. Get extra income
    const extra = await db
      .select()
      .from(extraincome)
      .where(and(eq(extraincome.id, empId), eq(extraincome.fyear, fy)))
      .limit(1);

    // 4. Calculate salary components
    let BASIC = 0, GPAY = 0, DA = 0, HRA = 0, CCA = 0, MEDALA = 0, OTHER_ALL = 0;
    let UPFCPF = 0, FBF = 0, SPLPF = 0, LIC = 0, ITAX = 0, PTAX = 0, HFUND = 0, OTHERS = 0, CPS = 0;
    let COOPTEX = 0, HDFC = 0, cpspfChk = 0, REC = 0, Comm = 0, VHLN = 0;

    // Pensioner IDs (for commutation)
    const pensionerIds = [801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 4, 12, 34, 246, 774];
    const isPensioner = pensionerIds.includes(empId);

    for (const r of payRows) {
      BASIC += NN(r.BASIC);
      GPAY += NN(r.GPAY);
      DA += NN(r.DA);
      HRA += NN(r.HRA);
      CCA += NN(r.CCA);
      MEDALA += NN(r.MEDALA);
      OTHER_ALL += NN(r.other_all);
      
      // Deductions
      UPFCPF += NN(r.PFSUB || r.CPSSUB);
      FBF += NN(r.FBF);
      SPLPF += NN(r.SPLPF);
      LIC += NN(r.LIC);
      ITAX += NN(r.ITAX);
      PTAX += NN(r.PTAX);
      HFUND += NN(r.HFUND);
      OTHERS += NN(r.OTHERS);
      CPS += NN(r.CPSSUB);
      
      // Additional deductions
      COOPTEX += NN(r.COOPTEX);
      HDFC += NN(r.HDFC);
      cpspfChk += NN(r.CPSSUB);
      VHLN += NN(r.VHLN);
      
      // Recovery amount (for specific employee IDs)
      const recoveryIds = [801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 34, 4, 12, 246, 774];
      if (recoveryIds.includes(empId)) {
        REC += NN(r.VHLN); // Recovery from VHLN column
      }
      
      Comm += NN(r.CPSSUB); // Commutation
    }

    // Add extra income components
    let extraIncomeTotal = 0;
    let extraCPS = 0;
    if (extra && extra[0]) {
      extraIncomeTotal = 
        NN(extra[0].daone) +
        NN(extra[0].datwo) +
        NN(extra[0].el) +
        NN(extra[0].bonus) +
        NN(extra[0].proarr) +
        NN(extra[0].incarr) +
        NN(extra[0].agparr) +
        NN(extra[0].cpsagparr) +
        NN(extra[0].other);
      
      extraCPS = 
        NN(extra[0].cpsdaone) +
        NN(extra[0].cpsdatwo) +
        NN(extra[0].cpsproarr) +
        NN(extra[0].cpsincarr) +
        NN(extra[0].cpsagparr) +
        NN(extra[0].cascps);
      
      UPFCPF += extraCPS;
      CPS += extraCPS;
      
      // Add extra income tax
      const extraITax = 
        NN(extra[0].daoneit) +
        NN(extra[0].datwoit) +
        NN(extra[0].elit) +
        NN(extra[0].proarrit) +
        NN(extra[0].increit) +
        NN(extra[0].casarrit) +
        NN(extra[0].additax);
      
      ITAX += extraITax;
    }

    // Calculate NPS deduction (80CCD(1B))
    let NPS = 0;
    const exemptedEmployees = [781, 242, 256, 257];
    
    if (!exemptedEmployees.includes(empId)) {
      if (UPFCPF < 50000) {
        NPS = UPFCPF;
        UPFCPF = 0;
      } else {
        if (cpspfChk > 0) {
          UPFCPF = UPFCPF - 50000;
          NPS = 50000;
        } else {
          NPS = 0;
        }
      }
    }

    // 5. Gross Salary Income (before recovery)
    const grossSalaryBeforeRecovery = BASIC + GPAY + DA + HRA + CCA + MEDALA + OTHER_ALL + extraIncomeTotal;
    
    // 6. Less: Recovery Amount
    const recoveryAmount = REC;
    
    // 7. Gross Salary Income (after recovery)
    const grossSalary = grossSalaryBeforeRecovery - recoveryAmount;

    // 8. HRA Calculation (Section 10(13A))
    const salaryForHRA = BASIC + DA;
    const salaryHRA10Percent = Math.round(salaryForHRA * 0.1);
    const salaryHRA40Percent = Math.round(salaryForHRA * 0.4);
    
    // For pensioners, use commutation amount instead of HRA
    let hraReceived = isPensioner ? Comm : HRA;
    let hraExempted = 0;
    
    if (age >= 60) {
      // Senior citizens - full HRA/Commutation exempted
      hraExempted = hraReceived;
    } else {
      // Regular calculation: minimum of (HRA received, 40% of salary, Rent paid - 10% of salary)
      // Since rent paid is dynamic input, we use min of HRA received and 40% of salary
      hraExempted = Math.min(hraReceived, salaryHRA40Percent);
    }

    // 9. Gross Income (after HRA exemption)
    const grossIncome = grossSalary - hraExempted;

    // 10. Deductions under Section 16 & 24(b)
    const professionalTax = PTAX;
    const standardDeduction = 50000;
    const entertainment = 0; // Can be made dynamic with req.body
    const housePropertyInterest = 0; // Can be made dynamic (max 200000) with req.body
    
    const totalDeductions16 = standardDeduction + professionalTax + entertainment + housePropertyInterest;

    // 11. Net Salary Income
    const netSalary = grossIncome - totalDeductions16;

    // 12. Other Income (Section 6)
    const pension = 0; // Can be made dynamic
    const otherIncomeOtherSources = 0; // Can be made dynamic
    const nscInterest = 0; // Can be made dynamic
    const fixedDepositInterest = 0; // Can be made dynamic
    
    const totalOtherIncome = pension + otherIncomeOtherSources + nscInterest + fixedDepositInterest;

    // 13. Gross Total Income
    const grossTotalIncome = netSalary + totalOtherIncome;

    // 14. Deductions under Chapter VI-A
    const deduction80CCC = 0; // LIC Jeevan Suraksha (dynamic)
    const deduction80C_UPFCPF = UPFCPF;
    const deduction80C_FBFSPF = FBF + SPLPF;
    const deduction80C_LIC = LIC;
    const deduction80C_TuitionFee = 0; // Dynamic
    const deduction80C_NSC = 0; // Dynamic
    const deduction80C_UTI = 0; // Dynamic
    const deduction80C_HousingLoan = 0; // Dynamic
    const deduction80C_Others = 0; // Dynamic
    
    const total80C = 
      deduction80CCC +
      deduction80C_UPFCPF +
      deduction80C_FBFSPF +
      deduction80C_LIC +
      deduction80C_TuitionFee +
      deduction80C_NSC +
      deduction80C_UTI +
      deduction80C_HousingLoan +
      deduction80C_Others;
    
    const deduction80C = Math.min(total80C, 150000); // Max limit

    const deduction80CCD1B = Math.min(NPS, 50000); // NPS additional deduction
    const deduction80CCG = 0; // Rajiv Gandhi Equity Savings Scheme (max 25000) - Dynamic
    const deduction80D_HF = HFUND; // Health fund from salary
    const deduction80D_Additional = 0; // Additional health insurance - Dynamic
    const deduction80D_Total = deduction80D_HF + deduction80D_Additional;
    const deduction80D = Math.min(deduction80D_Total, 50000); // Max 50000 (or 75000 for senior)
    
    const deduction80DD = 0; // Handicapped dependent (75000/125000) - Dynamic
    const deduction80DDB = 0; // Medical treatment (40000/100000) - Dynamic
    const deduction80E = 0; // Education loan interest - Dynamic
    const deduction80G_Donations = 0; // Donations - Dynamic
    const deduction80G_HDFC = Math.round(HDFC); // HDFC from salary
    const deduction80G = deduction80G_Donations + deduction80G_HDFC;
    const deduction80U = 0; // Physical disability (75000/125000) - Dynamic
    const deduction80TTA = 0; // Savings account interest (max 10000) - Dynamic
    const deductionOthers = 0; // Dynamic

    const totalChapterVIDeductions = 
      deduction80C +
      deduction80CCD1B +
      deduction80CCG +
      deduction80D +
      deduction80DD +
      deduction80DDB +
      deduction80E +
      deduction80G +
      deduction80U +
      deduction80TTA +
      deductionOthers;

    // 15. Taxable Income
    let taxableIncome = grossTotalIncome - totalChapterVIDeductions;
    
    // Note: PHP code removes rounding, so we keep the exact value
    // Round to nearest 10 is optional based on requirement
    const remainder = taxableIncome % 10;
    if (remainder < 5) {
      taxableIncome = taxableIncome - remainder;
    } else {
      taxableIncome = taxableIncome + (10 - remainder);
    }

    // 16. Tax Calculation based on age
    let basicExemptionLimit = age >= 60 ? 300000 : 250000;
    let tax = 0;
    let taxSlabA = 0, taxSlabB = 0, taxSlabC = 0;
    let amountSlabA = 0, amountSlabB = 0, amountSlabC = 0;

    if (taxableIncome > basicExemptionLimit) {
      let remaining = taxableIncome - basicExemptionLimit;
      
      // Slab 1: 5% on next 250000 (or 200000 for senior citizens)
      const slab1Limit = age >= 60 ? 200000 : 250000;
      if (remaining > 0) {
        amountSlabA = Math.min(remaining, slab1Limit);
        taxSlabA = amountSlabA * 0.05;
        remaining -= slab1Limit;
      }
      
      // Slab 2: 20% on next 500000
      if (remaining > 0) {
        amountSlabB = Math.min(remaining, 500000);
        taxSlabB = amountSlabB * 0.20;
        remaining -= 500000;
      }
      
      // Slab 3: 30% on balance
      if (remaining > 0) {
        amountSlabC = remaining;
        taxSlabC = Math.ceil(amountSlabC * 0.30);
      }
      
      tax = taxSlabA + taxSlabB + taxSlabC;
    }

    // 17. Tax Relief under Section 89
    const taxRelief = 0; // Can be made dynamic with req.body

    // 18. Tax after relief
    const taxAfterRelief = Math.max(tax - taxRelief, 0);

    // 19. Rebate under Section 87A
    const rebate87A = taxableIncome <= 500000 ? Math.min(taxAfterRelief, 12500) : 0;

    // 20. Health & Education Cess @ 4%
    const healthCess = Math.round((taxAfterRelief - rebate87A) * 0.04);

    // 21. Surcharge
    const surcharge = 0;

    // 22. Total Tax Payable
    const totalTax = taxAfterRelief - rebate87A + healthCess + surcharge;

    // 23. Tax already deducted (from salary + additional tax paid by individual)
    const soFarDeducted = ITAX;
    const taxPaidByIndividual = 0; // Can be made dynamic with req.body
    const totalSoFarDeducted = soFarDeducted + taxPaidByIndividual;

    // 24. Balance Tax
    const balanceTax = totalTax - totalSoFarDeducted;

    // Return comprehensive response
    res.json({
      employeeDetails: {
        name: emp[0]?.name,
        designation: emp[0]?.designation,
        department: emp[0]?.department,
        pan_no: emp[0]?.pan_no,
        mobile: emp[0]?.mobile,
        place: emp[0]?.place,
        age: age,
        empType: empType,
        isPensioner: isPensioner,
      },
      salaryComponents: {
        BASIC,
        GPAY,
        DA,
        HRA: hraReceived,
        CCA,
        MEDALA,
        OTHER_ALL,
        grossSalaryBeforeRecovery,
        recoveryAmount,
        grossSalary,
      },
      hraCalculation: {
        salaryForHRA,
        salaryHRA10Percent,
        salaryHRA40Percent,
        hraReceived,
        commutationAmount: Comm,
        isPensioner,
        hraExempted,
      },
      incomeCalculation: {
        grossSalary,
        lessHRAExempted: hraExempted,
        grossIncome,
      },
      deductionsSection16_24b: {
        housePropertyInterest,
        entertainment,
        professionalTax,
        standardDeduction,
        total: totalDeductions16,
      },
      netSalary,
      otherIncome: {
        pension,
        otherSources: otherIncomeOtherSources,
        nscInterest,
        fixedDepositInterest,
        total: totalOtherIncome,
      },
      grossTotalIncome,
      deductionsChapterVI: {
        section80C: {
          LIC_JeevanSuraksha: deduction80CCC,
          UPFCPF: deduction80C_UPFCPF,
          FBFSPF: deduction80C_FBFSPF,
          LIC: deduction80C_LIC,
          tuitionFee: deduction80C_TuitionFee,
          NSC: deduction80C_NSC,
          UTI: deduction80C_UTI,
          housingLoan: deduction80C_HousingLoan,
          others: deduction80C_Others,
          total: total80C,
          deduction: deduction80C,
        },
        section80CCD1B_NPS: deduction80CCD1B,
        section80CCG_RajivGandhi: deduction80CCG,
        section80D: {
          healthFund: deduction80D_HF,
          additionalInsurance: deduction80D_Additional,
          total: deduction80D_Total,
          deduction: deduction80D,
        },
        section80DD_Handicapped: deduction80DD,
        section80DDB_MedicalTreatment: deduction80DDB,
        section80E_EducationLoan: deduction80E,
        section80G: {
          donations: deduction80G_Donations,
          HDFC: deduction80G_HDFC,
          total: deduction80G,
        },
        section80U_Disability: deduction80U,
        section80TTA_SavingsInterest: deduction80TTA,
        others: deductionOthers,
        total: totalChapterVIDeductions,
      },
      taxableIncome,
      taxCalculation: {
        basicExemptionLimit,
        ageCategory: age >= 60 ? "Senior Citizen above 60 years but below 80 Years" : "Individual below 60 years",
        slabDetails: [
          {
            description: age >= 60 ? "On first Rs. 3,00,000" : "On first Rs. 2,50,000",
            amount: basicExemptionLimit,
            rate: 0,
            tax: 0,
          },
          {
            description: `On next (Rs. ${basicExemptionLimit + 1} to 5,00,000)`,
            amount: amountSlabA,
            rate: 0.05,
            tax: taxSlabA,
          },
          {
            description: "On next (Rs. 5,00,001 to 10,00,000)",
            amount: amountSlabB,
            rate: 0.20,
            tax: taxSlabB,
          },
          {
            description: "On balance (Above Rs. 10,00,001)",
            amount: amountSlabC,
            rate: 0.30,
            tax: taxSlabC,
          },
        ],
        totalTax: tax,
      },
      taxRelief,
      taxAfterRelief,
      rebate87A,
      healthCess,
      surcharge,
      totalTaxPayable: totalTax,
      soFarDeducted,
      taxPaidByIndividual,
      totalSoFarDeducted,
      balanceTax,
      balanceTaxMessage: balanceTax > 0 
        ? `Balance of Income Tax to be deducted: ${balanceTax}` 
        : "Balance of Income Tax to be deducted: NIL",
      fy,
      empId,
    });
  } catch (error) {
    console.error("Error in getSalaryTaxStatement:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

// Helper to safely convert to number
function NN(x) {
  return Number(x) || 0;
}

// Calculate age from date
function calculateAge(dateString) {
  if (!dateString) return 0;
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Implement fyToRange(fy) to return { fromMonth, toMonth } for the FY
function fyToRange(fy) {
  const m = fy.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!m) return null;
  const startYear = Number(m[1]);
  const endYear = Number(m[2]);
  if (endYear !== startYear + 1) return null;
  return { fromMonth: `${startYear}-04`, toMonth: `${endYear}-03` };
}
