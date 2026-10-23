function comparisonRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(cell);
      if (row.some(value => value)) rows.push(row);
      row = []; cell = '';
    } else cell += character;
  }
  row.push(cell);
  if (row.some(value => value)) rows.push(row);
  const headers = rows.shift().map(value => value.replace(/^\uFEFF/, ''));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

const comparisonDataBase = new URL('../data/', document.currentScript.src);

function comparisonClaims(value) {
  return (value || '').split('|').map(claim => claim.trim()).filter(Boolean);
}

function comparisonLinks(value) {
  return (value || '').split(';').map(url => url.trim()).filter(Boolean);
}

function renderEvidenceComparisons(root, records) {
  root.replaceChildren();
  records.forEach(record => {
    const article = document.createElement('article');
    article.className = 'evidence-comparison-card';

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = record.outlet;
    const meta = document.createElement('p');
    meta.textContent = [record.country, record.dates].filter(Boolean).join(' · ');
    header.append(title, meta);

    const claims = document.createElement('ul');
    claims.className = 'evidence-comparison-claims';
    comparisonClaims(record.evidence).forEach(text => {
      const claim = document.createElement('li');
      claim.textContent = text;
      claims.append(claim);
    });

    const links = document.createElement('div');
    links.className = 'evidence-comparison-links';
    comparisonLinks(record.article_urls).forEach((url, index, urls) => {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = urls.length > 1 ? `Source ${index + 1} ↗` : 'Open source ↗';
      links.append(link);
    });
    article.append(header, claims);
    if (links.childElementCount) article.append(links);
    root.append(article);
  });
}

function setupEvidenceComparison() {
  const root = document.getElementById('evidence-comparison-results');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  const search = document.getElementById('comparison-search');
  const country = document.getElementById('comparison-country');
  const sort = document.getElementById('comparison-sort');
  const resultCount = document.getElementById('comparison-result-count');

  fetch(new URL('media_coverage.csv', comparisonDataBase))
    .then(response => {
      if (!response.ok) throw Error(response.status);
      return response.text();
    })
    .then(text => {
      const records = comparisonRows(text).filter(record => record.evidence.trim());
      [...new Set(records.map(record => record.country).filter(Boolean))].sort().forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        country.append(option);
      });
      document.getElementById('comparison-source-count').textContent = records.length;
      document.getElementById('comparison-claim-count').textContent = records.reduce((total, record) => total + comparisonClaims(record.evidence).length, 0);
      document.getElementById('comparison-country-count').textContent = new Set(records.map(record => record.country)).size;

      function update() {
        const term = search.value.trim().toLocaleLowerCase();
        const filtered = records.filter(record =>
          (!country.value || record.country === country.value) &&
          (!term || Object.values(record).join(' ').toLocaleLowerCase().includes(term))
        );
        filtered.sort((a, b) => {
          if (sort.value === 'source') return a.outlet.localeCompare(b.outlet);
          const direction = sort.value === 'date-old' ? 1 : -1;
          return direction * (a.dates || '').localeCompare(b.dates || '') || a.outlet.localeCompare(b.outlet);
        });
        resultCount.textContent = `${filtered.length} of ${records.length} sources`;
        renderEvidenceComparisons(root, filtered);
      }
      search.addEventListener('input', update);
      country.addEventListener('change', update);
      sort.addEventListener('change', update);
      update();
    })
    .catch(() => { root.textContent = 'Could not load the evidence data. Serve the site with mkdocs serve.'; });
}

document.addEventListener('DOMContentLoaded', setupEvidenceComparison);
if (typeof document$ !== 'undefined') document$.subscribe(setupEvidenceComparison);
