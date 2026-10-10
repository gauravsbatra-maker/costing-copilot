// Display names only: sheet names remain the keys for all prices and sources.
export function costLabel(label: string): string {
  if (/^taj\s+hotel\s+expenses\b/i.test(label.trim())) return 'Food & beverage';
  if (/^food\s*&\s*beverage\s*\(minimum\s+guarantee\)$/i.test(label.trim())) return 'Food & beverage';
  if (label === 'Accommodation · rooms and nights') return 'Guest rooms';
  return label;
}

export function costText(text: string, headNames: string[]): string {
  const sourceStart=text.indexOf('Overall WIP · ');
  let display = sourceStart<0 ? text : text.slice(0,sourceStart);
  const source=sourceStart<0 ? '' : text.slice(sourceStart);
  for (const name of [...headNames, 'Accommodation · rooms and nights'].sort((a,b)=>b.length-a.length)) {
    if (costLabel(name)===name) continue;
    // Rename display text while leaving the original sheet source reference intact.
    display = display.replaceAll(name, costLabel(name));
  }
  return display.replace(/Food\s*&\s*beverage\s*\(minimum\s+guarantee\)/gi,'Food & beverage')+source;
}
