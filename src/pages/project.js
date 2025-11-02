import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { proposal } from "../db/schema_proposal.js";

export async function getProjects(req, res) {
  try {
    const current_user = req.user;


    const projects = await db
      .select()
      .from(proposal)
      .where(eq(proposal.emp_id, current_user.EMP_ID)); // Use the correct property name as per your schema, e.g., empId instead of emp_id

    res.json({ success: true, projects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createProject(req, res) {
    try {
        const current_user = req.user;
        if (!current_user?.EMP_ID) {
        return res
            .status(401)
            .json({ success: false, message: "Unauthorized: EMP_ID missing" });
        }
        const payload = req.body;
        payload.emp_id = current_user.EMP_ID;

        const result = await db.insert(proposal).values(payload);
        return res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: { Id: result.insertId, ...payload },
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}

// Update project by ID
export async function updateProject(req, res) {
  try {
    const current_user = req.user;
    if (!current_user?.EMP_ID) {
      return res.status(401).json({ success: false, message: "Unauthorized: EMP_ID missing" });
    }

    const { id } = req.params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project id" });
    }

    const body = req.body ?? {};

    // Fetch existing & ownership check
    const existing = await db
      .select()
      .from(proposal)
      .where(eq(proposal.id, projectId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const ownerEmpId = Number(existing[0].emp_id);
    const callerEmpId = Number(current_user.EMP_ID);
    if (!Number.isFinite(ownerEmpId) || !Number.isFinite(callerEmpId) || ownerEmpId !== callerEmpId) {
      return res.status(403).json({ success: false, message: "Forbidden: Not your project" });
    }

    // Extract allowed fields (partial update supported)
    const {
      Title,   // -> title
      Agency,  // -> FundAgency
      Amount,  // -> budget
      Status,  // -> pstatus
      DFrom,   // -> durationfrom
      DTo      // -> durationto
    } = body;

    // Build update object conditionally
    /** @type {Partial<typeof proposal.$inferInsert>} */
    const updateData = {};

    if (Title !== undefined) updateData.title = String(Title).trim();
    if (Agency !== undefined) updateData.FundAgency = String(Agency).trim();

    if (Amount !== undefined) {
      const n = Number(Amount);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ success: false, message: "Amount must be a valid number" });
      }
      updateData.budget = n;
    }

    if (Status !== undefined) updateData.pstatus = String(Status).trim();

    // Dates: normalize to YYYY-MM-DD if provided
    const dFromStr = DFrom !== undefined ? toDateOnlyString(DFrom) : undefined;
    const dToStr   = DTo   !== undefined ? toDateOnlyString(DTo)   : undefined;

    if (DFrom !== undefined && !dFromStr) {
      return res.status(400).json({ success: false, message: "Invalid DFrom" });
    }
    if (DTo !== undefined && !dToStr) {
      return res.status(400).json({ success: false, message: "Invalid DTo" });
    }

    if (dFromStr !== undefined) updateData.durationfrom = dFromStr;
    if (dToStr !== undefined)   updateData.durationto = dToStr;

    if (updateData.durationfrom && updateData.durationto) {
      if (new Date(updateData.durationfrom) > new Date(updateData.durationto)) {
        return res.status(400).json({ success: false, message: "DFrom must be before DTo" });
      }
    }

    // 🔴 Key fix: prevent Drizzle "No values to set"
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    // Perform update
    const result = await db
      .update(proposal)
      .set(updateData)
      .where(eq(proposal.id, projectId));

    // Cope with different drivers' result shapes
    const affected =
      result?.rowCount ??
      result?.rowsAffected ??
      result?.affectedRows ??
      (typeof result === "number" ? result : undefined);

    if (!affected) {
      return res.status(500).json({ success: false, message: "Failed to update project" });
    }

    return res.json({
      success: true,
      message: "Project updated successfully",
      data: {
        id: projectId,
        ...existing[0],
        ...updateData,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
}

// Delete project by ID
export async function deleteProject(req, res) {
    try {
        const current_user = req.user;
        if (!current_user?.EMP_ID) {
        return res
            .status(401)
            .json({ success: false, message: "Unauthorized: EMP_ID missing" });
        }
        const { id } = req.params;

        // Check if the record exists and belongs to the current user
        const existingRecords = await db
        .select()
        .from(proposal)
        .where(eq(proposal.id, Number(id)))
        .limit(1);

        if (existingRecords.length === 0) {
        return res
            .status(404)
            .json({ success: false, message: "Project not found" });
        }

        if (parseInt(existingRecords[0].emp_id) !== parseInt(current_user.EMP_ID)) {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized to delete this record" });
        }

        // Delete the record
        await db
        .delete(proposal)
        .where(eq(proposal.id, Number(id)));

        return res.json({
        success: true,
        message: "Project deleted successfully",
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}