// index.js
import cors from "cors";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import express from "express";
import morgan from "morgan";
import multer from "multer";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import { db } from "./src/db/connection.js";
import { college } from "./src/db/schema_college.js";
import { departmentMaster } from "./src/db/schema_department_master.js";
import { leave } from "./src/db/schema_leave.js";
import { employeeMaster } from "./src/db/schema_teaching.js";
import { changePassword } from "./src/pages/changePassword.js";
import * as it_formController from "./src/pages/it_form.js";
import * as leaveController from "./src/pages/leave.js";
import { registerLoginRoute } from "./src/pages/login.js";
import * as payController from "./src/pages/pay.js";
import {
  addExperience,
  addQualification,
  deleteExperience,
  deleteQualification,
  getProfile,
  getResearchSupervision,
  updateExperience,
  updateProfile,
  updateProfilePhoto,
  updateQualification
} from "./src/pages/profile.js";

import {
  bulkDeletePublications,
  createPublication,
  deletePublication,
  editPublication,
  getPublication,
  uploadPublication
} from "./src/pages/publication.js";

import {
  addAreaofSpecialization,
  deleteAreaofSpecialization,
  getAreaofSpecialization,
  updateAreaofSpecialization,
} from "./src/pages/area_of_specialization.js";

import {
  createForeignVisit,
  deleteForeignVisit,
  getForeignVisits,
  updateForeignVisit,
} from "./src/pages/foreign_visit.js";

import {
  createAward,
  deleteAward,
  getAward,
  updateAward,
} from "./src/pages/award.js";

import {
  createSeminar,
  deleteSeminar,
  getSeminars,
  updateSeminar,
} from "./src/pages/seminar.js";

import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "./src/pages/project.js";

import {
  createPatent,
  deletePatent,
  getPatent,
  updatePatent,
} from "./src/pages/patent.js";

import consultancy from "./src/pages/consultancy.js";
import webpages from "./src/pages/webpages.js";

import { authMiddleware } from "./src/utils/jwt.js";

// Required for ES modules (since __dirname is not available by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// CORS: allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Custom morgan format: IP | STATUS | PATH | TIME
morgan.token('real-ip', (req) => {
  return req.headers['x-real-ip'] || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.ip;
});

// Logger middleware - logs IP, Status Code, Path, and Response Time
app.use(morgan(':real-ip :method :url :status :response-time ms', {
  stream: {
    write: (message) => {
      // Remove trailing newline and colorize output
      const msg = message.trim();
      const parts = msg.split(' ');
      const status = parts[3];
      
      // Color code based on status
      let color = '\x1b[0m'; // default
      if (status && status.startsWith('2')) color = '\x1b[32m'; // green for 2xx
      else if (status && status.startsWith('3')) color = '\x1b[36m'; // cyan for 3xx
      else if (status && status.startsWith('4')) color = '\x1b[33m'; // yellow for 4xx
      else if (status && status.startsWith('5')) color = '\x1b[31m'; // red for 5xx
      
      console.log(color + msg + '\x1b[0m');
    }
  }
}));

app.use(express.json());

// Swagger setup (add Bearer scheme)
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Employee API",
    version: "1.0.0",
    description: "API documentation for Employee Login and Health Check",
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};
const options = {
  swaggerDefinition,
  apis: ["./src/pages/login.js", "./index.js"],
};
const swaggerSpec = swaggerJSDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Register login API
registerLoginRoute(app);

// Dropdown Values
app.get("/dropdown/colleges", authMiddleware, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(college)
      .orderBy(college.Name);
    res.json({ colleges: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/dropdown/departments", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(departmentMaster);
    res.json({ departments: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



app.get(
  "/dropdown/deptstaffs",
  authMiddleware,
  leaveController.dropdownDeptStaffs
);

app.get("/dropdown/financialyears", authMiddleware, payController.getPayFinancialYears);

// Leave portal routes
app.get("/leave/all", authMiddleware, leaveController.getAllLeaves); // admin only
app.get("/leave/dept", authMiddleware, leaveController.getLeavesByDept);
app.get(
  "/leave/nonteaching",
  authMiddleware,
  leaveController.getStaffAdminLeaves
);
app.get("/leave/pg", authMiddleware, leaveController.getPGLeaves);
app.post("/leave/apply", authMiddleware, leaveController.applyLeave);
app.put("/leave/edit", authMiddleware, leaveController.editLeave); // New edit route
app.get("/leave/view/:id", authMiddleware, leaveController.viewLeave);
app.delete("/leave/delete/:id", authMiddleware, leaveController.cancelLeave);
app.get("/leave/pending", authMiddleware, leaveController.getPendingLeaves); // superadmin only
app.post("/leave/approve", authMiddleware, leaveController.approveLeave); // superadmin only
app.get("/leave/my", authMiddleware, leaveController.getMyLeaves); // staff only
app.get("/leave/admin", authMiddleware, leaveController.getAdminLeaves);
app.get("/leave/remaining", authMiddleware, leaveController.getRemainingLeaves);

app.put("/auth/changepassword", authMiddleware, changePassword);


// Profile (Personal Information)
app.get("/dashboard/profile", authMiddleware, getProfile);
app.put("/dashboard/profile", authMiddleware, updateProfile);
app.put("/dashboard/profile/photo", authMiddleware,
  upload.single('photo'),
  updateProfilePhoto);

// Webpages
app.get("/dashboard/webpages", authMiddleware, webpages.getWebpages);
app.post("/dashboard/webpages", authMiddleware, webpages.createWebpage);
app.put("/dashboard/webpages/:id", authMiddleware, webpages.editWebpage);
app.delete("/dashboard/webpages/:id", authMiddleware, webpages.deleteWebpage);

// Consultancy
app.get("/dashboard/consultancy", authMiddleware, consultancy.getConsultancies);
app.post("/dashboard/consultancy", authMiddleware, consultancy.createConsultancy);
app.put("/dashboard/consultancy/:id", authMiddleware, consultancy.editConsultancy);
app.delete("/dashboard/consultancy/:id", authMiddleware, consultancy.deleteConsultancy);


// Qualification routes
app.post("/dashboard/qualification", authMiddleware, addQualification);
app.put("/dashboard/qualification/:id", authMiddleware, updateQualification);
app.delete("/dashboard/qualification/:id", authMiddleware, deleteQualification);


app.post("/dashboard/experience", authMiddleware, addExperience);
app.put("/dashboard/experience", authMiddleware, updateExperience);
app.delete("/dashboard/experience", authMiddleware, deleteExperience);

// Foreign Visit routes
app.get("/dashboard/foreign-visits", authMiddleware, getForeignVisits);
app.post("/dashboard/foreign-visits", authMiddleware, createForeignVisit);
app.put("/dashboard/foreign-visits/:id", authMiddleware, updateForeignVisit);
app.delete("/dashboard/foreign-visits/:id", authMiddleware, deleteForeignVisit);

// Area of Specialization routes
app.post(
  "/dashboard/area-of-specialization",
  authMiddleware,
  addAreaofSpecialization
);
app.delete(
  "/dashboard/area-of-specialization/:id",
  authMiddleware,
  deleteAreaofSpecialization
);
app.put(
  "/dashboard/area-of-specialization/:id",
  authMiddleware,
  updateAreaofSpecialization
);
app.get(
  "/dashboard/area-of-specialization",
  authMiddleware,
  getAreaofSpecialization
);

app.get(
  "/dashboard/research-supervision",
  authMiddleware,
  getResearchSupervision
);

// Award routes
app.get("/dashboard/award", authMiddleware, getAward);
app.post("/dashboard/award", authMiddleware, createAward);
app.put("/dashboard/award/:id", authMiddleware, updateAward);
app.delete("/dashboard/award/:id", authMiddleware, deleteAward);

// Seminar Routes
app.get("/dashboard/seminars", authMiddleware, getSeminars);
app.post("/dashboard/seminars", authMiddleware, createSeminar);
app.put("/dashboard/seminars/:id", authMiddleware, updateSeminar);
app.delete("/dashboard/seminars/:id", authMiddleware, deleteSeminar);

// Publication routes
app.get("/dashboard/publication", authMiddleware, getPublication);
app.post("/dashboard/publication", authMiddleware, createPublication); // to refresh data after adding new publication
app.put("/dashboard/publication/:id", authMiddleware, editPublication); // to refresh data after editing publication
app.delete("/dashboard/publication/:id", authMiddleware, deletePublication);
// Upload BibTeX file (expects multipart/form-data with file field named 'bibtex')
app.post(
  "/dashboard/publication/upload",
  authMiddleware,
  upload.single('bibtex'),
  uploadPublication
);

app.post("/dashboard/publication/bulk", authMiddleware, bulkDeletePublications);

// Project routes
app.get("/dashboard/proposals", authMiddleware, getProjects);
app.post("/dashboard/proposals", authMiddleware, createProject);
app.put("/dashboard/proposals/:id", authMiddleware, updateProject);
app.delete("/dashboard/proposals/:id", authMiddleware, deleteProject);

// Patent routes
app.get("/dashboard/patent", authMiddleware, getPatent);
app.post("/dashboard/patent", authMiddleware, createPatent);
app.put("/dashboard/patent/:id", authMiddleware, updatePatent);
app.delete("/dashboard/patent/:id", authMiddleware, deletePatent);

// Pay routes
app.get("/dashboard/pay", authMiddleware, payController.getPayDetails);
app.get("/dashboard/pay/admin", authMiddleware, payController.getPayDetailsAdmin);
app.post("/dashboard/pay", authMiddleware, payController.postPayDetails);
app.post("/dashboard/pay/bulk", authMiddleware, payController.bulkUploadPay);
app.put("/dashboard/pay", authMiddleware, payController.editPayDetails); // allow both POST and PUT for upsert
app.get("/dashboard/paydrawn/admin", authMiddleware, payController.getPayrollStatementAdmin);
app.get("/dashboard/paydrawn", authMiddleware, payController.getPayrollStatementUser);

// it_form routes

app.get("/dashboard/it_form", authMiddleware, it_formController.getSalaryTaxStatement);


// settings routes

app.put("/settings/da_percentage", authMiddleware, payController.setDaPercentage);

// server
app.get("/leave/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db.select().from(leave).where(eq(leave.id, id)).limit(1);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ leave: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/teaching/me", authMiddleware, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });

    const rows = await db
      .select()
      .from(employeeMaster)
      .where(eq(employeeMaster.off_email, email))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...userData } = rows[0];
    return res.json({ success: true, user: userData });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.use("/uploads", express.static("uploads"));

app.get("/user/photo/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "uploads/emp_photo", filename));
});

// Public health check (leave public if you want)
app.get("/health", async (_req, res) => {
  try {
    await db.select().from(employeeMaster).limit(1);
    res.json({ status: "ok", db: "up" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Serve React static files (build folder) - AFTER all API routes
// Make sure your React build is in the 'build' or 'dist' folder
app.use(express.static(path.join(__dirname, "build")));

// Catch-all route: serve React's index.html for all other routes
// This must be LAST - after all API routes and static files
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
  try {
    await db.select().from(employeeMaster).limit(1);
    console.log(`Server listening on http://localhost:${port}`);
  } catch (e) {
    console.error("Failed to connect to MySQL:", e.message);
    process.exit(1);
  }
});
