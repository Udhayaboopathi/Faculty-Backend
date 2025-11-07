import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { employeeMaster } from "../db/schema_teaching.js";

// Change password for teaching or non-teaching staff
export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "oldPassword and newPassword are required" });
  }
  try {
    var user = await db.select().from(employeeMaster).where(eq(employeeMaster.off_email, req.user.email)).limit(1);
    user = user[0];
    if(!user) return res.status(404).json({ error: "User not found" });
    if(user.id !== req.user.EMP_ID) return res.status(403).json({ error: "You are not authorized to change this password" });
    const off_email = user.off_email;
    if (user.password !== oldPassword) return res.status(401).json({ error: "Old password is incorrect" });
    await db.update(employeeMaster).set({ password: newPassword }).where(eq(employeeMaster.off_email, off_email));
    res.json({ success: true, message: "Password changed successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
