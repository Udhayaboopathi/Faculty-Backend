import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { publication } from "../db/schema_publication.js";

export async function getPublication(req, res) {
  try {
    const current_user = req.user;

    const awardData = await db
      .select()
      .from(publication)
      .where(eq(publication.emp_id, current_user.EMP_ID));

    res.json({ success: true, award: awardData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createPublication(req, res) {
  try {
    const current_user = req.user;
    const {
      P_type,
      Title,
      P_Name,
      P_Level,
      Author_1,
      Author_2,
      Author_3,
      Volume,
      Issue,
      Page_from,
      Page_to,
      Impact_F,
      Indexing,
      Publisher,
      P_year,
      P_month,
      DOI,
      Webpage,
      Paper,
    } = req.body;

    // Validate and cast data to match schema
    const validatedData = {
      emp_id: String(current_user.EMP_ID).slice(0, 10),
      P_type: ent.type ? String(ent.type).slice(0, 30) : "misc",
      Title: cleanedTitle ?? "Untitled",
      P_Name: pname ? String(pname) : "Unknown",
      P_Level: (plevel ?? "International").slice(0, 20),

      Author_1: authors[0] ? String(authors[0]).slice(0, 30) : "Unknown",
      Author_2: authors[1] ?? null, // <-- changed to null
      Author_3: authors[2] ?? null, // <-- changed to null

      Volume: volume ?? 0,
      Issue: issue ?? 0,
      Page_from: page_from ?? 0,
      Page_to: page_to ?? 0,
      Impact_F: impact_f ?? 0.0,

      Indexing: indexing ?? null, // <-- changed to null
      Publisher: publisherCandidate ? String(publisherCandidate) : "Unknown",
      P_year: year ?? new Date().getFullYear(),
      P_month: pmonth ?? null, // <-- changed to null

      DOI: f.doi ? String(f.doi) : null, // <-- changed to null
      Webpage: f.url ? String(f.url) : null, // <-- changed to null
      Paper:
        f.citationkey || f.key || cleanedTitle
          ? String(f.citationkey || f.key || cleanedTitle).slice(0, 300)
          : null, // <-- prefer null over undefined
    };

    // Validate required fields
    if (
      !validatedData.emp_id ||
      !validatedData.P_type ||
      !validatedData.Title ||
      !validatedData.P_Name ||
      !validatedData.P_Level ||
      !validatedData.Author_1 ||
      !validatedData.P_year
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate numeric fields
    if (
      isNaN(validatedData.Volume) ||
      isNaN(validatedData.Issue) ||
      isNaN(validatedData.Page_from) ||
      isNaN(validatedData.Page_to) ||
      isNaN(validatedData.Impact_F) ||
      isNaN(validatedData.P_year)
    ) {
      return res.status(400).json({ error: "Invalid numeric values" });
    }

    const newPublication = await db.insert(publication).values(validatedData);

    res.json({ success: true, publication: newPublication });
  } catch (e) {
    console.error("Error inserting publication:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function editPublication(req, res) {
  try {
    const current_user = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(publication)
      .where(eq(publication.Id, id)) // <-- capital I if DB uses `Id`
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });

    const ownerId = String(existing[0].emp_id);
    const requesterId = String(current_user.EMP_ID);

    if (ownerId !== requesterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allowed = [
      "P_type",
      "Title",
      "P_Name",
      "P_Level",
      "Author_1",
      "Author_2",
      "Author_3",
      "Volume",
      "Issue",
      "Page_from",
      "Page_to",
      "Impact_F",
      "Indexing",
      "Publisher",
      "P_year",
      "P_month",
      "DOI",
      "Webpage",
      "Paper", // remove DOI if you dropped it in DB
    ];
    const updateData = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k))
        updateData[k] = req.body[k];
    }
    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, publication: existing[0] });
    }

    await db.update(publication).set(updateData).where(eq(publication.Id, id));

    const updated = await db
      .select()
      .from(publication)
      .where(eq(publication.Id, id))
      .limit(1);

    return res.json({ success: true, publication: updated[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export async function deletePublication(req, res) {
  try {
    const current_user = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Invalid id" });

    const existing = await db
      .select()
      .from(publication)
      .where(eq(publication.Id, id)) // <-- capital I if DB uses `Id`
      .limit(1);

    if (!existing.length) return res.status(404).json({ error: "Not found" });

    const ownerId = String(existing[0].emp_id);
    const requesterId = String(current_user.EMP_ID);

    if (ownerId !== requesterId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(publication).where(eq(publication.Id, id));

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// Assumes you have: import { db } from "../db"; import { publication } from "../db/schema";
// If you're on drizzle-orm >=0.29, .insert(...).values(...) auto-executes.
// If you're on an older version, add `.execute()`.

export async function uploadPublication(req, res) {
  try {
    const current_user = req.user;
    if (!current_user || !current_user.EMP_ID) {
      return res.status(401).json({ error: "Unauthorized: missing EMP_ID" });
    }

    // 1) Read BibTeX (supports: multipart file, files[], raw body, string body, body.bibtex)
    let bibtext = "";
    if (req.file?.buffer) {
      bibtext = req.file.buffer.toString("utf8");
    } else if (Array.isArray(req.files) && req.files[0]?.buffer) {
      bibtext = req.files[0].buffer.toString("utf8");
    } else if (Buffer.isBuffer(req.body)) {
      bibtext = req.body.toString("utf8");
    } else if (typeof req.body === "string") {
      bibtext = req.body;
    } else if (typeof req.body?.bibtex === "string") {
      bibtext = req.body.bibtex;
    } else if (req.body?.buffer) {
      try { bibtext = req.body.buffer.toString("utf8"); } catch {}
    }

    if (!bibtext?.trim()) {
      return res.status(400).json({ error: "Missing bibtex content in file or 'bibtex' field" });
    }

    // 2) Parse BibTeX entries (tolerant)
    const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,]+),([\s\S]*?)\}\s*(?=@|$)/g;
    const entries = [];
    let mm;
    while ((mm = entryRegex.exec(bibtext))) {
      const type = (mm[1] || "").toLowerCase();
      const citationkey = (mm[2] || "").trim();
      const body = mm[3] || "";
      const fields = { citationkey };

      // key = { ... } | "..." | bareword
      const fieldRegex = /([A-Za-z0-9_\-]+)\s*=\s*(\{([\s\S]*?)\}|"([\s\S]*?)"|([^,\n\r]+))\s*(,|$)/g;
      let fr;
      while ((fr = fieldRegex.exec(body))) {
        const key = (fr[1] || "").toLowerCase();
        const val =
          fr[3] !== undefined ? fr[3] :
          fr[4] !== undefined ? fr[4] :
          fr[5] !== undefined ? fr[5] : "";
        fields[key] = String(val).trim();
      }

      entries.push({ type, citationkey, fields });
    }

    if (!entries.length) {
      return res.status(400).json({ error: "No valid bibtex entries found" });
    }

    // Helpers
    const mapAuthors = (a) =>
      !a
        ? []
        : a
            .split(/\s+and\s+/i)
            .map((s) => s.replace(/^\{+|}+$/g, "").trim())
            .filter(Boolean);

    const monthNames = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const toInt = (v, fallback = null) => {
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : fallback;
    };
    const toFloat = (v, fallback = null) => {
      const n = parseFloat(String(v));
      return Number.isFinite(n) ? n : fallback;
    };

    const results = [];
    for (const ent of entries) {
      try {
        const f = ent.fields || {};

        // Authors (max 3 into Author_1..3)
        const authors = mapAuthors(f.author);

        // Pages
        const pagesRaw = (f.pages || "").replace(/\s+/g, "");
        let page_from = null, page_to = null;
        if (pagesRaw) {
          const parts = pagesRaw.split(/--|–|-/).filter(Boolean);
          const pf = toInt(parts[0], null);
          const pt = parts.length > 1 ? toInt(parts[1], null) : null;
          page_from = pf;
          page_to = pt ?? pf ?? null;
        }

        // Volume / Issue / Impact
        const volume = f.volume ? toInt(f.volume, null) : null;
        const numberOrIssue = (f.number ?? f.issue);
        const issue = numberOrIssue != null && String(numberOrIssue).trim() !== ""
          ? toInt(numberOrIssue, null)
          : null;
        const impact_f = f.impact_f ? toFloat(f.impact_f, null) : null;

        // Where published
        const pname = f.booktitle || f.journal || f.publisher || null;

        // Publication level
        let plevel = null;
        if (pname) {
          const lc = String(pname).toLowerCase();
          if (/\binternational\b/.test(lc)) plevel = "International";
          else if (/\bnational\b/.test(lc)) plevel = "National";
        }

        // Month
        let pmonth = null;
        if (f.month) {
          const mmTxt = String(f.month).trim().replace(/^#/, "");
          const mn = toInt(mmTxt, null);
          if (mn && mn >= 1 && mn <= 12) pmonth = mn;
          else {
            const short = mmTxt.toLowerCase().slice(0, 3);
            if (monthNames[short]) pmonth = monthNames[short];
          }
        }

        // Year
        const year = f.year ? toInt(f.year, null) : null;

        // Title (strip outermost braces/quotes)
        const cleanedTitle = f.title
          ? String(f.title).replace(/^(?:\{+|"+)|(?:\}+|"+)$/g, "").trim()
          : null;

        const publisherCandidate =
          f.publisher || f.organization
            ? String(f.publisher || f.organization)
            : pname
            ? String(pname)
            : null;

        // Indexing (respect empty as NULL)
        const indexing =
          f.indexing && String(f.indexing).trim().length > 0
            ? String(f.indexing).slice(0, 80)
            : null;

        // Build insert data - ONLY include columns that should be inserted
        // Exclude Id (auto-increment) and UPDATED (has default)
        const insertData = {
          emp_id: String(current_user.EMP_ID).slice(0, 10),
          P_type: (ent.type ? String(ent.type) : "misc").slice(0, 30),
          Title: cleanedTitle ?? "Untitled",
          P_Name: pname ? String(pname) : "Unknown",
          P_Level: (plevel ?? "International").slice(0, 20),
          Author_1: (authors[0] ? String(authors[0]) : "Unknown").slice(0, 30),
          Author_2: authors[1] ? String(authors[1]) : null,
          Author_3: authors[2] ? String(authors[2]) : null,
          Volume: volume ?? 0,
          Issue: issue ?? 0,
          Page_from: page_from ?? 0,
          Page_to: page_to ?? 0,
          Impact_F: String(impact_f ?? 0.0), // Convert to string for decimal
          Indexing: indexing,
          Publisher: publisherCandidate ? String(publisherCandidate) : "Unknown",
          P_year: year ?? new Date().getFullYear(),
          P_month: pmonth,
          DOI: f.doi ? String(f.doi) : null,
          Webpage: f.url ? String(f.url) : null,
          Paper: (f.citationkey || f.key || cleanedTitle)
            ? String(f.citationkey || f.key || cleanedTitle).slice(0, 300)
            : null,
        };

        // Insert using Drizzle
        try {
          const [insertResult] = await db
            .insert(publication)
            .values(insertData)
            .$returningId(); // Returns the inserted ID

          results.push({ 
            success: true, 
            parsed: insertData, 
            insertedId: insertResult?.Id 
          });
        } catch (insertErr) {
          console.error("Insert error:", insertErr);
          results.push({
            success: false,
            error: insertErr?.message || String(insertErr),
            parsed: insertData,
          });
        }
      } catch (innerE) {
        console.error("Parse error:", innerE);
        results.push({ 
          success: false, 
          error: innerE?.message || String(innerE) 
        });
      }
    }

    const ok = results.filter(r => r.success).length;
    const bad = results.length - ok;
    
    return res.json({
      success: bad === 0,
      inserted: ok,
      failed: bad,
      results,
    });
  } catch (e) {
    console.error("Error uploading publication:", e);
    return res.status(500).json({ 
      error: e.message || String(e),
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
}