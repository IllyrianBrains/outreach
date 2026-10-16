const coverageAssetsBase = new URL('.', document.currentScript.src);

const LEVEL_META = {
  high: { label: 'High coverage', color: '#0ca30c' },
  medium: { label: 'Medium coverage', color: '#fab219' },
  orange: { label: '3–4 outlets sharing', color: '#f97316' },
  low: { label: 'Low coverage', color: '#d03b3b' }
};

function classifyCountries(data) {
  const countries = new Map();

  data.forEach(item => {
    if (!item.country) return;
    if (!countries.has(item.country)) {
      countries.set(item.country, {
        code: item.country_code,
        country: item.country,
        covered: new Set(),
        partial: new Set(),
        notFound: new Set(),
        notChecked: new Set(),
        allOutlets: new Set(),
        candidates: []
      });
    }

    const entry = countries.get(item.country);
    entry.allOutlets.add(item.outlet);
    if (item.coverage_status === 'Covered') entry.covered.add(item.outlet);
    else if (item.coverage_status === 'Mentioned' || item.coverage_status === 'Unclear') {
      entry.partial.add(item.outlet);
      entry.candidates.push(item);
    } else if (item.coverage_status === 'Not found') {
      entry.notFound.add(item.outlet);
      entry.candidates.push(item);
    } else if (item.coverage_status === 'Not checked') {
      entry.notChecked.add(item.outlet);
      entry.candidates.push(item);
    }
  });

  return [...countries.values()].map(entry => {
    // Covered outlets count as fully shared, Mentioned/Unclear as half shared,
    // and both Not found and Not checked as not shared.
    const coverageShare = entry.allOutlets.size
      ? (entry.covered.size + entry.partial.size * .5) / entry.allOutlets.size
      : 0;
    let level = 'low';
    if (coverageShare >= .5) level = 'high';
    else if (entry.covered.size === 3 || entry.covered.size === 4) level = 'orange';
    else if (coverageShare >= .2) level = 'medium';

    const verified = entry.covered.size > 0 || entry.partial.size > 0 || entry.notFound.size > 0;
    const contacted = entry.candidates.filter(item => {
      const status = (item.outreach_status || '').trim();
      return status && status !== 'Not contacted';
    }).length;
    const needsOutreach = Math.max(0, entry.candidates.length - contacted);
    const statusRank = { 'Not found': 0, 'Not checked': 0, Unclear: 1, Mentioned: 2 };
    const nextOutlets = [...entry.candidates]
      .filter(item => !((item.outreach_status || '').trim()) || item.outreach_status === 'Not contacted')
      .sort((a, b) => {
        const statusDifference = (statusRank[a.coverage_status] ?? 9) - (statusRank[b.coverage_status] ?? 9);
        return statusDifference || a.outlet.localeCompare(b.outlet);
      })
      .slice(0, 3);

    return {
      ...entry,
      level,
      coveragePercent: Math.round(coverageShare * 100),
      verified,
      contacted,
      needsOutreach,
      nextOutlets
    };
  }).sort((a, b) =>
    a.coveragePercent - b.coveragePercent ||
    b.needsOutreach - a.needsOutreach ||
    a.contacted - b.contacted ||
    a.country.localeCompare(b.country)
  );
}

const A2_TO_A3 = {
  AT: 'AUT', BE: 'BEL', CZ: 'CZE', DK: 'DNK', FI: 'FIN', FR: 'FRA', DE: 'DEU',
  NL: 'NLD', IE: 'IRL', IT: 'ITA', XK: 'CS-KM', LU: 'LUX', MT: 'MLT', GB: 'GBR',
  NO: 'NOR', PL: 'POL', ES: 'ESP', SE: 'SWE', AL: 'ALB', US: 'USA', CH: 'CHE'
};

let coverageMapInstance = null;
let coverageTileLayer = null;

function coverageMapTileUrl() {
  const dark = document.body.getAttribute('data-md-color-scheme') === 'slate';
  const layer = dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/{z}/{y}/{x}`;
}

function renderMap(priorities) {
  const container = document.getElementById('coverage-map');
  const legend = document.getElementById('coverage-map-legend');
  if (!container || typeof L === 'undefined') return;
  if (coverageMapInstance) coverageMapInstance.remove();

  coverageMapInstance = L.map(container, {
    center: [40, 12],
    zoom: 3,
    minZoom: 2,
    maxZoom: 16,
    worldCopyJump: true,
    scrollWheelZoom: true
  });
  coverageTileLayer = L.tileLayer(coverageMapTileUrl(), {
    attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors and the GIS user community',
    maxZoom: 16
  }).addTo(coverageMapInstance);

  const byA3 = new Map(priorities.map(item => [A2_TO_A3[item.code], item]));
  const style = (item, hover = false) => {
    const unverified = item && item.level === 'low' && !item.verified;
    return {
      fillColor: item ? LEVEL_META[item.level].color : '#9aa3af',
      fillOpacity: item ? (hover ? .95 : .75) : .2,
      color: unverified ? LEVEL_META.low.color : '#fff',
      weight: unverified ? 1.6 : .6,
      dashArray: unverified ? '3,3' : null
    };
  };

  fetch(new URL('countries.geo.json', coverageAssetsBase))
    .then(response => response.ok ? response.json() : Promise.reject(Error(response.status)))
    .then(geojson => {
      L.geoJSON(geojson, {
        style: feature => style(byA3.get(feature.id)),
        onEachFeature: (feature, layer) => {
          const item = byA3.get(feature.id);
          const name = item?.country || feature.properties.name;
          const text = item
            ? `${name}: ${LEVEL_META[item.level].label} (${item.coveragePercent}% shared)`
            : `${name}: not rated`;
          layer.bindTooltip(text, { sticky: true });
          layer.on('mouseover', () => layer.setStyle(style(item, true)));
          layer.on('mouseout', () => layer.setStyle(style(item)));
        }
      }).addTo(coverageMapInstance);
    })
    .catch(() => {});

  if (legend) {
    legend.replaceChildren();
    ['high', 'medium', 'orange', 'low'].forEach(level => {
      const item = document.createElement('span');
      item.className = 'coverage-map-legend-item';
      item.style.setProperty('--status-color', LEVEL_META[level].color);
      item.textContent = LEVEL_META[level].label;
      legend.append(item);
    });
  }
}

function renderPriorityList(data) {
  const root = document.getElementById('coverage-priority-list');
  const summary = document.getElementById('coverage-priority-summary');
  if (!root) return;

  const priorities = classifyCountries(data);
  renderMap(priorities);
  root.replaceChildren();

  priorities.forEach((item, index) => {
    const row = document.createElement('li');
    row.className = 'coverage-priority-item';
    row.style.setProperty('--status-color', LEVEL_META[item.level].color);

    const rank = document.createElement('span');
    rank.className = 'coverage-priority-rank';
    rank.textContent = index + 1;

    const content = document.createElement('div');
    content.className = 'coverage-priority-content';

    const heading = document.createElement('div');
    heading.className = 'coverage-priority-heading';
    const country = document.createElement('strong');
    country.textContent = item.country;
    const badge = document.createElement('span');
    badge.className = 'coverage-status-badge';
    badge.textContent = LEVEL_META[item.level].label;
    const percentage = document.createElement('span');
    percentage.className = 'coverage-priority-percentage';
    percentage.textContent = `${item.coveragePercent}% shared`;
    heading.append(country, badge, percentage);

    const facts = document.createElement('p');
    facts.className = 'coverage-priority-facts';
    const factParts = [
      `${item.covered.size} covered`,
      `${item.notFound.size} confirmed ${item.notFound.size === 1 ? 'miss' : 'misses'}`,
      `${item.notChecked.size} unchecked`,
      `${item.contacted} contacted`
    ];
    if (item.level === 'low' && !item.verified) factParts.push('coverage not yet verified');
    facts.textContent = factParts.join(' · ');

    const next = document.createElement('p');
    next.className = 'coverage-priority-next';
    if (item.nextOutlets.length) {
      const label = document.createElement('strong');
      label.textContent = 'Next: ';
      next.append(label);
      item.nextOutlets.forEach((outlet, outletIndex) => {
        if (outletIndex) next.append(document.createTextNode(', '));
        if (outlet.outlet_url) {
          const link = document.createElement('a');
          link.href = outlet.outlet_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = outlet.outlet;
          link.title = `Visit ${outlet.outlet}`;
          next.append(link);
        } else {
          next.append(document.createTextNode(outlet.outlet));
        }
      });
    } else {
      next.textContent = item.level === 'high' ? 'No immediate outreach priority.' : 'No uncontacted outlet is listed.';
    }

    content.append(heading, facts, next);
    row.append(rank, content);
    root.append(row);
  });

  if (summary) {
    const actionable = priorities.filter(item => item.needsOutreach > 0).length;
    const outlets = priorities.reduce((total, item) => total + item.needsOutreach, 0);
    summary.textContent = `${actionable} countries have open actions across ${outlets} outlets. Highest priority: ${priorities[0]?.country || 'none'}.`;
  }
}

function setupMediaCoverage() {
  const root = document.getElementById('coverage-priority-list');
  if (!root || root.dataset.coverageReady) return;
  root.dataset.coverageReady = '1';

  fetch(new URL('media_coverage.csv', coverageAssetsBase))
    .then(response => {
      if (!response.ok) throw Error(response.status);
      return response.text();
    })
    .then(text => renderPriorityList(csvRows(text)))
    .catch(() => {
      root.innerHTML = '<li class="coverage-priority-loading">Unable to load the media coverage CSV. Use <code>mkdocs serve</code>.</li>';
      const summary = document.getElementById('coverage-priority-summary');
      if (summary) summary.textContent = 'Priority calculation unavailable.';
    });
}

new MutationObserver(() => {
  if (coverageTileLayer) coverageTileLayer.setUrl(coverageMapTileUrl());
}).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });

document.addEventListener('DOMContentLoaded', setupMediaCoverage);
if (typeof document$ !== 'undefined') document$.subscribe(setupMediaCoverage);
