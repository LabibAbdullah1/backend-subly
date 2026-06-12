import fs from 'fs';
import path from 'path';

const unwantedTables = [
  'cache',
  'cache_locks',
  'failed_jobs',
  'job_batches',
  'jobs',
  'migrations',
  'sessions'
];

async function cleanSql() {
  const sqlFilePath = path.join(process.cwd(), 'migrations', 'sublymyi_main.sql');
  const backupFilePath = path.join(process.cwd(), 'migrations', 'sublymyi_main.backup.sql');

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at: ${sqlFilePath}`);
  }

  console.log(`Reading SQL file from: ${sqlFilePath}`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Back up original file
  fs.writeFileSync(backupFilePath, sqlContent, 'utf8');
  console.log(`Backup created at: ${backupFilePath}`);

  // Split statements by semicolon
  // Note: we want to split by semicolon, but a naive split can break on semicolons inside string quotes.
  // In phpMyAdmin dumps, INSERT values are either single-line or use simple escaping.
  // A robust split is splitting by semicolon followed by a newline or end of file.
  const statements = sqlContent.split(/;\r?\n/);
  const cleanedStatements: string[] = [];
  let skippedCount = 0;

  // Regex to extract table name from statements like CREATE TABLE `table`, INSERT INTO `table`, ALTER TABLE `table`, etc.
  const tableRegex = /(CREATE TABLE|INSERT INTO|ALTER TABLE|DROP TABLE)\s+`([a-zA-Z0-9_-]+)`/i;

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(tableRegex);
    if (match) {
      const tableName = match[2];
      if (unwantedTables.includes(tableName)) {
        console.log(`Skipping statement for unwanted Laravel table: ${tableName}`);
        skippedCount++;
        continue;
      }
    }

    cleanedStatements.push(statement);
  }

  // Join statements back
  const cleanedContent = cleanedStatements.join(';\n') + ';\n';
  fs.writeFileSync(sqlFilePath, cleanedContent, 'utf8');
  console.log(`✔ SQL file successfully cleaned. Removed ${skippedCount} statements.`);
}

cleanSql().catch(console.error);
