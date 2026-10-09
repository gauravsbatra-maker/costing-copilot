import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { readSavedCosting, type SavedCosting } from '../shared/savedCosting';
const SaveContext=createContext<(saved:SavedCosting)=>void>(()=>{});
export const useSaveCosting=()=>useContext(SaveContext);
export default function SavedCostings({children,onOpen,onSignOut}:{children:ReactNode;onOpen:(saved:SavedCosting)=>void;onSignOut:()=>void}) {
 const {isAuthenticated,isLoading}=useConvexAuth();
 const {signIn,signOut}=useAuthActions();
 const convex=useConvex(); const save=useMutation(api.costings.save);
 const rows=useQuery(api.costings.list,isAuthenticated?{}:'skip');
 const [panel,setPanel]=useState(false),[flow,setFlow]=useState<'signIn'|'signUp'>('signIn');
 const [pending,setPending]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const saving=useRef(false);
 const signInPanel=useRef<HTMLElement>(null);
 const emailField=useRef<HTMLInputElement>(null);
 const [focusRequest,setFocusRequest]=useState(0);
 useEffect(()=>{
  if(!focusRequest)return;
  signInPanel.current?.scrollIntoView({block:'start',behavior:'instant'});
  emailField.current?.focus({preventScroll:true});
 },[focusRequest]);
 useEffect(()=>{
  if(!isAuthenticated || !pending || saving.current)return;
  saving.current=true; setBusy(true);
  void save({snapshot:pending}).then(()=>{setPending(null);setNotice('Costing saved.');setPanel(false);}).catch(()=>{setError('Could not save this costing. Try Save this costing again.');setPending(null);}).finally(()=>{saving.current=false;setBusy(false);});
 },[isAuthenticated,pending,save]);
 return <SaveContext.Provider value={saved=>{setError('');setNotice('');setPending(JSON.stringify(saved));if(!isAuthenticated){setPanel(true);setFocusRequest(n=>n+1);}}}>
 <nav className="account-nav" aria-label="Saved costings"><button className="add-detail" onClick={()=>{setPanel(!panel);setError('');}}>My costings</button>{isAuthenticated&&<button className="add-detail" disabled={busy} onClick={()=>{void signOut().then(()=>{setPending(null);setPanel(false);setNotice('');onSignOut();});}}>Sign out</button>}</nav>
 {error&&!panel&&<p className="account-panel error" role="alert">{error}</p>}
 {notice&&<p className="account-panel" role="status">{notice}</p>}
 {panel&&<section ref={signInPanel} className="account-panel" aria-label="My costings"><h2>My costings</h2>{!isAuthenticated ? <><p>{pending?'Sign in to save this costing.':'Sign in to reopen your saved costings.'} Costing works without an account.</p><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);data.set('flow',flow);setBusy(true);setError('');void signIn('password',data).catch(()=>setError(flow==='signUp'?'Could not create an account. Try another email and a password of at least 8 characters.':'Could not sign in. Check your email and password.')).finally(()=>setBusy(false));}}><label className="brief-field"><span>Email</span><input ref={emailField} name="email" type="email" autoComplete="username" required/></label><label className="brief-field"><span>Password</span><input name="password" type="password" autoComplete={flow==='signUp'?'new-password':'current-password'} minLength={8} required/></label><button className="read-brief" disabled={busy||isLoading}>{busy?'Please wait…':flow==='signUp'?'Create account':'Sign in'}</button></form><button className="add-detail" disabled={busy} onClick={()=>setFlow(flow==='signIn'?'signUp':'signIn')}>{flow==='signIn'?'Create an account':'Use an existing account'}</button></> : <>{rows===undefined?<p>Loading costings…</p>:rows.length===0?<p>No saved costings yet.</p>:<ul>{rows.map(row=><li key={row.id}><strong>{row.title}</strong><p>{row.total}</p><button className="add-detail" disabled={busy} onClick={()=>{setBusy(true);void convex.query(api.costings.get,{id:row.id}).then(json=>{if(!json)throw new Error();onOpen(readSavedCosting(json));setPanel(false);window.scrollTo(0,0);}).catch(()=>setError('Could not open this costing. Please try again.')).finally(()=>setBusy(false));}}>Open costing</button></li>)}</ul>}</>}{error&&<p role="alert" className="error">{error}</p>}<button className="add-detail" onClick={()=>{setPanel(false);setPending(null);}}>Back to costing</button></section>}
 {children}
 </SaveContext.Provider>;
}
