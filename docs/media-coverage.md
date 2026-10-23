---
hide:
  - toc
---

# Media coverage

See where the protests are being reported and which outlets still need checking. Select a country on the map to see which outlets have posts and which do not.

<div class="coverage-chart-card coverage-chart-card--map">
  <div class="status-map-stats" id="coverage-map-stats" aria-label="Media coverage statistics" aria-live="polite">
    <article><strong id="coverage-stat-countries">—</strong><span>countries tracked</span></article>
    <article><strong id="coverage-stat-outlets">—</strong><span>media outlets</span></article>
    <article class="status-map-stat--positive"><strong id="coverage-stat-published">—</strong><span>outlets with coverage</span></article>
    <article class="status-map-stat--attention"><strong id="coverage-stat-uncovered">—</strong><span>outlets to check</span></article>
  </div>
  <div id="coverage-map" aria-label="Map of international media coverage by country"></div>
  <div class="coverage-map-legend" id="coverage-map-legend"></div>
</div>

## Countries

<div class="coverage-priority-summary" id="coverage-priority-summary" role="status">Calculating priorities…</div>
<div class="coverage-sort-control">
  <label for="coverage-country-sort">Sort countries by</label>
  <select id="coverage-country-sort">
    <option value="coverage-low">Lowest coverage first</option>
    <option value="coverage-high">Highest coverage first</option>
    <option value="missing-high">Most outlets without posts</option>
    <option value="alphabetical">Country name A–Z</option>
  </select>
  <label for="coverage-tag-filter">Show topic</label>
  <select id="coverage-tag-filter">
    <option value="">All topics</option>
  </select>
</div>
<ol class="coverage-priority-list" id="coverage-priority-list" aria-live="polite">
  <li class="coverage-priority-loading">Loading media coverage…</li>
</ol>

## Download the data

[Download the CSV](assets/data/media_coverage.csv). This is a snapshot, so coverage may change between checks.
