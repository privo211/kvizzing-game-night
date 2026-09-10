import {cookies} from 'next/headers';
import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {db} from '../db/raw';
const scrypt=promisify(scryptCallback);
export const SESSION_COOKIE='kvizzing_session';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function getUser():Promise<{id:string;username:string}|null>{
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return db().prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(digest(token),Date.now()).first();
}
export async function hashPassword(password:string){
 const salt=randomBytes(16).toString('hex');
 const hash=await scrypt(password,salt,64) as Buffer;
 return `${salt}:${hash.toString('hex')}`;
}
export async function checkPassword(password:string,stored:string){
 const [salt,hex]=stored.split(':');
 const hash=await scrypt(password,salt,64) as Buffer;
 const expected=Buffer.from(hex,'hex');return hash.length===expected.length&&timingSafeEqual(hash,expected);
}
export async function signIn(userId:string){
 const token=randomBytes(32).toString('hex');
 await db().batch([
  db().prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
  db().prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(digest(token),userId,Date.now()+30*86400000),
 ]);
 (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400});
}
export function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 return request.headers.get('sec-fetch-site')!=='cross-site'&&!!origin&&origin===new URL(request.url).origin;
}
