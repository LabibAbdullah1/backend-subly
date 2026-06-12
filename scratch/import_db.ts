import fs from 'fs';
import path from 'path';
import prisma from '../src/config/db.js';

async function importSql() {
  const sqlFilePath = path.join(process.cwd(), 'migrations', 'sublymyi_main.sql');
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at: ${sqlFilePath}`);
  }

  console.log(`Reading SQL file from: ${sqlFilePath}`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Disable foreign keys check to allow dropping tables safely
  console.log('Disabling foreign key checks...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  // Drop existing tables
  console.log('Retrieving existing tables...');
  const tables: any[] = await prisma.$queryRawUnsafe('SHOW TABLES');
  console.log(`Found ${tables.length} tables to drop.`);
  
  for (const tableObj of tables) {
    const tableName = Object.values(tableObj)[0] as string;
    console.log(`Dropping table: ${tableName}`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${tableName}\``);
  }

  // Parse and execute statements
  console.log('Executing SQL statements from dump...');
  const lines = sqlContent.split(/\r?\n/);
  let currentStatement = '';
  let executedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed === '') {
      continue;
    }

    currentStatement += line + '\n';

    // If the line ends with a semicolon, execute the statement
    if (trimmed.endsWith(';')) {
      const query = currentStatement.trim();
      currentStatement = '';

      if (query) {
        const upperQuery = query.toUpperCase();
        // Skip transaction control statements as they are not supported/needed in prepared statements
        if (upperQuery.startsWith('START TRANSACTION') || upperQuery.startsWith('COMMIT') || upperQuery.startsWith('BEGIN')) {
          continue;
        }

        try {
          // Remove trailing semicolon for executing raw query
          const cleanedQuery = query.endsWith(';') ? query.slice(0, -1) : query;
          await prisma.$executeRawUnsafe(cleanedQuery);
          executedCount++;
        } catch (err: any) {
          console.error(`Error executing statement at line ${i + 1}:\n${query}\nError: ${err.message}`);
        }
      }
    }
  }

  // Re-enable foreign keys check
  console.log('Enabling foreign key checks...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  console.log(`✔ Database reset and import completed successfully. Executed ${executedCount} SQL statements.`);
}

importSql()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
