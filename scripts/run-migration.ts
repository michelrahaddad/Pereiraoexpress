import pg from "pg";
import fs from "fs";
import path from "path";

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const sqlFile = path.join(__dirname, "migrate-to-production.sql");
    const sql = fs.readFileSync(sqlFile, "utf-8");

    console.log("Starting migration...");
    console.log(`SQL script size: ${sql.length} bytes`);

    await client.query(sql);

    const result = await client.query(`
      SELECT 'users' as table_name, count(*) as count FROM users
      UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
      UNION ALL SELECT 'service_categories', count(*) FROM service_categories
      UNION ALL SELECT 'provider_availability', count(*) FROM provider_availability
      UNION ALL SELECT 'symptoms', count(*) FROM symptoms
      UNION ALL SELECT 'symptom_questions', count(*) FROM symptom_questions
      UNION ALL SELECT 'symptom_diagnoses', count(*) FROM symptom_diagnoses
      UNION ALL SELECT 'local_knowledge', count(*) FROM local_knowledge
    `);

    console.log("\nMigration completed successfully!");
    console.log("\nVerification:");
    result.rows.forEach((row: any) => {
      console.log(`  ${row.table_name}: ${row.count} records`);
    });
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
