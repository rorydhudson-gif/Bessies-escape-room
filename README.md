# The Escape Room (HTML/CSS/JS, no frameworks)

Cinematic, puzzle-driven interactive room with modular views, smooth transitions, and real assets.

Status
- Core hub with hotspots and 16:9-safe scaling
- All stages implemented per spec with gating rules
- Transitions, subtle SFX manager (with WebAudio fallbacks)
- LocalStorage persistence and end screen with restart
- Wikipedia puzzle uses live Wikipedia API (client-side, CORS-enabled)

Run locally
Option A: Python (recommended)
1) Open a terminal in this folder
2) Run:
   python -m http.server 5173
3) Open:
   http://localhost:5173/?debug

Option B: Node http-server
1) npm i -g http-server
2) http-server -p 5173
3) Open:
   http://localhost:5173/?debug

Controls and testing tips
- Debug boxes on hotspots:
  - Add ?debug to URL: http://localhost:5173/?debug
  - Toggle at runtime: press the D key
- Intro:
  - Autoplays muted; use the Skip button if needed
- Persist/Resume:
  - Progress auto-saves in localStorage (key: escapeState)
  - End screen has “Restart” to clear and reload
  - Manual reset: localStorage.removeItem('escapeState') in DevTools console
- Transitions:
  - Global fade curtain added for showView transitions

Puzzle flow (golden path)
Hub: assets/room/room.jpg with clickable hotspots. Some hotspots are gated until prerequisites are complete.

1) Map
- Click the map hotspot to view pins with tooltips (Florence, Nice, Kraków marked red; decoys blue).
- Hints are in the sticky note on the box (“Follow the setting sun.”). The derived code is 201107 (east ➜ west ordering of red cities).

2) Lockbox (Padlocked Box)
- Enter 6-digit code: 201107
- On first wrong attempt: “look for the colours and who you went with”
- On second wrong attempt: “the sun rises in the east and sets in the west”
- On success: unlock SFX and auto-open Photos

3) Photos (Chronology inside the box)
- Drag 8 polaroids into the correct order (config-driven)
- Each correct photo reveals its letter; final word becomes NO1CHASE
- On success: chime, auto-open Laptop

4) Laptop (Password + Wikipedia)
- Step 1: Password
  - Enter NO1CHASE (case-insensitive)
- Step 2: Wikipedia link-hopping game
  - Uses live Wikipedia API (CORS via origin=*)
  - Start: RuPaul, Destination: Cricket, Max clicks: 10 (Back allowed if enabled in config)
  - Click internal links only (UI filters out external/special links)
  - Reaching “Cricket” triggers success and opens Boarding Pass

5) Boarding Pass
- Image shows passenger data with To: [blank]
- Enter IATA: ZTH
- On success: open the fridge note (shopping list)

6) Fridge Note (Briefcase Notebook)
- Riddle: “When the list is done, take what lingers at the end.”
- Derive and enter: DILIGENT
- Success unlocks Phone

7) Phone (Passcode → Video → Emojis → Chat)
- Passcode: DILIGENT (QWERTY is implied; we use an inline input + Unlock)
- Video plays inline assets/phone/video1.mp4
- Emoji sequence puzzle (no decoys after submit if keepOnWrong=false)
  - Correct sequence: 😀 😂 🫠 😮 😡
- On success: WhatsApp-style chat is revealed, then Portraits unlock

8) Portraits
- 3 portraits: Richie, Rex, Rudy. Choose the truthful person: Rudy
- On success: hinge-open concept and auto open Crossword

9) Crossword
- Across answers from config; contentEditable grid
- Down letters at column index spell FRIARY
- Check button validates across words; if the down result equals FRIARY, proceed to final

11) Final Letter
- Select words to form: “I love you so much you don’t understand.”
- Rules:
  - Case-insensitive; punctuation normalized; supports curly apostrophes
- On success:
  - Key drop audio/visual, state.finale=true
  - Door hotspot becomes active in hub
  - Clicking door goes to “Escape Complete” end screen with Restart

Gating logic summary
- Photos only after Lockbox success (s1=true)
- Laptop only after Photos success (s3=true)
- Briefcase hotspot appears/unlocks only after Wikipedia success (state.wiki=true)
- Fridge Note (shopping) only after Boarding Pass success (state.brief=true)
- Phone only after Notebook success (state.phoneReady=true)
- Portraits only after Phone success (state.phone=true)
- Crossword only after Portraits success (state.portraits=true)
- Final only after Crossword success
- Door only after Final success (state.finale=true)

Configs overview (./config)
- stage1_map.json
  - padlockCode: 201107
  - red/blue pins with lat/lon and fail hints
- stage3_photos.json
  - photos with letters, correct order, finalWord: no1chase
- stage4_wikipedia.json
  - start RuPaul, destination Cricket, maxClicks 10, allowBack true
- stage5_boarding.json
  - iataAnswer: ZTH, meta for boarding pass
- stage6_shopping.json
  - riddle list and finalWord: diligent
- stage7_emojis.json
  - phonePasscode: diligent
  - sequence: 😀 😂 🫠 😮 😡 (plus decoys)
- stage8_riddle.json
  - portraits list; Rudy marked truthful; wall note
- stage9_crossword.json
  - across clues; downWord FRIARY
- stage11_finale.json
  - paragraphs and targetSequence; normalization + UI hints

Audio and SFX
- keydrop.mp3 is included
- Other cues use WebAudio tones (unlock/success/fail) if corresponding assets are not present

Developer notes
- Hotspot overlay scales to the natural image bounds using getBoundingClientRect; image uses object-fit: contain. This prevents hotspot drift at different aspect ratios.
- The fade curtain is a simple full-screen overlay with CSS transitions: .fade-screen and .fade-screen.show
- State persistence with localStorage:
  - On set of s1/s3/wiki/brief/phoneReady/phone/portraits/finale, save() is called
- End screen:
  - “Escape Complete” page with a Restart button clears localStorage and reloads
- Debugging:
  - Add ?debug and use D to toggle visible hotspot outlines while aligning or QA’ing interactions

Known limitations and notes
- The Wikipedia puzzle uses Wikipedia’s JSON parse API (action=parse&origin=*). This requires an internet connection during gameplay.
- If you need a fully offline experience, replace the live Wikipedia step with a guided/local graph in config and a mock browser UI (code already structured to make this change straightforward).
- If the intro video cannot autoplay, use the Skip button. Browser media policies vary.

Quick QA checklist
- Resize the browser window to confirm no hotspot drift (debug boxes help)
- Golden path run-through (steps above)
- Repeat wrong answers to see progressive hints/messages where applicable
- Verify end state:
  - Final letter success triggers key drop and door unlock
  - Door opens the end screen with a functioning Restart button

Enjoy the escape.
