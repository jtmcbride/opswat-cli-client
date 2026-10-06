# Lingo — Language Learning App: Plan

> **Status:** v1 implemented. See "Implementation notes" at the end for where it differs from this plan.

A simple, mobile-first vocabulary app (Anki-like). Track words you know, drill them with
spaced-repetition flashcards, learn new words from context, and optionally chat with an AI tutor.

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + TypeScript** | One codebase → iOS, Android, and web (react-native-web) |
| Navigation | expo-router (tabs) | File-based routes, works on web + native |
| Local storage | **expo-sqlite** (native + web/wasm) behind a `Repository` interface | Offline-first; no account needed |
| State | Zustand | Small, simple |
| Tests | Jest + React Native Testing Library | Core logic (SRS, sentence picker, tokenizer) unit-tested |
| AI chat | Anthropic Messages API, user-supplied key (stored in expo-secure-store / localStorage on web) | No backend needed for v1 |
| Web deploy | `expo export -p web` → static host (GitHub Pages / Netlify), installable PWA | |

The existing repo contents (OPSWAT CLI) will be removed.

## 2. Data model

```
Language      { code, name, direction }                       e.g. "es", "Spanish"
DictEntry     { id, lang, lemma, forms[], pos?, gloss, freqRank?, source }
                -- source: "builtin" | "user:<import-id>"
KnownWord     { id, lang, word, gloss, addedAt, dictEntryId? }
Card (SRS)    { knownWordId, direction: "L2→L1"|"L1→L2", ease, interval, due, reps, lapses }
Review        { cardId, at, grade }                           -- history for stats
Sentence      { id, lang, text, translation, tokens[], source }
Settings      { activeLang, nativeLang, dailyNewLimit, aiProvider, aiModel }
```

## 3. Features (by screen)

1. **Words** — add a known word (autocomplete + gloss from dictionary; manual gloss if not found),
   search/list/delete, bulk paste (one per line). Saved immediately.
2. **Dictionaries** — pick active language; bundled defaults; import your own (CSV/TSV/JSON:
   `word, translation[, pos]`); enable/disable sources.
3. **Review (flashcards)** — SM-2 scheduling over known words; front/back flip; grades
   Again / Hard / Good / Easy; daily due count on the tab badge.
4. **Learn in context** — shows a sentence where *all words but one* are known (i+1). The new
   word is highlighted; user guesses (free text or multiple choice from dictionary glosses) or
   taps to reveal. "Got it" adds the word to known words + creates its card.
   Sentence source priority: bundled sentence corpus → AI-generated (if connected) → fallback
   template sentence.
5. **Chat (optional)** — AI tutor that converses in the target language, constrained to mostly
   known words + a few new ones per turn; tap any word for its gloss / add to known.
6. **Settings** — native/target language, AI key + model, export/import backup (JSON).

## 4. Default content

- **Languages (v1):** Spanish, French, German, Italian, Portuguese (Latin script — simple
  tokenization). CJK/other scripts later (needs segmentation).
- **Dictionaries:** top ~2,000 words per language by frequency with English glosses, built
  from openly licensed data (Wiktionary-derived / FreeDict) by a script in `tools/` and shipped
  as compressed JSON. Attribution in `LICENSES.md`.
- **Sentences:** ~1–3k short sentence pairs per language from **Tatoeba** (CC BY 2.0 FR),
  pre-tokenized and lemmatized-to-dictionary at build time.

## 5. Key logic

- **Tokenizer:** Unicode-aware word split, lowercase, strip punctuation; map inflected forms to
  lemmas via `DictEntry.forms`.
- **i+1 picker:** for each sentence, count unknown lemmas; candidates = exactly one unknown;
  rank by that word's frequency rank (most common first), avoid recently shown.
- **SRS:** SM-2 variant (ease ≥ 1.3, intervals 1d → 6d → interval×ease), pure functions.

## 6. Milestones

1. **Scaffold** — Expo + TS + router + tabs, lint/test setup, CI (GitHub Actions), remove old files.
2. **Storage layer** — SQLite schema, migrations, repositories, backup export/import.
3. **Dictionaries** — data build script, bundled ES/FR/DE/IT/PT, user import.
4. **Known words** — add/autocomplete/list/bulk add.
5. **Flashcards** — SM-2 + review UI.
6. **Learn in context** — tokenizer, i+1 picker, guess/reveal UI.
7. **AI chat** — settings, streaming chat, word tap-to-gloss, AI sentence generation for #6.
8. **Polish & deploy** — PWA manifest, offline, dark mode, web deploy, EAS build config.

Each milestone = its own commit(s) with tests for the core logic.

## 7. Open questions

- Stack OK (Expo for native + web), or web-only PWA to start?
- Which languages first (default: ES/FR/DE/IT/PT, English as native)?
- AI provider: Anthropic only with user's key, or a small proxy server so users don't need a key?
- Accounts / cloud sync — out of scope for v1?

## 8. Implementation notes (v1)

Decisions taken (defaults accepted): Expo for native + web; ES/FR/DE/IT/PT with English as native;
Anthropic with the user's own key; no accounts or sync.

Differences from the plan:

- **Storage:** zustand persisted to AsyncStorage (localStorage on web) instead of SQLite. Simpler,
  works identically on web, and is fine at vocabulary scale. Imported dictionaries are stored under
  separate keys. Swap in SQLite if a dictionary gets into the hundreds of thousands of entries.
- **Built-in content:** the network policy here blocked Tatoeba/Wiktionary downloads, so the
  built-in dictionaries (≈200–250 words) and sentences (≈120 per language) were written by hand.
  A test checks that every sentence word resolves to a dictionary entry. Next step: a `tools/`
  script to build larger dictionaries from openly licensed data.
- **Flashcards:** one card per word with a direction setting (word→meaning / meaning→word / mixed)
  rather than separate SRS state per direction.
- **AI:** non-streaming requests with server-side refusal fallback enabled; also used to generate
  new i+1 sentences (with per-word glosses) when the built-in sentences run out.
