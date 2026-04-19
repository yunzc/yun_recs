const CATEGORIES = {
  food:     { emoji: "🍜", color: "#ef4444", label: "Food" },
  coffee:   { emoji: "☕", color: "#a16207", label: "Coffee" },
  drinks:   { emoji: "🍸", color: "#7c3aed", label: "Drinks" },
  scenery:  { emoji: "🏞️", color: "#059669", label: "Scenery" },
  activity: { emoji: "🎯", color: "#2563eb", label: "Activity" },
  other:    { emoji: "📍", color: "#525252", label: "Other" },
};

const state = {
  recs: [],
  markers: new Map(),
  activeCategories: new Set(Object.keys(CATEGORIES)),
  activeRec: null,
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
  renderFilters();
  renderMarkers();
  fitToRecs();
}

function renderFilters() {
  const bar = document.getElementById("filters");
  bar.innerHTML = "";
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const chip = document.createElement("button");
    chip.className = "filter-chip active";
    chip.dataset.category = key;
    chip.innerHTML = `<span>${cat.emoji}</span><span>${cat.label}</span>`;
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
  const entry = state.markers.get(slug);
  entry?.marker.getElement()?.classList.add("active");
}

function openRec(rec) {
  state.activeRec = rec;
  setActiveMarker(rec.slug);

  const cat = CATEGORIES[rec.category] || CATEGORIES.other;
  const thumb = rec.thumbnail
    ? `<img src="${rec.thumbnail}" alt="" class="w-full h-56 object-cover rounded-xl mb-4" />`
    : "";
  const header = `
    <div class="not-prose mb-4">
      <div class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full" style="background:${cat.color}20;color:${cat.color}">
        <span>${cat.emoji}</span><span>${cat.label}</span>
      </div>
      <h1 class="text-2xl font-semibold mt-2 mb-0">${escapeHtml(rec.title)}</h1>
      ${rec.date ? `<div class="text-sm text-neutral-500 mt-1">${rec.date}</div>` : ""}
    </div>
    ${thumb}
  `;
  const body = header + rec.html;

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
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRec(); });

load().catch((err) => {
  console.error(err);
  document.getElementById("filters").innerHTML =
    '<span class="text-sm text-red-600 px-3 py-1">Failed to load recs.json — run <code>uv run python build.py</code></span>';
});
