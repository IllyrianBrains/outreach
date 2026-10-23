const partiesAssetsBase = new URL('.', document.currentScript.src);

const PARTY_LEVELS = {
  green: { label: '76–100% responded', color: '#2e7d32' },
  lightgreen: { label: '51–75% responded', color: '#7cb342' },
  orange: { label: '26–50% responded', color: '#f57c00' },
  red: { label: '0–25% responded', color: '#c62828' }
};

let partiesMap;
let partiesTiles;
const PARTIES_LABEL_MIN_ZOOM = 4;

function partyValues(value) {
  return (value || '').split(';').map(part => part.trim()).filter(Boolean);
}

function partyCountryId(country) {
  return `parties-country-${country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function classifyPartyCountries(data) {
  const countries = new Map();
  data.forEach(party => {
    if (!party.party) return;
    const country = party.country || 'Unspecified';
    if (!countries.has(country)) countries.set(country, { country, parties: [], responded: 0 });
    const item = countries.get(country); item.parties.push(party);
    if ((party.response_link || '').trim()) item.responded += 1;
  });
  return [...countries.values()].map(item => {
    const percent = item.parties.length ? Math.round(item.responded / item.parties.length * 100) : 0;
    const level = percent > 75 ? 'green' : percent > 50 ? 'lightgreen' : percent > 25 ? 'orange' : 'red';
    return { ...item, percent, level, missing: item.parties.length - item.responded };
  });
}

function sortPartyCountries(items, mode) {
  return [...items].sort((a, b) => {
    if (mode === 'entries-high') return b.parties.length - a.parties.length || a.country.localeCompare(b.country);
    if (mode === 'alphabetical') return a.country.localeCompare(b.country);
    return a.percent - b.percent || b.missing - a.missing || a.country.localeCompare(b.country);
  });
}

function partyTileUrl() {
  const dark = document.body.getAttribute('data-md-color-scheme') === 'slate';
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
}

function renderPartiesCountryMap(countries) {
  const root = document.getElementById('parties-outreach-map');
  const legend = document.getElementById('parties-map-legend');
  if (!root || typeof L === 'undefined') return;
  if (partiesMap) partiesMap.remove();
  partiesMap = L.map(root, { center: [46, 5], zoom: 3, minZoom: 2, maxZoom: 16, worldCopyJump: true });
  partiesTiles = L.tileLayer(partyTileUrl(), { attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors and the GIS user community', maxZoom: 16 }).addTo(partiesMap);
  const featureAliases = { 'Czech Republic': 'Czechia', Macedonia: 'North Macedonia', 'United States of America': 'United States' };
  const mapped = countries.filter(item => !item.country.includes('/') && item.country !== 'European Parliament');
  const byCountry = new Map(mapped.map(item => [item.country, item]));
  const labels = L.layerGroup();
  const updateLabels = () => {
    if (partiesMap.getZoom() >= PARTIES_LABEL_MIN_ZOOM) {
      if (!partiesMap.hasLayer(labels)) labels.addTo(partiesMap);
    } else if (partiesMap.hasLayer(labels)) labels.removeFrom(partiesMap);
  };
  partiesMap.on('zoomend', updateLabels);
  fetch(new URL('countries.geo.json', partiesAssetsBase)).then(response => response.json()).then(geojson => {
    L.geoJSON(geojson, {
      style: feature => {
        const item = byCountry.get(featureAliases[feature.properties.name] || feature.properties.name);
        return { fillColor: item ? PARTY_LEVELS[item.level].color : '#9aa3af', fillOpacity: item ? .75 : .12, color: '#fff', weight: .6 };
      },
      onEachFeature: (feature, layer) => {
        const name = featureAliases[feature.properties.name] || feature.properties.name;
        const item = byCountry.get(name);
        layer.bindTooltip(item ? `${name}: ${item.responded} of ${item.parties.length} responded (${item.percent}%)` : `${name}: no listed parties`, { sticky: true });
        if (!item) return;
        const bounds = layer.getBounds();
        const size = Math.min(.9, Math.max(.48, .48 + Math.sqrt(Math.max(0, bounds.getNorth() - bounds.getSouth()) * Math.max(0, bounds.getEast() - bounds.getWest())) * .03));
        const icon = L.divIcon({ className: 'coverage-map-ratio-label', html: `<span style="--ratio-label-size:${size.toFixed(2)}rem">${item.responded}/${item.parties.length}</span>`, iconSize: null });
        L.marker(bounds.getCenter(), { icon, interactive: false }).addTo(labels);
        const popup = document.createElement('div'); popup.className = 'coverage-map-popup';
        const title = document.createElement('strong'); title.className = 'coverage-map-popup__title'; title.textContent = name;
        const ratio = document.createElement('span'); ratio.className = 'coverage-map-popup__ratio'; ratio.textContent = `${item.responded}/${item.parties.length} parties responded (${item.percent}%)`;
        const open = document.createElement('a'); open.className = 'coverage-map-popup__open-country'; open.href = `#${partyCountryId(name)}`; open.textContent = 'Open country list ↓';
        open.addEventListener('click', event => { event.preventDefault(); const details = document.getElementById(partyCountryId(name)); if (details) { details.open = true; partiesMap.closePopup(); details.scrollIntoView({ behavior: 'smooth' }); } });
        popup.append(title, ratio, open); layer.bindPopup(popup);
      }
    }).addTo(partiesMap); updateLabels();
  }).catch(() => { root.setAttribute('aria-label', 'Political parties map unavailable'); });
  if (legend) {
    legend.replaceChildren();
    Object.values(PARTY_LEVELS).forEach(meta => { const item = document.createElement('span'); item.className = 'coverage-map-legend-item'; item.style.setProperty('--status-color', meta.color); item.textContent = meta.label; legend.append(item); });
  }
}

function addPartyLink(root, url, label) {
  if (!url) return;
  const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = label; root.append(link);
}

function addPartyResponseLinks(root, party) {
  const urls = partyValues(party.response_link);
  urls.forEach((url, index) => addPartyLink(root, url, urls.length > 1 ? `Response ${index + 1}` : 'Response'));
}

function addPartyInstagramEvidence(root, value) {
  if (!value) return;
  const url = value.match(/https?:\/\/[^\s)]+/)?.[0];
  if (!url) return;
  const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Instagram evidence'; link.title = value;
  root.append(link);
}

function renderPartyList(data, order, filterSummary) {
  const root = document.getElementById('parties-priority-list');
  const summary = document.getElementById('parties-summary');
  if (!root) return;
  const countries = sortPartyCountries(classifyPartyCountries(data), order);
  const responded = data.filter(item => (item.response_link || '').trim()).length;
  const mapStats = {
    'parties-stat-countries': countries.length,
    'parties-stat-parties': data.length,
    'parties-stat-responded': responded,
    'parties-stat-pending': data.length - responded
  };
  Object.entries(mapStats).forEach(([id, value]) => {
    const target = document.getElementById(id);
    if (target) target.textContent = value.toLocaleString();
  });
  root.replaceChildren();
  countries.forEach((item, index) => {
    const row = document.createElement('li'); row.className = 'coverage-priority-item'; row.style.setProperty('--status-color', PARTY_LEVELS[item.level].color);
    const details = document.createElement('details'); details.className = 'directory-country coverage-country-details'; details.id = partyCountryId(item.country);
    const heading = document.createElement('summary'); heading.className = 'directory-country-summary coverage-country-summary';
    const rank = document.createElement('span'); rank.className = 'coverage-priority-rank'; rank.textContent = index + 1;
    const content = document.createElement('div'); content.className = 'coverage-priority-content';
    const titleRow = document.createElement('div'); titleRow.className = 'coverage-priority-heading';
    const title = document.createElement('strong'); title.className = 'coverage-country-name'; title.textContent = item.country;
    const badge = document.createElement('span'); badge.className = 'coverage-status-badge'; badge.textContent = PARTY_LEVELS[item.level].label;
    const percentage = document.createElement('span'); percentage.className = 'coverage-priority-percentage'; percentage.textContent = `${item.percent}% responded`;
    titleRow.append(title, badge, percentage);
    const facts = document.createElement('p'); facts.className = 'coverage-priority-facts'; facts.textContent = `${item.parties.length} ${item.parties.length === 1 ? 'entry' : 'entries'} · ${item.responded} responded · ${item.missing} without a response`;
    const next = document.createElement('p'); next.className = 'coverage-priority-next'; const nextLabel = document.createElement('strong'); nextLabel.textContent = 'Next: '; next.append(nextLabel);
    const pending = item.parties.filter(party => !party.response_link).slice(0, 3); next.append(document.createTextNode(pending.length ? pending.map(party => party.party).join(', ') : 'All listed parties have responses.'));
    content.append(titleRow, facts, next); heading.append(rank, content);
    const list = document.createElement('ul'); list.className = 'coverage-outlet-list';
    [...item.parties].sort((a, b) => Number(!a.response_link) - Number(!b.response_link) || a.party.localeCompare(b.party)).forEach(party => {
      const li = document.createElement('li'); li.className = 'coverage-outlet-item'; if (party.response_link) li.classList.add('coverage-outlet-item--covered');
      const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = party.party;
      const meta = document.createElement('span'); meta.className = 'coverage-outlet-status'; meta.textContent = [party.priority ? `${party.priority} priority` : '', party.response_link ? 'Responded' : 'No response'].filter(Boolean).join(' · '); info.append(name, meta);
      if (party.status) { const status = document.createElement('span'); status.className = 'coverage-outlet-headline'; status.textContent = party.status; info.append(status); }
      if (party.issues) { const tags = document.createElement('span'); tags.className = 'coverage-outlet-tags'; partyValues(party.issues).forEach(issue => { const tag = document.createElement('span'); tag.className = 'institution-issue-tag'; tag.textContent = issue; tags.append(tag); }); info.append(tags); }
      const links = document.createElement('div'); links.className = 'coverage-outlet-links'; addPartyResponseLinks(links, party); addPartyLink(links, party.website, 'Website'); addPartyInstagramEvidence(links, party.instagram_evidence);
      if (!links.childElementCount) { const missing = document.createElement('span'); missing.textContent = 'No link listed'; links.append(missing); }
      li.append(info, links); list.append(li);
    });
    details.append(heading, list); row.append(details); root.append(row);
  });
  if (summary) summary.textContent = `${countries.length} countries/groups · ${data.length} parties${filterSummary ? ` · ${filterSummary}` : ''}`;
  renderPartiesCountryMap(countries);
}

function setupParties() {
  const root = document.getElementById('parties-priority-list');
  const order = document.getElementById('parties-country-sort'); const priority = document.getElementById('parties-priority-filter'); const issue = document.getElementById('parties-issue-filter');
  if (!root || root.dataset.ready) return; root.dataset.ready = '1';
  fetch(new URL('political_parties.csv', partiesAssetsBase)).then(response => { if (!response.ok) throw Error(response.status); return response.text(); }).then(text => {
    const data = csvRows(text);
    [...new Set(data.map(item => item.priority).filter(Boolean))].sort().forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; priority.append(option); });
    [...new Set(data.flatMap(item => partyValues(item.issues)))].sort().forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; issue.append(option); });
    const update = () => { const filtered = data.filter(item => (!priority.value || item.priority === priority.value) && (!issue.value || partyValues(item.issues).includes(issue.value))); renderPartyList(filtered, order.value, [priority.value, issue.value].filter(Boolean).join(' · ')); };
    order.addEventListener('change', update); priority.addEventListener('change', update); issue.addEventListener('change', update); update();
  }).catch(() => { root.innerHTML = '<li class="coverage-priority-loading">Unable to load the political parties CSV. Use <code>mkdocs serve</code>.</li>'; });
}

new MutationObserver(() => { if (partiesTiles) partiesTiles.setUrl(partyTileUrl()); }).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
document.addEventListener('DOMContentLoaded', setupParties);
if (typeof document$ !== 'undefined') document$.subscribe(setupParties);
