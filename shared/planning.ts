export const categories = ['Food', 'Beverages', 'Alcohol', 'Decoration', 'Music', 'Housekeeping', 'Invitation & RSVP', 'Giveaways', 'Manpower', 'Crockery', 'Cutlery', 'Glassware'] as const;
export type Category = typeof categories[number];
export type CostItem = {quantity: number; unitPriceCents?: number; actualCents?: number};
export function budgetTotals(tasks: CostItem[], budget: number) {
  return tasks.reduce((total, task) => {
    total.estimated += Math.round(task.quantity * (task.unitPriceCents ?? 0));
    total.actual += task.actualCents ?? 0;
    total.remaining = budget - total.actual;
    if (task.unitPriceCents === undefined && task.quantity > 0) total.unpriced++;
    return total;
  }, {estimated: 0, actual: 0, remaining: budget, unpriced: 0});
}
export function dayOffset(date: string, days: number) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function starterTasks(date: string, guests: number) {
  const tasks: [Category, string, number, string, number][] = [
    ['Food','Decide the menu and check dietary needs',1,'plan',-7],
    ['Food','Arrange the main meal',guests,'servings',-2],
    ['Food','Arrange snacks and dessert',guests,'servings',-1],
    ['Beverages','Stock water and soft drinks',guests * 2,'servings',-1],
    ['Beverages','Arrange ice',Math.max(1,Math.ceil(guests / 5)),'kg',0],
    ['Alcohol','Decide whether to serve alcohol',0,'bottles',-3],
    ['Decoration','Choose and set up decorations',1,'set',-1],
    ['Music','Prepare a playlist',1,'playlist',-2],
    ['Music','Check the speaker and volume',1,'check',0],
    ['Housekeeping','Clean the gathering space and washrooms',1,'clean',-1],
    ['Housekeeping','Arrange bins and an after-party clean-up',1,'plan',0],
    ['Invitation & RSVP','Send the WhatsApp invitation',1,'task',-7],
    ['Invitation & RSVP','Follow up on guest replies',1,'task',-2],
    ['Giveaways','Decide whether to prepare take-home gifts',0,'gifts',-3],
    ['Manpower','Arrange help for serving and clean-up',1,'person',-3],
    ['Crockery','Count and arrange plates and bowls',guests + Math.ceil(guests * .2),'sets',-1],
    ['Cutlery','Count and arrange spoons and forks',guests + Math.ceil(guests * .2),'sets',-1],
    ['Glassware','Count and arrange drinking glasses',guests + Math.ceil(guests * .2),'glasses',-1],
  ];
  return tasks.map(([category,title,quantity,unit,days],order)=>({category,title,quantity,unit,due:dayOffset(date,days),done:false,order}));
}
