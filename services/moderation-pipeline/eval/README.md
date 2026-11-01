# Classifier eval harness

Measures the vision classifier (`src/providers/anthropic.ts`, rubric in
`src/classifier-prompt.ts`) against a manifest of licensed, labelled public
images: per-group abstain rate, agreement with the dataset label, and cost per
1,000 images. Plan: `docs/plans/classifier-cascade.md`, Task 7.

## Nobody views an image

The product owner must never see these images, and neither does anyone
working on this harness. The manifest was assembled from dataset **metadata
only** (label CSVs). `run.ts` fetches each image into memory, sends it to the
model and keeps only the scores; it never writes image bytes to disk. Do not
open, render or describe any URL in `manifest.csv` or in a results file. Never
paste the URL of a flagged or refused item anywhere.

No nudity, underwear, sexual, gore, injury, blood or death data is collected:
there are no rows for level 3 of any group, nor for `sex 2` or `violence 2`.
Those cells are measured later in shadow mode through the review queue.

## Usage

Run from `services/moderation-pipeline`. The key is read from the gitignored
`.env.local` with Node's `--env-file`, so it never appears on a command line or
in output:

```sh
EVAL_MAX_IMAGES=50 pnpm exec tsx --env-file=.env.local eval/run.ts
EVAL_MAX_IMAGES=300 EVAL_MODEL_ID=claude-sonnet-5-5 pnpm exec tsx --env-file=.env.local eval/run.ts
pnpm exec tsx eval/run.ts --compare eval/results-claude-haiku-5-5.jsonl eval/results-claude-sonnet-5-5.jsonl
```

(`pnpm eval` runs the same script but expects `VISION_MODEL_API_KEY` in the
environment.) Through `pnpm --filter … exec` from the repo root, give
`--env-file` an absolute path.

- `EVAL_MAX_IMAGES` is required and is the spend cap: it bounds attempted
  images (dead links count), so it bounds API calls.
- `EVAL_MODEL_ID` defaults to `claude-haiku-5-5`; only models in the `PRICE`
  table are accepted.
- Results append to `eval/results-<model>.jsonl` (gitignored). A rerun skips
  images already in that file, so a run can be resumed; delete the file to
  start over.
- The last lines print per-group `n`, abstain %, agreement % and the
  `expected→level` breakdown, then `images`, cost and cost per 1k, then
  `attempted`, `dead-links`, `api-calls`, `cache-read-hits` (calls whose
  usage shows a rubric cache read) and `refusals`.

## Spend

The API account has a hard **$5/month cap covering all development**. Haiku
5.5 runs at roughly $0.12–0.25 per 1,000 images; Sonnet 5.5 at roughly 20×
that. Always set `EVAL_MAX_IMAGES` to the smallest useful number.

## Manifest

`manifest.csv`, columns `id,url,source,license,group,expected`. `expected` is
`0`, `1`, `2` or `1+` (any level ≥ 1). No field contains a comma (the parser is
a naive split). One row per image here; an image may in principle carry one
row per group.

**Source:** Open Images V7, validation and test splits
(`oidv7-{val,test}-annotations-human-imagelabels.csv`,
`oidv7-class-descriptions.csv`, `{validation,test}-images-with-rotation.csv`
from storage.googleapis.com/openimages). Only human-verified image-level labels
are used: confidence 1 = verified present, 0 = verified absent. The URL is
`OriginalURL` (the Flickr original, closest to a real phone photo, so cost per
1k is representative); images whose `OriginalSize` exceeds the provider's 10 MB
`maxImageBytes` are left out so they cannot abstain spuriously. Dead Flickr
links are skipped by `run.ts` and counted.

**Licence:** every row is CC BY 2.0
(`https://creativecommons.org/licenses/by/2.0/`), recorded per row. 591 rows
come from the test split and 229 from the validation split.

**Exclusions applied to every row:** any image with a verified-present label
for swimwear, underwear, lingerie, nudity-adjacent, erotic, bathing/beach/pool,
injury, blood, bandage, surgery, accident, death or war content (the full list
is `SENSITIVE` in the builder script).

**Sampling:** deterministic. Candidates for each cell are sorted by
`sha256("<group>/<expected>/<cell index>:<ImageID>")` and the first N taken; an
image already used for a group is not reused in that group. Rows are written
round-robin across cells, so any prefix (e.g. a 50-image pilot) covers every
group.

| group | expected | rows | Open Images labels (verified present unless noted) |
|---|---|---|---|
| sex | 1+ | 100 | `Woman` |
| sex | 0 | 100 | no person, human-part, figure, art or doll label present, and at least one of Person/Woman/Man/Girl/Boy/Human face verified absent |
| violence | 1+ | 100 | `Handgun`, `Rifle`, `Sword`, `Weapon`, `Gun`, `Firearm`, `Shotgun`, `Assault rifle`, `Dagger` or `Ammunition` |
| violence | 0 | 27 | `Kitchen knife` with a food/kitchen label and no weapon label (rubric: a cooking knife is 0) |
| violence | 0 | 73 | no weapon, knife, combat-sport or military label present, and a weapon label verified absent |
| religion | 1+ | 100 | `Church`, `Mosque`, `Cathedral`, `Temple`, `Cross`, `Christian cross`, `Crucifix`, `Hindu temple`, `Shinto shrine`, `Chapel`, `Place of worship`, `Pagoda`, `Shrine`, `Monastery`, `Abbey` or `Basilica` |
| religion | 0 | 20 | `Synagogue`, `Menorah` or `Rabbi` (Jewish content is 0) with no non-Jewish religious label |
| religion | 0 | 80 | `Building`, `House`, `Skyscraper` or `Tower` with no religious, spire, steeple or bell-tower label |
| addictions | 0 | 100 | `Wine`, `Beer`, `Wine glass`, `Cocktail`, `Champagne`, `Whisky`, `Alcoholic beverage` or `Distilled beverage`, with no smoking, gambling, party, drug or card label (tests "alcohol merely present is 0", incl. kiddush wine) |
| addictions | 1+ | 20 | `Cigarette`, `Cigar`, `Tobacco` or `Tobacco products` together with a person label |
| addictions | 2 | 100 | `Casino`, `Slot machine`, `Gambling`, `Poker` |

Total: 820 rows, 820 distinct images.

**Thin or missing cells:**
- `addictions 1+` has 20 rows, not 100. The `Smoking` and
  `Electronic cigarette` labels exist but carry no human-verified positives in
  these splits; `Cigarette`, `Cigar` and `Tobacco` are rare. A cigar held by a person is
  not necessarily someone smoking, so this cell's label is approximate.
- `addictions 2` uses `Poker`/`Gambling`, which do not prove money is at
  stake; the rubric's line ("cards for money") makes some rows arguable.
- `Roulette` is not an Open Images label. `Kippah` exists but has no verified
  annotations. `Corpse`, `Wound`, `Nudity`, `Underwear` and `Gore` do not
  exist as labels (only relevant as exclusions).
- Not collected by design: level 3 of every group, `sex 2`, `violence 2`,
  `religion 2` and `addictions 1` as distinct levels (the dataset gives
  presence, not ladder levels). Ladder levels are checked against a Sonnet 5.5
  reference run with `--compare`.
- FairFace was not used: it ships as a bulk zip without per-image URLs. COCO was
  not needed; Open Images covers every cell above.

The builder script and downloaded metadata are not in the repo (the metadata
is untrusted third-party data); this README records the method so the manifest
can be rebuilt.
