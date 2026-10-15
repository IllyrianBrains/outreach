# Illyrian Brains — action-first civic rights guide

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

## Run

```bash
pip install -r requirements.txt
mkdocs serve
mkdocs build --strict
```

The ADCN evidence brief is attributed to its original author. External images remain subject to publishers' permissions.
