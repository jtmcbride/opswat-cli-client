#!/usr/bin/env bash
# Downloads open data for tools/build-data/build.ts into <dir>. Needs curl, bzip2, tar.
set -euo pipefail
DIR=${1:-data-src}
mkdir -p "$DIR/freq" "$DIR/wiktionary" "$DIR/tatoeba"

get() { curl -fsSL --retry 3 --retry-delay 5 -o "$2" "$1"; }

declare -A FREQ=([es]=es [fr]=fr [de]=de [it]=it [pt]=pt_br [hr]=hr)
# Croatian is part of Wiktionary's Serbo-Croatian (filtered to Croatian usage in build.ts).
declare -A WIKI=([es]=Spanish [fr]=French [de]=German [it]=Italian [pt]=Portuguese [hr]=Serbo-Croatian)
declare -A ISO3=([es]=spa [fr]=fra [de]=deu [it]=ita [pt]=por [hr]=hrv)

for lang in "${!FREQ[@]}"; do
  f=${FREQ[$lang]}
  get "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/$f/${f}_50k.txt" "$DIR/freq/$lang.txt"

  name=${WIKI[$lang]}
  file=${name//[^A-Za-z]/} # "Serbo-Croatian" -> "SerboCroatian"
  out="$DIR/wiktionary/$lang.jsonl"
  # kaikki.org has used both .jsonl and .json (also JSON Lines) file names.
  get "https://kaikki.org/dictionary/$name/kaikki.org-dictionary-$file.jsonl" "$out" ||
    get "https://kaikki.org/dictionary/$name/kaikki.org-dictionary-$file.json" "$out"

  get "https://downloads.tatoeba.org/exports/per_language/${ISO3[$lang]}/${ISO3[$lang]}_sentences.tsv.bz2" - |
    bunzip2 > "$DIR/tatoeba/${ISO3[$lang]}_sentences.tsv" || true
done

get "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2" - | bunzip2 > "$DIR/tatoeba/eng_sentences.tsv"
get "https://downloads.tatoeba.org/exports/links.tar.bz2" - | tar -xjf - -C "$DIR/tatoeba"

ls -la "$DIR"/*
