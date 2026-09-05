/**
 * Run this ONCE after `npx prisma migrate dev --name init` has created the
 * `contracts` table. Prisma cannot express a PostgreSQL EXCLUDE constraint
 * in schema.prisma, so we add it here with raw SQL:
 *
 *   - enables the btree_gist extension (needed for EXCLUDE with an = operator)
 *   - adds a generated `date_range` column derived from startDate/endDate
 *   - adds an EXCLUDE constraint so the SAME employee cannot have two
 *     contracts with state='active' whose date ranges overlap
 *
 * This is the real guarantee against overlapping active contracts.
 * The pre-check in contracts.routes.js only exists to turn a raw Postgres
 * constraint-violation error into a friendly message before we even try
 * the insert/update.
 *
 * Safe to re-run: every statement is guarded with IF NOT EXISTS / exception
 * handling so running it twice does not error out.
 */

require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('1/3 Enabling btree_gist extension...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);

    console.log('2/3 Adding generated date_range column to contracts (if missing)...');
    const colCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'contracts' AND column_name = 'date_range';
    `);
    if (colCheck.rowCount === 0) {
      await client.query(`
        ALTER TABLE contracts
        ADD COLUMN date_range daterange
        GENERATED ALWAYS AS (
          daterange("startDate"::date, COALESCE("endDate"::date, 'infinity'::date), '[]')
        ) STORED;
      `);
    } else {
      console.log('   -> date_range already exists, skipping.');
    }

    console.log('3/3 Adding EXCLUDE constraint to prevent overlapping active contracts...');
    const conCheck = await client.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'contract_no_active_overlap';
    `);
    if (conCheck.rowCount === 0) {
      await client.query(`
        ALTER TABLE contracts
        ADD CONSTRAINT contract_no_active_overlap
        EXCLUDE USING gist (
          "employeeId" WITH =,
          date_range WITH &&
        ) WHERE (state = 'active');
      `);
    } else {
      console.log('   -> constraint already exists, skipping.');
    }

    console.log('\nDone. Overlapping ACTIVE contracts for the same employee are now rejected at the DB level.');
  } catch (err) {
    console.error('afterMigrate failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
