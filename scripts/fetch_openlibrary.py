"""
Fetch book metadata from OpenLibrary and write it into data/items_sample.csv.
Requires network access. Keeps the first 40 rows of the current CSV (the seed
real titles) and fills up to 300 rows with fetched data, de-duplicated by
(title, author).
"""

import json
import random
import time
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd


SUBJECTS = [
    "computer science",
    "software engineering",
    "software architecture",
    "machine learning",
    "deep learning",
    "data science",
    "data mining",
    "cloud computing",
    "big data",
    "databases",
    "algorithms",
    "statistics",
    "networking",
    "computer networks",
    "information retrieval",
    "data visualization",
    "cybersecurity",
    "information security",
    "distributed systems",
    "devops",
    "operating systems",
    "artificial intelligence",
    "python programming",
    "java programming",
    "data analytics",
]

TARGET_ROWS = 3000
PAGES_PER_SUBJECT = 15
PAGE_SIZE = 100


def fetch_subject(subject: str, pages: int = PAGES_PER_SUBJECT, page_size: int = PAGE_SIZE):
    """Yield book dicts for a subject from OpenLibrary search API."""
    for page in range(1, pages + 1):
        qs = urllib.parse.urlencode(
            {
                "subject": subject,
                "language": "eng",
                "limit": page_size,
                "page": page,
            }
        )
        url = f"https://openlibrary.org/search.json?{qs}"
        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                data = json.load(resp)
        except Exception as exc:  # noqa: BLE001 - network errors are expected
            print(f"[warn] fetch {subject} page {page} failed: {exc}")
            continue

        for doc in data.get("docs", []):
            title = (doc.get("title") or "").strip()
            if not title:
                continue
            authors = doc.get("author_name") or []
            author = "; ".join(authors[:3]).strip() or "Unknown"
            subjects_list = doc.get("subject") or []
            subject_val = subjects_list[0] if subjects_list else subject.title()
            year = doc.get("first_publish_year") or (doc.get("publish_year") or [None])[0]
            tags = subjects_list[:5] if subjects_list else [subject]
            abstract = (doc.get("subtitle") or "").strip()
            if not abstract:
                abstract = f"Topics: {', '.join(tags[:4])}" if tags else f"{title} related to {subject}"
            availability = "available" if random.random() > 0.25 else "unavailable"
            yield {
                "title": title,
                "author": author,
                "subject": subject_val,
                "year": year,
                "abstract": abstract,
                "tags": ", ".join(tags) if tags else subject,
                "availability": availability,
            }
        time.sleep(0.15)


def main():
    path = Path("data/items_sample.csv")
    if not path.exists():
        raise SystemExit("data/items_sample.csv not found")
    base_df = pd.read_csv(path)
    seed = base_df.iloc[:40].copy()  # keep the original 40 real titles

    rows = []
    seen = {(r["title"].strip().lower(), r["author"].strip().lower()) for _, r in seed.iterrows()}

    for subj in SUBJECTS:
        for rec in fetch_subject(subj, pages=PAGES_PER_SUBJECT, page_size=PAGE_SIZE):
            key = (rec["title"].lower(), rec["author"].lower())
            if key in seen:
                continue
            seen.add(key)
            rows.append(rec)
            if len(seed) + len(rows) >= TARGET_ROWS + 200:  # small buffer before trim
                break
        if len(seed) + len(rows) >= TARGET_ROWS + 200:
            break

    fetched = pd.DataFrame(rows)
    combined = pd.concat([seed, fetched], ignore_index=True)

    for col in ["title", "author", "subject", "abstract", "tags", "availability"]:
        combined[col] = combined[col].fillna("").astype(str).str.strip()
    combined["year"] = combined["year"].fillna("").astype(str).str.extract("(\\d{4})")[0]
    combined["year"] = combined["year"].replace("", pd.NA)

    combined = combined.drop_duplicates(subset=["title", "author"], keep="first").reset_index(drop=True)
    combined = combined.head(TARGET_ROWS)
    combined.to_csv(path, index=False)
    print(
        f"seed rows: {len(seed)}, fetched rows: {len(fetched)}, final rows: {len(combined)}, "
        f"unique(title,author): {len(combined[['title','author']].drop_duplicates())}"
    )


if __name__ == "__main__":
    main()
