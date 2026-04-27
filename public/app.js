const CATEGORIES = {
  eat:   { emoji: "🍜", color: "#ef4444", en: "Eat",   zh: "吃的" },
  walk:  { emoji: "🛍️", color: "#2563eb", en: "Walk",  zh: "逛的" },
  see:   { emoji: "🏞️", color: "#059669", en: "See",   zh: "看的" },
  other: { emoji: "📍", color: "#525252", en: "Other", zh: "其他" },
};

const STRINGS = {
  en: { close: "Close", fallback: "EN", loadError: "Failed to load recs.json — run" },
  zh: { close: "關閉",   fallback: "EN", loadError: "載入 recs.json 失敗,請執行" },
};

const state = {
  recs: [],
  markers: new Map(),
  activeCategories: new Set(Object.keys(CATEGORIES)),
  activeRec: null,
  lang: localStorage.getItem("lang") || "zh",
};

const map = L.map("map", { zoomControl: false }).setView([40.7128, -74.006], 11);
L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
}).addTo(map);

async function load() {
  const res = await fetch("recs.json", { cache: "no-cache" });
  state.recs = await res.json();
  applyLang();
  renderFilters();
  renderMarkers();
  fitToRecs();
}

function applyLang() {
  document.documentElement.lang = state.lang === "zh" ? "zh-Hant" : "en";
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.textContent = state.lang === "zh" ? "EN" : "中";
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem("lang", lang);
  applyLang();
  renderFilters();
  if (state.activeRec) openRec(state.activeRec);
}

function renderFilters() {
  const bar = document.getElementById("filters");
  bar.innerHTML = "";
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (state.activeCategories.has(key) ? " active" : "");
    chip.dataset.category = key;
    chip.innerHTML = `<span>${cat.emoji}</span><span>${cat[state.lang]}</span>`;
    chip.addEventListener("click", () => toggleCategory(key, chip));
    bar.appendChild(chip);
  }
}

function toggleCategory(key, chip) {
  if (state.activeCategories.has(key)) {
    state.activeCategories.delete(key);
    chip.classList.remove("active");
  } else {
    state.activeCategories.add(key);
    chip.classList.add("active");
  }
  for (const { rec, marker } of state.markers.values()) {
    const visible = state.activeCategories.has(rec.category);
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    else if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
  }
}

function makeIcon(cat) {
  const html = `<div class="rec-marker" style="background:${cat.color};color:#fff">${cat.emoji}</div>`;
  return L.divIcon({
    html,
    className: "rec-marker-wrap",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function renderMarkers() {
  for (const rec of state.recs) {
    const cat = CATEGORIES[rec.category] || CATEGORIES.other;
    const marker = L.marker([rec.lat, rec.lon], { icon: makeIcon(cat) }).addTo(map);
    marker.on("click", () => openRec(rec));
    state.markers.set(rec.slug, { rec, marker });
  }
}

function fitToRecs() {
  if (!state.recs.length) return;
  if (state.recs.length === 1) {
    map.setView([state.recs[0].lat, state.recs[0].lon], 13);
    return;
  }
  const bounds = L.latLngBounds(state.recs.map((r) => [r.lat, r.lon]));
  map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
}

function setActiveMarker(slug) {
  for (const { marker } of state.markers.values()) {
    marker.getElement()?.classList.remove("active");
  }
  state.markers.get(slug)?.marker.getElement()?.classList.add("active");
}

function pickLocalized(rec) {
  const lang = state.lang;
  const other = lang === "zh" ? "en" : "zh";
  const title = rec.title[lang] || rec.title[other];
  const html = rec.html[lang] || rec.html[other];
  const isFallback = !rec.title[lang] || !rec.html[lang];
  return { title, html, isFallback };
}

function openRec(rec) {
  state.activeRec = rec;
  setActiveMarker(rec.slug);

  const cat = CATEGORIES[rec.category] || CATEGORIES.other;
  const { title, html, isFallback } = pickLocalized(rec);
  const thumb = rec.thumbnail
    ? `<img src="${rec.thumbnail}" alt="" class="w-full h-56 object-cover rounded-xl mb-4" />`
    : "";
  const fallbackBadge = isFallback
    ? `<span class="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600 ml-2 align-middle">EN</span>`
    : "";
  const header = `
    <div class="not-prose mb-4">
      <div class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full" style="background:${cat.color}20;color:${cat.color}">
        <span>${cat.emoji}</span><span>${cat[state.lang]}</span>
      </div>
      <h1 class="text-2xl font-semibold mt-2 mb-0">${escapeHtml(title)}${fallbackBadge}</h1>
      ${rec.date ? `<div class="text-sm text-neutral-500 mt-1">${rec.date}</div>` : ""}
    </div>
    ${thumb}
  `;
  const mapsLabel = state.lang === "zh" ? "在 Google 地圖開啟" : "Open in Google Maps";
  const mapsFooter = rec.maps_url
    ? `<div class="not-prose mt-6 pt-4 border-t border-neutral-200">
        <a href="${rec.maps_url}" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 text-sm font-medium text-neutral-800 no-underline shadow-sm transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5" aria-hidden="true">
            <path fill="#1A73E8" d="M19.6 4.6c1.4-.4 2.9-.6 4.4-.6 5.5 0 10.4 2.8 13.3 7L26.7 23.3 19.6 4.6Z"/>
            <path fill="#EA4335" d="M10.7 10.6C13.4 7.8 16.3 5.6 19.6 4.6l7.1 18.7-7.4 8.8L10.7 10.6Z"/>
            <path fill="#4285F4" d="M24 28a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 16c1.1 0 7.9-9.6 13.3-19l-13.3-1.7L24 44Z"/>
            <path fill="#FBBC04" d="M19.3 32.1 26.7 23.3 10.7 10.6C8.4 13 7 16.1 7 19.5c0 4.7 4.5 9.3 12.3 12.6Z"/>
            <path fill="#34A853" d="M37.3 11c2.4 3 3.7 6.6 3.7 10.5 0 8.8-9.6 17-17 22.5L37.3 11Z"/>
          </svg>
          <span>${mapsLabel}</span>
        </a>
      </div>`
    : "";
  const body = header + html + mapsFooter;

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  if (isDesktop) {
    document.getElementById("sidebar-content").innerHTML = body;
    document.getElementById("sidebar").classList.remove("translate-x-full");
  } else {
    document.getElementById("sheet-content").innerHTML = body;
    document.getElementById("sheet").classList.remove("translate-y-full");
  }

  map.flyTo([rec.lat, rec.lon], Math.max(map.getZoom(), 13), { duration: 0.8 });
}

function closeRec() {
  document.getElementById("sidebar").classList.add("translate-x-full");
  document.getElementById("sheet").classList.add("translate-y-full");
  for (const { marker } of state.markers.values()) {
    marker.getElement()?.classList.remove("active");
  }
  state.activeRec = null;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.getElementById("sidebar-close").addEventListener("click", closeRec);
document.getElementById("sheet-close").addEventListener("click", closeRec);
document.getElementById("lang-toggle").addEventListener("click", () => {
  setLang(state.lang === "zh" ? "en" : "zh");
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRec(); });

load().catch((err) => {
  console.error(err);
  const s = STRINGS[state.lang];
  document.getElementById("filters").innerHTML =
    `<span class="text-sm text-red-600 px-3 py-1">${s.loadError} <code>uv run python build.py</code></span>`;
});
