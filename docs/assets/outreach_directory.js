const outreachAssetsBase = new URL('.', document.currentScript.src);

const outreachConfigs = {
  institutions: {
    file: 'institutions.csv', group: 'category', filter: 'category', title: 'institution',
    meta: ['scope', 'priority'], description: 'relevance', status: 'outreach_status',
    links: [['official_website', 'Website'], ['instagram_url', 'Instagram'], ['contact_email', 'Email']]
  },
  embassies: {
    file: 'embassies.csv', group: null, filter: 'country', title: 'representation',
    meta: ['country', 'category'], description: 'verification',
    links: [['official_website', 'Website'], ['instagram_url', 'Instagram']]
  },
  parties: {
    file: 'political_parties.csv', group: 'country', filter: 'priority', title: 'party',
    meta: ['priority', 'status'], description: 'issues', status: 'response_link',
    links: [['website', 'Website'], ['response_link', 'Response'], ['instagram_evidence', 'Instagram evidence']]
  }
};

function outreachState(item, statusKey) {
  if (!statusKey) return { tone: 'unknown', label: 'Outreach not tracked' };
  if (statusKey === 'response_link') {
    return (item[statusKey] || '').trim()
      ? { tone: 'contacted', label: 'Responded' }
      : { tone: 'not-contacted', label: 'No response' };
  }
  const label = (item[statusKey] || 'Not contacted').trim();
  const lower = label.toLowerCase();
  const contacted = lower && !['not contacted', 'not yet contacted', 'pending'].includes(lower);
  return { tone: contacted ? 'contacted' : 'not-contacted', label };
}

function outreachProgressColor(contacted, total) {
  if (!contacted) return '#d03b3b';
  if (contacted === total) return '#0ca30c';
  return '#f97316';
}

function renderPartiesMap(data) {
  const container = document.getElementById('parties-outreach-map');
  const legend = document.getElementById('parties-map-legend');
  if (!container || container.dataset.ready || typeof L === 'undefined') return;
  container.dataset.ready = '1';

  const aliases = { Czechia: 'Czech Republic', 'North Macedonia': 'Macedonia', 'United States': 'United States of America' };
  const byCountry = new Map();
  data.forEach(item => {
    const country = aliases[item.country] || item.country;
    if (!country || country.includes('/') || country === 'European Parliament') return;
    if (!byCountry.has(country)) byCountry.set(country, { total: 0, contacted: 0 });
    const stats = byCountry.get(country);
    stats.total += 1;
    if (outreachState(item, 'response_link').tone === 'contacted') stats.contacted += 1;
  });

  const map = L.map(container, { center: [43, 2], zoom: 2, minZoom: 2, maxZoom: 16, worldCopyJump: true });
  const dark = document.body.getAttribute('data-md-color-scheme') === 'slate';
  const layerName = dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
  const tiles = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layerName}/MapServer/tile/{z}/{y}/{x}`, {
    attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors and the GIS user community', maxZoom: 16
  }).addTo(map);
  new MutationObserver(() => {
    const isDark = document.body.getAttribute('data-md-color-scheme') === 'slate';
    tiles.setUrl(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${isDark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`);
  }).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });

  fetch(new URL('countries.geo.json', outreachAssetsBase))
    .then(response => response.ok ? response.json() : Promise.reject(Error(response.status)))
    .then(geojson => {
      L.geoJSON(geojson, {
        style: feature => {
          const stats = byCountry.get(feature.properties.name);
          return { fillColor: stats ? outreachProgressColor(stats.contacted, stats.total) : '#9aa3af', fillOpacity: stats ? .78 : .12, color: '#fff', weight: .7 };
        },
        onEachFeature: (feature, layer) => {
          const stats = byCountry.get(feature.properties.name);
          const label = stats
            ? `${feature.properties.name}: ${stats.contacted} of ${stats.total} responded (${Math.round(stats.contacted / stats.total * 100)}%)`
            : `${feature.properties.name}: no listed parties`;
          layer.bindTooltip(label, { sticky: true });
          layer.on('mouseover', () => layer.setStyle({ fillOpacity: stats ? .95 : .2 }));
          layer.on('mouseout', () => layer.setStyle({ fillOpacity: stats ? .78 : .12 }));
        }
      }).addTo(map);
    })
    .catch(() => { container.setAttribute('aria-label', 'Party outreach map unavailable'); });

  if (legend) {
    [['#d03b3b', 'No responses'], ['#f97316', 'Some responses'], ['#0ca30c', 'All responded'], ['#9aa3af', 'No listed parties']].forEach(([color, label]) => {
      const item = document.createElement('span'); item.className = 'coverage-map-legend-item';
      item.style.setProperty('--status-color', color); item.textContent = label; legend.append(item);
    });
  }
}

function renderInstitutionsTreemap(data) {
  const root = document.getElementById('institutions-treemap');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const categories = new Map();
  data.forEach(item => {
    const name = item.category || 'Other';
    if (!categories.has(name)) categories.set(name, { name, total: 0, contacted: 0 });
    const stats = categories.get(name); stats.total += 1;
    if (outreachState(item, 'outreach_status').tone === 'contacted') stats.contacted += 1;
  });
  const ordered = [...categories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const total = ordered.reduce((sum, item) => sum + item.total, 0);
  let offset = 0;
  ordered.forEach(item => {
    const tile = document.createElement('div'); tile.className = 'institutions-treemap-tile';
    const width = item.total / total * 100;
    tile.style.left = `${offset}%`; tile.style.width = `${width}%`;
    tile.style.setProperty('--treemap-color', outreachProgressColor(item.contacted, item.total));
    const name = document.createElement('strong'); name.textContent = item.name;
    const value = document.createElement('span');
    value.textContent = `${item.contacted} of ${item.total} contacted · ${Math.round(item.contacted / item.total * 100)}%`;
    tile.append(name, value); root.append(tile); offset += width;
  });
}

function setupOutreachDirectories() {
  document.querySelectorAll('.outreach-directory').forEach(wrapper => {
    if (wrapper.dataset.ready) return;
    wrapper.dataset.ready = '1';
    const config = outreachConfigs[wrapper.dataset.directory];
    const search = wrapper.querySelector('.outreach-search');
    const filter = wrapper.querySelector('.outreach-filter');
    const clear = wrapper.querySelector('.outreach-clear');
    const count = wrapper.querySelector('.outreach-count');
    const results = wrapper.querySelector('.outreach-results');

    fetch(new URL(config.file, outreachAssetsBase))
      .then(response => { if (!response.ok) throw Error(response.status); return response.text(); })
      .then(text => {
        const data = csvRows(text);
        if (wrapper.dataset.directory === 'parties') renderPartiesMap(data);
        if (wrapper.dataset.directory === 'institutions') renderInstitutionsTreemap(data);
        const openGroups = new Set();
        [...new Set(data.map(item => item[config.filter]).filter(Boolean))].sort().forEach(value => {
          const option = document.createElement('option'); option.value = value; option.textContent = value; filter.append(option);
        });

        function render() {
          const term = search.value.toLowerCase();
          const items = data.filter(item => (!filter.value || item[config.filter] === filter.value) && (!term || Object.values(item).join(' ').toLowerCase().includes(term)));
          count.textContent = `${items.length} of ${data.length} entries`;
          results.replaceChildren();
          const groups = new Map();
          items.forEach(item => { const key = config.group ? (item[config.group] || 'Other') : ''; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
          if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'outreach-empty';
            empty.textContent = 'No matching entries.';
            results.append(empty);
            return;
          }
          [...groups].sort(([a], [b]) => a.localeCompare(b)).forEach(([groupName, groupItems], groupIndex) => {
            const group = document.createElement(groupName ? 'details' : 'section');
            group.className = 'outreach-group';
            if (groupName) {
              const groupSummary = document.createElement('summary'); groupSummary.className = 'outreach-group-summary';
              const contacted = config.status
                ? groupItems.filter(item => outreachState(item, config.status).tone === 'contacted').length
                : 0;
              if (wrapper.dataset.directory === 'parties' || wrapper.dataset.directory === 'institutions') {
                const isParties = wrapper.dataset.directory === 'parties';
                const remaining = groupItems.length - contacted;
                const tone = contacted === groupItems.length ? 'complete' : contacted ? 'progress' : 'pending';
                group.classList.add('outreach-group--overview', `outreach-group--${wrapper.dataset.directory}`, `outreach-group--${tone}`);

                const rank = document.createElement('span');
                rank.className = 'outreach-group-rank';
                rank.textContent = groupIndex + 1;
                const summaryContent = document.createElement('div');
                summaryContent.className = 'outreach-group-content';
                const heading = document.createElement('div');
                heading.className = 'outreach-group-heading';
                const groupTitle = document.createElement('strong'); groupTitle.textContent = groupName;
                const badge = document.createElement('span'); badge.className = 'outreach-group-badge';
                badge.textContent = isParties
                  ? (tone === 'complete' ? 'All responded' : tone === 'progress' ? 'Some responses' : 'No response')
                  : (tone === 'complete' ? 'Outreach complete' : tone === 'progress' ? 'In progress' : 'Not contacted');
                const percentage = document.createElement('span'); percentage.className = 'outreach-group-percentage';
                percentage.textContent = `${Math.round(contacted / groupItems.length * 100)}% ${isParties ? 'responded' : 'contacted'}`;
                heading.append(groupTitle, badge, percentage);

                const facts = document.createElement('p'); facts.className = 'outreach-group-facts';
                const itemLabel = isParties
                  ? (groupItems.length === 1 ? 'party' : 'parties')
                  : (groupItems.length === 1 ? 'institution' : 'institutions');
                facts.textContent = isParties
                  ? `${groupItems.length} ${itemLabel} · ${contacted} responded · ${remaining} without a response`
                  : `${groupItems.length} ${itemLabel} · ${contacted} contacted · ${remaining} remaining`;
                const next = document.createElement('p'); next.className = 'outreach-group-next';
                const nextNames = groupItems
                  .filter(item => outreachState(item, config.status).tone !== 'contacted')
                  .map(item => item[config.title])
                  .sort((a, b) => a.localeCompare(b))
                  .slice(0, 3);
                next.textContent = nextNames.length ? `Next: ${nextNames.join(', ')}` : 'No immediate outreach action.';
                summaryContent.append(heading, facts, next);
                groupSummary.append(rank, summaryContent);
              } else {
                const groupTitle = document.createElement('strong'); groupTitle.textContent = groupName;
                const groupMeta = document.createElement('span');
                groupMeta.textContent = `${groupItems.length} ${groupItems.length === 1 ? 'entry' : 'entries'}` +
                  (config.status ? ` · ${contacted} contacted` : '');
                groupSummary.append(groupTitle, groupMeta);
              }
              group.append(groupSummary);
              group.open = Boolean(term || filter.value || openGroups.has(groupName));
              group.addEventListener('toggle', () => {
                if (group.open) openGroups.add(groupName);
                else openGroups.delete(groupName);
              });
            } else {
              group.classList.add('outreach-group--flat');
            }

            const entries = document.createElement('div'); entries.className = 'outreach-entry-list';
            groupItems.sort((a, b) => a[config.title].localeCompare(b[config.title])).forEach(item => {
              const state = outreachState(item, config.status);
              const entry = document.createElement('details'); entry.className = `outreach-entry outreach-entry--${state.tone}`;
              const summary = document.createElement('summary'); summary.className = 'outreach-entry-summary';
              const name = document.createElement('strong'); name.textContent = item[config.title];
              const status = document.createElement('span'); status.className = 'outreach-status'; status.textContent = state.label;
              summary.append(name, status); entry.append(summary);

              const body = document.createElement('div'); body.className = 'outreach-entry-body';
              const meta = document.createElement('p'); meta.textContent = config.meta.map(key => item[key]).filter(Boolean).join(' · ');
              const description = document.createElement('p'); description.textContent = item[config.description] || item.notes || '';
              const links = document.createElement('div'); links.className = 'outreach-links';
              config.links.forEach(([key, label]) => {
                if (!item[key]) return;
                const link = document.createElement('a');
                link.href = key === 'contact_email' && !item[key].startsWith('mailto:') ? `mailto:${item[key]}` : item[key];
                link.target = key === 'contact_email' ? '_self' : '_blank'; link.rel = 'noopener noreferrer'; link.textContent = label; links.append(link);
              });
              body.append(meta, description, links); entry.append(body); entries.append(entry);
            });
            group.append(entries); results.append(group);
          });
        }

        search.addEventListener('input', render); filter.addEventListener('change', render);
        clear.addEventListener('click', () => { search.value = ''; filter.value = ''; render(); search.focus(); });
        render();
      })
      .catch(() => { results.textContent = 'Unable to load this directory.'; });
  });
}

document.addEventListener('DOMContentLoaded', setupOutreachDirectories);
if (typeof document$ !== 'undefined') document$.subscribe(setupOutreachDirectories);
