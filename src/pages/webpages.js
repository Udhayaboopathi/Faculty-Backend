import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { webPages } from "../db/schema_webpages.js";

// Get all webpages for the logged-in user
export async function getWebpages(req, res) {
  try {
    const current_user = req.user;
    const webpages = await db
      .select()
      .from(webPages)
      .where(eq(webPages.emp_id, current_user.EMP_ID));
    res.json({ success: true, webpages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Create a new webpage entry for the logged-in user
export async function createWebpage(req, res) {
  try {
    const current_user = req.user;
    const { Webpage, Google, VIDWAN, SCOPUS, Publons } = req.body;
    const newData = {
      emp_id: current_user.EMP_ID,
      Webpage,
      Google,
      VIDWAN,
      SCOPUS,
      Publons,
    };
    const result = await db.insert(webPages).values(newData);
    res.json({ success: true, webpage: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Edit a webpage entry (only if owned by the logged-in user)
export async function editWebpage(req, res) {
  try {
    const current_user = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(webPages)
      .where(eq(webPages.Id, id))
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });
    if (existing[0].emp_id !== current_user.EMP_ID) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allowed = ["Webpage", "Google", "VIDWAN", "SCOPUS", "Publons"];
    const updateData = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) updateData[k] = req.body[k];
    }
    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, webpage: existing[0] });
    }

    await db.update(webPages).set(updateData).where(eq(webPages.Id, id));
    const updated = await db.select().from(webPages).where(eq(webPages.Id, id)).limit(1);
    return res.json({ success: true, webpage: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Delete a webpage entry (only if owned by the logged-in user)
export async function deleteWebpage(req, res) {
  try {
    const current_user = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(webPages)
      .where(eq(webPages.Id, id))
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });
    if (existing[0].emp_id !== current_user.EMP_ID) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(webPages).where(eq(webPages.Id, id));
    return res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default {
  getWebpages,
  createWebpage,
  editWebpage,
  deleteWebpage,
};