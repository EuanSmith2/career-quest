#!/usr/bin/env python3
"""Upsert share/questions.csv into the Notion Questions database, skipping QIDs already there.

Usage: NOTION_TOKEN=ntn_... python3 lovable-kit/notion-import.py
The Questions database must be shared with the integration (••• → Connections).
"""
import csv, json, os, sys, time, urllib.request

DB = "f2fdbc27481f487dbfb9d4486cfc177a"
DEMO = {"IT003", "NS003", "MA005", "AI001", "PT011", "MA006", "AI010", "SA014", "AI012", "AI017"}
TOKEN = os.environ.get("NOTION_TOKEN") or sys.exit("set NOTION_TOKEN")
HERE = os.path.dirname(os.path.abspath(__file__))


def call(method, path, body=None):
    req = urllib.request.Request(
        "https://api.notion.com/v1" + path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28",
                 "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(1 + attempt)
                continue
            sys.exit(f"{e.code} {e.read().decode()}")


def text(v):
    return {"rich_text": [{"text": {"content": v[:2000]}}]}


existing, cursor = set(), None
while True:
    body = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
    res = call("POST", f"/databases/{DB}/query", body)
    for p in res["results"]:
        rt = p["properties"]["QID"]["rich_text"]
        if rt:
            existing.add(rt[0]["plain_text"])
    if not res.get("has_more"):
        break
    cursor = res["next_cursor"]
print(f"{len(existing)} already in Notion")

rows = list(csv.DictReader(open(os.path.join(HERE, "..", "share", "questions.csv"))))
todo = [r for r in rows if r["id"] not in existing]
for i, r in enumerate(todo, 1):
    call("POST", "/pages", {"parent": {"database_id": DB}, "properties": {
        "Question": {"title": [{"text": {"content": r["question"][:2000]}}]},
        "QID": text(r["id"]), "Career Slug": text(r["career_slug"]),
        "Career": {"select": {"name": r["career"]}},
        "Difficulty": {"select": {"name": r["difficulty"]}}, "XP": {"number": int(r["xp"])},
        "Option A": text(r["option_a"]), "Option B": text(r["option_b"]),
        "Option C": text(r["option_c"]), "Option D": text(r["option_d"]),
        "Answer": {"select": {"name": r["answer_letter"]}},
        "Explanation": text(r["explanation"]), "Source": text(r["source"]),
        "Demo": {"checkbox": r["id"] in DEMO}}})
    time.sleep(0.34)  # Notion allows ~3 requests/s
    if i % 25 == 0:
        print(f"{i}/{len(todo)}")
print(f"done: added {len(todo)}, total {len(existing) + len(todo)}")
