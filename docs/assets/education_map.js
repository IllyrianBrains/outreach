const educationMapAssetsBase = new URL('.', document.currentScript.src);

function setupEducationMap() {
  const container = document.getElementById('education-map');
  if (!container || container.dataset.ready || typeof L === 'undefined') return;
  container.dataset.ready = '1';

  const search = document.getElementById('education-map-search');
  const category = document.getElementById('education-map-category');
  const status = document.getElementById('education-map-status');
  const municipalitiesToggle = document.getElementById('education-map-municipalities');
  const radiusToggle = document.getElementById('education-map-radius');
  const clear = document.getElementById('education-map-clear');
  const count = document.getElementById('education-map-count');
  const map = L.map(container, { center: [41.15, 20.1], zoom: 7, minZoom: 6, maxZoom: 18 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    maxZoom: 19
  }).addTo(map);
  map.createPane('municipalitiesPane');
  map.getPane('municipalitiesPane').style.zIndex = 350;
  const municipalities = L.geoJSON(null, {
    pane: 'municipalitiesPane',
    style: { color: '#6b7280', weight: 1, opacity: .55, fillOpacity: 0 },
    onEachFeature: (feature, layer) => layer.bindTooltip(`${feature.properties.name} municipality`, { sticky: true })
  });
  if (municipalitiesToggle.checked) municipalities.addTo(map);
  const Legend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'education-map-legend');
      div.setAttribute('aria-label', 'Map legend');
      div.innerHTML = '<span class="education-map-legend__active">Directly reported</span>'
        + '<span class="education-map-legend__assumed">Assumed from city report</span>'
        + '<span class="education-map-legend__municipality">Municipality boundary</span>'
        + '<span class="education-map-legend__radius">Approx. area affected</span>'
        + '<span class="education-map-legend__university">University</span>'
        + '<span class="education-map-legend__gymnasium">Gymnasium</span>';
      return div;
    }
  });
  new Legend().addTo(map);
  map.createPane('radiusPane');
  map.getPane('radiusPane').style.zIndex = 380;
  const radiusCircles = L.layerGroup().addTo(map);
  fetch(new URL('education_municipality_boundaries.geojson', educationMapAssetsBase))
    .then(response => {
      if (!response.ok) throw Error(response.status);
      return response.json();
    })
    .then(data => municipalities.addData(data))
    .catch(() => { municipalitiesToggle.checked = false; municipalitiesToggle.disabled = true; });
  municipalitiesToggle.addEventListener('change', () => {
    if (municipalitiesToggle.checked) municipalities.addTo(map);
    else municipalities.removeFrom(map);
  });
  const markers = L.layerGroup().addTo(map);

  Promise.all(['albania_education.csv', 'education_protest_status.csv', 'education_protest_cities.csv'].map(file =>
    fetch(new URL(file, educationMapAssetsBase)).then(response => {
      if (!response.ok) throw Error(response.status);
      return response.text();
    })
  ))
    .then(([educationText, protestText, cityText]) => {
      const protestByOsm = new Map(csvRows(protestText).map(item => [`${item.osm_type}/${item.osm_id}`, item]));
      const normalizeCity = value => {
        const normalized = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
        return { tirana: 'tirane', vlora: 'vlore' }[normalized] || normalized;
      };
      const protestCities = csvRows(cityText);
      const protestByCity = new Map(protestCities.map(item => [normalizeCity(item.city), item]));
      const distanceKm = (lat1, lon1, lat2, lon2) => {
        const toRadians = value => value * Math.PI / 180;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const data = csvRows(educationText).map(item => ({
        ...item,
        protest: protestByOsm.get(`${item.osm_type}/${item.osm_id}`)
          || protestByCity.get(normalizeCity(item.city))
          || protestCities.find(city => distanceKm(Number(item.latitude), Number(item.longitude), Number(city.latitude), Number(city.longitude)) <= Number(city.radius_km))
      }));
      const universities = data.filter(item => item.category === 'University').length;
      const gymnasiums = data.filter(item => item.category === 'Gymnasium').length;
      const active = data.filter(item => item.protest).length;
      const directlyReported = data.filter(item => item.protest?.status === 'Reported participating').length;
      document.getElementById('education-stat-total').textContent = data.length.toLocaleString();
      document.getElementById('education-stat-universities').textContent = universities.toLocaleString();
      document.getElementById('education-stat-gymnasiums').textContent = gymnasiums.toLocaleString();
      document.getElementById('education-stat-active').textContent = active.toLocaleString();
      document.getElementById('education-stat-active').title = `${directlyReported} directly reported; ${active - directlyReported} assumed from city-level reporting`;

      const STUDENTS_PER_GYMNASIUM = 300;
      const STUDENTS_PER_UNIVERSITY = 1000;
      const PROTEST_PARTICIPATION_RATE = 0.75;
      const UNKNOWN_GYMNASIUMS = 20;
      const UNKNOWN_UNIVERSITIES = 5;
      const mappedGymnasiums = data.filter(item => item.protest && item.category === 'Gymnasium').length;
      const mappedUniversities = data.filter(item => item.protest && item.category === 'University').length;
      const activeGymnasiums = mappedGymnasiums + UNKNOWN_GYMNASIUMS;
      const activeUniversities = mappedUniversities + UNKNOWN_UNIVERSITIES;
      const gymStudents = activeGymnasiums * STUDENTS_PER_GYMNASIUM;
      const uniStudents = activeUniversities * STUDENTS_PER_UNIVERSITY;
      const setCell = (id, value) => {
        const cell = document.getElementById(id);
        if (cell) cell.textContent = value.toLocaleString();
      };
      setCell('education-estimate-gym-count', mappedGymnasiums);
      setCell('education-estimate-uni-count', mappedUniversities);
      setCell('education-estimate-total-count', mappedGymnasiums + mappedUniversities);
      setCell('education-estimate-gym-unknown', UNKNOWN_GYMNASIUMS);
      setCell('education-estimate-uni-unknown', UNKNOWN_UNIVERSITIES);
      setCell('education-estimate-total-unknown', UNKNOWN_GYMNASIUMS + UNKNOWN_UNIVERSITIES);
      setCell('education-estimate-gym-active-total', activeGymnasiums);
      setCell('education-estimate-uni-active-total', activeUniversities);
      setCell('education-estimate-total-active-total', activeGymnasiums + activeUniversities);
      setCell('education-estimate-gym-students', gymStudents);
      setCell('education-estimate-uni-students', uniStudents);
      setCell('education-estimate-total-students', gymStudents + uniStudents);
      setCell('education-estimate-gym-protesting', Math.round(gymStudents * PROTEST_PARTICIPATION_RATE));
      setCell('education-estimate-uni-protesting', Math.round(uniStudents * PROTEST_PARTICIPATION_RATE));
      setCell('education-estimate-total-protesting', Math.round((gymStudents + uniStudents) * PROTEST_PARTICIPATION_RATE));

      function render() {
        const term = search.value.trim().toLocaleLowerCase();
        const visible = data.filter(item =>
          (!category.value || item.category === category.value) &&
          (!status.value || (status.value === 'active' ? item.protest : item.protest?.status === status.value)) &&
          (!term || [item.name, item.city, item.street].join(' ').toLocaleLowerCase().includes(term))
        );
        markers.clearLayers();
        radiusCircles.clearLayers();
        const bounds = [];

        visible.forEach(item => {
          const lat = Number(item.latitude);
          const lon = Number(item.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          if (radiusToggle.checked) {
            L.circle([lat, lon], {
              pane: 'radiusPane',
              radius: item.category === 'University' ? 6000 : 3000,
              color: '#ad1457', weight: 1.5, opacity: .5, fillColor: '#ad1457', fillOpacity: .15
            }).addTo(radiusCircles);
          }
          const directlyReported = item.protest?.status === 'Reported participating';
          const assumedActive = item.protest?.status === 'Assumed active from city report';
          const color = directlyReported ? '#ad1457' : (assumedActive ? '#f06292' : (item.category === 'University' ? '#e15d34' : '#26758a'));
          const marker = L.circleMarker([lat, lon], {
            radius: item.protest ? 9 : (item.category === 'University' ? 7 : 6),
            color: directlyReported ? '#6a0937' : (assumedActive ? '#ad1457' : '#fff'), weight: item.protest ? 3 : 1.5, fillColor: color, fillOpacity: .92
          });
          const popup = document.createElement('div');
          popup.className = 'education-map-popup';
          const heading = document.createElement('strong');
          heading.textContent = item.name;
          const type = document.createElement('span');
          type.textContent = item.category;
          popup.append(heading, type);
          if (item.protest) {
            const badge = document.createElement('b');
            badge.className = `education-map-popup__active${assumedActive ? ' education-map-popup__active--assumed' : ''}`;
            badge.textContent = directlyReported ? 'Directly reported participating' : item.protest.status;
            popup.append(badge);
          }
          const address = [item.street, item.city].filter(Boolean).join(', ');
          if (address) {
            const location = document.createElement('span');
            location.textContent = address;
            popup.append(location);
          }
          const links = document.createElement('div');
          const osm = document.createElement('a');
          osm.href = item.osm_url;
          osm.target = '_blank';
          osm.rel = 'noopener noreferrer';
          osm.textContent = 'OpenStreetMap ↗';
          links.append(osm);
          if (item.protest) {
            if (item.protest.source_url) {
              const evidence = document.createElement('a');
              evidence.href = item.protest.source_url;
              evidence.target = '_blank';
              evidence.rel = 'noopener noreferrer';
              evidence.textContent = `${item.protest.source_name} evidence ↗`;
              links.append(evidence);
            }
            const note = document.createElement('small');
            note.textContent = [item.protest.evidence_date, item.protest.note].filter(Boolean).join(': ');
            popup.append(note);
          }
          if (item.website) {
            const website = document.createElement('a');
            website.href = /^https?:\/\//i.test(item.website) ? item.website : `https://${item.website}`;
            website.target = '_blank';
            website.rel = 'noopener noreferrer';
            website.textContent = 'Website ↗';
            links.append(website);
          }
          popup.append(links);
          marker.bindPopup(popup).addTo(markers);
          bounds.push([lat, lon]);
        });
        count.textContent = visible.length === data.length ? `${data.length} institutions` : `${visible.length} of ${data.length} institutions`;
        if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
      }

      search.addEventListener('input', render);
      category.addEventListener('change', render);
      status.addEventListener('change', render);
      radiusToggle.addEventListener('change', render);
      clear.addEventListener('click', () => {
        search.value = '';
        category.value = '';
        status.value = '';
        municipalitiesToggle.checked = true;
        municipalities.addTo(map);
        radiusToggle.checked = true;
        render();
        search.focus();
      });
      render();
    })
    .catch(() => {
      count.textContent = 'The education map data could not be loaded.';
    });
}

document.addEventListener('DOMContentLoaded', setupEducationMap);
if (typeof document$ !== 'undefined') document$.subscribe(setupEducationMap);
