import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// For now we'll use in-memory storage if DATABASE_URL is not properly configured
export let db: any = null;

try {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')) {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
    console.log("✅ Database connection established");
  } else {
    console.log("⚠️  Using in-memory storage - Database not configured");
  }
} catch (error) {
  console.log("⚠️  Database connection failed, using in-memory storage:", error);
}
