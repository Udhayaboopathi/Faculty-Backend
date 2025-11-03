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
    const {
      Categry,
      Level,
      Name,
      Detail,
      Fdate, // can be '2020-12-29' or ISO string
      Issued, // can be '2021-01-08' or ISO string
      Stus,
      PNumber,
    } = req.body ?? {};

    // ---- basic validation ----
    if (!Name || !Detail || !Issued || !PNumber) {
      return res.status(400).json({
        success: false,
        error: "Name, Detail, Issued, and PNumber are required fields",
      });
    }

    // ---- helpers ----
    const trimOrNull = (v) =>
      v === undefined || v === null ? null : String(v).trim() || null;
    const toDateOrNull = (v) => {
      if (!v) return null;
      // Allow 'YYYY-MM-DD' or ISO; always hand a Date to the driver
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    // If your DB expects INT for Level, coerce; if VARCHAR, keep it as string.
    // Toggle the next line depending on schema:
    const levelValue =
      Level === undefined || Level === null
        ? null
        : Number.isNaN(Number(Level))
        ? String(Level).trim()
        : Number(Level);
    // Example:
    //  - INT column  -> keep as Number(levelValue)
    //  - VARCHAR col -> keep as String(levelValue)

    const record = {
      emp_id: current_user?.EMP_ID, // must be a number
      Categry: trimOrNull(Categry), // e.g., "National"
      Level: levelValue, // INT or VARCHAR (see note above)
      Name: trimOrNull(Name),
      Detail: trimOrNull(Detail),
      Fdate: toDateOrNull(Fdate), // null or Date
      Issued: toDateOrNull(Issued), // required -> valid Date
      Stus: trimOrNull(Stus), // e.g., "Awarded"
      PNumber: trimOrNull(PNumber), // keep as string to preserve leading zeros
    };

    // Additional guardrails:
    if (!record.emp_id || Number.isNaN(Number(record.emp_id))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid emp_id on user" });
    }
    if (!record.Issued) {
      return res
        .status(400)
        .json({ success: false, error: "Issued must be a valid date" });
    }

    const result = await db.insert(patent).values(record);

    // drizzle-mysql returns { insertId } on mysql2; adapt if you use a different driver
    const insertedId = result?.insertId ?? null;

    return res.json({
      success: true,
      patent: {
        Id: insertedId,
        ...record,
      },
    });
  } catch (e) {
    // Handle duplicate key nicely (e.g., unique PNumber)
    if (e && (e.code === "ER_DUP_ENTRY" || /duplicate/i.test(e.message))) {
      return res.status(409).json({
        success: false,
        error: "Duplicate entry (likely PNumber already exists).",
      });
    }
    return res.status(500).json({ success: false, error: e.message });
  }
}

export async function updatePatent(req, res) {
  try {
    const current_user = req.user;
    const patentId = Number(req.params.id);
    const { Categry, Level, Name, Detail, Fdate, Issued, Stus, PNumber } =
      req.body ?? {};

    // Check if patent exists
    const existingPatent = await db
      .select()
      .from(patent)
      .where(eq(patent.Id, patentId))
      .limit(1);

    if (!existingPatent.length) {
      return res
        .status(404)
        .json({ success: false, error: "Patent not found" });
    }

    // Verify ownership
    if (Number(existingPatent[0].emp_id) !== Number(current_user.EMP_ID)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You don't own this patent",
      });
    }

    // helpers (same sanitization as createPatent)
    const trimOrNull = (v) =>
      v === undefined || v === null ? null : String(v).trim() || null;
    const toDateOrNull = (v) => {
      if (v === undefined || v === null || v === "") return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const computeLevel = (v) => {
      if (v === undefined || v === null) return undefined;
      return Number.isNaN(Number(v)) ? trimOrNull(v) : Number(v);
    };

    // Build update object with validation/coercion
    const updateData = {};

    if (Categry !== undefined) updateData.Categry = trimOrNull(Categry);

    if (Level !== undefined) {
      const lvl = computeLevel(Level);
      // allow explicit null (to clear) or value
      updateData.Level = lvl === undefined ? null : lvl;
    }

    if (Name !== undefined) updateData.Name = trimOrNull(Name);
    if (Detail !== undefined) updateData.Detail = trimOrNull(Detail);

    if (Fdate !== undefined) {
      const d = toDateOrNull(Fdate);
      if (Fdate && d === null) {
        return res
          .status(400)
          .json({ success: false, error: "Fdate must be a valid date" });
      }
      updateData.Fdate = d;
    }

    if (Issued !== undefined) {
      const d = toDateOrNull(Issued);
      if (Issued && d === null) {
        return res
          .status(400)
          .json({ success: false, error: "Issued must be a valid date" });
      }
      updateData.Issued = d;
    }

    if (Stus !== undefined) updateData.Stus = trimOrNull(Stus);
    if (PNumber !== undefined) updateData.PNumber = trimOrNull(PNumber);

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No fields provided to update" });
    }

    await db.update(patent).set(updateData).where(eq(patent.Id, patentId));

    res.json({ success: true, message: "Patent updated successfully" });
  } catch (e) {
    if (e && (e.code === "ER_DUP_ENTRY" || /duplicate/i.test(e.message))) {
      return res.status(409).json({
        success: false,
        error: "Duplicate entry (likely PNumber already exists).",
      });
    }
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
      return res
        .status(404)
        .json({ success: false, error: "Patent not found" });
    }

    // Verify ownership
    if (Number(existingPatent[0].emp_id) !== current_user.EMP_ID) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You don't own this patent",
      });
    }

    await db.delete(patent).where(eq(patent.Id, patentId));

    res.json({ success: true, message: "Patent deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
