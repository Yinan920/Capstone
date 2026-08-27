# Sentiment classification: measured quality

Measured 2026-08-27. Reproduce with:

```bash
cd backend
.venv/bin/python -m scripts.eval_sentiment              # baselines only, no API key
.venv/bin/python -m scripts.eval_sentiment --with-haiku # adds the production path
```

## What is measured, and what is not

**Sentiment is scored; theme discovery is not.** Sentiment has a fixed label
space (`positive` / `neutral` / `negative`), so predictions can be compared to
ground truth. Theme discovery is unsupervised — KMeans forms the clusters and
the model writes their names, so there is no fixed set of correct answers to
score against. Measuring theme quality needs a separately labelled set (each
review tagged with its correct theme, scored by adjusted Rand index or purity);
that does not exist yet, and this document does not pretend otherwise.

An accuracy figure covering "the pipeline" would have to quietly average
something measurable with something that isn't.

## The gold set

`backend/data/gold_sentiment.csv` — **230 reviews**, every unique review across
the Amazon, TikTok and Shopify sample files. Not a sample of them: labelling all
230 removes any question of which ones were chosen.

| gold label | count |
|---|---|
| positive | 115 |
| negative | 92 |
| neutral | 23 |

**Labelling rule.** The label follows where the review *lands*, not the loudest
sentence in it. Net satisfied → positive. Net dissatisfied → negative. Genuine
two-sided reviews where neither side wins → neutral. So *"Great coffee but the
battery discharges way too fast when idle"* is negative (the complaint is the
point), while *"Slow, slow, slow. But I'd still buy it again because the
espresso is that good"* is neutral (both halves are real and the reviewer means
both).

**Annotator caveat, stated plainly.** These labels were assigned by an AI
assistant, not an independent human annotator, and the system under evaluation
is also a language model. Shared blind spots are possible and this is the
weakest link in the methodology. The gold set is a plain four-column CSV
precisely so labels can be reviewed and corrected — edit `gold_label` and re-run;
nothing else needs to change. There is one annotator and no inter-annotator
agreement figure.

## Why the stars are not the answer

**The rating column and the review text disagree on 39 of 230 reviews (17%).**
That gap is the product's whole reason to exist: a seller who averages the star
column is blind to one review in six. It also gives the evaluation its floor —
"stars only" is the system you get for free.

## Results

Three systems, same 230 reviews:

| system | what it is | accuracy | macro-F1 |
|---|---|---|---|
| **stars only** | `>=4` positive, `==3` neutral, `<=2` negative | 0.830 | 0.701 |
| **mock adapter** | keyless deterministic: stars blended with a small lexicon | 0.843 | 0.757 |
| **claude-haiku-4-5** | the production path | **0.883** | **0.817** |

Against the free baseline: **mock +8.0%, Haiku +16.6% macro-F1.** Haiku over the
lexicon heuristic is **+7.9%**.

### Per class — where the difference actually is

| | stars | mock | haiku |
|---|---|---|---|
| positive F1 | 0.935 | 0.935 | 0.935 |
| **neutral F1** | 0.348 | 0.509 | **0.638** |
| **negative F1** | 0.820 | 0.828 | **0.879** |

**All three systems classify praise identically well — 0.935, to three decimal
places.** Every point of difference between them is earned on the negative and
mixed reviews. Positive reviews say so plainly and a star rating captures them;
complaints arrive wrapped in qualifiers ("great machine, but…"), and that is
where a heuristic breaks and a model does not.

That happens to be exactly the half a seller is paying to find.

### Why macro-F1 and not accuracy

Accuracy moves 0.830 → 0.883, **+6.4%**. Macro-F1 moves 0.701 → 0.817,
**+16.6%**. The gap between those two numbers is the point: `neutral` is 23 of
230 reviews, so a system can mishandle most of the mixed reviews and still post
a respectable accuracy. Macro-F1 weights the three classes equally and refuses
to hide it. Quoting accuracy alone here would understate the model's
contribution by more than half.

The confusion matrices show the same thing directly — the stars baseline sends
**12 of 23** neutral reviews to `negative`; Haiku sends 5.

## Cost of the evaluated path

Metered from the API's own token counts (see `docs/benchmarks.md` §3):

- 230 reviews, 10 Haiku calls, 9,330 in / 2,872 out → **$0.0237**
- **$0.10 per 1,000 reviews** for sentiment

Sentiment classification is the cheap half of the pipeline. The full analysis —
including Sonnet cluster labelling — is $0.32/1,000 reviews at the 200-review
upload size.

## Honest limits

- **One annotator, and not an independent one.** See the caveat above.
- **230 reviews is a small set.** At n=23, the `neutral` F1 figures carry wide
  confidence intervals; treat the ordering as solid and the third decimal place
  as noise.
- **One product category.** Every review is about a portable espresso machine.
  Nothing here says how the classifier behaves on a different vertical.
- **Sentiment only.** Theme quality, alert precision, and reply-draft quality
  are all unmeasured.
- **Single run per system.** The two baselines are deterministic; the Haiku
  numbers would move slightly on a re-run.
