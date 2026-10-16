---
hide:
  - toc
---

# Universities and gymnasiums

Explore higher-education institutions and Albanian upper-secondary schools (*gjimnaze*) mapped in OpenStreetMap.

<div id="education-statistics" class="education-statistics" aria-label="Education map statistics" aria-live="polite">
  <article><strong id="education-stat-total">—</strong><span>Mapped institutions</span></article>
  <article><strong id="education-stat-universities">—</strong><span>Universities</span></article>
  <article><strong id="education-stat-gymnasiums">—</strong><span>Gymnasiums</span></article>
  <article class="education-statistics__active"><strong id="education-stat-active">—</strong><span>Active or assumed active</span></article>
  <article><strong id="education-stat-websites">—</strong><span>With a website</span></article>
</div>

<div class="education-map-card">
  <div class="education-map-toolbar">
    <label>Search <input id="education-map-search" type="search" placeholder="Name, city or street…"></label>
    <label>Type <select id="education-map-category"><option value="">All institutions</option><option value="University">Universities</option><option value="Gymnasium">Gymnasiums</option></select></label>
    <label>Status <select id="education-map-status"><option value="">All statuses</option><option value="active">All active</option><option value="Reported participating">Directly reported</option><option value="Assumed active from city report">Assumed from city report</option></select></label>
    <label class="education-map-toggle"><input id="education-map-municipalities" type="checkbox"> Show municipality boundaries</label>
    <button id="education-map-clear" type="button">Clear</button>
  </div>
  <p id="education-map-count" class="education-map-count" role="status">Loading institutions…</p>
  <div id="education-map" role="region" aria-label="Map of universities and gymnasiums in Albania"></div>
  <div class="education-map-legend" aria-label="Map legend"><span class="education-map-legend__active">Directly reported</span><span class="education-map-legend__assumed">Assumed from city report</span><span class="education-map-legend__municipality">Municipality boundary</span><span class="education-map-legend__university">University</span><span class="education-map-legend__gymnasium">Gymnasium</span></div>
</div>

!!! note "About the data"
    This map is extracted from the Albania OpenStreetMap PBF. It includes named features tagged as universities and named schools containing “gjimnaz”. “Directly reported” means a source named students from that institution. “Assumed from city report” applies the working assumption that mapped institutions in the supplied active-city list are active, using an OSM address or proximity to the city centre. Neither status implies official institutional endorsement. Select a marker to inspect the basis for its status.

[Download the map data as CSV](../assets/albania_education.csv)
