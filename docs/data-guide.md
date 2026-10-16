# Edit the CSV files

**All CSVs are in `docs/assets/`, but the linked online Excel workbook is their source of truth.** Keep each worksheet's first-row column names unchanged. A single scheduled download regenerates every corresponding CSV.

| File | Download | What to add |
|---|---|---|
| Sources | [sources.csv](assets/sources.csv) | A new news report, Instagram post or statement |
| Incidents | [incidents.csv](assets/incidents.csv) | A new event or reported rights concern |
| Evidence | [incident_evidence.csv](assets/incident_evidence.csv) | A photo, video or statement supporting an incident |
| Issues gallery photos | [issue_media.csv](assets/issue_media.csv) | A locally hosted photo for an `issue_id` from `issues_gallery.csv` |
| Media coverage | [Excel source](https://docs.google.com/spreadsheets/d/19qp5A7qB5DwoKEF6WlYKy_GSWNOxTgMX/edit?usp=sharing) · [generated CSV](assets/media_coverage.csv) | A check of whether a country's own outlet covered the protests |

Each record uses a unique ID. `source_id` in evidence must match `sources.csv`, and `incident_id` must match `incidents.csv`. One incident can have many evidence entries.

## Download example files

These small, fictional datasets are safe to use as templates. Their matching `SRC-EXAMPLE-*` and `INC-EXAMPLE-*` IDs demonstrate how the three files connect. Replace every example value before publishing.

| Example | Download |
|---|---|
| Sources | [sources-example.csv](assets/examples/sources-example.csv) |
| Incidents | [incidents-example.csv](assets/examples/incidents-example.csv) |
| Evidence | [incident-evidence-example.csv](assets/examples/incident-evidence-example.csv) |

## Examples already included

The following are real example rows from the included files, not invented incidents. Blank fields are permitted.

### `sources.csv`

```csv
source_id,published_date,event_date,publisher,title,url,category,format,topic,verification,origin,notes
SRC-001,2026-10-13,13 Oct,Reuters,"Student protests: education demands, clashes and police response",https://www.reuters.com/world/albanian-students-protest-over-education-jobs-clash-with-police-2026-10-13/,International media,Reporting,Police and protesters,Publisher page identified; individual claims require corroboration,Previous outreach registry,Existing entry; verify link and publication metadata before external distribution
```

### `incidents.csv`

```csv
incident_id,event_date,location,affected_group,alleged_actor,incident_type,summary,evidence_status,source_ids,adcn_reference,reported_count,limitations
INC-001,2026-10-13,"Tirana, Ministry of Education area",Protesters; bystanders,Police,Chemical irritants / water cannon,Reuters and Citizens.al report use of tear gas and water cannon; exact effects and individual exposures require verification.,Reported,SRC-001;SRC-102;SRC-109,"ADCN p.1, p.3",Unknown,No individual perpetrator attribution
```

### `incident_evidence.csv`

```csv
evidence_id,incident_id,source_id,event_date,media_type,evidence_title,description,publisher_url,image_url,adcn_reference,observation,verification_status,rights_and_safety_notes
EVD-001,INC-001,SRC-102,2026-10-13,article/photo,Tear gas and police intervention,"Citizens.al coverage describes tear gas, batons and spray, and contains protest imagery",https://citizens.al/2026/10/13/studentet-rizgjojne-protesten-policia-pergjigjet-me-dhune/,,,reported,Published source; original media not independently authenticated,Publisher retains rights; link rather than copy
```

### Media coverage workbook

Edit the [online Excel workbook](https://docs.google.com/spreadsheets/d/19qp5A7qB5DwoKEF6WlYKy_GSWNOxTgMX/edit?usp=sharing), not the generated CSVs. `Media Coverage` is required. Its `Media Outlet URL` and `Instagram URL` fields make each outlet clickable for contributors. The Institutions, Embassies, Political Parties, and Issues Gallery sheets publish their matching site directories. A sixth guide sheet is optional and is not required by the importer.

Leave `Coverage Status` empty when an outlet has not been checked; the importer records it as `Not checked`. Otherwise, use exactly one of `Covered`, `Mentioned`, `Unclear` or `Not found`. Leave `Coverage Date` and `Article URL` blank for `Not found`; never invent a URL. The media sheet does not require a `Language` column. Re-checking the same article updates its existing row; a distinct article from the same outlet may have its own row. The workbook is validated and converted every six hours.

### `issue_media.csv`

```csv
issue_id,image_url,image_credit
ENV-01,assets/images/issues/env-protest-train.jpg,Citizens.al
```

`issues_gallery.csv` is generated from the workbook's Issues Gallery sheet, so its `media_url` column is overwritten on every sync. `issue_media.csv` is edited by hand and is never touched by the importer: the gallery looks up each card's `issue_id` here first and only falls back to `issues_gallery.csv`'s own `media_url` when there is no match. To add a photo, save it under `assets/images/issues/` and add a row here with the matching `issue_id` and a credit for the publisher.

## Add a new entry

1. Add the publication to `sources.csv` and assign the next unique source ID.
2. Add an incident to `incidents.csv` only if it is a distinct event or allegation, not simply another article.
3. Add each photograph, video, or other supporting item to `incident_evidence.csv` with its incident and source IDs.
4. Link to original images unless you have permission to host a copy. Do not identify protected witnesses or minors.
5. Rebuild the site with `mkdocs serve` and check the gallery.

For historical protest photographs that do not document a rights incident, the `incident_id` may be left blank.
