// src/pages/login.js
import { and, eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { da_percentage } from "../db/schema_da_percentage.js";
import { empRoleMaster } from "../db/schema_emp_role_master.js";
import { employeeMasterNonTeaching } from "../db/schema_non_teaching.js";
import { roleMaster } from "../db/schema_role_master.js";
import { employeeMaster } from "../db/schema_teaching.js";
import { signAccessToken } from "../utils/jwt.js";

export function registerLoginRoute(app) {
  // Teaching staff login
  app.post("/login/teaching", async (req, res) => {
    const { off_email, password } = req.body;
    if (!off_email || !password) {
      return res.status(400).json({ error: "off_email and password are required" });
    }
    try {
      const rows = await db.select().from(employeeMaster).where(eq(employeeMaster.off_email, off_email)).limit(1);
      if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
      const user = rows[0];
      
      // TODO: replace with bcrypt compare if passwords are hashed
      if (user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
      const empId = user.id;

      const user_role_query = await db.select().from(empRoleMaster).where(eq(empRoleMaster.emp_id, empId)).limit(1);
      const user_role_id = user_role_query[0]?.role_id ?? 1;

      const user_role_name_query = await db.select().from(roleMaster).where(eq(roleMaster.id, user_role_id)).limit(1);
      const user_role_name = user_role_name_query[0]?.role ?? "teaching";

      const da_percentage_query = await db.select().from(da_percentage).orderBy(eq(da_percentage.id, 1)).limit(1);
      const da_percent = da_percentage_query[0]?.da_percent || 0;

      user.role = user_role_name;
      const { password: _pw, ...userData } = user;

   
      // Minimal claims — keep the JWT small
      const token = signAccessToken({
        sub: user.off_email, // or user.id if you have it
        role: user.role || "teaching",
        email: user.off_email,
        EMP_ID: empId,
        dept_id: user_role_name_query[0]?.dept_id || null,
        da_percentage: da_percent
      });

      return res.json({
        success: true,
        token,
        user: { ...userData, user_role_name, da_percentage: da_percent },
        // ...other fields
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  // Teaching staff login

// app.post("/login/teaching", async (req, res) => {
//     const { off_email, password, portal } = req.body;

//     if (!off_email || !password) {
//       return res.status(400).json({ error: "off_email and password are required" });
//     }

//     if (portal) {
//       const allowedPortals = ["facultyinformation", "leaveportal"];
//       if (!allowedPortals.includes(portal)) {
//         return res.status(400).json({ error: "Invalid portal for teaching staff" });
//       }
//     }

//     try {
//       const rows = await db
//         .select()
//         .from(employeeMaster)
//         .where(eq(employeeMaster.off_email, off_email))
//         .limit(1);

//       if (!rows.length) {
//         return res.status(401).json({ error: "Invalid credentials" });
//       }

//       const user = rows[0];

//       if (user.password !== password) {
//         return res.status(401).json({ error: "Invalid credentials" });
//       }

//       const user_role_query = await db.select().from(empRoleMaster).where(eq(empRoleMaster.emp_id, user.emp_id)).limit(1);
//       const user_role_id = user_role_query[0].role_id;

   

//       const user_role_name_query = await db.select().from(roleMaster).where(eq(roleMaster.id, user_role_id)).limit(1);
//       const user_role_name = user_role_name_query[0].role;


//       // Append user_role_name to the user object
//       user.role = user_role_name;

//       const { password: _pw, ...userData } = user;

  
//       // Minimal claims — keep the JWT small
//       const token = signAccessToken({
//         sub: user.off_email, // or user.id if you have it
//         role: user_role_name,
//         email: user.off_email,
//         EMP_ID: user.emp_id,
//         dept_id: user.dept_id
//       });

//       return res.json({
//         success: true,
//         token,
//         user: userData, // userData already includes user_role_name
//         is_superadmin: user.is_superadmin || 0, // Include in response
//         ...(portal && { portal }),
//       });
//     } catch (e) {
//       return res.status(500).json({ error: e.message });
//     }
// });

  // // Non-teaching staff login
  // app.post("/login/nonteaching", async (req, res) => {
  //   const { off_email, password } = req.body;
  //   if (!off_email || !password) {
  //     return res.status(400).json({ error: "off_email and password are required" });
  //   }
  //   try {
  //     const rows = await db.select().from(employeeMasterNonTeaching).where(eq(employeeMasterNonTeaching.off_email, off_email)).limit(1);
  //     if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
  //     const user = rows[0];

  //     // TODO: replace with bcrypt compare if passwords are hashed
  //     if (user.password !== password) return res.status(401).json({ error: "Invalid credentials" });

  //     const { password: _pw, ...userData } = user;

  //     const token = signAccessToken({
  //       id: user.id,
  //       role: "non-teaching",
  //       email: user.off_email,
  //     });

  //     console.log("Non-teaching user logged in:", userData);

  //     return res.json({ success: true, token, user: userData });
  //   } catch (e) {
  //     return res.status(500).json({ error: e.message });
  //   }
  // });

const normalizePAN = (pan) => pan.trim().toUpperCase();

app.post("/login/nonteaching", async (req, res) => {
  try {
    let { pan_no, dob } = req.body

    if (!pan_no || !dob) {
      return res.status(400).json({ error: "pan_no and dob are required" });
    }

    pan_no = pan_no;
    const dobISO = dob;
    if (!dobISO) {
      return res.status(400).json({ error: "Invalid dob format" });
    }

    const da_percent_query = await db.select().from(da_percentage).orderBy(eq(da_percentage.id, 1)).limit(1);
    const da_percent = da_percent_query[0]?.da_percent || 0;

    // Fetch user by PAN + DOB (more secure and avoids leaking if PAN exists)
    const rows = await db
      .select({
        id: employeeMasterNonTeaching.id,
        emp_id: employeeMasterNonTeaching.emp_id,
        first_name: employeeMasterNonTeaching.first_name,
        last_name: employeeMasterNonTeaching.last_name,
        off_email: employeeMasterNonTeaching.off_email,
        dob: employeeMasterNonTeaching.dob,
        pan_no: employeeMasterNonTeaching.pan_no,
        designation: employeeMasterNonTeaching.designation,
        dept: employeeMasterNonTeaching.dept,
        status: employeeMasterNonTeaching.status,
      })
      .from(employeeMasterNonTeaching)
      .where(
        and(
          eq(employeeMasterNonTeaching.pan_no, pan_no),
          eq(employeeMasterNonTeaching.dob, dobISO)
        )
      )
      .limit(1);

    if (!rows.length) {
      // Hide which field failed
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    // Build JWT payload. Choose a consistent subject and EMP_ID
    const token = signAccessToken({
      sub: user.id ?? user.pan_no,
      email: user.pan_no,       // using PAN as a unique login ID
      role: "nonteaching",
      EMP_ID:user.id,
      da_percentage: da_percent
    });

    // Avoid sending sensitive fields back (PAN is okay here since it's the login, but remove anything secret)
    const { pan_no: panForClient, ...rest } = user;
    const userData = { pan_no: panForClient, ...rest ,da_percentage: da_percent};

    return res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (e) {
    // Surface DB errors as 500 with message to help you debug in dev logs
    console.error("Non-teaching login error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
})
}