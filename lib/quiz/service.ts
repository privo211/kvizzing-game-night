import {db,type Statement} from '../../db/raw';
import {generateQuestions} from './generator';
import starterData from './starter.json';
import {isDuplicate} from './types';
import {normalize,questionSchema,type GameRow,type QuestionRow,type Player,type GameView,type VisibleQuestion} from './types';
export class QuizError extends Error {constructor(message:string,public status=400){super(message)}}
export async function getGame(userId:string,id?:string):Promise<GameRow|null>{
 return id ? db().prepare('SELECT * FROM games WHERE user_id=? AND id=?').bind(userId,id).first<GameRow>() : db().prepare("SELECT * FROM games WHERE user_id=? AND (status='playing' OR (status='generating' AND created_at>?)) ORDER BY created_at DESC LIMIT 1").bind(userId,Date.now()-360000).first<GameRow>();
}
export async function gameView(g:GameRow):Promise<GameView>{
 const rows=(await db().prepare('SELECT * FROM questions WHERE game_id=? ORDER BY position').bind(g.id).all<QuestionRow>()).results;
 const players=JSON.parse(g.players) as Player[];
 const scores=Object.fromEntries(players.map(p=>[p.id,0]));
 for(const row of rows){const grades=JSON.parse(row.grades) as Record<string,number>;for(const p of players)scores[p.id]+=grades[p.id]||0}
 const visible=(r:QuestionRow):VisibleQuestion=>{
  const q=questionSchema.parse(JSON.parse(r.data));
  const guesses=JSON.parse(r.guesses) as Record<string,string>;
  const base={id:r.id,position:r.position,title:q.title,category:q.category,difficulty:q.difficulty,prompt:q.prompt,ask:q.ask,hints:q.hints.slice(0,r.hints),revealed:!!r.revealed,guesses,grades:JSON.parse(r.grades)};
  return r.revealed ? {...base,answer:q.answer,explanation:q.explanation,banter:q.banter,sources:q.sources,suggestedGrades:Object.fromEntries(players.map(p=>[p.id,[q.answer,...q.aliases].map(normalize).includes(normalize(guesses[p.id]||''))?Math.max(4,10-r.hints*3):0]))}:base;
 };
 return {id:g.id,mode:g.mode,players,status:g.status,current:g.current,source:g.source,total:8,scores,question:g.status==='playing'&&rows[g.current]?visible(rows[g.current]):null,review:g.status==='complete'?rows.filter(r=>r.revealed).map(visible):[]};
}
export async function createGame(userId:string,mode:string,names:string[]):Promise<GameView>{
 await db().prepare("UPDATE games SET status='failed' WHERE user_id=? AND status='generating' AND created_at<?").bind(userId,Date.now()-360000).run();
 const active=await getGame(userId);
 if(active&&active.status==='playing')return gameView(active);
 if(active&&Date.now()-active.created_at<360000)throw new QuizError('Your questions are still being prepared. Give the quizmaster a moment, then resume.',409);
 if(active)await db().prepare("UPDATE games SET status='failed' WHERE id=? AND status='generating'").bind(active.id).run();
 const quota=await db().prepare('SELECT COUNT(*) AS n FROM games WHERE user_id=? AND created_at>?').bind(userId,Date.now()-86400000).first<{n:number}>();
 if((quota?.n||0)>=12)throw new QuizError('You have prepared 12 quizzes today. Your next fresh batch is available tomorrow.',429);
 const g:GameRow={id:crypto.randomUUID(),user_id:userId,mode,players:JSON.stringify(names.map((name,i)=>({id:String(i),name}))),status:'generating',current:0,created_at:Date.now(),source:'fresh'};
 const inserted=await db().prepare("INSERT INTO games (id,user_id,mode,players,status,current,created_at,source) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(g.id,userId,mode,g.players,g.status,0,g.created_at,g.source).run();
 if(!inserted.meta.changes)throw new QuizError('A quiz is already being prepared in another tab. Please resume it.',409);
 try{
  const seen=(await db().prepare('SELECT answer_key,prompt FROM history WHERE user_id=?').bind(userId).all<{answer_key:string;prompt:string}>()).results;
  let pack;
  try{pack=await generateQuestions(seen)}catch(error){
   const unused=starterData.map(q=>questionSchema.parse(q)).filter(q=>!isDuplicate(q,seen));
   if(unused.length<8)throw new QuizError('You’ve played all available starter questions. Fresh generation is currently unavailable. Please try again once the quiz service is restored; we won’t repeat your questions.',503);
   console.warn('quiz_starter_fallback',error instanceof Error?error.message:'generation unavailable');
   pack=unused.slice(0,8);g.source='starter';
  }
  const statements: Statement[]=[];
  for(const [position,q]of pack.entries()){
   const qId=crypto.randomUUID();
   statements.push(db().prepare('INSERT INTO questions (id,game_id,position,data) VALUES (?,?,?,?)').bind(qId,g.id,position,JSON.stringify(q)));
   for(const key of new Set([q.answer,...q.aliases].map(normalize))) statements.push(db().prepare('INSERT INTO history (user_id,answer_key,question_id,prompt,created_at) VALUES (?,?,?,?,?)').bind(userId,key,qId,q.prompt,Date.now()));
  }
  statements.push(db().prepare("UPDATE games SET status='playing',source=? WHERE id=? AND status='generating'").bind(g.source,g.id));
  await db().batch(statements); // Atomic: no partial reservations and unique per-user answer entities.
  return gameView({...g,status:'playing'});
 }catch(e){await db().prepare("UPDATE games SET status='failed' WHERE id=? AND status='generating'").bind(g.id).run();throw e}
}
export async function mutateGame(userId:string,input:{action:string;gameId:string;questionId?:string;guesses?:Record<string,string>;grades?:Record<string,number>}):Promise<GameView>{
 const g=await getGame(userId,input.gameId);
 if(!g)throw new QuizError('That quiz could not be found.',404);
 if(input.action==='finish'){
  if(g.status!=='playing')throw new QuizError('This game is not in progress.',409);
  await db().prepare("UPDATE games SET status='complete' WHERE id=? AND user_id=? AND status='playing'").bind(g.id,userId).run();
  return gameView({...g,status:'complete'});
 }
 if(g.status!=='playing')throw new QuizError('This game is not in progress.',409);
 const q=await db().prepare('SELECT * FROM questions WHERE game_id=? AND position=? AND id=?').bind(g.id,g.current,input.questionId||'').first<QuestionRow>();
 if(!q)throw new QuizError('The quiz has moved on. Resume to see the current question.',409);
 if(input.action==='hint'){
  if(q.revealed)throw new QuizError('The answer has already been revealed.',409);
  await db().prepare('UPDATE questions SET hints=CASE WHEN hints<2 THEN hints+1 ELSE 2 END WHERE id=? AND revealed=0').bind(q.id).run();
 }else if(input.action==='reveal'){
  const players=JSON.parse(g.players) as Player[];
  const guesses=Object.fromEntries(players.map(p=>[p.id,(input.guesses?.[p.id]||'').trim().slice(0,240)]));
  await db().prepare('UPDATE questions SET revealed=1,guesses=? WHERE id=? AND revealed=0').bind(JSON.stringify(guesses),q.id).run();
 }else if(input.action==='next'){
  if(!q.revealed)throw new QuizError('Reveal the answer before scoring this question.');
  const players=JSON.parse(g.players) as Player[];
  const max=Math.max(4,10-q.hints*3);
  if(!input.grades||players.some(p=>![0,Math.floor(max/2),max].includes(input.grades![p.id])))throw new QuizError('Score each player before continuing.');
  const grades=Object.fromEntries(players.map(p=>[p.id,input.grades![p.id]]));
  const next=g.current+1;
  await db().batch([
   db().prepare('UPDATE questions SET grades=? WHERE id=? AND EXISTS (SELECT 1 FROM games WHERE id=? AND current=?)').bind(JSON.stringify(grades),q.id,g.id,g.current),
   db().prepare('UPDATE games SET current=?,status=? WHERE id=? AND current=?').bind(next,next>=8?'complete':'playing',g.id,g.current),
  ]);
 }else throw new QuizError('Unknown quiz action.');
 const updated=await getGame(userId,g.id);
 return gameView(updated!);
}
