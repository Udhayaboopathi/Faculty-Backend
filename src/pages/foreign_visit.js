import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { forigenvisite } from "../db/schema_forigenvisite.js";

/**
 * Convert any input into YYYY-MM-DD string for MySQL DATE column
 */
function toDateOnlyString(input) {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getForeignVisits(req, res) {
  try {
    const current_user = req.user;

    const foreignVisits = await db
      .select()
      .from(forigenvisite)
      .where(eq(forigenvisite.emp_id, current_user.EMP_ID));

    res.json({ success: true, foreignVisits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createForeignVisit(req, res) {
  try {
    const current_user = req.user;
    if (!current_user?.EMP_ID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: EMP_ID missing" });
    }

    const { Company, Purpose, DFrom, DTo, Agency, Invitation, Certificate } =
      req.body ?? {};

    // Basic required validations (adjust if some fields are optional in your UI)
    if (!Company || typeof Company !== "string" || Company.length > 40) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Company (max 40 chars)" });
    }
    if (!Purpose || typeof Purpose !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Purpose" });
    }
    if (!Agency || typeof Agency !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Agency" });
    }

    const dFromStr = toDateOnlyString(DFrom);
    const dToStr = toDateOnlyString(DTo);

    if (!dFromStr)
      return res
        .status(400)
        .json({ success: false, message: "Invalid DFrom date" });
    if (!dToStr)
      return res
        .status(400)
        .json({ success: false, message: "Invalid DTo date" });

    // Ensure DFrom <= DTo
    if (new Date(dFromStr) > new Date(dToStr)) {
      return res
        .status(400)
        .json({ success: false, message: "DFrom cannot be after DTo" });
    }

    // Build payload for Drizzle insert (only allowed fields + emp_id)
    const payload = {
      emp_id: current_user.EMP_ID, // from auth context
      Company,
      Purpose,
      DFrom: dFromStr, // MySQL DATE accepts 'YYYY-MM-DD'
      DTo: dToStr,
      Agency,
      Invitation: Invitation ?? "",
      Certificate: Certificate ?? "",
      // Invitation, Certificate are intentionally NOT accepted in this POST
    };

    // Insert row
    // For MySQL (mysql2), drizzle returns OkPacket with insertId
    const result = await db.insert(forigenvisite).values(payload);
    const insertId = Array.isArray(result)
      ? result[0]?.insertId
      : result?.insertId;

    // Construct a response object
    const created = {
      Id: insertId ?? undefined,
      ...payload,
    };

    return res.status(201).json({
      success: true,
      message: "Foreign visit created",
      data: created,
      id: insertId ?? undefined,
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}


export async function updateForeignVisit(req, res) {
    try {
        const current_user = req.user;
        if (!current_user?.EMP_ID) {
        return res
            .status(401)
            .json({ success: false, message: "Unauthorized: EMP_ID missing" });
        }
        const { id } = req.params;
        const { Company, Purpose, DFrom, DTo, Agency, Invitation, Certificate } = req.body ?? {};

        // Basic required validations (adjust if some fields are optional in your UI)
        if (!Company || typeof Company !== "string" || Company.length > 40) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid Company (max 40 chars)" });
        }
        if (!Purpose || typeof Purpose !== "string") {
        return res
            .status(400)
            .json({ success: false, message: "Invalid Purpose" });
        }
        if (!Agency || typeof Agency !== "string") {
        return res
            .status(400)
            .json({ success: false, message: "Invalid Agency" });
        }

        const dFromStr = toDateOnlyString(DFrom);
        const dToStr = toDateOnlyString(DTo);

        if (!dFromStr)
        return res
            .status(400)
            .json({ success: false, message: "Invalid DFrom date" });
        if (!dToStr)
        return res
            .status(400)
            .json({ success: false, message: "Invalid DTo date" });

        // Ensure DFrom <= DTo
        if (new Date(dFromStr) > new Date(dToStr)) {
        return res
            .status(400)
            .json({ success: false, message: "DFrom cannot be after DTo" });
        }

        // Check if the record exists and belongs to the current user
        const existingRecords = await db
        .select()
        .from(forigenvisite)
        .where(eq(forigenvisite.Id, Number(id)))
        .limit(1);

        if (existingRecords.length === 0) {
        return res
            .status(404)
            .json({ success: false, message: "Foreign visit not found" });
        }

        if (parseInt(existingRecords[0].emp_id) !== parseInt(current_user.EMP_ID)) {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized to update this record" });
        }

        // Build payload for Drizzle update
        const payload = {
        Company,
        Purpose,
        DFrom: dFromStr, // MySQL DATE accepts 'YYYY-MM-DD'
        DTo: dToStr,
        Agency,
        Invitation: Invitation ?? "",
        Certificate: Certificate ?? "",
        };

        // Update the record
        await db
        .update(forigenvisite)
        .set(payload)
        .where(eq(forigenvisite.Id, Number(id)));

        return res.status(200).json({
        success: true,
        message: "Foreign visit updated successfully",
        data: { Id: Number(id), ...payload },
        });
    }   catch (e) {
        console.error(e);
        return res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
}

// Delete foreign visit by ID

export async function deleteForeignVisit(req, res) {
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
        .from(forigenvisite)
        .where(eq(forigenvisite.Id, Number(id)))
        .limit(1);
        if (existingRecords.length === 0) {
        return res
            .status(404)
            .json({ success: false, message: "Foreign visit not found" });
        }
        
        if (parseInt(existingRecords[0].emp_id) !== parseInt(current_user.EMP_ID)) {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized to delete this record" });
        }
        
        // Delete the record
        await db
        .delete(forigenvisite)
        .where(eq(forigenvisite.Id, Number(id)));
        
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
