# Edit the CSV files

**All three CSVs are in `docs/assets/`.** Download them here and edit in Excel, LibreOffice or a text editor. Keep the column names unchanged.

| File | Download | What to add |
|---|---|---|
| Sources | [sources.csv](assets/sources.csv) | A new news report, Instagram post or statement |
| Incidents | [incidents.csv](assets/incidents.csv) | A new event or reported rights concern |
| Evidence | [incident_evidence.csv](assets/incident_evidence.csv) | A photo, video or statement supporting an incident |

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

## Add a new entry

1. Add the publication to `sources.csv` and assign the next unique source ID.
2. Add an incident to `incidents.csv` only if it is a distinct event or allegation, not simply another article.
3. Add each photograph, video, or other supporting item to `incident_evidence.csv` with its incident and source IDs.
4. Link to original images unless you have permission to host a copy. Do not identify protected witnesses or minors.
5. Rebuild the site with `mkdocs serve` and check the gallery.

For historical protest photographs that do not document a rights incident, the `incident_id` may be left blank.
