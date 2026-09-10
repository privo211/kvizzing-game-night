import { getUser } from '../../../lib/auth';
import {createGame,getGame,gameView,mutateGame,QuizError} from '../../../lib/quiz/service';
import {db} from '../../../db/raw';
import {z} from 'zod';
export const dynamic='force-dynamic';
export const maxDuration=300;
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function failure(e:unknown){
 console.error('quiz_request_failed',e instanceof Error?e.message:'unknown');
 if(e instanceof QuizError)return respond({error:e.message},e.status);
 if(e instanceof z.ZodError)return respond({error:'Please check the quiz setup and try again.'},400);
 return respond({error:e instanceof Error&&!/SQL|D1|parse|JSON|fetch|network|abort|timeout/i.test(e.message)?e.message:'The quizmaster hit a snag. Your progress is safe. Please try again.'},503);
}
export async function GET(){try{
 const u=await getUser();if(!u)return respond({error:'Please sign in to save your question history.'},401);
 const game=await getGame(u.id);
 const stats=await db().prepare('SELECT COUNT(DISTINCT question_id) AS seen FROM history WHERE user_id=?').bind(u.id).first();
 return respond({game:game?await gameView(game):null,stats});
}catch(e){return failure(e)}}
const inputSchema=z.union([
 z.object({action:z.literal('start'),mode:z.enum(['solo','friends','teams']),names:z.array(z.string().trim().min(1).max(32)).min(1).max(12)}),
 z.object({action:z.enum(['hint','reveal','next','finish']),gameId:z.string().uuid(),questionId:z.string().uuid().optional(),guesses:z.record(z.string().max(240)).optional(),grades:z.record(z.number().int()).optional()})
]);
export async function POST(request:Request){try{
 if(request.headers.get('sec-fetch-site')==='cross-site')return respond({error:'Please open the quiz to continue.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return respond({error:'Expected a quiz action.'},415);
 if(Number(request.headers.get('content-length')||0)>12000)return respond({error:'That request is too large.'},413);
 const u=await getUser();if(!u)return respond({error:'Please sign in to save your question history.'},401);
 const raw=await request.text();if(raw.length>12000)return respond({error:'That request is too large.'},413);
 const input=inputSchema.parse(JSON.parse(raw));
 if(input.action==='start'){
  const mode=input.mode as string;const names=input.names as string[];
  if((mode==='solo'&&names.length!==1)||(mode!=='solo'&&names.length<2))throw new QuizError('Add at least two players or teams for a group quiz.');
  if(new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw new QuizError('Give each player or team a different name.');
  return respond({game:await createGame(u.id,mode,names)});
 }
 return respond({game:await mutateGame(u.id,input as Parameters<typeof mutateGame>[1])});
}catch(e){return failure(e)}}
