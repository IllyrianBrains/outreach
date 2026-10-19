const coverageAssetsBase = new URL('.', document.currentScript.src);

const LEVEL_META = {
  green: { label: '76–100% of outlets', color: '#2e7d32' },
  lightgreen: { label: '51–75% of outlets', color: '#7cb342' },
  orange: { label: '26–50% of outlets', color: '#f57c00' },
  red: { label: '0–25% of outlets', color: '#c62828' }
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
        uncovered: new Set(),
        postCount: 0,
        allOutlets: new Set(),
        outlets: [],
        candidates: []
      });
    }

    const entry = countries.get(item.country);
    entry.allOutlets.add(item.outlet);
    entry.outlets.push(item);
    const articleUrls = (item.article_urls || '').split(';').map(value => value.trim()).filter(Boolean);
    if (articleUrls.length) {
      entry.covered.add(item.outlet);
      entry.postCount += articleUrls.length;
    } else {
      entry.uncovered.add(item.outlet);
      entry.candidates.push(item);
    }
  });

  return [...countries.values()].map(entry => {
    const coverageShare = entry.allOutlets.size
      ? entry.covered.size / entry.allOutlets.size
      : 0;
    let level = 'red';
    if (coverageShare > .75) level = 'green';
    else if (coverageShare > .5) level = 'lightgreen';
    else if (coverageShare > .25) level = 'orange';

    const nextOutlets = [...entry.candidates]
      .sort((a, b) => a.outlet.localeCompare(b.outlet))
      .slice(0, 3);

    return {
      ...entry,
      level,
      coveragePercent: Math.round(coverageShare * 100),
      needsOutreach: entry.candidates.length,
      nextOutlets
    };
  });
}

function sortCoverageCountries(countries, mode) {
  return [...countries].sort((a, b) => {
    if (mode === 'coverage-high') {
      return b.coveragePercent - a.coveragePercent ||
        b.covered.size - a.covered.size ||
        a.country.localeCompare(b.country);
    }
    if (mode === 'missing-high') {
      return b.uncovered.size - a.uncovered.size ||
        a.coveragePercent - b.coveragePercent ||
        a.country.localeCompare(b.country);
    }
    if (mode === 'alphabetical') return a.country.localeCompare(b.country);
    return a.coveragePercent - b.coveragePercent ||
      b.uncovered.size - a.uncovered.size ||
      a.country.localeCompare(b.country);
  });
}

const A2_TO_A3 = {
  AT: 'AUT', BE: 'BEL', CZ: 'CZE', DK: 'DNK', FI: 'FIN', FR: 'FRA', DE: 'DEU',
  NL: 'NLD', IE: 'IRL', IT: 'ITA', XK: 'CS-KM', LU: 'LUX', MT: 'MLT', GB: 'GBR',
  NO: 'NOR', PL: 'POL', ES: 'ESP', SE: 'SWE', AL: 'ALB', US: 'USA', CH: 'CHE',
  VA: 'VAT', GR: 'GRC', TR: 'TUR', UA: 'UKR', AU: 'AUS', BA: 'BIH', BR: 'BRA',
  BG: 'BGR', CA: 'CAN', HR: 'HRV', IN: 'IND', JP: 'JPN', ME: 'MNE', NZ: 'NZL',
  MK: 'MKD', RO: 'ROU', RS: 'SRB', SI: 'SVN', AD: 'AND', AM: 'ARM', AZ: 'AZE',
  BY: 'BLR', CY: 'CYP', EE: 'EST', GE: 'GEO', HU: 'HUN', IS: 'ISL', LV: 'LVA',
  LI: 'LIE', LT: 'LTU', MD: 'MDA', MC: 'MCO', PT: 'PRT', RU: 'RUS', SM: 'SMR',
  SK: 'SVK'
};

let coverageMapInstance = null;
let coverageTileLayer = null;
const COVERAGE_LABEL_MIN_ZOOM = 4;

function coverageMapTileUrl() {
  const dark = document.body.getAttribute('data-md-color-scheme') === 'slate';
  const layer = dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/{z}/{y}/{x}`;
}

function coverageCountryId(item) {
  const key = item.code || item.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `coverage-country-${key}`;
}

function coverageTags(item) {
  return (item.tags || '').split(';').map(tag => tag.trim()).filter(Boolean);
}

function coverageMapPopup(item) {
  const popup = document.createElement('div');
  popup.className = 'coverage-map-popup';

  const heading = document.createElement('strong');
  heading.className = 'coverage-map-popup__title';
  heading.textContent = item.country;
  popup.append(heading);

  const ratio = document.createElement('span');
  ratio.className = 'coverage-map-popup__ratio';
  ratio.textContent = `${item.covered.size}/${item.allOutlets.size} outlets published (${item.coveragePercent}%) · ${item.postCount} ${item.postCount === 1 ? 'post' : 'posts'}`;
  popup.append(ratio);

  const appendShortlist = (label, outlets, covered) => {
    const line = document.createElement('p');
    line.className = `coverage-map-popup__line coverage-map-popup__line--${covered ? 'yes' : 'no'}`;
    const lineLabel = document.createElement('strong');
    lineLabel.textContent = `${label}: `;
    line.append(lineLabel);

    if (!outlets.length) {
      line.append(document.createTextNode('None'));
    }

    outlets.slice(0, 3).forEach((outlet, index) => {
      if (index) line.append(document.createTextNode(', '));
      const articleUrls = (outlet.article_urls || '').split(';').map(value => value.trim()).filter(Boolean);
      if (covered && articleUrls.length) {
        const link = document.createElement('a');
        link.href = articleUrls[0];
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = outlet.outlet;
        line.append(link);
      } else {
        line.append(document.createTextNode(outlet.outlet));
      }
    });

    if (outlets.length > 3) {
      line.append(document.createTextNode(`, +${outlets.length - 3}`));
    }
    popup.append(line);
  };

  const sortedOutlets = [...item.outlets].sort((a, b) => a.outlet.localeCompare(b.outlet));
  appendShortlist('Yes', sortedOutlets.filter(outlet => (outlet.article_urls || '').trim()), true);
  appendShortlist('No', sortedOutlets.filter(outlet => !(outlet.article_urls || '').trim()), false);

  const openCountry = document.createElement('a');
  openCountry.className = 'coverage-map-popup__open-country';
  openCountry.href = `#${coverageCountryId(item)}`;
  openCountry.textContent = 'Open country list ↓';
  openCountry.addEventListener('click', event => {
    event.preventDefault();
    const details = document.getElementById(coverageCountryId(item));
    if (!details) return;
    details.open = true;
    coverageMapInstance?.closePopup();
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  popup.append(openCountry);
  return popup;
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

  const countryLabels = L.layerGroup();
  const updateCountryLabelVisibility = () => {
    if (coverageMapInstance.getZoom() >= COVERAGE_LABEL_MIN_ZOOM) {
      if (!coverageMapInstance.hasLayer(countryLabels)) countryLabels.addTo(coverageMapInstance);
    } else if (coverageMapInstance.hasLayer(countryLabels)) {
      countryLabels.removeFrom(coverageMapInstance);
    }
  };
  coverageMapInstance.on('zoomend', updateCountryLabelVisibility);

  const byA3 = new Map(priorities.map(item => [A2_TO_A3[item.code], item]));
  const style = (item, hover = false) => {
    return {
      fillColor: item ? LEVEL_META[item.level].color : '#9aa3af',
      fillOpacity: item ? (hover ? .95 : .75) : .2,
      color: '#fff',
      weight: .6
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
            ? `${name}: ${item.postCount} posts · ${item.covered.size} outlets with posts, ${item.uncovered.size} without posts`
            : `${name}: not rated`;
          layer.bindTooltip(text, { sticky: true });
          if (item) {
            layer.bindPopup(coverageMapPopup(item), { maxWidth: 360, minWidth: 240 });
            const bounds = layer.getBounds();
            const latSpan = Math.max(0, bounds.getNorth() - bounds.getSouth());
            const lngSpan = Math.max(0, bounds.getEast() - bounds.getWest());
            const labelSize = Math.min(.9, Math.max(.48, .48 + Math.sqrt(latSpan * lngSpan) * .03));
            const ratioLabel = L.divIcon({
              className: 'coverage-map-ratio-label',
              html: `<span style="--ratio-label-size:${labelSize.toFixed(2)}rem">${item.covered.size}/${item.allOutlets.size}</span>`,
              iconSize: null
            });
            L.marker(bounds.getCenter(), { icon: ratioLabel, interactive: false })
              .addTo(countryLabels);
          }
          layer.on('mouseover', () => layer.setStyle(style(item, true)));
          layer.on('mouseout', () => layer.setStyle(style(item)));
        }
      }).addTo(coverageMapInstance);
      updateCountryLabelVisibility();
    })
    .catch(() => {});

  if (legend) {
    legend.replaceChildren();
    ['green', 'lightgreen', 'orange', 'red'].forEach(level => {
      const item = document.createElement('span');
      item.className = 'coverage-map-legend-item';
      item.style.setProperty('--status-color', LEVEL_META[level].color);
      item.textContent = LEVEL_META[level].label;
      legend.append(item);
    });
  }
}

function renderPriorityList(data, sortMode = 'coverage-low', activeTag = '') {
  const root = document.getElementById('coverage-priority-list');
  const summary = document.getElementById('coverage-priority-summary');
  if (!root) return;

  const priorities = sortCoverageCountries(classifyCountries(data), sortMode);
  renderMap(priorities);
  root.replaceChildren();

  priorities.forEach((item, index) => {
    const row = document.createElement('li');
    row.className = 'coverage-priority-item';
    row.style.setProperty('--status-color', LEVEL_META[item.level].color);

    const details = document.createElement('details');
    details.className = 'coverage-country-details';
    details.id = coverageCountryId(item);
    const countrySummary = document.createElement('summary');
    countrySummary.className = 'coverage-country-summary';

    const rank = document.createElement('span');
    rank.className = 'coverage-priority-rank';
    rank.textContent = index + 1;

    const summaryContent = document.createElement('div');
    summaryContent.className = 'coverage-priority-content';

    const heading = document.createElement('div');
    heading.className = 'coverage-priority-heading';

    const country = document.createElement('strong');
    country.className = 'coverage-country-name';
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
      `${item.uncovered.size} without ${item.uncovered.size === 1 ? 'an article' : 'articles'}`
    ];
    facts.textContent = factParts.join(' · ');

    const next = document.createElement('p');
    next.className = 'coverage-priority-next';
    const nextLabel = document.createElement('strong');
    nextLabel.textContent = 'Next: ';
    next.append(nextLabel);
    if (item.nextOutlets.length) {
      item.nextOutlets.forEach((outlet, outletIndex) => {
        if (outletIndex) next.append(document.createTextNode(', '));
        if (outlet.outlet_url) {
          const link = document.createElement('a');
          link.href = outlet.outlet_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = outlet.outlet;
          link.title = `Visit ${outlet.outlet}`;
          link.addEventListener('click', event => event.stopPropagation());
          next.append(link);
        } else {
          next.append(document.createTextNode(outlet.outlet));
        }
      });
    } else {
      next.append(document.createTextNode('All listed outlets have posts.'));
    }

    summaryContent.append(heading, facts, next);
    countrySummary.append(rank, summaryContent);

    const outletList = document.createElement('ul');
    outletList.className = 'coverage-outlet-list';
    [...item.outlets]
      .sort((a, b) =>
        Number(!(a.article_urls || '').trim()) - Number(!(b.article_urls || '').trim()) ||
        a.outlet.localeCompare(b.outlet)
      )
      .forEach(outlet => {
        const outletItem = document.createElement('li');
        outletItem.className = 'coverage-outlet-item';
        const articleUrls = (outlet.article_urls || '').split(';').map(value => value.trim()).filter(Boolean);
        if (articleUrls.length) {
          outletItem.classList.add('coverage-outlet-item--covered');
        }
        const outletInfo = document.createElement('div');
        const outletName = document.createElement('strong');
        outletName.textContent = outlet.outlet;
        const outletStatus = document.createElement('span');
        outletStatus.className = 'coverage-outlet-status';
        outletStatus.textContent = articleUrls.length
          ? `${articleUrls.length} ${articleUrls.length === 1 ? 'article' : 'articles'}`
          : 'No article listed';
        outletInfo.append(outletName, outletStatus);

        if (outlet.tags) {
          const tags = document.createElement('span');
          tags.className = 'coverage-outlet-tags';
          coverageTags(outlet).forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.type = 'button';
            tagButton.textContent = tag;
            tagButton.title = `Show ${tag} on the map`;
            if (tag === activeTag) tagButton.classList.add('is-active');
            tagButton.addEventListener('click', () => {
              const tagFilter = document.getElementById('coverage-tag-filter');
              if (!tagFilter) return;
              tagFilter.value = tag;
              tagFilter.dispatchEvent(new Event('change'));
              document.getElementById('coverage-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            tags.append(tagButton);
          });
          outletInfo.append(tags);
        }

        const links = document.createElement('div');
        links.className = 'coverage-outlet-links';
        const addLink = (url, label) => {
          if (!url) return;
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = label;
          links.append(link);
        };
        const addLinks = (urls, label, dateValues = '') => {
          const values = (urls || '').split(';').map(value => value.trim()).filter(Boolean);
          const dates = dateValues.split(';').map(value => value.trim());
          values.forEach((url, index) => {
            const numberedLabel = values.length > 1 ? `${label} ${index + 1}` : label;
            addLink(url, dates[index] ? `${numberedLabel} · ${dates[index]}` : numberedLabel);
          });
        };
        addLinks(outlet.article_urls, 'Article', outlet.dates || '');
        addLinks(outlet.outlet_url, 'Website');
        addLinks(outlet.instagram_url, 'Instagram');
        if (outlet.contact_email) addLink(`mailto:${outlet.contact_email}`, 'Email');
        if (!links.childElementCount) {
          const missing = document.createElement('span');
          missing.textContent = 'No link listed';
          links.append(missing);
        }

        outletItem.append(outletInfo, links);
        outletList.append(outletItem);
      });

    details.append(countrySummary, outletList);
    row.append(details);
    root.append(row);
  });

  if (summary) {
    const sortLabels = {
      'coverage-low': 'lowest coverage first',
      'coverage-high': 'highest coverage first',
      'missing-high': 'most outlets without posts first',
      alphabetical: 'country name A–Z'
    };
    const tagSummary = activeTag ? ` · tag: ${activeTag}` : '';
    summary.textContent = `${priorities.length} countries · ${data.length} outlets · ${sortLabels[sortMode] || sortLabels['coverage-low']}${tagSummary}`;
  }
}

function setupMediaCoverage() {
  const root = document.getElementById('coverage-priority-list');
  const sort = document.getElementById('coverage-country-sort');
  const tagFilter = document.getElementById('coverage-tag-filter');
  if (!root || root.dataset.coverageReady) return;
  root.dataset.coverageReady = '1';

  fetch(new URL('media_coverage.csv', coverageAssetsBase))
    .then(response => {
      if (!response.ok) throw Error(response.status);
      return response.text();
    })
    .then(text => {
      const data = csvRows(text);
      const tags = [...new Set(data.flatMap(coverageTags))].sort((a, b) => a.localeCompare(b));
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter?.append(option);
      });
      const update = () => {
        const activeTag = tagFilter?.value || '';
        const filtered = activeTag ? data.filter(item => coverageTags(item).includes(activeTag)) : data;
        renderPriorityList(filtered, sort?.value, activeTag);
      };
      update();
      sort?.addEventListener('change', update);
      tagFilter?.addEventListener('change', update);
    })
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
