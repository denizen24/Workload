/**
 * Однократная установка нового пароля пользователю в MongoDB.
 * Запуск из корня репозитория: npm run set-password -- <email> <newPassword>
 * Или из apps/backend: node scripts/set-user-password.mjs <email> <newPassword>
 * Требует: MONGO_URI в .env (в корне репозитория) или в окружении.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadEnv() {
  const envPath = resolve(__dirname, "..", "..", ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/workload";
const [email, newPassword] = process.argv.slice(2);

if (!email || !newPassword) {
  console.error("Usage: node scripts/set-user-password.mjs <email> <newPassword>");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.connection.collection("users");
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    console.error("User not found:", normalizedEmail);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash, updatedAt: new Date() } }
  );

  console.log("Password updated for:", normalizedEmail);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
