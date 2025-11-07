import { and, asc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { departmentMaster } from "../db/schema_department_master.js";
import { empDeptMaster } from "../db/schema_emp_dept_master.js";
import { leave } from "../db/schema_leave.js";
import { employeeMasterNonTeaching } from "../db/schema_non_teaching.js";
import { employeeMaster } from "../db/schema_teaching.js";
// Staff applies for leave
export async function applyLeave(req, res) {
  const {
    LTYPE,
    ROLE_ID,
    LFROM,
    LTO,
    INCHARGE,
    RESON,
    TOTAL,
    Daytype,
    Session,
    Timing,
  } = req.body;
  const EMP_ID = req.user.EMP_ID;
  if (!LTYPE || !EMP_ID || !LFROM || !LTO) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await db.insert(leave).values({
      LTYPE,
      EMP_ID,
      ROLE_ID,
      LFROM,
      LTO,
      INCHARGE,
      RESON,
      TOTAL,
      status: 0,
      Daytype,
      Session,
      Timing,
      cancel: 0,
    });
    res.json({ success: true, message: "Leave applied successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Staff edits their leave application
export async function editLeave(req, res) {
  const { id } = req.body;
  const EMP_ID = req.user.EMP_ID;

  if (!id) {
    return res.status(400).json({ error: "Missing leave id" });
  }

  try {
    // Check if the leave exists and belongs to the user
    const existingLeave = await db
      .select()
      .from(leave)
      .where(eq(leave.id, id))
      .limit(1);

    if (
      !existingLeave.length ||
      parseInt(existingLeave[0].EMP_ID) !== parseInt(EMP_ID)
    ) {
      return res.status(404).json({ error: "Leave not found or unauthorized" });
    }

    // Check if leave is already approved/denied
    if (existingLeave[0].status !== 0) {
      return res
        .status(400)
        .json({ error: "Cannot edit approved or denied leave" });
    }

    // Build updates from provided body fields (only allowed keys)
    const allowed = [
      "LTYPE",
      "ROLE_ID",
      "LFROM",
      "LTO",
      "INCHARGE",
      "RESON",
      "TOTAL",
      "Daytype",
      "Session",
      "Timing",
      "cancel",
      "cancel_reason",
    ];

    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    // Perform update
    await db.update(leave).set(updates).where(eq(leave.id, id));

    res.json({ success: true, message: "Leave updated successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function viewLeave(req, res) {
  const { id } = req.params; // Get ID from URL params
  const EMP_ID = req.user.EMP_ID; // Get EMP_ID from authenticated user

  if (!id) {
    return res.status(400).json({ error: "Missing leave ID" });
  }

  try {
    // Fetch the leave by ID and ensure it belongs to the user, join employee_master for incharge name
    const leaveDetails = await db
      .select({
        ...leave,
        inchargeName: sql`TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))`,
      })
      .from(leave)
      .leftJoin(employeeMaster, eq(employeeMaster.id, leave.INCHARGE))
      .where(and(eq(leave.id, id), eq(leave.EMP_ID, EMP_ID)))
      .limit(1);

    if (!leaveDetails.length) {
      return res.status(404).json({ error: "Leave not found or unauthorized" });
    }

    // Return the leave details with incharge name
    res.json({ success: true, data: leaveDetails[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function cancelLeave(req, res) {
  const { id } = req.params; // Get leave ID from URL params
  const EMP_ID = req.user.EMP_ID; // Get EMP_ID from authenticated user

  if (!id) {
    return res.status(400).json({ error: "Missing leave ID" });
  }

  try {
    // Check if the leave exists and belongs to the user
    const existingLeave = await db
      .select()
      .from(leave)
      .where(and(eq(leave.id, id), eq(leave.EMP_ID, EMP_ID)))
      .limit(1);

    if (!existingLeave.length) {
      return res.status(404).json({ error: "Leave not found or unauthorized" });
    }

    // Check if leave is already approved/denied
    if (existingLeave[0].status !== 0) {
      return res
        .status(400)
        .json({ error: "Cannot cancel approved or denied leave" });
    }

    // Update the leave to set cancel = 1
    await db.update(leave).set({ cancel: 1 }).where(eq(leave.id, id));

    res.json({ success: true, message: "Leave cancelled successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Superadmin views pending leaves for their department
export async function getPendingLeaves(req, res) {
  const emp_id = req.user?.EMP_ID;
  if (!emp_id) {
    return res
      .status(401)
      .json({ error: "Unauthorized: No employee ID found" });
  }

  // Get department ID for the user
  const deptQuery = await db
    .select({ dept_id: empDeptMaster.dept_id })
    .from(empDeptMaster)
    .where(eq(empDeptMaster.emp_id, emp_id))
    .limit(1);

  if (!deptQuery.length) {
    return res.status(404).json({ error: "Department not found for employee" });
  }
  const dept_id = deptQuery[0].dept_id;

  const on = req.query?.on?.toString();
  const from = req.query?.from?.toString();
  const to = req.query?.to?.toString();

  const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const endCol = sql`IFNULL(${leave.LTO}, ${leave.LFROM})`;

  let dateWhere = null;
  if (on) {
    if (!isISO(on)) {
      return res.status(400).json({ error: '"on" must be YYYY-MM-DD' });
    }
    dateWhere = and(lte(leave.LFROM, on), gte(endCol, on));
  } else if (from || to) {
    if (!from || !to) {
      return res
        .status(400)
        .json({ error: 'Both "from" and "to" are required' });
    }
    if (!isISO(from) || !isISO(to)) {
      return res
        .status(400)
        .json({ error: '"from" and "to" must be YYYY-MM-DD' });
    }
    if (to < from) {
      return res.status(400).json({ error: '"to" must be >= "from"' });
    }
    dateWhere = and(lte(leave.LFROM, to), gte(endCol, from));
  }

  try {
    // Only pending leaves for employees in the same department
    const whereExpr = dateWhere
      ? and(eq(leave.status, 0), eq(empDeptMaster.dept_id, dept_id), dateWhere)
      : and(eq(leave.status, 0), eq(empDeptMaster.dept_id, dept_id));

    const leaves = await db
      .select({
        ...leave,
        employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))`,
      })
      .from(leave)
      .leftJoin(employeeMaster, eq(employeeMaster.id, leave.EMP_ID))
      .leftJoin(empDeptMaster, eq(empDeptMaster.emp_id, leave.EMP_ID))
      .where(whereExpr);

    res.json({ success: true, count: leaves.length, leaves });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Superadmin approves/denies leave
export async function approveLeave(req, res) {
  const { id, status, cancel_reason } = req.body;
  if (!id || typeof status === "undefined") {
    return res.status(400).json({ error: "id and status are required" });
  }
  try {
    await db
      .update(leave)
      .set({ status, cancel_reason })
      .where(eq(leave.id, id));
    res.json({ success: true, message: "Leave status updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Staff views their leave status
export async function getMyLeaves(req, res) {
  const EMP_ID = req.user.EMP_ID; // EMP_ID is a value, not an object
  if (!EMP_ID) {
    return res.status(400).json({ error: "EMP_ID not found in token" });
  }
  try {
    const leaves = await db
      .select()
      .from(leave)
      .where(eq(leave.EMP_ID, EMP_ID));
    res.json({ success: true, leaves });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getAdminLeaves(req, res) {
  try {
    const emp_id = req.user?.EMP_ID;

    // Validate emp_id
    if (!emp_id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No employee ID found" });
    }

    // Query department ID
    const get_dept_query = await db
      .select({ dept_id: empDeptMaster.dept_id })
      .from(empDeptMaster)
      .where(eq(empDeptMaster.emp_id, emp_id));

    // Check if department exists
    if (!get_dept_query.length) {
      return res
        .status(404)
        .json({ error: "Department not found for employee" });
    }

    const dept_id = get_dept_query[0].dept_id;

    // Get all employees in the department
    const dept_staffs = await db
      .select({ emp_id: empDeptMaster.emp_id })
      .from(empDeptMaster)
      .where(eq(empDeptMaster.dept_id, dept_id));

    // Get leaves for each employee in the department
    // Get leaves for each employee in the department
    const dept_staff_details = await Promise.all(
      dept_staffs.map(async (staff) => {
        const leaves = await db
          .select({
            id: leave.id,
            emp_id: leave.EMP_ID,
            leave_type: leave.LTYPE,
            start_date: leave.LFROM,
            end_date: leave.LTO,
            incharge: leave.INCHARGE,
            reason: leave.RESON,
            total: leave.TOTAL,
            status: leave.status,
            day_type: leave.Daytype,
            session: leave.Session,
            timing: leave.Timing,
            cancel: leave.cancel,
            cancel_reason: leave.cancel_reason,
            // Add employee name from employeeMaster
            name: employeeMaster.first_name,
          })
          .from(leave)
          .leftJoin(employeeMaster, eq(leave.EMP_ID, employeeMaster.id)) // Join with employeeMaster
          .where(and(eq(leave.EMP_ID, staff.emp_id)), ne(leave.EMP_ID, emp_id)); // Exclude the admin themselves

        return [
          {
            emp_id: staff.emp_id, // Include emp_id for clarity
            name: leaves.length > 0 ? leaves[0].name : null, // Use name from first leave, or null if no leaves
            leaves,
          },
        ];
      })
    );

    // Optionally filter out employees with no leaves (uncomment if desired)
    // const filtered_details = dept_staff_details.filter(staff => staff.leaves.length > 0);

    return res.status(200).json(dept_staff_details);
  } catch (error) {
    console.error("Error fetching admin leaves:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllLeaves(req, res) {
  try {
    const on = req.query?.on?.toString();
    const from = req.query?.from?.toString();
    const to = req.query?.to?.toString();

    // Admin-only (numeric)
    const requesterId = Number(req.user?.EMP_ID);
    if (!requesterId || ![300, 301, 302].includes(requesterId)) {
      return res.status(403).json({
        error: "Forbidden: You do not have access to view all leaves",
      });
    }

    const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

    // Treat LTO NULL as LFROM for overlap checks
    const endCol = sql`IFNULL(${leave.LTO}, ${leave.LFROM})`;

    let dateWhere = null;
    if (on) {
      if (!isISO(on)) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "on" must be YYYY-MM-DD' });
      }
      dateWhere = and(lte(leave.LFROM, on), gte(endCol, on));
    } else if (from || to) {
      if (!from || !to) {
        return res
          .status(400)
          .json({ error: 'Bad Request: both "from" and "to" are required' });
      }
      if (!isISO(from) || !isISO(to)) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "from" and "to" must be YYYY-MM-DD' });
      }
      if (to < from) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "to" must be >= "from"' });
      }
      dateWhere = and(lte(leave.LFROM, to), gte(endCol, from));
    }

    const whereExpr = dateWhere || undefined;

    // Build the query:
    // - Join employee_master and employee_master_non_teaching by id
    // - Prefer teaching fields; fallback to non-teaching via COALESCE/NULLIF
    const q = db
      .select({
        // Leave fields
        id: leave.id,
        LTYPE: leave.LTYPE,
        EMP_ID: leave.EMP_ID,
        ROLE_ID: leave.ROLE_ID,
        LFROM: leave.LFROM,
        LTO: leave.LTO,
        INCHARGE: leave.INCHARGE,
        RESON: leave.RESON,
        TOTAL: leave.TOTAL,
        status: leave.status,
        Daytype: leave.Daytype,
        Session: leave.Session,
        Timing: leave.Timing,
        cancel: leave.cancel,
        cancel_reason: leave.cancel_reason,

        // Employee code: teaching emp_id, fallback to non-teaching id as string
        employeeCode: sql`
          COALESCE(
            ${employeeMaster.emp_id},
            CAST(${employeeMasterNonTeaching.id} AS CHAR),
            'Unknown'
          )
        `,

        // Employee name: teaching first; if null/blank, use non-teaching
        employeeName: sql`
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name})), ''),
            NULLIF(TRIM(CONCAT_WS(' ', ${employeeMasterNonTeaching.first_name}, ${employeeMasterNonTeaching.last_name})), ''),
            'Unknown Employee'
          )
        `,

        // Department: teaching via department_master, else non-teaching dept
        department: sql`
          COALESCE(
            ${departmentMaster.department},
            NULLIF(${employeeMasterNonTeaching.dept}, ''),
            'Unknown'
          )
        `,
      })
      .from(leave)
      // Teaching path: Join employee_master and related tables
      .leftJoin(employeeMaster, eq(employeeMaster.id, leave.EMP_ID))
      .leftJoin(
        empDeptMaster,
        and(
          eq(empDeptMaster.emp_id, employeeMaster.id),
          eq(empDeptMaster.status, 1)
        )
      )
      .leftJoin(
        departmentMaster,
        and(
          eq(departmentMaster.id, empDeptMaster.dept_id),
          eq(departmentMaster.status, 1)
        )
      )
      // Non-teaching path: Join employee_master_non_teaching by id
      .leftJoin(
        employeeMasterNonTeaching,
        eq(employeeMasterNonTeaching.id, leave.EMP_ID)
      );

    const rows = whereExpr
      ? await q.where(whereExpr).orderBy(
          asc(
            sql`COALESCE(${departmentMaster.department}, ${employeeMasterNonTeaching.dept}, 'Unknown')`
          ),
          asc(sql`
            COALESCE(
              ${employeeMaster.first_name},
              ${employeeMasterNonTeaching.first_name},
              'Unknown'
            )
          `),
          asc(leave.LFROM)
        )
      : await q.orderBy(
          asc(
            sql`COALESCE(${departmentMaster.department}, ${employeeMasterNonTeaching.dept}, 'Unknown')`
          ),
          asc(sql`
            COALESCE(
              ${employeeMaster.first_name},
              ${employeeMasterNonTeaching.first_name},
              'Unknown'
            )
          `),
          asc(leave.LFROM)
        );

    return res.json({ success: true, leaves: rows });
  } catch (error) {
    console.error("Error fetching all leaves:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getLeavesByDept(req, res) {
  try {
    // Admin gate (mirror your rule)
    const requesterId = Number(req.user?.EMP_ID);
    if (!requesterId || ![300, 301, 302].includes(requesterId)) {
      return res.status(403).json({
        error: "Forbidden: You do not have access to view all leaves",
      });
    }

    // Required dept_id (department_master.id)
    const deptIdParam = req.query?.dept_id;
    const deptId = Number(deptIdParam);
    if (!Number.isInteger(deptId) || deptId <= 0) {
      return res
        .status(400)
        .json({ error: 'Bad Request: "dept_id" must be a positive integer' });
    }

    // ---- Date filters ----
    const on = req.query?.on && String(req.query.on);
    const from = req.query?.from && String(req.query.from);
    const to = req.query?.to && String(req.query.to);
    const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

    // Treat LTO nulls as LFROM (single-day)
    const endCol = sql`IFNULL(${leave.LTO}, ${leave.LFROM})`;

    let dateWhere = null;
    if (on) {
      if (!isISO(on)) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "on" must be YYYY-MM-DD' });
      }
      // Overlap for a single day
      dateWhere = and(lte(leave.LFROM, on), gte(endCol, on));
    } else if (from || to) {
      if (!from || !to) {
        return res.status(400).json({
          error:
            'Bad Request: both "from" and "to" are required when using a range',
        });
      }
      if (!isISO(from) || !isISO(to)) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "from" and "to" must be YYYY-MM-DD' });
      }
      if (to < from) {
        return res
          .status(400)
          .json({ error: 'Bad Request: "to" must be >= "from"' });
      }
      // Range overlap
      dateWhere = and(lte(leave.LFROM, to), gte(endCol, from));
    }

    // ---- WHERE: teaching only + dept + optional date ----
    // Flip ne(...) to eq(...) if your mapping differs.
    const whereParts = [
      ne(leave.ROLE_ID, 1),
      eq(empDeptMaster.dept_id, deptId),
    ];
    if (dateWhere) whereParts.push(dateWhere);
    const whereExpr = whereParts.reduce(
      (acc, cur) => (acc ? and(acc, cur) : cur),
      null
    );

    const rows = await db
      .select({
        id: leave.id,
        LTYPE: leave.LTYPE,
        ROLE_ID: leave.ROLE_ID,
        LFROM: leave.LFROM,
        LTO: leave.LTO,
        RESON: leave.RESON,
        TOTAL: leave.TOTAL,
        status: leave.status,
        Daytype: leave.Daytype,
        Session: leave.Session,
        Timing: leave.Timing,

        departmentId: departmentMaster.id,
        department: departmentMaster.department,
        employeeCode: employeeMaster.emp_id,
        employeeName: sql`TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))`,
      })
      .from(leave)
      .leftJoin(employeeMaster, eq(employeeMaster.id, leave.EMP_ID))
      .leftJoin(
        empDeptMaster,
        and(
          eq(empDeptMaster.emp_id, employeeMaster.id),
          eq(empDeptMaster.status, 1)
        )
      )
      .leftJoin(
        departmentMaster,
        and(
          eq(departmentMaster.id, empDeptMaster.dept_id),
          eq(departmentMaster.status, 1)
        )
      )
      .where(whereExpr)
      .orderBy(
        asc(departmentMaster.department),
        asc(employeeMaster.first_name),
        asc(leave.LFROM)
      );

    return res.json({
      success: true,
      dept_id: deptId,
      filter: { on: on || null, from: from || null, to: to || null },
      leaves: rows,
    });
  } catch (error) {
    console.error("getLeavesByDept failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// export async function leaveIncharge(req,res)[
//   try{
//     const type = req.query?.type?.toString();
//     const emp_id = req.user?.EMP_ID;
//     const emp_type = req.user?.role;
//     if(!emp_id){
//       return res.status(401).json({ error: "Unauthorized: EMP_ID missing" });
//     }

//     if (emp_type === 'teaching') {
//       const dept_id = await db.select().from(empDeptMaster).where(eq(empDeptMaster.emp_id, emp_id)).limit(1);
//       if(!dept_id.length){
//         return res.status(404).json({ error: "Department not found for employee" });
//       }
//       const dept = dept_id[0].dept_id;

//   }
//   catch(e){
//     console.error("Error in leaveIncharge:", e);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// ]

export async function getStaffAdminLeaves(req, res) {
  try {
    const emp_id = req.user?.EMP_ID;
    // Admin check (your rule)
    // if (emp_id !== 301 ) {
    //   return res.status(401).json({ error: "Unauthorized" });
    // }

    if (emp_id === 301) {
      // Only these leave types
      const types = ["CL", "COL", "OD"];

      // Non-teaching only: INNER JOIN on PK (leave.EMP_ID -> non_teaching.id)
      const rows = await db
        .select({
          // leave fields (add/remove as you need)
          id: leave.id,
          LTYPE: leave.LTYPE,
          EMP_ID: leave.EMP_ID,
          ROLE_ID: leave.ROLE_ID,
          LFROM: leave.LFROM,
          LTO: leave.LTO,
          INCHARGE: leave.INCHARGE,
          RESON: leave.RESON,
          TOTAL: leave.TOTAL,
          status: leave.status,
          Daytype: leave.Daytype,
          Session: leave.Session,
          Timing: leave.Timing,
          cancel: leave.cancel,
          cancel_reason: leave.cancel_reason,

          // non-teaching columns we need to build the name
          nt_first: employeeMasterNonTeaching.first_name,
          nt_last: employeeMasterNonTeaching.last_name,
          employeeCode: employeeMasterNonTeaching.emp_id,
          department: employeeMasterNonTeaching.dept,
        })
        .from(leave)
        .innerJoin(
          employeeMasterNonTeaching,
          eq(employeeMasterNonTeaching.id, leave.EMP_ID)
        )
        .where(inArray(leave.LTYPE, types))
        .orderBy(asc(leave.LFROM));

      // Build full name in JS to avoid SQL expression issues
      const result = rows.map((r) => {
        const first = (r.nt_first || "").trim();
        const last = (r.nt_last || "").trim();
        const employeeName = (first + " " + last).trim() || "Unknown Employee";
        const { nt_first, nt_last, ...rest } = r; // drop helper fields
        return { ...rest, employeeName };
      });

      return res.status(200).json(result);
    } else if (emp_id === 302) {
      const types = ["OD-UA", "RH", "PER"];
      const rows = await db
        .select({
          // leave fields (add/remove as you need)
          id: leave.id,
          LTYPE: leave.LTYPE,
          EMP_ID: leave.EMP_ID,
          ROLE_ID: leave.ROLE_ID,
          LFROM: leave.LFROM,
          LTO: leave.LTO,
          INCHARGE: leave.INCHARGE,
          RESON: leave.RESON,
          TOTAL: leave.TOTAL,
          status: leave.status,
          Daytype: leave.Daytype,
          Session: leave.Session,
          Timing: leave.Timing,
          cancel: leave.cancel,
          cancel_reason: leave.cancel_reason,
          employeeName: employeeMasterNonTeaching.first_name,
          nt_last: employeeMasterNonTeaching.last_name,
          employeeCode: employeeMasterNonTeaching.emp_id,
          department: employeeMasterNonTeaching.dept,
        })
        .from(leave)
        .innerJoin(
          employeeMasterNonTeaching,
          eq(employeeMasterNonTeaching.id, leave.EMP_ID)
        )
        .where(inArray(leave.LTYPE, types))
        .orderBy(asc(leave.LFROM));
      return res.status(200).json(rows);
    }
  } catch (error) {
    console.error("Error fetching admin leaves (non-teaching only):", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function dropdownDeptStaffs(req, res) {
  try {
    const collegeIdStr = req.query?.college_id?.toString();
    if (!collegeIdStr) {
      return res.status(400).json({ error: 'Query "college_id" is required' });
    }
    const collegeId = Number(collegeIdStr);
    if (!Number.isInteger(collegeId) || collegeId <= 0) {
      return res
        .status(400)
        .json({ error: 'Query "college_id" must be a positive integer' });
    }

    const rawType = (req.query?.type ?? "").toString().trim().toLowerCase();
    // normalize: "non-teaching", "non teaching", "nonteaching" => "non-teaching"
    const type = ["non-teaching", "non teaching", "nonteaching"].includes(
      rawType
    )
      ? "non-teaching"
      : rawType === "teaching"
      ? "teaching"
      : ""; // empty means “unspecified”

    const deptIdParam = req.query?.department;
    const deptId = deptIdParam != null ? Number(deptIdParam) : null;
    if (deptIdParam != null && (!Number.isInteger(deptId) || deptId <= 0)) {
      return res
        .status(400)
        .json({ error: 'Query "department" must be a positive integer' });
    }

    // Common mapper
    const mapRows = (rows) =>
      rows.map((r) => ({
        empId: r.empIntId,
        empCode: r.empCode ?? "",
        name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim(),
      }));

    // ────────────────────────── Branches ──────────────────────────

    // A) college_id == 1
    if (collegeId === 1) {
      // A1) department provided → Teaching by department
      if (deptId) {
        const rows = await db
          .select({
            empIntId: employeeMaster.id, // internal PK
            empCode: employeeMaster.emp_id, // external code
            first_name: employeeMaster.first_name,
            last_name: employeeMaster.last_name,
          })
          .from(empDeptMaster)
          .leftJoin(employeeMaster, eq(employeeMaster.id, empDeptMaster.emp_id))
          .where(
            and(
              eq(empDeptMaster.dept_id, deptId),
              eq(empDeptMaster.status, 1), // active mapping
              eq(employeeMaster.place, collegeId), // ensure from this college
              ne(employeeMaster.id, req.user?.EMP_ID ?? -1)
              // add: eq(employeeMaster.status, 1)  if you track employee active flag
            )
          )
          .orderBy(asc(employeeMaster.first_name));

        return res.json(mapRows(rows));
      }

      // A2) no department → Non-Teaching by place
      {
        const rows = await db
          .select({
            empIntId: employeeMasterNonTeaching.id,
            empCode: employeeMasterNonTeaching.emp_id,
            first_name: employeeMasterNonTeaching.first_name,
            last_name: employeeMasterNonTeaching.last_name,
          })
          .from(employeeMasterNonTeaching)
          .where(
            and(
              eq(employeeMasterNonTeaching.place, collegeId),
              // eq(employeeMasterNonTeaching.status, 1), // uncomment if you have a status flag
              ne(employeeMasterNonTeaching.id, req.user?.EMP_ID ?? -1)
            )
          )
          .orderBy(asc(employeeMasterNonTeaching.first_name));
        console.log(rows.length);
        return res.json(mapRows(rows));
      }
    }

    // B) college_id != 1 → ignore department; decide by type
    // non-teaching
    if (type === "non-teaching") {
      const rows = await db
        .select({
          empIntId: employeeMasterNonTeaching.id,
          empCode: employeeMasterNonTeaching.emp_id,
          first_name: employeeMasterNonTeaching.first_name,
          last_name: employeeMasterNonTeaching.last_name,
        })
        .from(employeeMasterNonTeaching)
        .where(
          and(
            eq(employeeMasterNonTeaching.place, collegeId),
            eq(employeeMasterNonTeaching.EMPTYPE, "NON"),
            ne(employeeMasterNonTeaching.id, req.user?.EMP_ID ?? -1)
          )
        )
        .orderBy(asc(employeeMasterNonTeaching.first_name));

      return res.json(mapRows(rows));
    }

    // teaching for other colleges (college_id != 1)
    // combine teaching table + non-teaching with EMPTYPE='TEA'
    if (type === "teaching" || (!type && collegeId !== 1)) {
      const [teachA, teachB] = await Promise.all([
        db
          .select({
            empIntId: employeeMaster.id,
            empCode: employeeMaster.emp_id,
            first_name: employeeMaster.first_name,
            last_name: employeeMaster.last_name,
          })
          .from(employeeMaster)
          .where(
            and(
              eq(employeeMaster.place, collegeId),
              ne(employeeMaster.id, req.user?.EMP_ID ?? -1)
            )
          ),

        db
          .select({
            empIntId: employeeMasterNonTeaching.id,
            empCode: employeeMasterNonTeaching.emp_id,
            first_name: employeeMasterNonTeaching.first_name,
            last_name: employeeMasterNonTeaching.last_name,
          })
          .from(employeeMasterNonTeaching)
          .where(
            and(
              eq(employeeMasterNonTeaching.place, collegeId),
              eq(employeeMasterNonTeaching.EMPTYPE, "TEA"),
              ne(employeeMasterNonTeaching.id, req.user?.EMP_ID ?? -1)
            )
          ),
      ]);

      // merge + dedupe (by empIntId|empCode), then sort by first_name
      const merged = [...teachA, ...teachB];
      const uniqMap = new Map();
      for (const r of merged) {
        const key = `${r.empIntId}|${r.empCode ?? ""}`;
        if (!uniqMap.has(key)) uniqMap.set(key, r);
      }
      const deduped = Array.from(uniqMap.values()).sort((a, b) =>
        (a.first_name ?? "").localeCompare(b.first_name ?? "")
      );

      return res.json(mapRows(deduped));
    }
  } catch (err) {
    console.error("Error fetching department staffs:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPGLeaves(req, res) {
  try {
    const empId = req.user?.EMP_ID;
    if (!empId)
      return res.status(401).json({ error: "Unauthorized: no EMP_ID" });
    if (Number(empId) !== 214)
      return res.status(401).json({ error: "Unauthorized" });

    // Exclude admin (214) at the source
    const employees = await db
      .select({
        emp_id: employeeMaster.id,
        full_name: sql`
          TRIM(CONCAT_WS(' ', ${employeeMaster.first_name}, ${employeeMaster.last_name}))
        `.as("full_name"),
      })
      .from(employeeMaster)
      .where(
        and(
          eq(employeeMaster.place, 2), // PG campus
          ne(employeeMaster.id, 214) // exclude admin entirely
        )
      );

    const result = await Promise.all(
      employees.map(async (emp) => {
        const leaves = await db
          .select({
            id: leave.id,
            emp_id: leave.EMP_ID,
            leave_type: leave.LTYPE,
            start_date: leave.LFROM,
            end_date: leave.LTO,
            incharge: leave.INCHARGE,
            reason: leave.RESON,
            total: leave.TOTAL,
            status: leave.status,
            day_type: leave.Daytype,
            session: leave.Session,
            timing: leave.Timing,
            cancel: leave.cancel,
            cancel_reason: leave.cancel_reason,
          })
          .from(leave)
          .where(eq(leave.EMP_ID, emp.emp_id)) // no need to exclude 214 again
          .orderBy(asc(leave.LFROM));

        return {
          emp_id: emp.emp_id,
          name: emp.full_name,
          leaves,
        };
      })
    );

    return res.status(200).json(result);
  } catch (e) {
    console.error("Error in getPGLeaves:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRemainingLeaves(req, res) {
  try {
    const EMP_ID = Number(req.user?.EMP_ID);
    const rawType = (req.query?.type ?? "").toString().trim().toUpperCase();
    if (!EMP_ID || !rawType) {
      return res.status(400).json({ error: "EMP_ID and type required" });
    }
    const type = rawType;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Fiscal year starts on April 1st: determine fiscal start year
    const fiscalStartYear = month >= 4 ? year : year - 1;
    const fiscalStart = `${fiscalStartYear}-04-01`;
    const fiscalEnd = `${fiscalStartYear + 1}-03-31`;

    let remaining = 0;

    if (type === "CL") {
      const maxAllowed = 12;
      // SUM TOTAL within fiscal year (LFROM used to bucket into FY)
      const rows = await db
        .select({ used: sql`COALESCE(SUM(${leave.TOTAL}), 0)` })
        .from(leave)
        .where(
          and(
            eq(leave.EMP_ID, EMP_ID),
            eq(leave.LTYPE, type),
            gte(leave.LFROM, fiscalStart),
            lte(leave.LFROM, fiscalEnd)
          )
        );
      const used = Number(rows?.[0]?.used ?? 0);
      remaining = Math.max(0, maxAllowed - used);
      return res.json({ type, remaining });
    } else if (type === "PER") {
      const maxAllowed = 2;
      const rows = await db
        .select({ cnt: sql`COALESCE(COUNT(*), 0)` })
        .from(leave)
        .where(
          and(
            eq(leave.EMP_ID, EMP_ID),
            eq(leave.LTYPE, type),
            sql`MONTH(${leave.LFROM}) = ${month}`
          )
        );
      const used = Number(rows?.[0]?.cnt ?? 0);
      remaining = Math.max(0, maxAllowed - used);
      return res.json({ type, remaining });
    } else if (type === "OD") {
      const maxAllowed = 20;
      const rows = await db
        .select({ used: sql`COALESCE(SUM(${leave.TOTAL}), 0)` })
        .from(leave)
        .where(
          and(
            eq(leave.EMP_ID, EMP_ID),
            eq(leave.LTYPE, type),
            gte(leave.LFROM, fiscalStart),
            lte(leave.LFROM, fiscalEnd)
          )
        );
      const used = Number(rows?.[0]?.used ?? 0);
      remaining = Math.max(0, maxAllowed - used);
      return res.json({ type, remaining });
    } else {
      return res.json({ type, remaining: "No constraints" });
    }
  } catch (e) {
    console.error("Error in getRemainingLeaves:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
