import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { patent } from "../db/schema_patent.js";

export async function getPatent(req, res) {
  try {
    const current_user = req.user;

    const patentData = await db
      .select()
      .from(patent)
      .where(eq(patent.emp_id, current_user.EMP_ID));

    res.json({ success: true, patent: patentData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createPatent(req, res) {
  try {
    const current_user = req.user;
    const { Categry, Level, Name, Detail, Fdate, Issued, Stus, PNumber } = req.body;

    // Validate required fields
    if (!Name || !Detail || !Issued || !PNumber) {
      return res.status(400).json({ 
        success: false, 
        error: "Name, Detail, Issued, and PNumber are required fields" 
      });
    }

    const newPatent = await db.insert(patent).values({
      emp_id: current_user.EMP_ID,
      Categry: Categry || null,
      Level: Level || null,
      Name,
      Detail,
      Fdate: Fdate || null,
      Issued,
      Stus: Stus || null,
      PNumber
    });

    res.json({ 
      success: true, 
      patent: { 
        Categry, 
        Level, 
        Name, 
        Detail, 
        Fdate, 
        Issued, 
        Stus, 
        PNumber 
      } 
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export async function updatePatent(req, res) {
  try {
    const current_user = req.user;
    const patentId = Number(req.params.id);
    const { Categry, Level, Name, Detail, Fdate, Issued, Stus, PNumber } = req.body;

    // Check if patent exists
    const existingPatent = await db
      .select()
      .from(patent)
      .where(eq(patent.Id, patentId))
      .limit(1);

    if (!existingPatent.length) {
      return res.status(404).json({ success: false, error: "Patent not found" });
    }

    // Verify ownership
    if (existingPatent[0].emp_id !== current_user.EMP_ID) {
      return res.status(403).json({ success: false, error: "Forbidden: You don't own this patent" });
    }

    // Prepare update object - only update provided fields
    const updateData = {};
    if (Categry !== undefined) updateData.Categry = Categry || null;
    if (Level !== undefined) updateData.Level = Level || null;
    if (Name !== undefined) updateData.Name = Name;
    if (Detail !== undefined) updateData.Detail = Detail;
    if (Fdate !== undefined) updateData.Fdate = Fdate || null;
    if (Issued !== undefined) updateData.Issued = Issued;
    if (Stus !== undefined) updateData.Stus = Stus || null;
    if (PNumber !== undefined) updateData.PNumber = PNumber;

    await db
      .update(patent)
      .set(updateData)
      .where(eq(patent.Id, patentId));

    res.json({ success: true, message: "Patent updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export async function deletePatent(req, res) {
  try {
    const current_user = req.user;
    const patentId = Number(req.params.id);

    // Check if patent exists
    const existingPatent = await db
      .select()
      .from(patent)
      .where(eq(patent.Id, patentId))
      .limit(1);

    if (!existingPatent.length) {
      return res.status(404).json({ success: false, error: "Patent not found" });
    }

    // Verify ownership
    if (existingPatent[0].emp_id !== current_user.EMP_ID) {
      return res.status(403).json({ success: false, error: "Forbidden: You don't own this patent" });
    }

    await db.delete(patent).where(eq(patent.Id, patentId));

    res.json({ success: true, message: "Patent deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
