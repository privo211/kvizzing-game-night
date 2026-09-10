import {z} from 'zod';
import {db} from '../../../db/raw';
import {hashPassword,checkPassword,digest,signIn,sameOrigin} from '../../../lib/auth';
const schema=z.object({action:z.enum(['signup','signin']),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),password:z.string().min(10).max(128)});
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Please sign in from the website.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Expected account details.'},415);
 try{
  const raw=await request.text();if(raw.length>2000)return json({error:'Request too large.'},413);
  const {action,username,password}=schema.parse(JSON.parse(raw));
  const now=Date.now(),window=Math.floor(now/900000);
  const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local';
  const keys=[digest('ip:'+ip),digest('name:'+username)];
  const limits=await db().batch(keys.map(key=>db().prepare('INSERT INTO auth_limits(key,attempts,"window") VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_limits."window"=? THEN auth_limits.attempts+1 ELSE 1 END,"window"=? RETURNING attempts').bind(key,window,window,window)));
  if(limits.some(r=>Number(r.results[0]?.attempts)>15))return json({error:'Too many attempts. Please wait 15 minutes.'},429);
  const existing=await db().prepare('SELECT id,password_hash FROM users WHERE username=?').bind(username).first<{id:string;password_hash:string}>();
  if(action==='signup'){
   if(existing)return json({error:'That username is already taken.'},409);
   const id=crypto.randomUUID(),passwordHash=await hashPassword(password);
   const result=await db().prepare('INSERT INTO users(id,username,password_hash,created_at) VALUES (?,?,?,?) ON CONFLICT(username) DO NOTHING').bind(id,username,passwordHash,now).run();
   if(!result.meta.changes)return json({error:'That username is already taken.'},409);
   await signIn(id);
  }else{
   // Perform the same expensive comparison even when a username does not exist.
   const valid=await checkPassword(password,existing?.password_hash||'00000000000000000000000000000000:'+ '00'.repeat(64));
   if(!existing||!valid)return json({error:'The username or password is incorrect.'},401);
   await signIn(existing.id);
  }
  return json({ok:true});
 }catch(e){
  if(e instanceof z.ZodError)return json({error:'Use a 3–24 character username (letters, numbers, underscore) and a password of 10–128 characters.'},400);
  console.error('auth_failed',e instanceof Error?e.message:'unknown');
  return json({error:'Accounts are temporarily unavailable. Please try again shortly.'},503);
 }
}
