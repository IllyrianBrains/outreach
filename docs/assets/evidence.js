const evidenceAssetsBase=new URL('.',document.currentScript.src),evidenceSiteBase=new URL('../',evidenceAssetsBase);
function evidenceBadge(status){
  const s=(status||'').toLowerCase();
  if(s.includes('unverified'))return['Unverified','warn'];
  if(s.includes('alleg'))return['Alleged','warn'];
  if(s.includes('reported'))return['Reported','info'];
  if(s.includes('visible'))return['Visible in footage','ok'];
  if(s.includes('photograph'))return['Published photo','ok'];
  if(s.includes('caption'))return['Publisher caption','neutral'];
  return[status||'Unlabeled','neutral'];
}
function evidenceLightbox(){
  let lb=document.getElementById('evidence-lightbox');
  if(lb)return lb;
  lb=document.createElement('div');lb.id='evidence-lightbox';lb.className='evidence-lightbox';
  const img=document.createElement('img');
  const close=document.createElement('button');close.type='button';close.className='evidence-lightbox-close';close.setAttribute('aria-label','Close image');close.textContent='×';
  lb.append(img,close);
  lb.addEventListener('click',e=>{if(e.target===lb||e.target===close)lb.classList.remove('is-open')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('is-open')});
  document.body.append(lb);
  return lb;
}
function openEvidenceLightbox(src,alt){
  const lb=evidenceLightbox();
  const img=lb.querySelector('img');img.src=src;img.alt=alt||'';
  lb.classList.add('is-open');
}
function setupEvidence(){const root=document.getElementById('evidence-results');if(!root||root.dataset.ready)return;root.dataset.ready='1';
  const search=document.getElementById('evidence-search'),filter=document.getElementById('evidence-filter'),sort=document.getElementById('evidence-sort'),clear=document.getElementById('evidence-clear'),count=document.getElementById('evidence-count');
  fetch(new URL('incident_evidence.csv',evidenceAssetsBase)).then(r=>{if(!r.ok)throw Error(r.status);return r.text()}).then(t=>{
    const data=csvRows(t);
    [...new Set(data.map(x=>x.media_type).filter(Boolean))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;filter.append(o)});
    function render(){
      const q=search.value.toLowerCase();
      let items=data.filter(x=>(!filter.value||x.media_type===filter.value)&&(!q||Object.values(x).join(' ').toLowerCase().includes(q)));
      items=items.slice().sort((a,b)=>{
        const da=Date.parse(a.event_date),db=Date.parse(b.event_date),ua=isNaN(da),ub=isNaN(db);
        if(ua||ub)return ua===ub?0:ua?1:-1;
        return sort.value==='date-asc'?da-db:db-da;
      });
      count.textContent=items.length===data.length?data.length+' entries':items.length+' of '+data.length+' entries';
      root.replaceChildren();
      if(!items.length){
        const empty=document.createElement('p');empty.className='evidence-empty';empty.textContent='No evidence matches that search or filter.';root.append(empty);return;
      }
      for(const x of items){
        const card=document.createElement('article');card.className='evidence-card';
        const publisherUrl=x.publisher_url&&(x.publisher_url.startsWith('http')?x.publisher_url:new URL(x.publisher_url,evidenceSiteBase).href);
        const media=document.createElement('div');media.className='evidence-media';
        if(x.image_url){
          const imgUrl=x.image_url.startsWith('http')?x.image_url:new URL(x.image_url,evidenceSiteBase).href;
          const im=document.createElement('img');im.src=imgUrl;im.alt='';im.loading='lazy';media.append(im);
          const zoom=document.createElement('button');zoom.type='button';zoom.className='evidence-zoom';zoom.setAttribute('aria-label','View full image');zoom.textContent='⤢';
          zoom.addEventListener('click',e=>{e.stopPropagation();openEvidenceLightbox(imgUrl,x.evidence_title)});
          media.append(zoom);
        }else{
          media.classList.add('evidence-media--empty');media.textContent=(x.media_type||'Evidence').split('/')[0];
        }
        const[badgeText,badgeTone]=evidenceBadge(x.observation);
        const badge=document.createElement('span');badge.className='evidence-badge evidence-badge--'+badgeTone;badge.textContent=badgeText;media.append(badge);
        card.append(media);
        const body=document.createElement('div');body.className='evidence-body';
        const h=document.createElement('h3');h.textContent=x.evidence_title;
        const meta=document.createElement('p');meta.className='evidence-meta';meta.textContent=[x.event_date,x.media_type].filter(Boolean).join(' · ');
        const p=document.createElement('p');p.textContent=x.description;
        body.append(meta,h,p);
        const noteParts=[x.incident_id,x.source_id,x.adcn_reference].filter(Boolean).join(' · ');
        if(noteParts){const ref=document.createElement('small');ref.className='evidence-reference';ref.textContent=noteParts;body.append(ref)}
        if(publisherUrl){const link=document.createElement('a');link.className='evidence-source-link';link.textContent='Open source ↗';link.href=publisherUrl;link.target='_blank';link.rel='noopener noreferrer';body.append(link)}
        card.append(body);
        root.append(card);
      }
    }
    search.addEventListener('input',render);filter.addEventListener('change',render);sort.addEventListener('change',render);
    clear.addEventListener('click',()=>{search.value='';filter.value='';sort.value='date-desc';search.focus();render()});render();
  }).catch(()=>root.textContent='Unable to load evidence CSV. Use mkdocs serve.')}
document.addEventListener('DOMContentLoaded',setupEvidence);if(typeof document$!=='undefined')document$.subscribe(setupEvidence);
