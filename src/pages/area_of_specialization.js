import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { area } from "../db/schema_area.js";

export async function getAreaofSpecialization(req, res) {
  try {
    const current_user = req.user;

    const areaofspecialization = await db
      .select()
      .from(area)
      .where(eq(area.emp_id, current_user.EMP_ID));

    res.json({ success: true, areaofspecialization });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function addAreaofSpecialization(req, res) {
  try {
    const current_user = req.user;
    const areas = req.body; // Expecting an array of areas

    const insertData = {
      emp_id: current_user.EMP_ID,
      area: areas.area,
    };

    await db.insert(area).values(insertData);

    res.json({
      success: true,
      message: "Areas of specialization added successfully",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteAreaofSpecialization(req, res) {
  try {
    const current_user = req.user;
    const { id } = req.params; // Expecting the Sno of the area to delete

    const existingArea = await db
      .select()
      .from(area)
      .where(eq(area.Sno, Number(id)))
      .limit(1);

    if (parseInt(existingArea[0].emp_id) !== parseInt(current_user.EMP_ID)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this area" });
    }

    if (existingArea.length === 0) {
      return res.status(404).json({ error: "Area not found" });
    }

    await db.delete(area).where(eq(area.Sno, Number(id)));

    res.json({
      success: true,
      message: "Area of specialization deleted successfully",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateAreaofSpecialization(req, res) {
  try {
    const current_user = req.user;
    const { id } = req.params; // Expecting the Sno of the area to update
    const areas = req.body;

    if (!areas) {
      return res.status(400).json({ error: "New area is required" });
    }

    const existingArea = await db
      .select()
      .from(area)
      .where(eq(area.Sno, Number(id)))
      .limit(1);

    if (existingArea.length === 0) {
      return res.status(404).json({ error: "Area not found" });
    }

    if (parseInt(existingArea[0].emp_id) !== parseInt(current_user.EMP_ID)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this area" });
    }

    await db
      .update(area)
      .set({ area: areas.area })
      .where(eq(area.Sno, Number(id)));

    res.json({
      success: true,
      message: "Area of specialization updated successfully",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
