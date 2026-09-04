const fs = require("node:fs");
const path = require("node:path");

const databasePath = path.join(__dirname, "..", "prisma", "dev.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.closeSync(fs.openSync(databasePath, "a"));
console.log(`SQLite database ready: ${databasePath}`);
