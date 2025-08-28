import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Database connection
export let db: any = null;
export let isDbConnected = false;

async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { 
        ssl: 'require',
        max: 1, // Limit connections for serverless
        connect_timeout: 10,
        socket_timeout: 10,
        idle_timeout: 10,
      });
      db = drizzle(sql, { schema });
      
      // Test the connection
      await sql`SELECT 1 as test`;
      isDbConnected = true;
      console.log("✅ Database connection established and tested");
    } else {
      console.log("⚠️  Using in-memory storage - DATABASE_URL not configured");
    }
  } catch (error) {
    console.log("⚠️  Database connection failed, using in-memory storage:", error.message);
    db = null;
    isDbConnected = false;
  }
}

// Initialize the database connection
initializeDatabase();
