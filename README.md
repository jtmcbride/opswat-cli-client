# Leximble

A simple, mobile-first vocabulary app. Track the words you know, drill them with spaced-repetition
flashcards, pick up new words from context, and optionally chat with an AI tutor that sticks to
your vocabulary. Runs on iOS, Android, and the web from one Expo codebase. Data stays on the
device unless you turn on sync.

## Interface

The Leximble interface uses a mobile bottom bar, desktop sidebar, guided starting options, and a vocabulary-focused daily practice screen. See [design notes and validation](docs/design.md).

## Features

- **Words**: add known words with dictionary autocomplete (inflected forms like *tengo* resolve
  to *tener*), bulk paste, one-tap “starter” sets, or a 2-minute **placement test** that marks
  the common words you already know. Word pages show nouns with their article and full
  conjugation/declension tables; every inflected form in those tables is recognized when reading.
- **Review**: FSRS spaced repetition (the scheduler Anki uses) with adjustable target recall, a
  daily new-card limit, and leech detection (words you keep forgetting can be edited or
  suspended). Each word has a recognition card (word → meaning, or hear it) and, once learned, a
  production card (meaning → word: typed, in a fill-in-the-blank sentence, or spoken), scheduled
  separately. Answers are checked accent- and typo-tolerantly with a suggested grade you can
  override. After a few hundred reviews, the scheduler can be tuned to your own memory.
- **Learn**: shows a sentence where every word is known except one (“i+1”). Guess from
  multiple choice or tap to reveal, then add the word to your list. Tap any word for its meaning.
- **Read**: paste or import any text (or have AI write a story at ~95% known words). See what
  share of it you can read, tap any word for its meaning or audio, and add new words from it.
- **Chat** (optional): an AI conversation partner that writes mostly with your known words and
  introduces one or two new ones per reply. Free conversation or role-plays (café, directions,
  hotel…); your mistakes are corrected and can be saved as flashcards. Dictate by voice and have
  replies read aloud. AI also generates practice sentences and explains grammar on request.
- **Pronunciation**: speaker buttons on words, flashcards, Learn sentences, and chat replies use the
  device's text-to-speech voices (`expo-speech`; works offline on iOS/Android, Web Speech API in
  browsers). Long-press for slow speech; optional auto-play on flashcards. Buttons hide when the device
  has no voice for the language. **Say it** buttons check your pronunciation word by word (browsers
  with speech recognition: Chrome, Edge, Safari).
- **Progress**: streak and daily review goal on the Words tab; a Progress screen with current and
  best streak, goal days, retention, a 16-week activity calendar, vocabulary strength (new →
  mastered, per direction), everyday coverage (share of words in everyday sentences you know, plus
  the most common words to learn next), this week vs last week, milestones (words, mastered words,
  streak, reviews, coverage) with celebrations as you reach them, reviews per day, upcoming reviews
  and words added. A recap of last week appears on the Words tab when a new week starts. Optional
  daily reminder (iOS/Android) that skips days you've already met your goal and mentions the
  streak at stake.
- **Dictionaries**: built-in Spanish, French, German, Italian, Portuguese and Croatian with 5,000
  words (frequency-ranked, with meanings and inflections) and up to ~12,000 example sentences each
  (Croatian has fewer: Tatoeba has less Croatian), built from
  open data (see `DATA-LICENSES.md`), plus curated starter sets. Import your own dictionary as CSV,
  TSV, JSON, or an Anki text export, for any language.
- **Sync** (optional): sign in with an emailed code to sync words, reviews, texts, chats, settings
  and progress across devices (Supabase). Without it, all data stays on the device.
- **Backup**: export/import everything as JSON.

## Getting started

```bash
npm install
npm start          # Expo dev server: press w for web, or scan the QR code with Expo Go
npm run web        # web only
```

AI features need an [Anthropic API key](https://console.anthropic.com/). Paste it in
**Settings → AI tutor**. It is stored on the device (secure storage on iOS/Android, localStorage on
web) and sent only to the Anthropic API. The default model is `claude-opus-5-5` and can be changed
in Settings.

## Cloud sync (optional)

Sync uses a [Supabase](https://supabase.com) project; the free tier is enough. Builds without the
two settings below simply hide sync.

1. Create a project, open **SQL Editor**, and run
   [`supabase/migrations/20261006000000_sync.sql`](supabase/migrations/20261006000000_sync.sql)
   (or `npx supabase db push` with the Supabase CLI).
2. **Authentication → Emails → Templates**: in **Magic Link** and **Confirm signup**, show the code
   instead of (or as well as) the link, e.g. `<p>Your Leximble code: {{ .Token }}</p>`.
3. **Authentication → Emails → SMTP**: the built-in sender only emails your project's team members
   and a few messages an hour, so set up custom SMTP (e.g. Resend, Brevo) before inviting others.
4. Copy the project URL and publishable key (**Project Settings → API Keys**) into `.env`
   (see `.env.example`) for local builds, and into the repository's Actions **variables**
   `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the GitHub Pages build. For EAS builds, add
   them as EAS environment variables.

Free projects pause after a week without activity; restore them from the dashboard.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests (SRS, tokenizer, i+1 picker, import parser, built-in data coverage) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build:web` | Static web build in `dist/` (single-page app; host anywhere) |

Native builds: `npx eas-cli build -p ios|android` (see [EAS docs](https://docs.expo.dev/build/introduction/)).

## Project layout

```
src/app/            screens (expo-router): (tabs)/ Words, Review, Learn, Read, Chat; settings, stats, placement, read/, dictionaries, languages, word/[id]
src/lib/            pure logic: srs.ts (FSRS), queue.ts, recall.ts, reading.ts, grammar.ts, placement.ts, activity.ts,
                    pronunciation.ts, tokenize.ts, dictionary.ts (DictIndex), picker.ts (i+1), importParser.ts, ai.ts
src/store/          zustand store persisted to AsyncStorage; imported dictionaries stored per key;
                    cloud.ts + useSync.ts drive sync (merge logic in src/lib/sync.ts, syncItems.ts)
supabase/           database schema for sync
src/data/           curated starter dictionaries (dictionaries/) and generated ones (generated/, lazy-loaded)
tools/build-data/   pipeline that builds src/data/generated from open data (run by the Build dictionaries workflow)
__tests__/          jest tests
```

### Regenerating the built-in dictionaries

Run the **Build dictionaries** workflow (Actions tab), or see `DATA-LICENSES.md` to run it locally.
It also runs automatically when `tools/build-data/` changes.

### Adding to a starter dictionary

Edit `src/data/dictionaries/<lang>.ts`. Entries are `lemma | gloss | pos | form1, form2`, ordered
by frequency; sentences are `text | translation`. `npm test` fails if a sentence uses a word that
isn't in the dictionary (including its inflected forms).
