#!/usr/bin/env python3
"""Build recs.json from /content/*.md files."""
import json
import sys
from pathlib import Path

import frontmatter
import markdown

ROOT = Path(__file__).parent
CONTENT_DIR = ROOT / "content"
OUTPUT = ROOT / "public" / "recs.json"

REQUIRED = {"category", "lat", "lon"}
md = markdown.Markdown(extensions=["extra", "sane_lists"])


def render(text):
    if not text:
        return ""
    md.reset()
    return md.convert(text)


def build():
    recs = []
    files = sorted(CONTENT_DIR.glob("*.md"))
    for path in files:
        post = frontmatter.load(path)
        missing = REQUIRED - post.metadata.keys()
        if missing:
            print(f"skip {path.name}: missing {missing}", file=sys.stderr)
            continue

        title_en = post.get("title_en") or post.get("title")
        title_zh = post.get("title_zh")
        if not title_en and not title_zh:
            print(f"skip {path.name}: missing title_en/title_zh", file=sys.stderr)
            continue

        body_en = post.content.strip()
        body_zh = (post.get("content_zh") or "").strip()

        recs.append({
            "slug": path.stem,
            "category": post["category"],
            "lat": float(post["lat"]),
            "lon": float(post["lon"]),
            "thumbnail": post.get("thumbnail"),
            "date": str(post["date"]) if post.get("date") else None,
            "maps_url": post.get("maps_url"),
            "title": {"en": title_en, "zh": title_zh},
            "html": {"en": render(body_en), "zh": render(body_zh)},
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(recs, ensure_ascii=False, indent=2))
    print(f"wrote {len(recs)} recs to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
