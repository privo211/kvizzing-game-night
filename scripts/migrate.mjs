import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('Connect the free Neon database and pull DATABASE_URL first.');
const sql=neon(process.env.DATABASE_URL);
const statements=readFileSync(new URL('../db/migration.sql',import.meta.url),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
await sql.transaction(statements.map(s=>sql.query(s)));
console.log('Quiz database schema is ready.');
