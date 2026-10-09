require("dotenv").config();
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "apks.json");

for (const dir of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Missing ADMIN_USERNAME, ADMIN_PASSWORD, or SESSION_SECRET in .env");
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "blackff_admin",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
  // For production, configure a persistent session store instead of Express's MemoryStore.
}));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false }));

function readApks() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function writeApks(items) { fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2)); }
function requireAdmin(req, res, next) {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: "Admin login required." });
  next();
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100);
    cb(null, `${Date.now()}-${safeOriginal || "app.apk"}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".apk") return cb(new Error("Only .apk files are allowed."));
    cb(null, true);
  }
});

app.get("/api/apks", (_req, res) => {
  const items = readApks().map(({ id, title, description, filename, size, uploadedAt }) => ({
    id, title, description, filename, size, uploadedAt,
    downloadUrl: `/download/${encodeURIComponent(id)}`
  }));
  res.json(items);
});
app.get("/api/session", (req, res) => res.json({ isAdmin: req.session?.isAdmin === true }));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Username or password is incorrect." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start secure session." });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("blackff_admin", { httpOnly: true, sameSite: "strict" });
    res.json({ ok: true });
  });
});

app.post("/api/upload", requireAdmin, (req, res, next) => {
  upload.single("apk")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ error: "Choose an APK file first." });
    const title = String(req.body.title || path.basename(req.file.originalname, ".apk")).trim().slice(0, 80);
    const description = String(req.body.description || "").trim().slice(0, 500);
    const items = readApks();
    const item = {
      id: require("crypto").randomUUID(),
      title: title || "Android APK",
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    items.unshift(item);
    writeApks(items);
    res.json({ ok: true, apk: item });
  });
});
app.get("/download/:id", (req, res) => {
  const item = readApks().find(x => x.id === req.params.id);
  if (!item) return res.status(404).send("APK not found.");
  const file = path.join(UPLOAD_DIR, item.filename);
  if (!fs.existsSync(file)) return res.status(404).send("APK file is missing.");
  res.download(file, item.originalName || item.filename);
});
app.delete("/api/apks/:id", requireAdmin, (req, res) => {
  const items = readApks();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "APK not found." });
  const file = path.join(UPLOAD_DIR, item.filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  writeApks(items.filter(x => x.id !== item.id));
  res.json({ ok: true });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error. Check server logs." });
});
app.listen(PORT, () => console.log(`BLACK FF MODZ running on port ${PORT}`));
