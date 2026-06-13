import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

let envPath: string = "";

try {
  if (import.meta.url) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    envPath = path.resolve(dirname, "../../.env");
  }
} catch (e) {}

if (!envPath) {
  envPath = path.resolve(process.cwd(), "../../.env");
}

try {
  process.loadEnvFile(envPath);
} catch (e: any) {
  try {
    process.loadEnvFile();
  } catch (err: any) {}
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
