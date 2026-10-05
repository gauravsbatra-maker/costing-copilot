// Entirely made-up test data; never replace this with a client brief.
export const inventedBrief = `City: Jaipur. Dates: 12–13 December 2027. Number of days: 2.
Day 1: Welcome dinner, 150 guests. Day 2: Celebration lunch, 250 guests.
Out-of-town guests: 80. Rooms: 40. Nights: 2. Room rate: Rs 12000 per room per night.
Benchmark project: Project Lantern. Benchmark headcount: 200 guests.
Cost heads: Food, Decor, Accommodation. Food: scale by each function's guest count. Decor: fixed setup. Accommodation: scale by rooms and nights.
GST treatment: GST excluded. Variance: 10%.`;
export function inventedExtraction() {
  return {
    fields: { city: 'Jaipur', dates: '12–13 December 2027', days: '2', outOfTownGuests: '80', rooms: '40', nights: '2', roomRate: 'Rs 12000 per room per night', benchmarkProject: 'Project Lantern', benchmarkHeadcount: '200', seasonalPremium: null, gstTreatment: 'GST excluded', variance: '10%' },
    functions: [{ day: 'Day 1', name: 'Welcome dinner', guests: '150' }, { day: 'Day 2', name: 'Celebration lunch', guests: '250' }],
    scalingRules: [{ head: 'Food', rule: "scale by each function's guest count" }, { head: 'Decor', rule: 'fixed setup' }, { head: 'Accommodation', rule: 'scale by rooms and nights' }],
  };
}

// Guest origin and the old benchmark must not become the new event's city/date.
export const hometownBrief = `The new celebration is in the client's hometown; the venue is not confirmed.
Most guests Mumbai-based. Use our Aug 2026 Mumbai wedding as the benchmark project.
The old benchmark had 300 guests, 60 rooms, 3 nights and a room rate of Rs 9000.
The old benchmark lasted 4 days, with a 15% seasonal premium, GST included and 8% variance.
The client's favourite number is 250. No new function guest counts or accommodation requirements are confirmed.`;

// Made-up WhatsApp-style regression brief, not a client document.
export const detailedBrief = `Hi team – sharing the wedding brief 👇
📅 Last week of Dec 2026 | 2 days
📍 client's hometown – venue TBC | most guests Mumbai-based
• Out-of-town guests – 75
• Stay – 40 rooms | 2 nights | ₹35,000/room night
• Benchmark – our Aug 2026 Mumbai wedding | ~700 pax
• Seasonal premium – +10% | GST extra | variance ±10%

Day 1
• Lunch – 250 pax
• High tea – 250 pax
• Dinner – 1,000 pax
• After party – 150 pax
Day 2
• Lunch – 250 pax
• High tea – 250 pax
• Dinner – 1,000 pax
• After party – 150 pax

Scaling rules 👇
• Food – scale by each function's guest count against the ~700 pax benchmark.
• Production – scale by dinner headcount against the ~700 pax benchmark.
• Decor – keep fixed setup; apply +10% seasonal premium.
• Accommodation – use 40 rooms for 2 nights at ₹35,000/room night.`;
export function detailedExtraction() {
  return {
    fields: { city: 'Mumbai', dates: 'Last week of Dec 2026', days: '2', outOfTownGuests: '75', rooms: '40', nights: '2', roomRate: '₹35,000/room night', benchmarkProject: 'our Aug 2026 Mumbai wedding', benchmarkHeadcount: '~700 pax', seasonalPremium: '+10%', gstTreatment: 'GST extra', variance: '±10%' },
    functions: ['Day 1', 'Day 2'].flatMap(day => [
      { day, name: 'Lunch', guests: '250' }, { day, name: 'High tea', guests: '250' },
      { day, name: 'Dinner', guests: '1,000' }, { day, name: 'After party', guests: '150' },
    ]),
    scalingRules: [
      { head: 'Food', rule: "scale by each function's guest count against the ~700 pax benchmark" },
      { head: 'Production', rule: 'scale by dinner headcount against the ~700 pax benchmark' },
      { head: 'Decor', rule: 'keep fixed setup; apply +10% seasonal premium' },
      { head: 'Accommodation', rule: 'use 40 rooms for 2 nights at ₹35,000/room night' },
    ],
  };
}
