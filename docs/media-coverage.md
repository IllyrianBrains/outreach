---
hide:
  - navigation
---

# International media coverage priorities

This list shows where outreach can have the most impact. It is recalculated from the media coverage CSV whenever the page loads, so new checks and outreach updates automatically change the order.

<div class="coverage-chart-card coverage-chart-card--map">
  <h2>Coverage map</h2>
  <div id="coverage-map" aria-label="Map of international media coverage by country"></div>
  <div class="coverage-map-legend" id="coverage-map-legend"></div>
  <p class="coverage-map-note">A dashed outline marks a low rating that has not yet been verified.</p>
</div>

## Priority list

Coverage is calculated across every listed outlet: `Covered` counts as shared, `Mentioned` or `Unclear` counts as half shared, and both `Not found` and `Not checked` count as not shared. Under 20% is Low, 20–49% is Medium, and 50% or more is High. Countries with exactly 3 or 4 confirmed covered outlets get their own orange tier unless they already qualify as High. Lower coverage, more unresolved outlets, and less completed outreach produce a higher priority.

<div class="coverage-priority-summary" id="coverage-priority-summary" role="status">Calculating priorities…</div>
<ol class="coverage-priority-list" id="coverage-priority-list" aria-live="polite">
  <li class="coverage-priority-loading">Loading media coverage…</li>
</ol>

<details class="coverage-priority-method">
  <summary>How the priority order is calculated</summary>
  <p>Countries with the lowest shared percentage come first. Ties are ordered by the number of outlets still needing outreach, then completed outreach, then country name. Unchecked outlets and confirmed misses both count as not shared.</p>
</details>

## Download the data

[Media coverage CSV](assets/media_coverage.csv) — one row per outlet checked. Outlet names in the priority list link directly to their websites so contributors can investigate or contact them. See [the online workbook and editing instructions](data-guide.md) for the column format.

This is a snapshot, not a continuous monitor. Re-check it periodically and update the CSV rather than treating any single pass as final. If you confirm new coverage, add the row with a real article URL — do not mark an outlet `Covered` without one.
