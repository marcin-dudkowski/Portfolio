(() => {
  'use strict';
  const DATA=window.GRAPH_DATA;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId=new Map(DATA.nodes.map(n=>[n.id,n]));
  const groups={bim:'BIM Coordination',research:'Research & Development',architecture:'Architecture',university:'University & Design',interests:'Beyond Architecture'};
  const groupOf=window.portfolioGroupOf;
  const groupHubs={'work-bim':'bim','research':'research','work-architecture':'architecture','university':'university','interests':'interests'};
  const projects=DATA.nodes.filter(n=>n.type==='project');
  const home=$('#network-home'),page=$('#project-page'),content=$('#project-content'),index=$('#project-index'),search=$('#project-search');
  const preview=$('#hover-preview');let current=null,returnFocus=null,scrollTop=0,currentFilter='all';
  const network=new window.ProjectNetwork($('#network-stage'),DATA,n=>{
    if(n.type==='category'){setFilter(groupHubs[n.id]||'all');}else navigate(n.id);
  },n=>{
    if(!n||n.type!=='project'||!n.thumbnail){preview.hidden=true;return;}
    preview.querySelector('img').src=n.thumbnail;preview.querySelector('span').textContent=groups[groupOf(n)]||'';
    preview.querySelector('strong').textContent=n.title;preview.querySelector('p').textContent=n.year||'Personal interests';preview.hidden=false;
  });
  function setFilter(group){currentFilter=group;network.setFilter(group);document.querySelectorAll('.filter').forEach(el=>{const active=el.dataset.filter===group;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  }
  document.querySelectorAll('.filter').forEach(el=>el.addEventListener('click',()=>setFilter(el.dataset.filter)));
  $('#zoom-in').addEventListener('click',()=>network.setZoom(network.zoom*1.2));$('#zoom-out').addEventListener('click',()=>network.setZoom(network.zoom/1.2));$('#reset-view').addEventListener('click',()=>network.reset());$('#toggle-motion').addEventListener('click',()=>network.toggleMotion());

  function openIndex(focusSearch=false){returnFocus=document.activeElement;search.value='';renderIndex('');if(!index.open)index.showModal();if(focusSearch)search.focus();else index.querySelector('.close-button').focus();}
  $('#open-index').addEventListener('click',()=>openIndex());$('#open-search').addEventListener('click',()=>openIndex(true));
  document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();openIndex(true);});
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.close).close()));
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  index.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
  search.addEventListener('input',()=>renderIndex(search.value));
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=$('#index-results a');if(first){e.preventDefault();first.click();}}});
  function renderIndex(query){const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);const entries=[byId.get('about-me'),...projects].filter(n=>{const hay=[n.title,n.description,n.body,n.year,n.role,groups[groupOf(n)],...(n.tools||[])].join(' ').toLowerCase();return terms.every(t=>hay.includes(t));});
    const sections=[];const append=(title,nodes)=>{if(!nodes.length)return;sections.push(`<section class="index-group"><h3>${esc(title)}</h3>${nodes.map(n=>`<a class="index-entry" href="#${esc(n.id)}"><span>${esc(n.title)}</span><small>${esc(n.year|| (n.type==='me'?'Profile & CV':'Personal interest'))}</small></a>`).join('')}</section>`);};
    append('Profile',entries.filter(n=>n.type==='me'));for(const [id,title]of Object.entries(groups))append(title,entries.filter(n=>groupOf(n)===id));
    $('#index-results').innerHTML=sections.join('')||'<p class="empty-results">No projects found. Try “BIM”, “Python”, “timber” or “ski”.</p>';
    $('#search-status').textContent=entries.length+' results';
    $('#index-results').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>index.close()));
  }
  function imageFigure(src,caption,{hero=false,wide=false,portrait=false}={}){const size=DATA.imageSizes?.[src];const dimensions=size?` width="${size[0]}" height="${size[1]}"`:'';return `<figure class="${hero?'hero-image':'gallery-image'}${wide?' wide':''}${portrait?' portrait':''}"><button class="image-button" data-image="${esc(src)}" data-caption="${esc(caption)}" aria-label="Enlarge ${esc(caption)}"><img src="${esc(src)}" alt="${esc(caption)}"${dimensions}${hero?' fetchpriority="high"':' loading="lazy"'} decoding="async"></button>${!hero&&caption?`<figcaption>${esc(caption)}</figcaption>`:''}</figure>`;}
  function normLink(l){if(typeof l==='string'){const [label,url]=l.split('|').map(s=>s.trim());return {label,url:url||label};}return l;}
  function caseBlock(b){
    if(b.type==='paragraph')return `<p class="case-text">${esc(b.text).replace(/\n/g,'<br>')}</p>`;
    if(b.type==='heading')return `<h2>${esc(b.text)}</h2>`;
    if(b.type==='caption')return `<p class="case-credit">${esc(b.text)}</p>`;
    if(b.type==='image'){
      const size=DATA.imageSizes[b.src],dimensions=size?` width="${size[0]}" height="${size[1]}"`:'';
      const full=b.fullSrc||b.src;
      return `<figure class="case-figure${b.labels?' has-labels':''}"><button class="image-button" data-image="${esc(full)}" data-caption="${esc(b.caption||b.alt)}" aria-label="Enlarge ${esc(b.alt)}"><img src="${esc(b.src)}" alt="${esc(b.alt)}"${dimensions} loading="lazy" decoding="async"></button>${b.labels?`<div class="figure-labels" style="--columns:${b.labels.length}">${b.labels.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${b.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`;
    }
    if(b.type==='columns')return `<div class="case-columns ${esc(b.variant||'equal')}">${b.blocks.map(x=>`<div class="case-column">${caseBlock(x)}</div>`).join('')}</div>`;
    if(b.type==='stack')return `<div class="case-stack">${b.blocks.map(caseBlock).join('')}</div>`;
    return '';
  }
  function renderCase(n){const c=n.caseStudy;
    const contact=n.type==='me'?`<div class="case-contact"><a href="mailto:mjdudkowski@gmail.com">mjdudkowski@gmail.com</a><a href="tel:+48500296603">+48 500 296 603</a>${(n.links||[]).map(normLink).filter(l=>l?.url?.includes('linkedin.com')).map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener">LinkedIn</a>`).join('')}</div>`:'';
    return `<div class="case-study"><header class="case-heading"><h1 id="project-title">${esc(c.title)}</h1>${c.subtitle?`<p class="case-subtitle">${esc(c.subtitle)}</p>`:''}${c.meta?.length?`<div class="case-meta">${c.meta.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}${contact}</header>${c.sections.map(s=>`<section class="case-section">${s.blocks.map(caseBlock).join('')}</section>`).join('')}</div>`;
  }
  function renderPage(n){
    if(n.caseStudy)return renderCase(n);
    const isAbout=n.type==='me',group=groups[groupOf(n)]||'About me';
    let html=`<header class="project-heading"><div><p class="eyebrow">${esc(group)}</p><h1 id="project-title">${esc(n.title)}</h1></div><p class="project-intro">${esc(n.description||n.projectType||'')}</p></header>`;
    const meta=[['Year',n.year],['Role',n.role],['Context',n.projectType],['Tools',(n.tools||[]).join(' / ')]].filter(([,v])=>v);
    if(meta.length)html+=`<dl class="project-meta">${meta.map(([k,v])=>`<div class="meta-item"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    if(n.thumbnail&&!isAbout)html+=imageFigure(n.thumbnail,n.title,{hero:true});
    html+='<div class="project-reading">';
    if(isAbout&&n.thumbnail)html+=imageFigure(n.thumbnail,'Portrait of Marcin Dudkowski',{hero:true,portrait:true});
    const body=(n.body||'').replace(/^# [^\n]+\n/m,'');html+=`<div class="project-body">${window.renderMarkdown(body)}</div>`;
    const links=(n.links||[]).map(normLink).filter(l=>l?.url&&!/\.pdf(?:$|[?#])/i.test(l.url));
    if(links.length)html+=`<div class="project-downloads">${links.map(l=>`<a href="${esc(l.url)}" ${/^(mailto:|tel:)/.test(l.url)?'':'target="_blank" rel="noopener"'}>${esc(l.label)}</a>`).join('')}</div>`;
    html+='</div>';
    const images=(n.images||[]).filter(i=>i.src!==n.thumbnail);if(images.length)html+=`<div class="gallery">${images.map((im,i)=>imageFigure(im.src,im.caption||n.title+' — project image',{wide:images.length===1||(images.length%2===1&&i===images.length-1)})).join('')}</div>`;
    const videos=[n.heroVideo,...(n.videos||[])].filter(Boolean);if(videos.length)html+=`<div class="gallery">${videos.map(v=>`<figure class="wide"><video controls playsinline preload="none" poster="${esc(n.thumbnail)}">${v.sources.map(s=>`<source src="${esc(s.src)}" type="${esc(s.type)}">`).join('')}Your browser does not support this video.</video><figcaption>Interior animation study</figcaption></figure>`).join('')}</div>`;
    if(n.models?.length)html+=`<section class="model-section"><h2>Explore the model</h2>${n.models.map(src=>`<model-viewer src="${esc(src)}" alt="Interactive model of ${esc(n.title)}" camera-controls touch-action="pan-y" loading="lazy" reveal="auto" environment-image="neutral" shadow-intensity="0.4" exposure="1" poster="${esc(n.thumbnail)}"></model-viewer>`).join('')}<p>Drag to rotate. Scroll or pinch to zoom.</p></section>`;
    let related=projects.filter(x=>x.id!==n.id&&groupOf(x)===groupOf(n)).slice(0,5);
    if(isAbout)related=[byId.get('work-bim-project-01'),byId.get('research-revit-add-ins'),byId.get('interests-craft'),byId.get('interests-ski-touring')];
    if(n.id==='research-cobie')related=[byId.get('work-bim-project-02'),byId.get('work-bim-project-03'),byId.get('research-revit-add-ins')];
    if(related.length)html+=`<section class="related"><h2>Follow a connection</h2><div class="related-links">${related.map(r=>`<a href="#${esc(r.id)}">${esc(r.title)}</a>`).join('')}</div></section>`;
    return html;
  }
  function openPage(id){const n=byId.get(id);if(!n||n.type==='category')return;if(!current){returnFocus=document.activeElement;scrollTop=window.scrollY;}current=id;index.close();preview.hidden=true;home.hidden=true;page.hidden=false;document.body.classList.add('page-open');network.setVisible(false);content.innerHTML=renderPage(n);$('#project-location').textContent=groups[groupOf(n)]||'Profile & CV';document.title=n.title+' — Marcin Dudkowski';window.scrollTo({top:0,behavior:'instant'});page.focus({preventScroll:true});
    content.querySelectorAll('[data-image]').forEach(btn=>btn.addEventListener('click',()=>openImage(btn)));
    content.querySelectorAll('model-viewer').forEach(viewer=>{
      const setMaterials=()=>{for(const material of viewer.model?.materials||[]){
        material.pbrMetallicRoughness.setBaseColorFactor([.78,.80,.83,1]);
        material.pbrMetallicRoughness.setMetallicFactor(0);
        material.pbrMetallicRoughness.setRoughnessFactor(.85);
        material.setEmissiveFactor([.03,.03,.03]);
        for(const texture of [material.pbrMetallicRoughness.baseColorTexture,material.pbrMetallicRoughness.metallicRoughnessTexture,material.emissiveTexture,material.normalTexture])texture?.setTexture(null);
      }};
      viewer.addEventListener('load',setMaterials);if(viewer.loaded)setMaterials();
    });
    if(n.models?.length&&!document.querySelector('script[data-model-viewer]')){const s=document.createElement('script');s.type='module';s.src='model-viewer.min.js';s.dataset.modelViewer='';document.head.append(s);}
  }
  const viewer=$('#image-viewer'),viewport=viewer.querySelector('.image-viewport'),largeImage=viewer.querySelector('img');
  let imageScale=1,imageSourceButton=null;
  function fitImage(){
    const width=largeImage.naturalWidth,height=largeImage.naturalHeight;
    if(!width||!height)return;
    const fit=Math.min(viewport.clientWidth/width,viewport.clientHeight/height,1);
    largeImage.style.width=Math.round(width*fit*imageScale)+'px';largeImage.style.height=Math.round(height*fit*imageScale)+'px';
    $('#image-zoom-out').disabled=imageScale<=1;$('#image-zoom-in').disabled=imageScale>=8;
  }
  function openImage(button){imageSourceButton=button;imageScale=1;largeImage.removeAttribute('style');largeImage.src=button.dataset.image;largeImage.alt=button.dataset.caption;viewer.querySelector('p').textContent=button.dataset.caption;viewer.showModal();viewport.scrollTo(0,0);fitImage();}
  largeImage.addEventListener('load',fitImage);
  $('#image-zoom-in').addEventListener('click',()=>{imageScale=Math.min(8,imageScale*1.5);fitImage();});
  $('#image-zoom-out').addEventListener('click',()=>{imageScale=Math.max(1,imageScale/1.5);fitImage();});
  $('#image-fit').addEventListener('click',()=>{imageScale=1;fitImage();viewport.scrollTo(0,0);});
  viewer.addEventListener('close',()=>{if(imageSourceButton?.isConnected)imageSourceButton.focus({preventScroll:true});});
  window.addEventListener('resize',()=>{if(viewer.open)fitImage();});
  function closePage(){if(!current)return;current=null;page.hidden=true;content.innerHTML='';home.hidden=false;document.body.classList.remove('page-open');network.setVisible(true);document.title='Marcin Dudkowski — Architecture, BIM & Digital Craft';window.scrollTo({top:scrollTop,behavior:'instant'});if(returnFocus?.isConnected&&!returnFocus.closest('dialog'))returnFocus.focus({preventScroll:true});else $('#open-index').focus({preventScroll:true});}
  function route(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{id='';}if(id==='work-bim-project-05')id='research-parametric-design';if(id==='project-index'){closePage();openIndex(true);return;}const n=byId.get(id);if(n?.type==='category'){closePage();setFilter(groupHubs[id]||'all');}else if(n)openPage(id);else closePage();}
  function navigate(id){if(location.hash==='#'+id)openPage(id);else location.hash=id;}
  $('#back-to-network').addEventListener('click',()=>{history.pushState(null,'',location.pathname+location.search);closePage();});
  document.querySelector('.identity').addEventListener('click',e=>{e.preventDefault();history.pushState(null,'',location.pathname+location.search);closePage();setFilter('all');network.reset();});
  window.addEventListener('hashchange',route);
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!$('#image-viewer').open){e.preventDefault();openIndex(true);}if(e.key==='Escape'&&!index.open&&!$('#image-viewer').open&&current){e.preventDefault();history.pushState(null,'',location.pathname+location.search);closePage();}});
  setFilter('all');route();
})();
