function csvRows(text) {
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

const directoryAssetsBase = new URL('.', document.currentScript.src);
const directorySiteBase = new URL('../', directoryAssetsBase);

function renderSourceFeed(root, items) {
  root.replaceChildren();
  items.forEach((source, index) => {
    const article = document.createElement('article');
    article.className = 'source-feed-row';

    const rank = document.createElement('div');
    rank.className = 'source-feed-rank';
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    const id = document.createElement('small');
    id.textContent = source.source_id;
    rank.append(number, id);

    const body = document.createElement('div');
    body.className = 'source-feed-body';
    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.href = source.url.startsWith('http') ? source.url : new URL(source.url, directorySiteBase).href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = source.title;
    const domain = document.createElement('small');
    domain.className = 'source-feed-domain';
    try { domain.textContent = new URL(link.href).hostname.replace(/^www\./, ''); }
    catch { domain.textContent = 'local document'; }
    heading.append(link, domain);

    const meta = document.createElement('p');
    meta.className = 'source-feed-meta';
    meta.textContent = [source.publisher, source.published_date, source.category, source.media_type].filter(Boolean).join(' · ');

    const topic = document.createElement('p');
    topic.className = 'source-feed-topic';
    topic.textContent = source.topic;

    const verification = document.createElement('p');
    verification.className = 'source-feed-verification';
    verification.textContent = source.verification;

    const actions = document.createElement('div');
    actions.className = 'source-feed-actions';
    const open = document.createElement('a');
    open.href = link.href;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'Open source ↗';
    const attribution = document.createElement('span');
    attribution.textContent = source.attribution ? `Credit: ${source.attribution}` : '';
    actions.append(open);
    if (attribution.textContent) actions.append(attribution);

    body.append(heading, meta);
    if (topic.textContent) body.append(topic);
    body.append(verification, actions);
    article.append(rank, body);
    root.append(article);
  });
}

function renderIncidentCards(root, items) {
  root.replaceChildren();
  items.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'source-feed-row';

    const rank = document.createElement('div');
    rank.className = 'source-feed-rank';
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    const id = document.createElement('small');
    id.textContent = item.incident_id;
    rank.append(number, id);

    const body = document.createElement('div');
    body.className = 'source-feed-body';
    const heading = document.createElement('h3');
    heading.textContent = item.incident_type;
    const meta = document.createElement('p');
    meta.className = 'source-feed-meta';
    meta.textContent = [item.event_date, item.location, item.affected_group].filter(Boolean).join(' · ');
    const summary = document.createElement('p');
    summary.className = 'source-feed-topic';
    summary.textContent = item.summary;
    const note = document.createElement('small');
    note.className = 'source-feed-verification';
    note.textContent = [item.evidence_status, item.source_ids && `Sources: ${item.source_ids}`, item.adcn_reference].filter(Boolean).join(' · ');
    body.append(heading, meta, summary, note);
    if (item.adcn_brief_url) {
      const link = document.createElement('a');
      link.className = 'source-feed-actions';
      link.href = item.adcn_brief_url.startsWith('http') ? item.adcn_brief_url : new URL(item.adcn_brief_url, directorySiteBase).href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open ADCN brief ↗';
      body.append(link);
    }
    article.append(rank, body);
    root.append(article);
  });
}

function setupRegistry() {
  for (const mode of ['source', 'incident']) {
    const root = document.getElementById(`${mode}-results`);
    if (!root || root.dataset.ready) continue;
    root.dataset.ready = '1';
    const search = document.getElementById(`${mode}-search`);
    const filter = document.getElementById(`${mode}-filter`);
    const count = document.getElementById(`${mode}-count`);
    const file = mode === 'source' ? 'sources.csv' : 'incidents.csv';
    fetch(new URL(file, directoryAssetsBase))
      .then(response => {
        if (!response.ok) throw Error(response.status);
        return response.text();
      })
      .then(text => {
        const data = csvRows(text);
        const filterKey = mode === 'source' ? 'category' : 'affected_group';
        [...new Set(data.map(item => item[filterKey]).filter(Boolean))].sort().forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          filter.append(option);
        });
        function render() {
          const term = search.value.toLocaleLowerCase();
          const items = data.filter(item =>
            (!filter.value || item[filterKey] === filter.value) &&
            (!term || Object.values(item).join(' ').toLocaleLowerCase().includes(term))
          );
          count.textContent = `${items.length} of ${data.length} entries`;
          if (mode === 'source') renderSourceFeed(root, items);
          else renderIncidentCards(root, items);
        }
        search.addEventListener('input', render);
        filter.addEventListener('change', render);
        render();
      })
      .catch(() => { root.textContent = 'Could not load CSV. Serve with mkdocs serve rather than opening files directly.'; });
  }
}

document.addEventListener('DOMContentLoaded', setupRegistry);
if (typeof document$ !== 'undefined') document$.subscribe(setupRegistry);
