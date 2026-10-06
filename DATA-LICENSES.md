# Data sources and licenses

The app code is separate from the language data it ships.

| Data | Source | License |
|---|---|---|
| Hand-written starter dictionaries and sentences (`src/data/dictionaries/`) | Written for this project | Same as the project |
| Word frequency ranks | [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave (OpenSubtitles 2018) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Meanings and inflected forms | [English Wiktionary](https://en.wiktionary.org/), extracted by [wiktextract](https://github.com/tatuylonen/wiktextract) / [kaikki.org](https://kaikki.org/) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Example sentences and translations | [Tatoeba](https://tatoeba.org/) | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) |

The generated files in `src/data/generated/` combine these sources and are therefore distributed
under CC BY-SA 4.0. Rebuild them with the **Build dictionaries** workflow, or locally:

```bash
bash tools/build-data/download.sh data-src      # ~3 GB download
npx tsx tools/build-data/build.ts data-src src/data/generated
```
