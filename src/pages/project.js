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

    const { Title, Agency, Amount, Status, DFrom, DTo } = req.body ?? {};

    // Helper: normalize input to YYYY-MM-DD or undefined
    function toDateOnlyString(value) {
      if (value == null || value === "") return undefined;
      const d = value instanceof Date ? value : new Date(String(value));
      if (!isFinite(d.getTime())) return undefined;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

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

    // Build update object conditionally (accepts both schema keys and legacy aliases)
    /** @type {Partial<typeof proposal.$inferInsert>} */
    const updateData = {};
    const body = req.body ?? {};

    // Accept common aliases from older clients
    const aliases = {
      Title: "title",
      Agency: "FundAgency",
      Amount: "budget",
      Status: "pstatus",
      DFrom: "durationfrom",
      DTo: "durationto",
    };
    for (const [alias, real] of Object.entries(aliases)) {
      if (body[alias] !== undefined && body[real] === undefined) {
        body[real] = body[alias];
      }
    }

    // Field groups by expected type
    const dateFields = ["applydate", "sanctiondate", "durationfrom", "durationto"];
    const intFields = [
      "budget",
      "duration",
      "samt",
      "ryear1",
      "ryear2",
      "ryear3",
      "ryear4",
      "ryear5",
      "uyear1",
      "uyear2",
      "uyear3",
      "uyear4",
      "uyear5",
    ];
    const stringFields = [
      "refno",
      "proposaltype",
      "title",
      "principal",
      "coprincipal",
      "fund",
      "FundAgency",
      "brief",
      "uc1",
      "uc2",
      "uc3",
      "uc4",
      "uc5",
      "Publications",
      "pstatus",
      "report",
    ];

    // Normalize and validate date fields
    for (const f of dateFields) {
      if (body[f] !== undefined) {
        const v = toDateOnlyString(body[f]);
        if (!v) return res.status(400).json({ success: false, message: `Invalid ${f}` });
        updateData[f] = v;
      }
    }

    // Normalize and validate integer fields
    for (const f of intFields) {
      if (body[f] !== undefined) {
        const n = Number(body[f]);
        if (!Number.isFinite(n)) return res.status(400).json({ success: false, message: `${f} must be a valid number` });
        updateData[f] = n;
      }
    }

    // Strings and text
    for (const f of stringFields) {
      if (body[f] !== undefined) updateData[f] = String(body[f]).trim();
    }

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

    // Treat 0 affectedRows as successful "no changes" (MySQL returns 0 if values are identical)
    const responseData = {
      id: projectId,
      ...existing[0],
      ...updateData,
    };

    if (typeof affected === "number") {
      if (affected === 0) {
        return res.json({
          success: true,
          message: "No changes made to the project",
          data: responseData,
        });
      }
      if (affected > 0) {
        return res.json({
          success: true,
          message: "Project updated successfully",
          data: responseData,
        });
      }
      // negative or unexpected numeric value
      return res.status(500).json({ success: false, message: "Failed to update project" });
    }

    // If driver didn't return a numeric affected count, assume success
    return res.json({
      success: true,
      message: "Project updated successfully",
      data: responseData,
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