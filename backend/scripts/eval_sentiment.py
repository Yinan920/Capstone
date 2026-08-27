"""Measure sentiment-classification quality against a human-labelled gold set.

Why this stage and not the whole pipeline: sentiment is the one step with a
**fixed label space** (positive / neutral / negative), so it can be scored
against ground truth. Theme discovery is unsupervised — its labels are written
by the model, so there is nothing to compare them to without a separately
labelled theme gold set. Measuring what is measurable beats an accuracy number
that quietly means nothing.

Three systems, so the model's contribution is isolated rather than assumed:

  stars   — the rating alone (>=4 positive, ==3 neutral, <=2 negative).
            The baseline that matters: if stars predicted text sentiment, this
            product would not need to exist.
  mock    — MockLLM, the keyless deterministic adapter (stars blended with a
            small lexicon). The "cheap heuristic" bar the real model must clear.
  haiku   — the production path, claude-haiku-4-5, via the real adapter.

Usage:
    python -m scripts.eval_sentiment                  # stars + mock, no API key
    python -m scripts.eval_sentiment --with-haiku     # adds the metered real run
"""
import argparse
import asyncio
import csv
import os
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
GOLD = pathlib.Path(__file__).resolve().parents[1] / "data" / "gold_sentiment.csv"
LABELS = ["positive", "neutral", "negative"]

parser = argparse.ArgumentParser()
parser.add_argument("--with-haiku", action="store_true", help="also run the real adapter (metered)")
parser.add_argument("--gold", default=str(GOLD))
parser.add_argument(
    "--min-macro-f1",
    type=float,
    metavar="F",
    help="exit non-zero if the best evaluated system scores below F. This is what "
    "makes the harness a CI gate rather than a report: a prompt edit that costs "
    "accuracy fails the build instead of shipping quietly.",
)
args = parser.parse_args()

if args.with_haiku:
    os.environ["LLM_PROVIDER"] = "anthropic"
    key = os.environ.get("ANTHROPIC_API_KEY") or ""
    if not key and (REPO / "docs/api-key").exists():
        key = (REPO / "docs/api-key").read_text().strip()
    if not key:
        sys.exit("--with-haiku needs ANTHROPIC_API_KEY or docs/api-key")
    os.environ["ANTHROPIC_API_KEY"] = key


def stars_only(ratings: list[int]) -> list[str]:
    return ["positive" if r >= 4 else "neutral" if r == 3 else "negative" for r in ratings]


def metrics(gold: list[str], pred: list[str]) -> dict:
    """Accuracy, per-class P/R/F1, and macro-F1.

    Macro-F1 rather than accuracy alone because the classes are imbalanced —
    a system that never predicts `neutral` can still post a decent accuracy,
    and macro-F1 is what exposes that.
    """
    n = len(gold)
    correct = sum(g == p for g, p in zip(gold, pred))
    per_class = {}
    f1s = []
    for label in LABELS:
        tp = sum(g == label and p == label for g, p in zip(gold, pred))
        fp = sum(g != label and p == label for g, p in zip(gold, pred))
        fn = sum(g == label and p != label for g, p in zip(gold, pred))
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"p": precision, "r": recall, "f1": f1, "support": tp + fn}
        f1s.append(f1)
    return {
        "accuracy": correct / n,
        "macro_f1": sum(f1s) / len(f1s),
        "per_class": per_class,
        "confusion": {
            g: {p: sum(gg == g and pp == p for gg, pp in zip(gold, pred)) for p in LABELS}
            for g in LABELS
        },
    }


def report(name: str, gold: list[str], pred: list[str]) -> dict:
    m = metrics(gold, pred)
    print(f"\n### {name}")
    print(f"  accuracy {m['accuracy']:.3f}   macro-F1 {m['macro_f1']:.3f}")
    print(f"  {'class':10s} {'prec':>6s} {'rec':>6s} {'F1':>6s} {'n':>5s}")
    for label in LABELS:
        c = m["per_class"][label]
        print(f"  {label:10s} {c['p']:6.3f} {c['r']:6.3f} {c['f1']:6.3f} {c['support']:5d}")
    print("  confusion (rows = gold, cols = predicted):")
    print(f"    {'':10s}" + "".join(f"{l[:3]:>6s}" for l in LABELS))
    for g in LABELS:
        print(f"    {g:10s}" + "".join(f"{m['confusion'][g][p]:6d}" for p in LABELS))
    return m


async def main() -> None:
    rows = list(csv.DictReader(open(args.gold, encoding="utf-8-sig")))
    if not rows:
        sys.exit(f"no rows in {args.gold}")
    texts = [r["text"] for r in rows]
    ratings = [int(r["rating"]) for r in rows]
    gold = [r["gold_label"].strip().lower() for r in rows]
    bad = {g for g in gold} - set(LABELS)
    if bad:
        sys.exit(f"gold set has unknown labels: {sorted(bad)}")

    from collections import Counter
    print(f"gold set: {len(rows)} reviews from {args.gold}")
    print(f"  gold distribution: {dict(Counter(gold))}")
    print(f"  star distribution: {dict(sorted(Counter(ratings).items()))}")
    # How often the stars disagree with what the text says — the reason the
    # product reads text at all rather than averaging the rating column.
    disagree = sum(g != s for g, s in zip(gold, stars_only(ratings)))
    print(f"  stars disagree with the text on {disagree}/{len(rows)} ({disagree / len(rows):.0%})")

    results = {"stars": report("stars only (baseline)", gold, stars_only(ratings))}

    from app.integrations.llm.mock import MockLLM
    mock_pred = [label for _, label in await MockLLM().score(texts, ratings)]
    results["mock"] = report("mock adapter (stars + lexicon)", gold, mock_pred)

    if args.with_haiku:
        from app.integrations.llm.anthropic import AnthropicLLM
        llm = AnthropicLLM()
        haiku_pred = [label for _, label in await llm.score(texts, ratings)]
        results["haiku"] = report("claude-haiku-4-5 (production path)", gold, haiku_pred)
        print(f"\n  metered: {llm.usage.calls} calls, "
              f"{llm.usage.input_tokens:,} in / {llm.usage.output_tokens:,} out, "
              f"${llm.usage.cost():.4f} "
              f"(${llm.usage.cost() / len(rows) * 1000:.2f} per 1,000 reviews)")

    print("\n" + "=" * 62)
    print(f"{'system':32s} {'accuracy':>9s} {'macro-F1':>9s}")
    for name, m in results.items():
        print(f"{name:32s} {m['accuracy']:9.3f} {m['macro_f1']:9.3f}")
    base = results["stars"]["macro_f1"]
    for name, m in results.items():
        if name != "stars" and base:
            print(f"  {name} vs stars baseline: macro-F1 {(m['macro_f1'] - base) / base:+.1%}")

    if args.min_macro_f1 is not None:
        # Gate on the best system actually evaluated, so the same threshold is
        # meaningful whether or not an API key was available: without one the
        # bar is the deterministic adapter, with one it is the production model.
        best_name = max(results, key=lambda k: results[k]["macro_f1"])
        best = results[best_name]["macro_f1"]
        print(f"\ngate: best system is {best_name} at macro-F1 {best:.3f}, "
              f"floor {args.min_macro_f1:.3f}")
        if best < args.min_macro_f1:
            sys.exit(
                f"FAIL: macro-F1 {best:.3f} is below the floor {args.min_macro_f1:.3f}. "
                "Sentiment quality regressed — check prompt, model, or adapter changes."
            )
        print("gate: PASS")


asyncio.run(main())
