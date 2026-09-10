import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://localhost:5173';
await fs.mkdir('work',{recursive:true});
const username='test_'+Date.now().toString(36),password=crypto.randomUUID();
const signup=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({action:'signup',username,password})});
assert.equal(signup.status,200,await signup.clone().text());
const cookie=signup.headers.get('set-cookie').split(';')[0];
async function req(body,cookieHeader=cookie){const r=await fetch(base+'/api/quiz',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookieHeader},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
assert.equal((await req(undefined,'')).status,401);
let {data}=await req({action:'start',mode:'solo',names:['Test player']});assert.equal(data.game?.status,'playing',JSON.stringify(data));
let g=data.game;const initialId=g.id;const firstId=g.question.id;
assert.equal(g.question.answer,undefined);assert.equal(g.question.sources,undefined);assert.equal(g.question.hints.length,0);
const duplicate=await req({action:'start',mode:'solo',names:['Seedy']});assert.equal(duplicate.data.game.id,initialId);
const forbidden=await req({action:'hint',gameId:crypto.randomUUID(),questionId:firstId});assert.equal(forbidden.status,404);
const premature=await req({action:'next',gameId:g.id,questionId:firstId,grades:{0:10}});assert.equal(premature.status,400);
for(let i=0;i<8;i++){
 const qid=g.question.id;
 if(i===0){g=(await req({action:'hint',gameId:g.id,questionId:qid})).data.game;assert.equal(g.question.hints.length,1);g=(await req({action:'hint',gameId:g.id,questionId:qid})).data.game;assert.equal(g.question.hints.length,2);g=(await req({action:'hint',gameId:g.id,questionId:qid})).data.game;assert.equal(g.question.hints.length,2);}
 g=(await req({action:'reveal',gameId:g.id,questionId:qid,guesses:{0:'My test guess'}})).data.game;
 assert.ok(g.question.answer);assert.ok(g.question.explanation.length>=100);assert.ok(g.question.sources.length);
 const replay=(await req({action:'reveal',gameId:g.id,questionId:qid,guesses:{0:'changed after reveal'}})).data.game;
 assert.equal(replay.question.guesses[0],'My test guess');
 const max=i===0?4:10;
 const bad=await req({action:'next',gameId:g.id,questionId:qid,grades:{0:999}});assert.equal(bad.status,400);
 const body={action:'next',gameId:g.id,questionId:qid,grades:{0:max}};
 if(i===0){const double=await Promise.all([req(body),req(body)]);assert.ok(double.some(r=>r.status===200));g=(await req()).data.game;assert.equal(g.current,1);assert.equal(g.scores[0],4)}else{g=(await req(body)).data.game;}
 if(i<7){assert.equal(g.question.answer,undefined);assert.notEqual(g.question.id,qid);assert.equal((await req()).data.game.current,i+1);}
}
assert.equal(g.status,'complete');assert.equal(g.scores[0],74);assert.equal(g.review.length,8);assert.equal((await req()).data.game,null);
await fs.writeFile('work/test-results.json',JSON.stringify({firstGameId:initialId,questions:g.review.map(q=>({id:q.id,answer:q.answer,category:q.category,title:q.title})),checks:'auth, answer secrecy, resume, hint cap, ownership, premature advance, immutable reveal, score bounds, concurrent advance, completion',score:g.scores},null,2));
console.log('PASS: full eight-question game, saved history, auth, answer secrecy, hint cap, score validation, concurrent scoring and resume.');

const firstAnswers=new Set(g.review.map(q=>q.answer));
g=(await req({action:'start',mode:'teams',names:['Alpha','Beta']})).data.game;
assert.equal(g.mode,'teams');
for(let i=0;i<8;i++){
 g=(await req({action:'reveal',gameId:g.id,questionId:g.question.id,guesses:{0:'a',1:'b'}})).data.game;
 assert.ok(!firstAnswers.has(g.question.answer));
 g=(await req({action:'next',gameId:g.id,questionId:g.question.id,grades:{0:10,1:5}})).data.game;
}
assert.equal(g.scores[0],80);assert.equal(g.scores[1],40);
const exhausted=await req({action:'start',mode:'solo',names:['Test']});assert.equal(exhausted.status,503);assert.match(exhausted.data.error,/won’t repeat/);
const login=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({action:'signin',username,password})});assert.equal(login.status,200);
const newCookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await req(undefined,newCookie)).data.stats.seen,16);
console.log('PASS: second team game, 16 unique questions, exhaustion without repeats, sign-in preserves history.');
