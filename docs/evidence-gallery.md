---
hide:
  - navigation
---

# Evidence gallery

Browse source-attributed photos, videos, and reports. Inclusion does not establish misconduct; each card states how the item was observed or reported.

!!! warning "About video submissions"
    Anonymous video clips have not been individually reviewed, dated, or matched to incidents. Filter by **video** and treat each clip as unverified until checked.

<div class="evidence-gallery">
  <div class="evidence-toolbar" role="search" aria-label="Filter evidence">
    <input id="evidence-search" type="search" placeholder="Search evidence…" aria-label="Search evidence">
    <select id="evidence-filter" aria-label="Media type"><option value="">All media types</option></select>
    <select id="evidence-sort" aria-label="Sort order">
      <option value="date-desc">Newest first</option>
      <option value="date-asc">Oldest first</option>
    </select>
    <button id="evidence-clear" type="button">Clear</button>
  </div>
  <p id="evidence-count" role="status" aria-live="polite"></p>
  <div id="evidence-results" class="evidence-grid">Loading evidence…</div>
</div>

## Data and methodology

[Sources CSV](assets/sources.csv) · [Incidents CSV](assets/incidents.csv) · [Evidence CSV](assets/incident_evidence.csv) · [Editing guide](data-guide.md)

*Protect the identity of minors and witnesses.*
