import {neon} from '@neondatabase/serverless';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

type Query={sql:string;params:(string|number|null)[]};
type Result<T=Record<string,unknown>>={results:T[];meta:{changes:number};success:boolean};
let local:DatabaseSync|undefined;
async function execute(queries:Query[]):Promise<Result[]>{
 if(process.env.DATABASE_URL){
  const sql=neon(process.env.DATABASE_URL,{fullResults:true});
  const results=await sql.transaction(queries.map(q=>{let index=0;return sql.query(q.sql.replace(/\?/g,()=>`$${++index}`),q.params)}));
  return results.map(r=>({results:r.rows as Record<string,unknown>[],meta:{changes:r.command==='SELECT'?0:(r.rowCount||0)},success:true}));
 }
 // Vercel functions have ephemeral filesystems. Never silently save production history locally.
 if(process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('The quiz database needs to be connected before accounts can be used.');
 if(!local){
  mkdirSync(join(process.cwd(),'.local'),{recursive:true});
  local=new DatabaseSync(join(process.cwd(),'.local/quiz.sqlite'));
  local.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  for(const migration of ['0000_chubby_wendell_vaughn.sql','0001_accounts.sql'])local.exec(readFileSync(join(process.cwd(),'drizzle',migration),'utf8'));
 }
 local.exec('BEGIN IMMEDIATE');
 try{
  const results=queries.map(q=>{
   const s=local!.prepare(q.sql);
   if(s.columns().length)return {results:s.all(...q.params) as Record<string,unknown>[],meta:{changes:0},success:true};
   const r=s.run(...q.params);return {results:[],meta:{changes:Number(r.changes)},success:true};
  });
  local.exec('COMMIT');return results;
 }catch(e){local.exec('ROLLBACK');throw e}
}
export class Statement {
 constructor(readonly sql:string,readonly params:(string|number|null)[]=[]){ }
 bind(...params:(string|number|null)[]){return new Statement(this.sql,params)}
 async all<T=Record<string,unknown>>():Promise<Result<T>>{return (await execute([this]))[0] as Result<T>}
 async first<T=Record<string,unknown>>():Promise<T|null>{return (await this.all<T>()).results[0]||null}
 async run(){return (await execute([this]))[0]}
}
export function db(){return {prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>execute(statements)}}
