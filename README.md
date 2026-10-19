# Outreach — action-first civic rights guide

MkDocs Material website for nonpartisan human-rights outreach related to Albania.

**Main tabs:** Home · Countries · Letters · Background.

The public-facing entry points prioritize practical outreach. Context, incident analysis, evidence and bibliography are grouped under Background.

## Edit the CSVs

All CSVs are at `docs/assets/`:
- `sources.csv` — publications and original URLs
- `incidents.csv` — reported incidents and affected groups
- `incident_evidence.csv` — evidence items linked by source and incident ID

The site provides examples and direct links in Sources → CSV files and examples.
Downloadable fictional templates are in `docs/assets/examples/`.

## Media coverage data pipeline

The public Excel workbook is the source of truth. `scripts/update-media-coverage.py`
downloads it, validates its sheets, and writes the CSV files the site loads.
`Media Coverage` is required and uses the simplified eight-column layout:
`Country`, `Media Outlet`, `Website`, `Instagram`, `Article URLs`, `Tags`,
`Email`, and `Date`. The `Sources`, `Incidents`, and `Evidence` (or
`Incident Evidence`) sheets populate the downloadable examples under
`docs/assets/examples/`; they never overwrite the live evidence datasets.
Optional `Protest Timeline` (or `Timeline`) sheets are also imported. First rows
must contain the exact CSV column names used by their destination files.

`Institutions & Actors` uses the combined fourteen-column layout: `Country`,
`City`, `EU Member`, `Organization`, `Category`, `Office in Albania`, `Issues`,
`Website`, `Email`, `Response Date`, `Response Type`, `Response Link`, and
`Contact Route`, followed by `Contribution`.
Embassy records belong in this sheet and appear alongside the other
organizations on the Institutions and actors page. Multiple response values
may be separated with semicolons; corresponding dates, types, and links should
use the same order.

`Political Parties` uses: `Country`, `Party`, `Website`, `Priority`, `Issues`,
`Status`, `Response Link`, and `Instagram Evidence`.

Run it manually with:

```bash
python scripts/update-media-coverage.py
```

The `Update outreach data` GitHub Actions workflow runs every six hours
and commits the generated CSV when it changes. It can also be run manually from
the Actions tab.

## Run

```bash
pip install -r requirements.txt
mkdocs serve
mkdocs build
```

The ADCN evidence brief is attributed to its original author. External images remain subject to publishers' permissions.
