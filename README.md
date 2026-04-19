# Yun's Recs

A personal map of recommendations. Write Markdown files, get an interactive map.

## Stack
- Content: Markdown files in `/content` with YAML frontmatter
- Build: Python script (`build.py`) → `public/recs.json`
- Frontend: Static site in `/public` (Leaflet + CartoDB Voyager tiles + Tailwind)
- Hosting: Cloudflare Pages

## Local setup

Uses [uv](https://docs.astral.sh/uv/) for Python dependency management.

```bash
uv sync
uv run python build.py
cd public && python3 -m http.server 8000
```

Then open <http://localhost:8000>. No API keys needed.

## Adding a rec

1. Drop a photo in `public/images/`.
2. Create `content/<slug>.md`:

   ```markdown
   ---
   title: Place name
   category: food  # food | coffee | drinks | scenery | activity | other
   lat: 40.7128
   lon: -74.0060
   date: 2026-04-18
   thumbnail: images/my-photo.jpg
   ---

   # Heading

   Your notes here. Full Markdown supported.
   ```

3. Run `uv run python build.py` and commit. Cloudflare rebuilds on push.

## Cloudflare Pages deploy

Connect the repo to Cloudflare Pages with these build settings:

- **Build command:** `curl -LsSf https://astral.sh/uv/install.sh | sh && $HOME/.local/bin/uv sync && $HOME/.local/bin/uv run python build.py`
- **Build output directory:** `public`
- **Environment variables:** `PYTHON_VERSION=3.12`
