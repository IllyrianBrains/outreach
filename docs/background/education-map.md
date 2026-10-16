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
</div>

<div class="education-map-card">
  <div id="education-map" role="region" aria-label="Map of universities and gymnasiums in Albania"></div>
  <div class="education-map-toolbar">
    <label>Search <input id="education-map-search" type="search" placeholder="Name, city or street…"></label>
    <label>Type <select id="education-map-category"><option value="">All institutions</option><option value="University">Universities</option><option value="Gymnasium">Gymnasiums</option></select></label>
    <label>Status <select id="education-map-status"><option value="">All statuses</option><option value="active">All active</option><option value="Reported participating">Directly reported</option><option value="Assumed active from city report">Assumed from city report</option></select></label>
    <label class="education-map-toggle"><input id="education-map-municipalities" type="checkbox" checked> Show municipality boundaries</label>
    <label class="education-map-toggle"><input id="education-map-radius" type="checkbox" checked> Show area affected</label>
    <button id="education-map-clear" type="button">Clear</button>
  </div>
  <p id="education-map-count" class="education-map-count" role="status">Loading institutions…</p>
</div>

!!! note "About the data"
    This map is extracted from the Albania OpenStreetMap PBF. It includes named features tagged as universities and named schools containing “gjimnaz”. “Directly reported” means a source named students from that institution. “Assumed from city report” applies the working assumption that mapped institutions in the supplied active-city list are active, using an OSM address or proximity to the city centre. Neither status implies official institutional endorsement. Select a marker to inspect the basis for its status. The circles drawn around each institution (6 km for universities, 3 km for gymnasiums) are a visualization aid showing where catchments overlap, not a measured or reported area of effect.

[Download the map data as CSV](../assets/albania_education.csv)

## Estimated students affected

<div class="education-estimate-card">
<table id="education-estimate-table" class="education-estimate-table">
  <thead>
    <tr><th scope="col"></th><th scope="col">Gymnasiums</th><th scope="col">Universities</th><th scope="col">Total</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Mapped active institutions</th><td id="education-estimate-gym-count">—</td><td id="education-estimate-uni-count">—</td><td id="education-estimate-total-count">—</td></tr>
    <tr><th scope="row">Additional unmapped institutions (assumed)</th><td id="education-estimate-gym-unknown">—</td><td id="education-estimate-uni-unknown">—</td><td id="education-estimate-total-unknown">—</td></tr>
    <tr class="education-estimate-table__subtotal"><th scope="row">Total assumed active institutions</th><td id="education-estimate-gym-active-total">—</td><td id="education-estimate-uni-active-total">—</td><td id="education-estimate-total-active-total">—</td></tr>
    <tr><th scope="row">Estimated enrolled students</th><td id="education-estimate-gym-students">—</td><td id="education-estimate-uni-students">—</td><td id="education-estimate-total-students">—</td></tr>
    <tr class="education-estimate-table__highlight"><th scope="row">Estimated students protesting (75%)</th><td id="education-estimate-gym-protesting">—</td><td id="education-estimate-uni-protesting">—</td><td id="education-estimate-total-protesting">—</td></tr>
  </tbody>
</table>
<p class="education-estimate-note">Assumptions: 300 students per gymnasium, 1,000 per university; 20 additional gymnasiums and 5 additional universities assumed active but not individually mapped in OpenStreetMap; 75% of students at active or assumed-active institutions taking part. These are planning assumptions for scale, not reported counts.</p>
</div>
