import { useState } from 'react';
import { X } from 'lucide-react';
const dismissalKey = 'costing-phone-orientation-dismissed';
export default function PhoneOrientationHint() {
  const [dismissed,setDismissed] = useState(()=>{
    try { return sessionStorage.getItem(dismissalKey)==='yes'; } catch { return false; }
  });
  if (dismissed) return null;
  return <aside className="phone-orientation-hint" aria-label="Phone viewing tip"><p>🎬 For a desktop-like view, turn your phone sideways, just like watching a movie.</p><button type="button" aria-label="Dismiss phone viewing tip" onClick={()=>{
    setDismissed(true);
    try { sessionStorage.setItem(dismissalKey,'yes'); } catch { /* Still dismiss when browser storage is unavailable. */ }
  }}><X size={18} aria-hidden="true"/></button></aside>;
}
