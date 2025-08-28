// Migration script from Replit PostgreSQL to Supabase
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./shared/schema.js";
import fs from 'fs';

async function migrateToSupabase() {
  console.log("🚀 Starting migration to Supabase...");
  
  try {
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync('./migration_backup.json', 'utf8'));
    console.log(`📊 Found ${backupData.users.length} users to migrate`);
    
    // Connect to Supabase (you need to set SUPABASE_DATABASE_URL)
    if (!process.env.SUPABASE_DATABASE_URL) {
      throw new Error("SUPABASE_DATABASE_URL environment variable is required");
    }
    
    console.log("🔗 Connecting to Supabase...");
    const sql = postgres(process.env.SUPABASE_DATABASE_URL, {
      ssl: 'require',
      max: 1,
    });
    
    const db = drizzle(sql, { schema: { users } });
    
    // Test connection
    await sql`SELECT 1 as test`;
    console.log("✅ Connected to Supabase successfully");
    
    // Create tables using Drizzle push (safer than manual migrations)
    console.log("📋 Creating tables in Supabase...");
    console.log("💡 Please run: npm run db:push --force");
    console.log("   This will create all tables safely");
    
    // Migration will continue after tables are created
    console.log("⏳ After tables are created, run the data migration...");
    
    // Insert users
    for (const user of backupData.users) {
      try {
        await db.insert(users).values({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          profileImageUrl: user.profileImageUrl,
          userType: user.userType,
          birthDate: user.birthDate ? new Date(user.birthDate) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        }).onConflictDoNothing();
        
        console.log(`✅ Migrated user: ${user.firstName} ${user.lastName} (${user.userType})`);
      } catch (error) {
        console.log(`⚠️  Error migrating user ${user.email}:`, error.message);
      }
    }
    
    // Close connection
    await sql.end();
    console.log("🎉 Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log("\n💡 To fix IPv6 connectivity issue:");
      console.log("1. Go to Supabase Dashboard → Settings → Database");
      console.log("2. Enable 'IPv4 dedicated address' ($4.00/month)");
      console.log("3. Update SUPABASE_DATABASE_URL with the new IPv4 connection string");
    }
  }
}

// Run migration
migrateToSupabase();