const institutionsAssetsBase = new URL('.', document.currentScript.src);

const INSTITUTION_LEVELS = {
  green: { label: '76–100% responded', color: '#2e7d32' },
  lightgreen: { label: '51–75% responded', color: '#7cb342' },
  orange: { label: '26–50% responded', color: '#f57c00' },
  red: { label: '0–25% responded', color: '#c62828' }
};

let institutionsMap;
let institutionsTiles;
const INSTITUTIONS_LABEL_MIN_ZOOM = 4;

function institutionCountryId(country) {
  return `institutions-country-${country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function classifyInstitutionCountries(data) {
  const countries = new Map();
  data.forEach(item => {
    if (!item.organization) return;
    const country = item.country || 'Unspecified';
    if (!countries.has(country)) countries.set(country, { country, organizations: [], responded: 0 });
    const entry = countries.get(country);
    entry.organizations.push(item);
    if ((item.response_link || '').trim()) entry.responded += 1;
  });
  return [...countries.values()].map(item => {
    const percent = item.organizations.length ? Math.round(item.responded / item.organizations.length * 100) : 0;
    const level = percent > 75 ? 'green' : percent > 50 ? 'lightgreen' : percent > 25 ? 'orange' : 'red';
    return { ...item, percent, level, missing: item.organizations.length - item.responded };
  });
}

function sortInstitutionCountries(items, mode) {
  return [...items].sort((a, b) => {
    if (mode === 'entries-high') return b.organizations.length - a.organizations.length || a.country.localeCompare(b.country);
    if (mode === 'alphabetical') return a.country.localeCompare(b.country);
    return a.percent - b.percent || b.missing - a.missing || a.country.localeCompare(b.country);
  });
}

function institutionTileUrl() {
  const dark = document.body.getAttribute('data-md-color-scheme') === 'slate';
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
}

function renderInstitutionsMap(countries) {
  const root = document.getElementById('institutions-map');
  const legend = document.getElementById('institutions-map-legend');
  if (!root || typeof L === 'undefined') return;
  if (institutionsMap) institutionsMap.remove();
  institutionsMap = L.map(root, { center: [46, 5], zoom: 3, minZoom: 2, maxZoom: 16, worldCopyJump: true });
  institutionsTiles = L.tileLayer(institutionTileUrl(), {
    attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors and the GIS user community', maxZoom: 16
  }).addTo(institutionsMap);
  const aliases = { 'Czech Republic': 'Czechia', 'United States of America': 'United States' };
  const byCountry = new Map(countries.map(item => [item.country, item]));
  const countryLabels = L.layerGroup();
  const updateLabelVisibility = () => {
    if (institutionsMap.getZoom() >= INSTITUTIONS_LABEL_MIN_ZOOM) {
      if (!institutionsMap.hasLayer(countryLabels)) countryLabels.addTo(institutionsMap);
    } else if (institutionsMap.hasLayer(countryLabels)) {
      countryLabels.removeFrom(institutionsMap);
    }
  };
  institutionsMap.on('zoomend', updateLabelVisibility);
  fetch(new URL('countries.geo.json', institutionsAssetsBase)).then(response => response.json()).then(geojson => {
    L.geoJSON(geojson, {
      style: feature => {
        const item = byCountry.get(aliases[feature.properties.name] || feature.properties.name);
        return { fillColor: item ? INSTITUTION_LEVELS[item.level].color : '#9aa3af', fillOpacity: item ? .75 : .12, color: '#fff', weight: .6 };
      },
      onEachFeature: (feature, layer) => {
        const name = aliases[feature.properties.name] || feature.properties.name;
        const item = byCountry.get(name);
        layer.bindTooltip(item ? `${name}: ${item.responded} of ${item.organizations.length} responded (${item.percent}%)` : `${name}: no listed organizations`, { sticky: true });
        if (item) {
          const bounds = layer.getBounds();
          const latSpan = Math.max(0, bounds.getNorth() - bounds.getSouth());
          const lngSpan = Math.max(0, bounds.getEast() - bounds.getWest());
          const labelSize = Math.min(.9, Math.max(.48, .48 + Math.sqrt(latSpan * lngSpan) * .03));
          const ratioLabel = L.divIcon({
            className: 'coverage-map-ratio-label',
            html: `<span style="--ratio-label-size:${labelSize.toFixed(2)}rem">${item.responded}/${item.organizations.length}</span>`,
            iconSize: null
          });
          L.marker(bounds.getCenter(), { icon: ratioLabel, interactive: false }).addTo(countryLabels);
          const popup = document.createElement('div'); popup.className = 'coverage-map-popup';
          const title = document.createElement('strong'); title.className = 'coverage-map-popup__title'; title.textContent = name;
          const ratio = document.createElement('span'); ratio.className = 'coverage-map-popup__ratio'; ratio.textContent = `${item.responded}/${item.organizations.length} organizations responded (${item.percent}%)`;
          const open = document.createElement('a'); open.className = 'coverage-map-popup__open-country'; open.href = `#${institutionCountryId(name)}`; open.textContent = 'Open country list ↓';
          open.addEventListener('click', event => { event.preventDefault(); const details = document.getElementById(institutionCountryId(name)); if (details) { details.open = true; institutionsMap.closePopup(); details.scrollIntoView({ behavior: 'smooth' }); } });
          popup.append(title, ratio, open); layer.bindPopup(popup);
        }
      }
    }).addTo(institutionsMap);
    updateLabelVisibility();
  }).catch(() => { root.setAttribute('aria-label', 'Institutions map unavailable'); });
  if (legend) {
    legend.replaceChildren();
    Object.values(INSTITUTION_LEVELS).forEach(meta => { const item = document.createElement('span'); item.className = 'coverage-map-legend-item'; item.style.setProperty('--status-color', meta.color); item.textContent = meta.label; legend.append(item); });
  }
}

function addInstitutionLink(root, url, label, email = false) {
  if (!url) return;
  const link = document.createElement('a'); link.href = email && !url.startsWith('mailto:') ? `mailto:${url}` : url;
  link.target = email ? '_self' : '_blank'; link.rel = 'noopener noreferrer'; link.textContent = label; root.append(link);
}

function institutionValues(value) {
  return (value || '').split(';').map(part => part.trim());
}

function institutionIssues(organization) {
  return institutionValues(organization.issues).filter(Boolean);
}

function addInstitutionResponses(info, links, organization) {
  const urls = institutionValues(organization.response_link).filter(Boolean);
  if (!urls.length) return;
  const dates = institutionValues(organization.response_date);
  const types = institutionValues(organization.response_type);
  const sources = institutionValues(organization.response_source);
  const responseMeta = document.createElement('span');
  responseMeta.className = 'coverage-outlet-headline';
  responseMeta.textContent = urls.map((url, index) => {
    const parts = [types[index] || (urls.length > 1 ? `Response ${index + 1}` : 'Response'), dates[index], sources[index]];
    return parts.filter(Boolean).join(' · ');
  }).join(' | ');
  info.append(responseMeta);
  urls.forEach((url, index) => {
    const type = types[index] || 'Response';
    const label = urls.length > 1 ? `${type} ${index + 1}${dates[index] ? ` · ${dates[index]}` : ''}` : `${type}${dates[index] ? ` · ${dates[index]}` : ''}`;
    addInstitutionLink(links, url, label);
  });
}

function addInstitutionContactRoute(info, route) {
  if (!route) return;
  const line = document.createElement('span');
  line.className = 'coverage-outlet-headline';
  line.append(document.createTextNode('Contact: '));
  const url = route.match(/https?:\/\/\S+/)?.[0];
  const email = route.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  if (url || email) {
    const value = url || email;
    const link = document.createElement('a');
    link.href = email ? `mailto:${email}` : value;
    link.target = email ? '_self' : '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = route;
    line.append(link);
  } else {
    line.append(document.createTextNode(route));
  }
  info.append(line);
}

function addInstitutionContribution(info, contribution) {
  if (!contribution) return;
  const line = document.createElement('span');
  line.className = 'coverage-outlet-headline institution-contribution';
  const label = document.createElement('strong'); label.textContent = 'Contribution: ';
  line.append(label);
  const urlPattern = /https?:\/\/[^\s]+/g;
  let offset = 0;
  for (const match of contribution.matchAll(urlPattern)) {
    line.append(document.createTextNode(contribution.slice(offset, match.index)));
    const link = document.createElement('a'); link.href = match[0]; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Source';
    line.append(link); offset = match.index + match[0].length;
  }
  line.append(document.createTextNode(contribution.slice(offset)));
  info.append(line);
}

function renderInstitutionList(data, sortMode, activeCategory) {
  const root = document.getElementById('institutions-priority-list');
  const summary = document.getElementById('institutions-summary');
  if (!root) return;
  const countries = sortInstitutionCountries(classifyInstitutionCountries(data), sortMode);
  root.replaceChildren();
  countries.forEach((item, index) => {
    const row = document.createElement('li'); row.className = 'coverage-priority-item'; row.style.setProperty('--status-color', INSTITUTION_LEVELS[item.level].color);
    const details = document.createElement('details'); details.className = 'directory-country coverage-country-details'; details.id = institutionCountryId(item.country);
    const heading = document.createElement('summary'); heading.className = 'directory-country-summary coverage-country-summary';
    const rank = document.createElement('span'); rank.className = 'coverage-priority-rank'; rank.textContent = index + 1;
    const content = document.createElement('div'); content.className = 'coverage-priority-content';
    const titleRow = document.createElement('div'); titleRow.className = 'coverage-priority-heading';
    const title = document.createElement('strong'); title.className = 'coverage-country-name'; title.textContent = item.country;
    const badge = document.createElement('span'); badge.className = 'coverage-status-badge'; badge.textContent = INSTITUTION_LEVELS[item.level].label;
    const percentage = document.createElement('span'); percentage.className = 'coverage-priority-percentage'; percentage.textContent = `${item.percent}% responded`;
    titleRow.append(title, badge, percentage);
    const facts = document.createElement('p'); facts.className = 'coverage-priority-facts'; facts.textContent = `${item.organizations.length} ${item.organizations.length === 1 ? 'entry' : 'entries'} · ${item.responded} responded · ${item.missing} without a response`;
    const next = document.createElement('p'); next.className = 'coverage-priority-next';
    const nextLabel = document.createElement('strong'); nextLabel.textContent = 'Next: '; next.append(nextLabel);
    const pending = item.organizations.filter(org => !(org.response_link || '').trim()).slice(0, 3);
    next.append(document.createTextNode(pending.length ? pending.map(org => org.organization).join(', ') : 'All listed organizations have responses.'));
    content.append(titleRow, facts, next); heading.append(rank, content);
    const list = document.createElement('ul'); list.className = 'coverage-outlet-list';
    [...item.organizations].sort((a, b) => Number(!a.response_link) - Number(!b.response_link) || a.organization.localeCompare(b.organization)).forEach(org => {
      const li = document.createElement('li'); li.className = 'coverage-outlet-item'; if (org.response_link) li.classList.add('coverage-outlet-item--covered');
      const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = org.organization;
      const meta = document.createElement('span'); meta.className = 'coverage-outlet-status'; meta.textContent = [org.category, org.city, org.eu_member === '1' ? 'EU member' : '', org.office_in_albania === '1' ? 'Office in Albania' : ''].filter(Boolean).join(' · ');
      info.append(name, meta);
      if (org.issues) {
        const issues = document.createElement('span'); issues.className = 'coverage-outlet-tags';
        institutionIssues(org).forEach(issue => { const tag = document.createElement('span'); tag.className = 'institution-issue-tag'; tag.textContent = issue; issues.append(tag); });
        info.append(issues);
      }
      addInstitutionContactRoute(info, org.contact_route);
      addInstitutionContribution(info, org.contribution);
      const links = document.createElement('div'); links.className = 'coverage-outlet-links';
      addInstitutionResponses(info, links, org); addInstitutionLink(links, org.website, 'Website'); addInstitutionLink(links, org.email, 'Email', true);
      if (!links.childElementCount) { const missing = document.createElement('span'); missing.textContent = 'No link listed'; links.append(missing); }
      li.append(info, links); list.append(li);
    });
    details.append(heading, list); row.append(details); root.append(row);
  });
  if (summary) summary.textContent = `${countries.length} countries · ${data.length} organizations${activeCategory ? ` · category: ${activeCategory}` : ''}`;
  renderInstitutionsMap(countries);
}

function setupInstitutions() {
  const root = document.getElementById('institutions-priority-list');
  const sort = document.getElementById('institutions-country-sort');
  const filter = document.getElementById('institutions-category-filter');
  const issueFilter = document.getElementById('institutions-issue-filter');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  fetch(new URL('institutions.csv', institutionsAssetsBase)).then(response => { if (!response.ok) throw Error(response.status); return response.text(); }).then(text => {
    const data = csvRows(text);
    [...new Set(data.map(item => item.category).filter(Boolean))].sort().forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; filter.append(option); });
    [...new Set(data.flatMap(institutionIssues))].sort().forEach(issue => { const option = document.createElement('option'); option.value = issue; option.textContent = issue; issueFilter.append(option); });
    const update = () => {
      const category = filter.value; const issue = issueFilter.value;
      const filtered = data.filter(item => (!category || item.category === category) && (!issue || institutionIssues(item).includes(issue)));
      renderInstitutionList(filtered, sort.value, [category, issue].filter(Boolean).join(' · '));
    };
    sort.addEventListener('change', update); filter.addEventListener('change', update); issueFilter.addEventListener('change', update); update();
  }).catch(() => { root.innerHTML = '<li class="coverage-priority-loading">Unable to load the institutions CSV. Use <code>mkdocs serve</code>.</li>'; });
}

new MutationObserver(() => { if (institutionsTiles) institutionsTiles.setUrl(institutionTileUrl()); }).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
document.addEventListener('DOMContentLoaded', setupInstitutions);
if (typeof document$ !== 'undefined') document$.subscribe(setupInstitutions);
