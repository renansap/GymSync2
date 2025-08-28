import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Database connection
export let db: any = null;
export let isDbConnected = false;

async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      console.log("🔗 Connecting to Replit PostgreSQL...");
      const sql = postgres(process.env.DATABASE_URL, { 
        max: 1, // Limit connections for serverless
        connect_timeout: 10,
        idle_timeout: 10,
      });
      db = drizzle(sql, { schema });
      
      // Test the connection
      await sql`SELECT 1 as test`;
      isDbConnected = true;
      console.log("✅ Database connection established and tested");
      
      // Initialize storage after database is ready
      const { initializeStorage } = await import("./storage");
      initializeStorage();
      
    } else {
      console.log("⚠️  Using in-memory storage - DATABASE_URL not configured");
      // Initialize storage without database
      const { initializeStorage } = await import("./storage");
      initializeStorage();
    }
  } catch (error) {
    console.log("⚠️  Database connection failed, using in-memory storage:", (error as Error).message);
    db = null;
    isDbConnected = false;
    
    // Initialize storage in fallback mode
    const { initializeStorage } = await import("./storage");
    initializeStorage();
  }
}

// Initialize the database connection
initializeDatabase();
