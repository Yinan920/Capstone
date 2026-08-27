"""Measure the DEPLOYED SellerSense service on a 50-review upload.

Non-mutating: registers a throwaway account (same trick the E2E suite uses),
uploads, polls, then deletes its own dataset. No service config is changed.

Stage boundaries come from the `progress` field that the pipeline itself
commits after each step (5/30/50/65/80/90/95), sampled by fast polling.
"""
import csv
import io
import pathlib
import sys
import time

import httpx

BASE = "https://sellersense-414647520736.us-central1.run.app"
CSV = pathlib.Path(sys.argv[1])
PROGRESS_STAGE = {
    5: "job accepted -> running",
    30: "1. Sentiment          (LLM Haiku, chunked)",
    50: "2. Embeddings         (local)",
    65: "3. KMeans clustering  (local)",
    80: "4. Cluster labels     (LLM Sonnet, concurrent)",
    85: "4b. Dataset takeaway  (LLM Haiku, single call)",
    90: "5. Keyword n-grams    (local)",
    95: "6. Alert rules        (local)",
    100: "done (final commit)",
}

rows = sum(1 for _ in csv.DictReader(open(CSV)))
print(f"target : {BASE}")
print(f"payload: {CSV.name} ({rows} reviews)\n")

with httpx.Client(timeout=120.0) as c:
    # --- 1. cold start: the very first request of this session -------------
    t = time.perf_counter()
    r = c.get(f"{BASE}/api/health")
    cold = time.perf_counter() - t
    print(f"[cold-start probe] GET /api/health -> {r.status_code} in {cold:.2f}s   {r.json()}")
    warm = []
    for _ in range(3):
        t = time.perf_counter()
        c.get(f"{BASE}/api/health")
        warm.append(time.perf_counter() - t)
    print(f"[warm baseline  ] same call, 3x: {', '.join(f'{w:.2f}s' for w in warm)}")
    print(f"[cold-start cost] ~{cold - min(warm):.2f}s attributable to container start\n")

    # --- 2. register a throwaway free-tier account -------------------------
    email = f"bench-{int(time.time())}@test.co"
    r = c.post(f"{BASE}/api/auth/register",
               json={"email": email, "name": "Bench", "password": "S3cure!pass"})
    r.raise_for_status()
    tok = r.json()["token"]
    c.headers["Authorization"] = f"Bearer {tok}"
    print(f"registered {email} (free tier, cap 50)")

    # --- 3. upload; the pipeline runs as a BackgroundTask after the 201 ----
    t_upload = time.perf_counter()
    r = c.post(
        f"{BASE}/api/datasets/upload",
        files={"file": (CSV.name, CSV.read_bytes(), "text/csv")},
        data={"name": "bench-50", "productName": "NovaBrew Espresso", "source": "amazon"},
    )
    upload_secs = time.perf_counter() - t_upload
    r.raise_for_status()
    body = r.json()
    job_id, ds_id = body["job"]["id"], body["dataset"]["id"]
    print(f"POST /api/datasets/upload -> 201 in {upload_secs:.2f}s  (parse + insert, no LLM)")
    print(f"job {job_id}\n")

    # --- 4. poll progress; record when each checkpoint first appears -------
    seen, t0 = {}, time.perf_counter()
    last = None
    while True:
        j = c.get(f"{BASE}/api/jobs/{job_id}").json()
        p, st = j["progress"], j["status"]
        if p not in seen:
            seen[p] = time.perf_counter() - t0
        if st in ("done", "failed"):
            seen.setdefault(100, time.perf_counter() - t0)
            last = j
            break
        if time.perf_counter() - t0 > 300:
            last = j
            print("TIMED OUT after 300s")
            break
        time.sleep(0.1)
    total = time.perf_counter() - t0

    print(f"job status: {last['status']}" + (f"  error={last.get('error')}" if last.get("error") else ""))
    print("\n--- stage breakdown (progress checkpoints, client-observed) ---")
    prev = 0.0
    for p in sorted(seen):
        print(f"  {PROGRESS_STAGE.get(p, p):46s} at {seen[p]:6.2f}s   (+{seen[p] - prev:5.2f}s)")
        prev = seen[p]
    print(f"\nANALYSIS wall time (201 -> done): {total:.2f}s")
    print(f"END-TO-END (upload request + analysis): {upload_secs + total:.2f}s")

    # --- 5. verify + clean up ----------------------------------------------
    d = c.get(f"{BASE}/api/datasets/{ds_id}/dashboard").json()
    print(f"\ndashboard: {len(d.get('themes', []))} themes, "
          f"{len(d.get('keywords', []))} keywords, reviewCount={d.get('reviewCount')}")
    print("themes:", [t["label"] for t in d.get("themes", [])])
    if "keep" in sys.argv:
        print(f"\nKEEPING dataset {ds_id} / job {job_id} for DB inspection.")
    else:
        r = c.delete(f"{BASE}/api/datasets/{ds_id}")
        print(f"cleanup: DELETE dataset -> {r.status_code}")
