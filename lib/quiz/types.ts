import { z } from 'zod';
export const questionSchema = z.object({
 title:z.string().min(3).max(90),category:z.enum(['Culture','Science','The world','History','Sport','Food & language']),difficulty:z.enum(['Warm-up','Connect the dots','The stretch']),
 prompt:z.string().min(180).max(1100),ask:z.string().min(8).max(160),answer:z.string().min(1).max(100),aliases:z.array(z.string().min(1).max(100)).max(8),hints:z.array(z.string().min(15).max(240)).length(2),explanation:z.string().min(100).max(1200),banter:z.string().min(8).max(180),sources:z.array(z.object({title:z.string().min(3).max(180),url:z.string().url().startsWith('https://')})).min(1).max(3),
});
export type Question=z.infer<typeof questionSchema>;
export type Player={id:string;name:string};
export type QuestionRow={id:string;game_id:string;position:number;data:string;hints:number;revealed:number;guesses:string;grades:string};
export type GameRow={id:string;user_id:string;mode:string;players:string;status:string;current:number;created_at:number;source:string};
export type VisibleQuestion={id:string;position:number;title:string;category:string;difficulty:string;prompt:string;ask:string;hints:string[];revealed:boolean;guesses:Record<string,string>;grades:Record<string,number>;answer?:string;explanation?:string;banter?:string;sources?:Question['sources'];suggestedGrades?:Record<string,number>};
export type GameView={id:string;mode:string;players:Player[];status:string;current:number;source:string;question:VisibleQuestion|null;scores:Record<string,number>;review:VisibleQuestion[];total:number};
export const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^(the|a|an)\s+/,'').replace(/[^a-z0-9]/g,'');
export function isDuplicate(q:Question,seen:{answer_key:string;prompt:string}[]) {
 const keys=[q.answer,...q.aliases].map(normalize);
 const words=(s:string)=>new Set(s.toLowerCase().match(/[a-z]{4,}/g)||[]);
 const a=words(q.prompt);
 return seen.some(h=>keys.includes(h.answer_key) || (()=>{const b=words(h.prompt);const intersection=[...a].filter(w=>b.has(w)).length;return intersection / (a.size+b.size-intersection)>.58})());
}
