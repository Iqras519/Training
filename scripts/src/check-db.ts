import { db, analysesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Querying database for analyses...");
  try {
    const results = await db.select().from(analysesTable).orderBy(desc(analysesTable.id)).limit(10);
    console.log(`Found ${results.length} analyses:`);
    for (const r of results) {
      console.log(`ID: ${r.id}, Filename: ${r.fileName}, Severity: ${r.severity}, Confidence: ${r.confidenceScore}, HealthScore: ${r.healthScore}, CreatedAt: ${r.createdAt}`);
    }
  } catch (error) {
    console.error("Database query failed:", error);
  }
  process.exit(0);
}

main();
