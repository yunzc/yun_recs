// Replace with your Mapbox public token. Restrict it by URL in the Mapbox dashboard.
mapboxgl.accessToken = "REPLACE_WITH_MAPBOX_TOKEN";

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

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-74.006, 40.7128],
  zoom: 11,
});
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

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
    marker.getElement().style.display = visible ? "" : "none";
  }
}

function renderMarkers() {
  for (const rec of state.recs) {
    const cat = CATEGORIES[rec.category] || CATEGORIES.other;
    const el = document.createElement("div");
    el.className = "rec-marker";
    el.style.background = cat.color;
    el.style.color = "#fff";
    el.textContent = cat.emoji;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openRec(rec);
    });

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([rec.lon, rec.lat])
      .addTo(map);

    state.markers.set(rec.slug, { rec, marker });
  }
}

function fitToRecs() {
  if (!state.recs.length) return;
  if (state.recs.length === 1) {
    map.flyTo({ center: [state.recs[0].lon, state.recs[0].lat], zoom: 13 });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const r of state.recs) bounds.extend([r.lon, r.lat]);
  map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
}

function openRec(rec) {
  state.activeRec = rec;
  for (const { marker } of state.markers.values()) {
    marker.getElement().classList.remove("active");
  }
  state.markers.get(rec.slug)?.marker.getElement().classList.add("active");

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

  map.flyTo({ center: [rec.lon, rec.lat], zoom: Math.max(map.getZoom(), 13), speed: 0.8 });
}

function closeRec() {
  document.getElementById("sidebar").classList.add("translate-x-full");
  document.getElementById("sheet").classList.add("translate-y-full");
  for (const { marker } of state.markers.values()) {
    marker.getElement().classList.remove("active");
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
    '<span class="text-sm text-red-600 px-3 py-1">Failed to load recs.json — run <code>python build.py</code></span>';
});
