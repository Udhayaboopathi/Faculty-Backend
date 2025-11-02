import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { organizer } from "../db/schema_organizer.js";

export async function getSeminars(req, res) {
  try {
    const current_user = req.user;

    
    const seminars = await db
      .select()
      .from(organizer)
      .where(eq(organizer.empId, current_user.EMP_ID));

    res.json({success: true, seminars});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}

export async function createSeminar(req, res) {
    try {
        const current_user = req.user;
        if (!current_user?.EMP_ID) {
        return res
            .status(401)
            .json({ success: false, message: "Unauthorized: EMP_ID missing" });
        }
        const payload = req.body;
        payload.empId = current_user.EMP_ID;

        const result = await db.insert(organizer).values(payload);
        return res.status(201).json({
        success: true,
        message: "Foreign visit created successfully",
        data: { Id: result.insertId, ...payload },
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}

// Update foreign visit by ID
export async function updateSeminar(req, res) {
    try {
        const current_user = req.user;
        if (!current_user?.EMP_ID) {
        return res
            .status(401)
            .json({ success: false, message: "Unauthorized: EMP_ID missing" });
        }
        const { id } = req.params;
        const payload = req.body;

        // Check if the record exists and belongs to the current user
        const existingRecords = await db
        .select()
        .from(organizer)
        .where(eq(organizer.id, Number(id)))
        .limit(1);
        if (existingRecords.length === 0) {
        return res
            .status(404)
            .json({ success: false, message: "Foreign visit not found" });
        }
        
        if (parseInt(existingRecords[0].empId) !== parseInt(current_user.EMP_ID)) {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized to update this record" });
        }

        // Validate and sanitize payload as needed
        // For example, ensure dateFrom is before dateTo, required fields are present, etc.
        if (payload.dateFrom && payload.dateTo && new Date(payload.dateFrom) > new Date(payload.dateTo)) {
        return res
            .status(400)
            .json({ success: false, message: "dateFrom must be before dateTo" });
        }
        // Add more validation as per your requirements
        // Example: Ensure required fields are present
        const requiredFields = ["tRole", "oType", "title", "dateFrom", "dateTo", "level", "role", "org", "orgAddress"];
        for (const field of requiredFields) {
        if (!payload[field]) {
            return res
            .status(400)
            .json({ success: false, message: `Missing required field: ${field}` });
        }
        }
        // Example: Sanitize string fields to prevent XSS
        const sanitizeString = (str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        for (const field of Object.keys(payload)) {
        if (typeof payload[field] === "string") {
            payload[field] = sanitizeString(payload[field]);
        }
        }

        // Ensure empId is not changed
        delete payload.empId;

        const result = await db
        .update(organizer)
        .set(payload)
        .where(eq(organizer.id, Number(id)));

        if (result.rowsAffected === 0) {
        return res
            .status(500)
            .json({ success: false, message: "Failed to update foreign visit" });
        }

        return res.json({
        success: true,
        message: "Foreign visit updated successfully",
        data: { Id: Number(id), ...existingRecords[0], ...payload },
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}

export async function deleteSeminar(req, res) {
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
        .from(organizer)
        .where(eq(organizer.id, Number(id)))
        .limit(1);
        if (existingRecords.length === 0) {
        return res
            .status(404)
            .json({ success: false, message: "Foreign visit not found" });
        }
        
        if (parseInt(existingRecords[0].empId) !== parseInt(current_user.EMP_ID)) {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized to delete this record" });
        }
        
        // Delete the record
        await db
        .delete(organizer)
        .where(eq(organizer.id, Number(id)));
        
        return res.status(200).json({
        success: true,
        message: "Foreign visit deleted successfully",
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}