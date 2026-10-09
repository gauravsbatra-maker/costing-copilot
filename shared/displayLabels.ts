// Display names only: sheet names remain the keys for all prices and sources.
export function costLabel(label: string): string {
  if (/^taj\s+hotel\s+expenses\b/i.test(label.trim())) return 'Food & beverage (minimum guarantee)';
  if (label === 'Accommodation · rooms and nights') return 'Guest rooms';
  return label;
}

export function costText(text: string, headNames: string[]): string {
  let display = text;
  for (const name of [...headNames, 'Accommodation · rooms and nights'].sort((a,b)=>b.length-a.length)) {
    if (costLabel(name)===name) continue;
    // Display source names consistently; the stored source text and row stay intact.
    display = display.replaceAll(name, costLabel(name));
  }
  return display;
}
