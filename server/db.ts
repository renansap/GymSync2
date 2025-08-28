import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Database connection
export let db: any = null;

try {
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { 
      ssl: 'require',
      max: 1, // Limit connections for serverless
    });
    db = drizzle(sql, { schema });
    console.log("✅ Database connection established");
  } else {
    console.log("⚠️  Using in-memory storage - DATABASE_URL not configured");
  }
} catch (error) {
  console.log("⚠️  Database connection failed, using in-memory storage:", error);
}
