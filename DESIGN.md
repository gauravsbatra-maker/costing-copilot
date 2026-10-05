# DESIGN.md · costing-copilot

## Part 1 · Working screens (for the project head)

### First screen
Headline: From the host's brief to a costed proposal, in one sitting.
Under it: Paste the brief, add a past project's costing sheet, check what we found, then get a costed proposal where every number shows where it came from.
Button: Start with the brief

### Reference: Stripe's invoice editor
Take: the line items on the left with a live total on the right, one clear send button, and quiet type with lots of space.
Ignore: the fintech blues and greys, the dashboard sidebar, and the developer jargon.
These are back-office screens: same palette and fonts as Part 2, without the one bold touch per screen. Figures in brackets are sample numbers.

### 1. Paste brief
Job: Turn the host's words into a list of requirements.
Main action: Read the brief
Empty: Paste the host's brief here. WhatsApp, email or call notes; messy is fine.
Loading: Reading the brief…
Error: We couldn't read that. Paste it as plain text, or try a shorter piece.
Done: Brief read. We found [14] requirements.

### 2. Upload sheet
Job: Bring in a past project's costing sheet, so the new brief is priced against what similar work really cost. The app reads only the Overall WIP tab (10 heads, two-row header).
Main action: Use this project
Empty: Upload a past project's costing sheet (Excel). We'll read its Overall WIP tab.
Loading: Reading Overall WIP…
Error (no tab): This file has no Overall WIP tab. Upload the costing sheet from a past project.
Error (header): We couldn't read the two-row header on Overall WIP. Check the head names sit on the first row and the column labels on the second.
Error (heads): We found [8] of the 10 heads. [Head name] and [head name] are missing. Upload anyway, or fix the sheet.
Done: [Project name] loaded: 10 heads, [96] line items, ₹[total] in all.

### 3. Review requirements
Job: Check and fix what the app understood before any money is attached.
Main action: Cost it
Empty: Nothing to review yet. Paste a brief first.
Loading: Matching each requirement to the past project's costs…
Unclear field (amber tag): "Unclear: the brief doesn't say this plainly. Confirm our reading or type the right value." The amber clears once it's settled.
Headcount, per head (question at the top): "Headcounts differ. The brief has [250] at [lunch] and [1,000] at [dinner]. Which headcount drives each head?" Answers: one row for each of the 10 heads, each with the options [250, lunch], [1,000, dinner] or Another number.
Blocked (under the button): "Settle [2] unclear fields and pick a headcount for [3] heads to cost this." Cost it stays off until both are settled.
Error: [6] requirements have no match in the past project's costs. Add a cost, or mark them "to quote".
Done: "All [14] requirements settled and matched. Every head has its headcount."

### 4. Costed proposal
Job: A priced, line-by-line proposal the host can say yes to.
The promise: every number shows its source line from the sheet. Each figure carries a tag like "Overall WIP · [Head] · row [42]", and tapping it shows that line from the past project's sheet. A figure with no source line is never shown as a number; it reads "To quote". Each head also shows the headcount it was costed for.
Main action: Save proposal
Empty: No proposal yet. Review the requirements first.
Loading: Costing [14] items…
Error: Costing stopped at [Florals]. Check that cost and try again.
Not logged in: tapping Save proposal opens the login with "To save this proposal, please log in." Nothing is stored until the login succeeds.
Logged in: the proposal is saved with its brief and source sheet, to reopen later.
Never saved: the proposal lives only in this session. The words under the button say: "Not saved. This proposal is cleared when you close the app."
Login error: "We couldn't log you in, so nothing was saved. Try again."
Done, saved: "Proposal saved: ₹[total] across [14] items. Every figure shows its source line in [Project name]."

### Scope
v1 has no export: no PDF, no Excel, nothing sent to anyone. Without a login nothing is stored; the proposal lasts only for the session. Saving a proposal, with its brief and source sheet, needs a login. Download (PDF and Excel together) is a later milestone.

## Part 2 · The proposal PDF (for the client, later milestone)

An app for event planning that sells the pitch at once – here, the numbers speak louder than words. Who it's for: a host planning a milestone (a wedding, an anniversary, a landmark birthday, a corporate celebration, a big get-together) who is gathering a lot of people and wants to make an impression. He is spending to show his taste. What he buys: a stylised version of himself. A planner who takes his ideas, adds outside influences and makes them better. The tone: new-world money spent with old-money restraint. Glamour, luxury, chic, with one confident, brash move held in check. It won't please everyone. It has to win the taste-makers, so every celebration becomes a talking point and a reference for the next.
The look: Gaudí meets Bauhaus, Japan meets Africa, Baz Luhrmann meets IKEA, Tom Ford meets Prada via Christian Dior. Mediterranean pastels, textured surfaces, a stylised typeface, splashes of primary colour.
The philosophy
Mountain and beach. People say the world divides into mountain people and beach people. Find your spot wherever you are. You may lean towards one, but you can choose to be both, because together they make you complete. That's the yin and yang of every celebration: calm and spectacle, old money and new, restraint and one bold statement.
Celebrate the world. Borrow beautifully from everywhere, from Japan and Africa to the Mediterranean and the Bauhaus. Completeness comes from the mix, not from one place.
Lead, don't follow. Following a trend is easy. Have the nerve to lead with a bold statement, and the next host's brief will reference yours.
Every generation finds its own retro. Retro is always cool, but it changes by generation: each one goes back, discovers its own and yearns for it. The house favourites are 1930s jazz and Art Deco, and the 1960s and 70s, killer decades for design.
On screen: every celebration story names its pair of opposites (mountain and beach, deco and Bauhaus, jazz and silence) and its one bold statement.
1. The feeling, in labels
Old-money hush, limewash grounds, linen-soft pastels, wide margins, quiet type. The host feels he has always lived at this level, and nothing on screen has to prove it.

One brash move, each screen gets a single confident gesture: a full-bleed spectacle photo, a terracotta splash, an oversized italic headline. That's where the new-money energy goes, and it gets one place, not several.

The host in the mirror, he sees himself rendered: his words, his occasion, his taste, translated and made better. The work is shown as "he said, we made".

Insider's references, Gaudí, Dior, Bar Luce, Positano, Ndebele colour. Cues that taste-makers recognise without being told, dropped the way a curator drops them, never as name-dropping.

The talking point, every celebration shown has one detail people photographed and copied. The app sells that detail, because it's what makes the next host call.

2. References, one per component
Named references to pull into a moodboard. Swap any for an image you already love.
Component
Reference
Take
Ignore
First-open moment
Baz Luhrmann's party sequences in The Great Gatsby
The rush of arriving at the best party in town: one layered reveal, then the opening line on a bold title card
The glitter, the confetti, anything after the first five seconds
Home hero
Gaudí's Casa Batlló meets Herbert Bayer's 1923 Bauhaus poster
A strict grid broken by one organic, curving form; one bar or circle of primary colour
Gaudí's everything-curves excess and the poster's full saturation
Celebration photos
Slim Aarons's photographs of old money at leisure
Guests, not décor: candid, sun-lit, effortless people who look like they belong
Faded colour casts that look like a filter
Portraits of hosts and the planner
Tom Ford campaign photography
Confident, close, warmly lit; sharp tailoring; one subject per frame
The provocation and the black gloss
Celebration story pages
Christian Dior show sets (the floral rooms at the Musée Rodin)
One big idea per event at architectural scale; the room as the statement
Runway formality and the logo
Palette and venue mood
Prada's Bar Luce in Milan and Mediterranean weddings (Positano, Capri)
Sun-washed pastels with an intellectual, slightly odd edge
Postcard clichés and retro-diner kitsch
"He said, we made"
Gaudí's sketches beside the built building; Dior atelier toiles beside the finished gown
The host's idea shown next to the elevated result, so the translation is visible
Process clutter: show two frames, not twenty
Invitations and type
Engraved, letterpress stationery (Smythson-style)
Engraved serif letters, deep impression, cream stock, generous margins
Crests, monograms, borrowed heraldry
Texture
Limewash and tadelakt plaster, terrazzo, Gaudí's trencadís mosaic, Bagru block print
A faint hand-made grain on pastel fields; one mosaic or print edge as a divider
All-over pattern; texture behind text
How it works
IKEA assembly instructions
Numbered steps, one pictogram each, zero adjectives; the drama stays elsewhere
Cartoon people and flat-pack humour
Accent marks
Ndebele painted houses held in Muji and Kinfolk white space (Japan meets Africa)
Geometric colour bands as a frame or stripe inside quiet Japanese layouts
Bands as backgrounds; the beige-only Muji palette
Evening celebrations and ornament
1930s Art Deco and the jazz age: the Chrysler Building's crown, Cotton Club-era big-band glamour
Sunbursts, fans and stepped geometry drawn as gold hairlines; brass-section energy for night events
Gatsby fancy dress: feather boas, flapper costumes, gold fills
Lounges, after-parties and retro shapes
1960s and 70s design: Verner Panton interiors, sunken conversation pits, Milton Glaser posters
Rounded corners and soft curves, low lounge settings, one bold supergraphic per event
Brown-and-orange everything, shag carpet, psychedelic pastiche
Destinations and settings
Mountain meets beach: an Alpine chalet in Gstaad beside a Capri beach club
Settings shown as yin-and-yang pairs: wood and snow next to sea and sun, one photo of each
Travel-brochure gloss and drone shots
3. Type and colour
Fonts (two, both free on Google Fonts): Bodoni Moda for headlines. It's a high-contrast couture serif that reads like an engraved invitation, which is the old money. Jost for everything else. It's geometric and Futura-like, which is the Bauhaus order.
Size
Font
Used for
56 px
Bodoni Moda italic
The one brash headline: the first-open title card and the Home headline only
32 px
Bodoni Moda
Screen and section titles, celebration names
16 px
Jost
Body text, buttons, form fields (never Bodoni at this size, because its hairlines vanish)
12 px
Jost, letter-spaced caps
Captions: occasion, place, guest count, year
Colours
Role
Colour
Hex
Rule
Text
Ink
#22252B
All text; never pure black
Background
Limewash
#F7F3EC
Default ground on every screen, with a faint plaster grain
Pastel fields
Champagne / Sea glass / Blush / Bar Luce mint / Pale terracotta
#EFE3CF / #CFE0E8 / #F1D5CC / #D3E6DA / #E8C2A8
Section and card backgrounds, one per section
Accent
Aegean blue
#1E4FA3
Only on the main action button, one per screen
Highlight
Marigold
#F2B705
Small marks only: a dot, an underline, a date
Brand splash
Terracotta red
#C8462F
The one brash move: logo mark, first-open moment, one splash per screen; never on controls
Gilt
Antique gold
#B8955A
Hairlines only (a 1 px rule, an engraved-style frame); never as a fill or as text
Errors
Brick
#A3322A
Error text with an icon, always next to the field
Texture: a limewash or terrazzo grain at 3–4% opacity on background and pastel fields. Never behind body text, never on buttons.
Gold appears only as a hairline. Old money doesn't show gold as a fill, and gold on black is the clearest new-money tell.

Signature lines
The app opens with a line about joy, carries three catchphrases throughout and ends on a sign-off.
Opening line (the first-open title card):
"I have the simplest tastes. I am always satisfied with the best.", attributed to Oscar Wilde

Alternates: "I like large parties. They're so intimate. At small parties there isn't any privacy.", F. Scott Fitzgerald, The Great Gatsby · "Let us have wine and women, mirth and laughter, / Sermons and soda-water the day after.", Lord Byron, Don Juan
Catchphrases (one per screen at most, set in Bodoni Moda italic):
Line
Where it lives
Mountain or beach? Why choose.
The approach, above the five steps
Don't follow the trend. Be the reference.
Celebration story, beside the talking point
Old-money manners. New-money nerve.
Your first look, above the moodboard
Sign-off (the last screen and the footer of every page):
In life, you don't get what you deserve. You get what you negotiate.

Closing line, always the very last words: This is just the beginning.
6. Principles
One brash move per screen, and only one. Everything else is restraint.

One primary colour per screen, one main action per screen.

Limewash and pastels cover at least 80% of every screen; terracotta red and marigold stay under 5%; gold is a hairline only.

The host is the hero. Show his words, his occasion and his guests before the planner's name.

Show, never say: no "luxury", "exclusive", "premium" or "bespoke". Old money doesn't announce itself.

No prices or vendor logos on public screens. Budget is only ever asked privately, as a band.

Every celebration shown has one named talking point, the detail people copied.

Photograph guests, not just décor: candid, sun-lit, never posed or stock.

Two typefaces, four sizes. Nothing else, ever.

Write like a host speaking to a host: "I" and "you", sentences under 15 words.

Motion is slow and assured: fades and slides of 300–400 ms, no bounce. The first-open moment is the one exception.

Never please everyone. If a taste-maker would find it common, cut it.
