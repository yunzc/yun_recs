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

REQUIRED = {"title", "category", "lat", "lon"}
md = markdown.Markdown(extensions=["extra", "sane_lists"])


def build():
    recs = []
    files = sorted(CONTENT_DIR.glob("*.md"))
    for path in files:
        post = frontmatter.load(path)
        missing = REQUIRED - post.metadata.keys()
        if missing:
            print(f"skip {path.name}: missing {missing}", file=sys.stderr)
            continue

        md.reset()
        recs.append({
            "slug": path.stem,
            "title": post["title"],
            "category": post["category"],
            "lat": float(post["lat"]),
            "lon": float(post["lon"]),
            "thumbnail": post.get("thumbnail"),
            "date": str(post["date"]) if post.get("date") else None,
            "html": md.convert(post.content),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(recs, ensure_ascii=False, indent=2))
    print(f"wrote {len(recs)} recs to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
