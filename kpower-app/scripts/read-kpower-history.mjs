/**
 * Read-only probe of stock KPower SQLite history (when present).
 * Does not invent samples — prints table names / row counts for operators.
 *
 * Usage: node scripts/read-kpower-history.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const dbPath = path.join(
  process.env.LOCALAPPDATA || "",
  "KPower",
  "data",
  "kpower.db",
);

if (!fs.existsSync(dbPath)) {
  console.log(JSON.stringify({ ok: false, message: "kpower.db not found", dbPath }));
  process.exit(0);
}

// better-sqlite3 may not be installed — fall back to python helper note
try {
  const require = createRequire(import.meta.url);
  const Database = require("better-sqlite3");
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  const summary = tables.map((t) => {
    try {
      const n = db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get().c;
      return { table: t.name, rows: n };
    } catch {
      return { table: t.name, rows: null };
    }
  });
  console.log(JSON.stringify({ ok: true, dbPath, tables: summary }, null, 2));
  db.close();
} catch (err) {
  console.log(
    JSON.stringify({
      ok: false,
      dbPath,
      message:
        "Readable DB present but better-sqlite3 not installed — app history uses in-app samples; stock DB remains available for offline audit via Python/sqlite3",
      error: String(err.message || err),
    }),
  );
}
