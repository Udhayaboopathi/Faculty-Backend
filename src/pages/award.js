import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { award } from "../db/schema_award.js";


export async function getAward(req, res) {
  try {
    const current_user = req.user;

    const awardData = await db
      .select()
      .from(award)
      .where(eq(award.emp_id, current_user.EMP_ID));

    res.json({ success: true, award: awardData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createAward(req, res) {
    try {
        const current_user = req.user;
        const { Title, A_date, Level, Sponcer, Spon_Address } = req.body;

        const newAward = await db.insert(award).values({
            emp_id: current_user.EMP_ID,
            Title,
            A_date,
            Level,
            Sponcer,
            Spon_Address
        });

        res.json({ success: true, award: { Title, A_date, Level, Sponcer, Spon_Address } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export async function updateAward(req, res) {
    try {
        const current_user = req.user;
        const awardId = Number(req.params.id);
        const { Title, A_date, Level, Sponcer, Spon_Address } = req.body;

        const existingAward = await db
            .select()
            .from(award)
            .where(eq(award.id, awardId))
            .limit(1);

        if (!existingAward.length) {
            return res.status(404).json({ error: "Award not found" });
        }

        if (parseInt(existingAward[0].emp_id) !== parseInt(current_user.EMP_ID)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const updatedAward = await db
            .update(award)
            .set({
                Title,
                A_date,
                Level,
                Sponcer,
                Spon_Address
            })
            .where(eq(award.id, awardId));

        res.json({ success: true, award: updatedAward });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

export async function deleteAward(req, res) {
    try {
        const current_user = req.user;
        const awardId = Number(req.params.id);

        const existingAward = await db
            .select()
            .from(award)
            .where(eq(award.id, awardId))
            .limit(1);

        if (!existingAward.length) {
            return res.status(404).json({ error: "Award not found" });
        }

        if (parseInt(existingAward[0].emp_id) !== parseInt(current_user.EMP_ID)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        await db.delete(award).where(eq(award.id, awardId));

        res.json({ success: true, message: "Award deleted successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}