import {cookies} from 'next/headers';
import {db} from '../../../../db/raw';
import {digest,SESSION_COOKIE,sameOrigin} from '../../../../lib/auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response('Invalid origin',{status:403});
 const jar=await cookies(),token=jar.get(SESSION_COOKIE)?.value;
 if(token)await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest(token)).run();
 jar.delete(SESSION_COOKIE);
 return new Response(null,{status:303,headers:{Location:'/'}});
}
