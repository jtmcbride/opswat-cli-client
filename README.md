# Lingo

A simple, mobile-first vocabulary app. Track the words you know, drill them with spaced-repetition
flashcards, pick up new words from context, and optionally chat with an AI tutor that sticks to
your vocabulary. Runs on iOS, Android, and the web from one Expo codebase. All data stays on the
device.

## Features

- **Words**: add known words with dictionary autocomplete (inflected forms like *tengo* resolve
  to *tener*), bulk paste, or one-tap “starter” sets of the most common words.
- **Review**: FSRS spaced repetition (the scheduler Anki uses) with adjustable target recall, a
  daily new-word limit, and leech detection (words you keep forgetting can be edited or
  suspended). New words start as flip cards; after that, reviews mix typed recall
  (meaning → word), fill-in-the-blank sentences, and listening (hear → type), checked accent- and
  typo-tolerantly with a suggested grade you can override.
- **Learn**: shows a sentence where every word is known except one (“i+1”). Guess from
  multiple choice or tap to reveal, then add the word to your list. Tap any word for its meaning.
- **Read**: paste or import any text (or have AI write a story at ~95% known words). See what
  share of it you can read, tap any word for its meaning or audio, and add new words from it.
- **Chat** (optional): an AI conversation partner that writes mostly with your known words and
  introduces one or two new ones per reply. It can also generate fresh practice sentences.
- **Pronunciation**: speaker buttons on words, flashcards, Learn sentences, and chat replies use the
  device's text-to-speech voices (`expo-speech`; works offline on iOS/Android, Web Speech API in
  browsers). Long-press for slow speech; optional auto-play on flashcards. Buttons hide when the device
  has no voice for the language.
- **Dictionaries**: built-in Spanish, French, German, Italian, and Portuguese with 5,000 words
  (frequency-ranked, with meanings and inflections) and ~12,000 example sentences each, built from
  open data (see `DATA-LICENSES.md`), plus curated starter sets. Import your own dictionary as CSV,
  TSV, JSON, or an Anki text export, for any language.
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
src/app/            screens (expo-router): (tabs)/ Words, Review, Learn, Read, Chat; settings, read/, dictionaries, languages, word/[id]
src/lib/            pure logic: srs.ts, recall.ts, reading.ts, tokenize.ts, dictionary.ts (DictIndex), picker.ts (i+1), importParser.ts, ai.ts
src/store/          zustand store persisted to AsyncStorage; imported dictionaries stored per key
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
