import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { experienceMaster } from "../db/schema_experience_master.js";
import { qualificationMaster } from "../db/schema_qualification_master.js";
import { researchSupervision } from "../db/schema_research_supervision.js";
import { employeeMaster } from "../db/schema_teaching.js";

export async function getProfile(req, res) {
  try {
    const current_user = req.user;

    const profile_data = {};

    const profile = await db
      .select()
      .from(employeeMaster)
      .where(eq(employeeMaster.id, current_user.EMP_ID))
      .limit(1);

    profile_data.profile = profile[0];

    const qualification = await db
      .select()
      .from(qualificationMaster)
      .where(eq(qualificationMaster.emp_id, current_user.EMP_ID))
      .orderBy(qualificationMaster.arrange);

    profile_data.qualification = qualification;

    const experiences = await db
      .select()
      .from(experienceMaster)
      .where(eq(experienceMaster.emp_id, current_user.EMP_ID));

    profile_data.experiences = experiences;

    res.json({ success: true, profile_data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateProfile(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { personalInfo, experiences } = req.body || {};
  try {
    // Personal Info
    if (personalInfo && typeof personalInfo === "object") {
      const allowedPersonal = [
        "first_name",
        "last_name",
        "off_email",
        "dob",
        "doj",
        "gender",
        "blood_group",
        "per_email_1",
        "per_email_2",
        "mobile_1",
        "mobile_2",
        "address_1",
        "address_2",
        "photo",
        "resume",
        "father_name",
        "mother_name",
        "pan_no",
        "pan_name",
      ];
      const updatePersonal = {};
      for (const f of allowedPersonal) {
        if (Object.prototype.hasOwnProperty.call(personalInfo, f)) {
          updatePersonal[f] = personalInfo[f];
        }
      }
      if (Object.keys(updatePersonal).length) {
        await db
          .update(employeeMaster)
          .set(updatePersonal)
          .where(eq(employeeMaster.id, current_user.EMP_ID));
      }
    }

    return res.json({ success: true, message: "Profile updated successfully" });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}

export async function updateQualification(req, res) {
  const current_user = req.user;
  const qual_id = Number(req.params.id);
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { qualifications } = req.body || {};

  // Qualification
  if (Array.isArray(qualifications)) {
    const allowedQual = [
      "qualification",
      "year_from",
      "year_upto",
      "mark",
      "institute",
      "status",
      "arrange",
      // add other allowed qualification fields here
    ];
    for (const qual of qualifications) {
      const patch = {};
      for (const f of allowedQual) {
        if (Object.prototype.hasOwnProperty.call(qual, f)) {
          const value = qual[f];
          patch[f] = value === '' ? null : value;
        }
      }
      // Only update if qual.id is present and belongs to current user
      if (qual_id) {
        await db
          .update(qualificationMaster)
          .set(patch)
          .where(
            eq(qualificationMaster.id, qual_id),
            eq(qualificationMaster.emp_id, current_user.EMP_ID)
          );
      }
    }
    return res.json({ success: true, message: "Qualifications updated successfully" });
  } else {
    return res.status(400).json({ success: false, message: "Invalid qualifications array" });
  }
}

export async function updateExperience(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { experiences } = req.body || {};

  // Experience
  if (Array.isArray(experiences)) {
    const allowedExp = [
      "company",
      "month_from",
      "year_from",
      "month_upto",
      "year_upto",
      "role",
      "status",
      "Exp_type",
      // add other allowed experience fields here
    ];
    for (const exp of experiences) {
      const patch = {};
      for (const f of allowedExp) {
        if (Object.prototype.hasOwnProperty.call(exp, f)) {
          patch[f] = exp[f];
        }
      }
      patch.emp_id = current_user.EMP_ID;
      if (exp.id) {
        await db
          .update(experienceMaster)
          .set(patch)
          .where(eq(experienceMaster.id, Number(exp.id)));
      }
      else{
        await db.insert(experienceMaster).values(patch);
      }
    }
    return res.json({ success: true, message: "Experiences updated successfully" });
  } else {
    return res.status(400).json({ success: false, message: "Invalid experiences array" });
  }
}


export async function getResearchSupervision(req, res) {
  try {
    const current_user = req.user;

    const researchSupervisionData = await db
      .select()
      .from(researchSupervision)
      .where(eq(researchSupervision.emp_id, current_user.EMP_ID));

    res.json({ success: true, researchSupervision: researchSupervisionData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function addQualification(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { qualificationInfo } = req.body || {};
  try {
    // Qualification Info
    if (qualificationInfo && typeof qualificationInfo === "object") {
      const allowedQualification = [
        "qualification",
        "year_from",
        "year_upto",
        "mark",
        "institute",
        "status",
        "arrange",
      ];
      const newQualification = {};
      for (const f of allowedQualification) {
        if (Object.prototype.hasOwnProperty.call(qualificationInfo, f)) {
          newQualification[f] = qualificationInfo[f];
        }
      }
      newQualification.emp_id = current_user.EMP_ID;
      // Only insert if at least one allowed field (excluding emp_id) is present
      const validFields = Object.keys(newQualification).filter(
        (f) => f !== "emp_id"
      );
      if (validFields.length) {
        await db.insert(qualificationMaster).values(newQualification);
        return res.json({
          success: true,
          message: "Qualification added successfully",
        });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: "No valid qualification fields provided",
          });
      }
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid qualification info" });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}

export async function deleteQualification(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const qualificationId = req.params.id;

  try {
    if (!qualificationId) {
      return res
        .status(400)
        .json({ success: false, message: "Qualification ID is required" });
    }

    // Verify the qualification belongs to the user
    const qualification = await db
      .select()
      .from(qualificationMaster)
      .where(
        eq(qualificationMaster.id, qualificationId),
        eq(qualificationMaster.emp_id, current_user.EMP_ID)
      )
      .limit(1);

    if (!qualification.length || Number(qualification[0].emp_id) !== current_user.EMP_ID) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Qualification not found or not authorized",
        });
    }

    // Delete the qualification
    await db
      .delete(qualificationMaster)
      .where(
        eq(qualificationMaster.id, qualificationId),
        eq(qualificationMaster.emp_id, current_user.EMP_ID)
      );

    return res.json({
      success: true,
      message: "Qualification deleted successfully",
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}

export async function addExperience(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { experienceInfo } = req.body || {};
  try {
    // Experience Info
    if (experienceInfo && typeof experienceInfo === "object") {
      const allowedExperience = [
        "company",
        "month_from",
        "year_from",
        "month_upto",
        "year_upto",
        "role",
        "status",
        "Exp_type",
      ];
      const newExperience = {};
      for (const f of allowedExperience) {
        if (Object.prototype.hasOwnProperty.call(experienceInfo, f)) {
          newExperience[f] = experienceInfo[f];
        }
      }
      newExperience.emp_id = current_user.EMP_ID;
      // Only insert if at least one allowed field (excluding emp_id) is present
      const validFields = Object.keys(newExperience).filter(
        (f) => f !== "emp_id"
      );
      if (validFields.length) {
        await db.insert(experienceMaster).values(newExperience);
        return res.json({
          success: true,
          message: "Experience added successfully",
        });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: "No valid experience fields provided",
          });
      }
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid experience info" });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}

export async function deleteExperience(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { experienceId } = req.body || {};

  try {
    if (!experienceId) {
      return res
        .status(400)
        .json({ success: false, message: "Experience ID is required" });
    }

    // Verify the experience belongs to the user
    const experience = await db
      .select()
      .from(experienceMaster)
      .where(
        eq(experienceMaster.id, experienceId),
        eq(experienceMaster.emp_id, current_user.EMP_ID)
      )
      .limit(1);

    if (!experience.length) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Experience not found or not authorized",
        });
    }

    // Delete the experience
    await db
      .delete(experienceMaster)
      .where(
        eq(experienceMaster.id, experienceId),
        eq(experienceMaster.emp_id, current_user.EMP_ID)
      );

    return res.json({
      success: true,
      message: "Experience deleted successfully",
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Server error" });
  }
}

export async function updateProfilePhoto(req, res) {
  const current_user = req.user;
  if (!current_user?.EMP_ID) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    // dynamic imports to stay compatible with ESM file
    const fsModule = await import("fs");
    const fs = fsModule.promises || fsModule;
    const pathModule = await import("path");
    const path = pathModule.default || pathModule;

    const uploadsDir = path.resolve("uploads/emp_photo");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Fetch current profile early to obtain first_name for default filename and old photo
    const profileRow = await db
      .select()
      .from(employeeMaster)
      .where(eq(employeeMaster.id, current_user.EMP_ID))
      .limit(1);

    const oldFileName = profileRow?.[0]?.photo;

    // determine a sanitized base name: first_name_empId_date
    const rawFirstName =
      (profileRow?.[0]?.first_name) ||
      current_user.first_name ||
      `emp${current_user.EMP_ID}`;
    const sanitize = (s) =>
      String(s)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "");
    const baseName = `${sanitize(rawFirstName)}_${current_user.EMP_ID}_${Date.now()}`;

    let newFileName;

    // helper to get extension from original name or mimetype
    const extFrom = (originalName, mime) => {
      if (originalName) {
        const ext = path.extname(originalName);
        if (ext) return ext;
      }
      if (mime) {
        const parts = mime.split("/");
        if (parts[1]) return "." + parts[1].split("+")[0];
      }
      return ".png";
    };

    // 1) If file uploaded via multer (req.file)
    if (req.file) {
      const file = req.file;
      const srcPath = file.path || (file.destination ? path.join(file.destination, file.filename) : null);

      const ext = extFrom(file.originalname, file.mimetype);
      newFileName = `${baseName}${ext}`;

      const destPath = path.join(uploadsDir, newFileName);

      // move/rename file to uploadsDir with our default name
      if (srcPath && path.resolve(srcPath) !== path.resolve(destPath)) {
        await fs.rename(srcPath, destPath).catch(async (err) => {
          // if rename fails (cross-device), fallback to copy+unlink
          if (err.code === "EXDEV" || err.code === "EPERM") {
            await fs.copyFile(srcPath, destPath);
            await fs.unlink(srcPath).catch(() => {});
          } else {
            throw err;
          }
        });
      } else if (!srcPath) {
        // if multer didn't provide a path, try to use buffer (e.g., multer.memoryStorage)
        if (file.buffer) {
          await fs.writeFile(destPath, file.buffer);
        } else {
          return res.status(400).json({ success: false, message: "Uploaded file missing path/buffer" });
        }
      }
    }
    // 2) If photo sent as base64 string in req.body.photo
    else if (req.body?.photo && typeof req.body.photo === "string") {
      const dataUrlMatch = req.body.photo.match(/^data:(.+);base64,(.+)$/);
      const base64 = dataUrlMatch ? dataUrlMatch[2] : req.body.photo;
      const mime = dataUrlMatch ? dataUrlMatch[1] : "image/png";
      const ext = mime.split("/").pop().replace("+xml", "");
      newFileName = `${baseName}.${ext}`;
      const destPath = path.join(uploadsDir, newFileName);
      await fs.writeFile(destPath, Buffer.from(base64, "base64"));
    } else {
      return res.status(400).json({ success: false, message: "No photo provided" });
    }

    // Update DB with new filename
    await db
      .update(employeeMaster)
      .set({ photo: newFileName })
      .where(eq(employeeMaster.id, current_user.EMP_ID));

    // Remove old file if it exists and is different from new file
    if (oldFileName && oldFileName !== newFileName) {
      const oldPath = path.join(uploadsDir, String(oldFileName));
      await fs.unlink(oldPath).catch(() => {
        // ignore errors (file might not exist)
      });
    }

    return res.json({ success: true, message: "Profile photo updated successfully", photo: newFileName });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
}
