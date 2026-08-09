"""Generate the TikTok Shop and Shopify sample review CSVs.

Each channel gets its own complaint profile so switching datasets in the demo
surfaces genuinely different insights — TikTok buyers are impulse-driven and
punish slow shipping; DTC Shopify buyers care about packaging as part of the
brand experience. Texts are individually written rather than templated, because
near-duplicate reviews collapse the KMeans clustering into one degenerate group.

Run:  backend/.venv/bin/python scripts/make_samples.py
"""
import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

random.seed(11)
DATA = Path(__file__).resolve().parent.parent / "data"

FIRST = """Ava Liam Mia Noah Zoe Ethan Isla Kai Nora Owen Ruby Finn Lily Miles Iris Jude Cora Rhys
Faye Cole June Beau Sage Knox Wren Tate Elle Reid Skye Otis Vera Milo Esme Rex Dana Levi Nell Zane
Tara Hugo Bree Enzo Lena Arlo Pia Dean Suki Rory Nina Cruz Elsa Vance Mabel Dex Thea Bo Juno Wade
Remi Clay Anya Blake Fern Drew Opal Chase Wilder Greta Nash Marlo Quinn Sylvie Ari Lark Roman Ines
Booker Tess Zev Hattie Griff Posy Ellis Wren Casper Maud Roscoe Delia Otto Verity Sol Bee""".split()
LAST = list("ABCDEFGHJKLMNPRSTVWZ")


def authors(n):
    seen, out = set(), []
    while len(out) < n:
        name = f"{random.choice(FIRST)} {random.choice(LAST)}."
        if name not in seen:
            seen.add(name)
            out.append(name)
    return out


def write(path, rows, start, span_days):
    """rows: list of (text, rating). Dates spread across the window, with the
    order shuffled so complaint clusters aren't accidentally time-correlated."""
    random.shuffle(rows)
    names = authors(len(rows))
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["author", "rating", "text", "created_at"])
        for i, (text, rating) in enumerate(rows):
            dt = start + timedelta(
                days=(i * span_days) // len(rows),
                hours=random.randint(7, 21),
                minutes=random.choice([0, 15, 30, 45]),
            )
            w.writerow([names[i], rating, text, dt.strftime("%Y-%m-%dT%H:%M:%SZ")])
    print(f"{path.name}: {len(rows)} rows")


# ══════════════════════════════════════════════ TikTok Shop — 150 rows
# Impulse buyers who found the product on video. Fast-shipping expectations
# make delivery the dominant complaint; casual, short, enthusiastic voice.

tt_shipping = [
    "Ordered after seeing it on my fyp and it took 13 days to show up. Coffee is good but that wait was rough.",
    "Shipping was so slow. Tracking didn't update for over a week and I thought it got lost.",
    "Took almost two weeks. For the price I expected faster than this honestly.",
    "Still waiting nine days in with no tracking movement. Finally came but the wait killed the hype.",
    "The product is great, the shipping is not. Twelve days and zero updates.",
    "I bought this for a trip and it arrived after I got back. Please fix the delivery times.",
    "Tracking said out for delivery for four straight days. Confusing and stressful.",
    "Ordered on a Monday, got it 15 days later. Coffee's solid but I almost cancelled.",
    "Delivery took forever and support was slow to answer about it too.",
    "Two weeks to arrive. The espresso is worth it but be ready to wait.",
    "Slow shipping is the only real complaint. Everything else about it is great.",
    "Tracking number didn't work at all for the first week. Not a good look.",
    "It came eventually but the estimated date was off by ten days.",
    "Package sat in one city for six days according to tracking. Very slow carrier.",
    "Bought this on a whim and then waited 11 days wondering if I'd been scammed. It's real, just slow.",
    "The shipping experience was the worst part. Product itself is honestly great.",
    "Ordered twice, both times took over ten days. Consistent but consistently slow.",
    "No shipping updates for eight days then suddenly delivered. Weird process.",
    "Delivery estimate said five days, reality was fourteen.",
    "I love the coffee but the wait made me almost return it before it arrived.",
    "Would give five stars if shipping wasn't this slow. Genuinely a great machine.",
    "Took ages and arrived with no notification, just found it at my door.",
    "The wait was so long I forgot I ordered it. Nice surprise but come on.",
    "Shipping needs work. Everything else about this brand is good.",
    "Twelve days for something advertised as fast shipping. Misleading.",
    "Tracking was useless. Had to email support twice to find out where it was.",
    "Slow delivery but the espresso quality made up for it in the end.",
    "Ordered for a gift and it arrived two weeks after the birthday. Frustrating.",
    "The carrier lost it for a few days apparently. Took 16 days total.",
    "Fine product, painfully slow shipping. That's the whole review.",
    "Still no movement on tracking a week in. Eventually arrived on day 12.",
    "Everyone in the comments said shipping was slow and they were right.",
    "Delivery took longer than every other order I placed that week.",
    "Nine days and counting with no update, then it just appeared. Fix the tracking.",
    "The product deserves better logistics honestly. Coffee is excellent.",
    "Slow, slow, slow. But I'd still buy it again because the espresso is that good.",
    "Two weeks wait. The machine is great but manage your expectations on delivery.",
    "Waited so long I opened a support ticket. It arrived the next day.",
    "Bought after a viral video, waited 13 days, worth it but barely.",
    "Shipping time is the one thing holding this back from being perfect.",
    "Tracking never updated past 'label created' until the day it arrived.",
    "It got here 10 days late compared to the estimate on the listing.",
    "Delivery was rough but the espresso is genuinely restaurant quality.",
    "Took two weeks and arrived on a random Sunday with no notice.",
    "Slow shipping seems to be a pattern based on other reviews. Same experience here.",
    "Good product, bad shipping. Hopefully they switch carriers.",
    "Ordered during a sale and waited 17 days. Probably volume related but still.",
    "Wish I'd known about the shipping times before ordering. Product is fine.",
    "The espresso is amazing. The delivery experience is not.",
    "Almost disputed the charge because it took so long. Glad I didn't, it's great.",
    "Fourteen days. Coffee good, patience tested.",
    "Delivery took forever and the tracking page was completely wrong the whole time.",
]
tt_packaging = [
    "Box arrived completely crushed. The machine works but the water tank has a crack.",
    "Came in a flimsy box with no padding. Mine was dented on one side.",
    "Packaging was destroyed. Machine survived but barely, no protection inside at all.",
    "Arrived with the box open and taped back shut. Felt like a return being resold.",
    "The outer box was torn and the frother was missing from the accessories.",
    "Crushed corner and a cracked pressure gauge. Requested a replacement.",
    "Second order, second smashed box. They need better packaging seriously.",
    "No bubble wrap, no padding, just the machine loose in a thin box. Dented on arrival.",
    "Box looked like it had been kicked. Machine has a scratch across the front.",
    "Arrived damaged. The lid doesn't sit flush anymore because of a dent.",
    "The packaging is way too thin for something this expensive.",
    "Got it with a dented body and a bent handle. Support replaced it but still.",
    "Box was soaked and falling apart. Machine works but it's cosmetically damaged.",
    "Packaging fail. Everything rattling around inside with nothing holding it.",
    "Mine arrived with the manual missing and the box already opened.",
    "Dented on arrival, again. Third time ordering from this brand.",
    "The box was so beat up I almost refused delivery.",
    "Cracked plastic on the side from shipping damage. Disappointing for the price.",
    "Packaging needs a redesign. Mine came damaged and so did my friend's.",
    "Arrived in a battered box with a broken accessory clip.",
    "Machine was fine but the box was destroyed. Got lucky I think.",
    "Torn sleeve, crushed corner, dented unit. Not a great first impression.",
    "Zero protection in the box. Mine has a permanent dent on the base.",
    "The espresso is great but mine arrived with a cracked casing.",
    "Box damage seems common based on other reviews. Mine was crushed too.",
    "Came with a dent that affects how the lid closes. Annoying.",
    "Whoever designed this packaging has never shipped anything.",
    "Arrived with the seal broken and the box caved in on one side.",
    "Mine had a scratched body straight out of a wrecked box.",
    "Packaging was so bad the accessories were rattling loose inside.",
    "Damaged on arrival, had to wait even longer for the replacement.",
    "The box arrived flattened. Machine still works, somehow.",
    "Dented and scratched. Works fine but I paid full price for damaged goods.",
    "Please use thicker boxes. Mine was crushed and the tank is cracked.",
]
tt_battery = [
    "Battery drains overnight even when it's off. Have to charge before every use.",
    "Charge doesn't hold. Full at night, dead by morning.",
    "Battery life is the weak point. Loses half its charge just sitting there.",
    "Great coffee but the battery discharges way too fast when idle.",
    "Had to charge it three times on a two day trip. Battery needs work.",
    "Idle battery drain is real. Firmware fix needed.",
    "Died mid-shot twice. Battery capacity feels overstated.",
    "Battery drains when unused which defeats the point of a portable machine.",
    "Love it but the battery only gives me a few shots before needing a charge.",
    "The power management is bad. It loses charge sitting in my bag.",
    "Battery drops from full to half in two days of not using it.",
    "Camping trip and the battery died on day two. Bring a power bank.",
    "Charging takes long and the charge doesn't last. Only real flaw.",
    "Battery is disappointing for the price. Everything else is solid.",
    "Won't hold charge past a couple days. Otherwise a great machine.",
    "Mine dies overnight consistently. Support said a firmware update is coming.",
    "The battery drain issue is the one thing I'd fix about this.",
    "Portable but you'll still need to plug it in constantly.",
    "Battery life shorter than advertised in my experience.",
    "Idle drain makes it less portable than it looks.",
]
tt_quality = [
    "Genuinely did not expect this to be good and the crema is incredible.",
    "Best espresso I've had from anything this small. Obsessed.",
    "The shot quality is unreal for a portable machine. Rich and smooth.",
    "Tastes like a real cafe shot. I use it every single morning now.",
    "Rich crema, no bitterness, heats up fast. Exactly what I wanted.",
    "Better than my old countertop machine and it fits in a drawer.",
    "The flavor is so much better than I expected from a viral product.",
    "Smooth, strong, and consistent every time. Really impressed.",
    "Coffee quality alone makes this worth it. Best purchase this year.",
    "Perfect crema every shot. My partner uses it more than I do now.",
    "Heats in under a minute and pulls a great shot. Love it.",
    "The espresso is legitimately excellent, not just good for a portable.",
    "Rich taste, easy to clean, tiny footprint. Nothing to complain about.",
    "I make two shots a day with it and it hasn't missed once.",
    "Espresso quality rivals cafes near me. Genuinely surprised.",
    "Great crema and it's so easy to use. Bought one for my mom too.",
    "The taste is smooth and full. Way better than pod machines.",
    "Compact, fast, and the coffee is genuinely great. No notes.",
    "Cleanup takes thirty seconds and the coffee is fantastic.",
    "Strong, rich, no grit. Exactly what I hoped for.",
    "Been using it daily for a month, quality hasn't dropped at all.",
    "The crema on this thing is better than my local shop.",
    "Really well built and the espresso is excellent. Happy purchase.",
    "Makes better coffee than machines five times the price.",
    "Flavor is rich and clean. I've stopped buying coffee out.",
    "Easy to use, easy to clean, and the shot quality is top tier.",
    "This replaced my entire coffee setup. The taste is that good.",
    "Consistent great shots every morning. Zero complaints on quality.",
    "Tastes amazing and takes up no space. Ideal for small kitchens.",
    "The espresso is smooth and the machine feels premium in hand.",
    "Bought it skeptical, now I use it twice a day. Coffee is excellent.",
    "Rich crema, quick heat up, easy cleanup. It just works.",
    "Genuinely the best small espresso maker I've tried.",
    "Great shot quality and it's held up well after two months.",
    "The coffee is fantastic and the build feels solid.",
    "Better than expected in every way that matters. Great espresso.",
    "Crema is thick and the flavor is balanced. Very happy.",
    "Makes a proper shot, not a watery imitation. Impressed.",
    "Perfect for my desk at work. Coffee tastes great.",
    "Smooth rich espresso every time. Would buy again.",
    "The taste sold me. Compact size is a bonus.",
    "Excellent coffee, simple to operate, easy to rinse out.",
    "Best small machine I've owned and I've tried a few.",
    "Really good crema and no bitter aftertaste at all.",
    "Coffee quality is outstanding. Worth every dollar.",
    "Fast heat up and a genuinely great shot. Love it.",
    "It's small but the espresso does not taste small.",
    "Two months in and the coffee is still excellent.",
    "Rich, smooth, consistent. Exactly what I wanted from it.",
    "The espresso quality honestly exceeded the hype.",
    "Great machine, great coffee, very easy to live with.",
    "My morning routine improved a lot. Coffee is excellent.",
    "Strong shots with beautiful crema. Very satisfied.",
    "Quality is there. Tastes better than the cafe by my office.",
    "Compact and the coffee is genuinely cafe level.",
    "Really impressed with the flavor. Cleanup is easy too.",
    "Excellent espresso and it looks good on the counter.",
    "Coffee is rich and the machine is a joy to use.",
    "Best coffee I've made at home. Simple as that.",
    "The shot quality is consistently great. Very happy with it.",
]
tt_viral = [
    "Saw it on tiktok, bought it, do not regret it. Actually worth the hype.",
    "One of the rare viral products that lives up to the videos.",
    "The hype is real. I use it every day.",
    "Bought because everyone was posting about it and it's genuinely good.",
    "Viral for a reason. Great little machine.",
    "Impulse bought from a video and it's my favorite purchase this year.",
    "Everyone said get it and they were right.",
    "Was skeptical of the hype but this one delivers.",
    "Not just a trend, this thing is actually useful.",
    "The videos undersold it honestly. Better in person.",
    "Bought it off my fyp at 2am and zero regrets.",
    "Worth the hype and then some. Great coffee.",
    "Trust the videos on this one, it's legit.",
    "Rare case of a viral product being genuinely good.",
    "The hype checked out. Using it daily.",
    "Saw it three times on my feed and caved. Glad I did.",
    "Actually lives up to what people say about it.",
    "Viral purchase that I'd actually recommend to friends.",
    "Bought it because of the videos, keeping it because of the coffee.",
    "Not disappointed at all. The hype is earned.",
    "Great impulse buy. Genuinely useful and the coffee is good.",
    "The videos are accurate. Really nice product.",
    "Worth every bit of the hype it's getting.",
    "One of the few tiktok products I've kept past a month.",
]
tt_support = [
    "Mine arrived damaged and support sent a replacement in two days. Great service.",
    "Support answered fast and sorted out my shipping issue immediately.",
    "Customer service was genuinely helpful when my order was delayed.",
    "Had a question about descaling and they replied within an hour.",
    "Support replaced my faulty frother without any hassle.",
    "The team refunded my shipping when it was late. Nice touch.",
    "Quick and friendly support. They actually read my message.",
    "Support sorted my damaged unit out quickly. Would buy again because of that.",
    "Emailed about a cracked tank and had a replacement shipped same day.",
    "Really responsive support team. Made a bad delivery experience better.",
]

# 150 rows, keeping the channel's complaint profile: shipping dominates, then
# packaging, both above the 15% alert threshold.
tiktok = (
    [(t, random.choice([1, 2, 2, 3])) for t in tt_shipping[:39]] +
    [(t, random.choice([1, 1, 2, 2])) for t in tt_packaging[:26]] +
    [(t, random.choice([2, 2, 3])) for t in tt_battery[:15]] +
    [(t, random.choice([5, 5, 5, 4])) for t in tt_quality[:45]] +
    [(t, 5) for t in tt_viral[:18]] +
    [(t, 5) for t in tt_support[:7]]
)
assert len(tiktok) == 150, len(tiktok)
write(DATA / "sample_reviews_tiktok.csv", tiktok,
      datetime(2026, 4, 6, tzinfo=timezone.utc), 98)


# ══════════════════════════════════════════════ Shopify (DTC) — 30 rows
# Direct-store buyers: fewer, longer, more considered reviews. Packaging reads
# as part of the brand experience rather than just logistics; price sensitivity
# shows up because they paid full retail.

shopify = [
    # packaging as brand experience — the dominant complaint (7)
    ("Ordering direct from the brand I expected a nicer unboxing, but the box arrived crushed on one "
     "corner and the machine had a visible dent. For a premium DTC price this matters.", 2),
    ("The packaging didn't match the brand's aesthetic at all — thin cardboard, no insert, machine "
     "loose inside. Mine arrived scratched.", 2),
    ("Beautiful product, disappointing presentation. The outer box was torn and there was no "
     "protective padding whatsoever.", 3),
    ("I bought this as a gift and had to apologise for the state of the box. Please invest in the "
     "unboxing, it's part of what people pay for here.", 2),
    ("Machine is lovely but arrived with a dented base. The inner packaging offers no real "
     "protection for something this heavy.", 2),
    ("Second order and again the box was damaged in transit. The product survives but it undercuts "
     "the premium feel.", 2),
    ("Packaging is the weak link. Everything else about buying direct has been excellent.", 3),
    # value / price (4)
    ("It's a genuinely good machine but the direct price is steep compared to marketplace listings "
     "for similar portables.", 3),
    ("Quality justifies most of the price, though I'd expect a carry case included at this tier.", 4),
    ("Pricey for what it is, but the coffee quality and the support have made it feel worthwhile.", 4),
    ("I hesitated at the price and still think it's high, but I use it daily so the cost per shot "
     "has worked out fine.", 4),
    # coffee quality — the dominant strength (11)
    ("The espresso is outstanding. Thick crema, balanced extraction, and completely consistent shot "
     "after shot. It replaced a machine that cost three times as much.", 5),
    ("I've been pulling shots at home for years and this holds its own against proper equipment. "
     "The flavour is clean with no bitterness.", 5),
    ("Rich, full-bodied espresso every morning. Heats in under a minute and cleans up in seconds.", 5),
    ("The taste is remarkable for something this size. My partner switched from the cafe down the "
     "road to this.", 5),
    ("Consistently excellent coffee. After two months of daily use the quality hasn't drifted at all.", 5),
    ("Crema is thick and stable, extraction is even, and it handles a fine grind without complaint.", 5),
    ("Genuinely cafe-quality shots. I bought a second one for the office.", 5),
    ("The flavour profile is smooth and rounded. Best espresso I've made at home, easily.", 5),
    ("Excellent build and excellent coffee. It feels like a considered product rather than a gadget.", 5),
    ("Strong, aromatic shots with a proper crema layer. Exceeded what I expected.", 5),
    ("Two months in and every shot is as good as the first. Very impressed with the consistency.", 5),
    # design / aesthetics — DTC buyers care (5)
    ("The design is beautiful. It's the only appliance I don't hide in a cupboard.", 5),
    ("Genuinely well designed — the finish, the weight, the way the lid closes. Feels premium.", 5),
    ("It looks lovely on the counter and takes almost no space. Form and function both handled.", 5),
    ("The industrial design is a step above everything else in this category.", 4),
    ("Elegant, compact, and it photographs well which is why I found the brand in the first place.", 5),
    # support (3)
    ("Support answered a descaling question within the hour with a proper detailed reply. Rare these "
     "days and it made me trust the brand.", 5),
    ("My unit arrived damaged and they shipped a replacement before I'd even returned the first. "
     "Excellent service.", 5),
    ("The team followed up a week after delivery to check the machine was working well. Nice touch "
     "that you don't get from marketplaces.", 5),
]
assert len(shopify) == 30, len(shopify)
write(DATA / "sample_reviews_shopify.csv", shopify,
      datetime(2026, 5, 11, tzinfo=timezone.utc), 63)
