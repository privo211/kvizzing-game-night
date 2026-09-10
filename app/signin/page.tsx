'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ArrowRight,ArrowLeft,LoaderCircle} from 'lucide-react';
export default function SignIn(){
 const [action,setAction]=useState<'signup'|'signin'>('signup'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,username:data.get('username'),password:data.get('password')})});
   const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error||'Please try again.');window.location.assign('/');
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');setBusy(false)}
 }
 return <main className="auth-shell"><Link href="/" className="rules-link"><ArrowLeft size={16}/> Back to game night</Link><div className="auth-card"><div className="section-label">YOUR SEAT AT THE TABLE</div><h1>{action==='signup'?'Good questions. Great company.':'Welcome back, quizzer.'}</h1><p>One free account. Saved games. Questions that remember you.</p><div className="auth-tabs"><button aria-pressed={action==='signup'} onClick={()=>{setAction('signup');setError('')}}>Create account</button><button aria-pressed={action==='signin'} onClick={()=>{setAction('signin');setError('')}}>Sign in</button></div><form onSubmit={submit}><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9_]{3,24}" minLength={3} maxLength={24} required placeholder="your_quiz_name"/><small>3–24 letters, numbers or underscores.</small><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={action==='signup'?'new-password':'current-password'} minLength={10} maxLength={128} required placeholder="At least 10 characters"/>{error&&<p className="error-banner" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy?<LoaderCircle className="spin" size={20}/>:<>{action==='signup'?'Save my seat':'Let’s play'}<ArrowRight size={20}/></>}</button></form><p className="auth-note">{action==='signup'?'Save your password somewhere safe. This early version doesn’t offer password recovery.':'Your question history stays with this username, including when you change devices.'}</p></div></main>;
}
