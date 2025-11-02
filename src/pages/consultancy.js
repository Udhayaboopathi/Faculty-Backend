import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { consultancy } from "../db/schema_consultancy.js";

// Get all consultancy records for the logged-in user
export async function getConsultancies(req, res) {
  try {
    const current_user = req.user;
    const empId = Number(current_user.EMP_ID); // Ensure it's a number
    const consultancies = await db
      .select()
      .from(consultancy)
      .where(eq(consultancy.emp_id, empId));
    res.json({ success: true, consultancies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Create a consultancy record
export async function createConsultancy(req, res) {
  try {
    const emp_id = req.user.EMP_ID;
    const { Company, Amount, From } = req.body;
    const newData = {
      emp_id: Number(emp_id),
      Company: String(Company),
      Amount: String(Amount),
      From: String(From).slice(0, 10),
    };

    const result = await db.insert(consultancy).values([newData]);
    const insertId = result.insertId || (result[0] && result[0].id);

    let insertedRow = null;
    if (insertId) {
      const rows = await db
        .select()
        .from(consultancy)
        .where(eq(consultancy.id, insertId))
        .limit(1);
      if (rows.length) insertedRow = rows[0];
    }

    res.json({ success: true, consultancy: insertedRow });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Edit a consultancy record (only if owned by the logged-in user)
export async function editConsultancy(req, res) {
  try {
    const { id } = req.params;
    const emp_id = req.user.EMP_ID;
    const updateData = req.body;

    const recordId = Number(id);
    if (!Number.isFinite(recordId))
      return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(consultancy)
      .where(eq(consultancy.id, recordId))
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });
    if (existing[0].emp_id !== emp_id)
      return res.status(403).json({ error: "Forbidden" });

    await db
      .update(consultancy)
      .set(updateData)
      .where(eq(consultancy.id, recordId));
    const updated = await db
      .select()
      .from(consultancy)
      .where(eq(consultancy.id, recordId))
      .limit(1);
    res.json({ success: true, consultancy: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Delete a consultancy record (only if owned by the logged-in user)
export async function deleteConsultancy(req, res) {
  try {
    const { id } = req.params;
    const emp_id = req.user.EMP_ID;

    const recordId = Number(id);
    if (!Number.isFinite(recordId))
      return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(consultancy)
      .where(eq(consultancy.id, recordId))
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });
    if (existing[0].emp_id !== emp_id)
      return res.status(403).json({ error: "Forbidden" });

    await db.delete(consultancy).where(eq(consultancy.id, recordId));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default {
  getConsultancies,
  createConsultancy,
  editConsultancy,
  deleteConsultancy,
};
