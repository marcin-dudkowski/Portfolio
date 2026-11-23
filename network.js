/* A lightweight canvas network with real HTML buttons for every project. */
(() => {
  'use strict';
  const POSITIONS={
    'about-me':[.485,.425,65],
    'work-bim':[.66,.22,25],
    'work-bim-project-01':[.535,.065,50],
    'work-bim-project-04':[.815,.06,-25],
    'work-bim-project-03':[.90,.24,10],
    'work-bim-project-02':[.765,.375,-30],
    'research':[.765,.60,30],
    'research-parametric-design':[.943,.48,-15],
    'research-revit-add-ins':[.89,.755,35],
    'research-independent-software':[.72,.90,-30],
    'research-cobie':[.588,.665,10],
    'work-architecture':[.33,.36,5],
    'work-architecture-project-01':[.365,.065,-35],
    'work-architecture-project-02':[.225,.28,10],
    'work-architecture-project-03':[.20,.475,10],
    'work-architecture-project-04':[.39,.545,-20],
    'university':[.355,.755,30],
    'university-project-01':[.295,.63,20],
    'university-project-02':[.225,.805,-20],
    'university-project-03':[.17,.635,-30],
    'university-project-04':[.435,.94,-15],
    'university-project-05':[.49,.79,15],
    'university-project-06':[.12,.90,-15],
    'university-project-07':[.28,.96,10],
    'interests':[.075,.49,5],
    'interests-craft':[.065,.715,-20],
    'interests-ski-touring':[.08,.39,30],
  };
  const HUBS={bim:'work-bim',research:'research',architecture:'work-architecture',university:'university',interests:'interests'};
  const groupOf=n=>n.id.startsWith('work-bim')?'bim':n.id.startsWith('work-architecture')?'architecture':n.id.split('-')[0];
  class ProjectNetwork {
    constructor(stage,data,onOpen,onHover){
      this.stage=stage;this.canvas=stage.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.layer=stage.querySelector('#network-nodes');
      this.data=data;this.onOpen=onOpen;this.onHover=onHover;this.filter='all';this.zoom=1;this.pan={x:0,y:0};this.turn=0;this.pitch=0;this.hover=null;this.raf=0;this.lastFrame=0;this.time=0;this.visible=true;
      this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.paused=this.motionQuery.matches;
      this.nodes=data.nodes.filter(n=>POSITIONS[n.id]).map((n,i)=>{
        const el=document.createElement('button');el.type='button';el.className='network-node '+(n.type==='me'?'is-about':n.type==='category'?'is-hub':'is-project');el.dataset.id=n.id;
        const sphere=document.createElement('span');sphere.className='node-sphere';sphere.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.className='node-label';label.textContent=n.type==='me'?'Marcin Dudkowski':n.id==='work-bim'?'BIM coordination':n.id==='research'?'Research & development':n.id==='interests'?'Beyond work':n.id==='university'?'University & design':n.title;
        if(n.type==='me'){const sub=document.createElement('small');sub.textContent='About me';label.append(sub);}
        el.append(sphere,label);el.setAttribute('aria-label',(n.type==='category'?'Explore ':n.type==='me'?'About ':'Open project: ')+n.title);
        const size=n.type==='me'?40:n.type==='category'?26:12+(i%4)*3;el.style.setProperty('--size',size+'px');this.layer.append(el);
        const node={...n,el,group:groupOf(n),base:POSITIONS[n.id],size};
        el.addEventListener('click',()=>{if(!this.dragged)this.onOpen(n);});
        el.addEventListener('pointerenter',()=>{if(!this.drag){this.setHover(n.id);this.onHover(n);}});
        el.addEventListener('pointerleave',()=>{this.setHover(null);this.onHover(null);});
        el.addEventListener('focus',()=>{this.setHover(n.id);this.onHover(n);});
        el.addEventListener('blur',()=>{this.setHover(null);this.onHover(null);});
        return node;
      });
      this.byId=new Map(this.nodes.map(n=>[n.id,n]));
      this.edges=[];Object.values(HUBS).forEach(id=>this.edges.push(['about-me',id]));
      this.nodes.filter(n=>n.type==='project').forEach(n=>this.edges.push([HUBS[n.group],n.id]));
      // These two project applications are explicitly described in the portfolio.
      this.edges.push(['work-bim-project-02','research-cobie'],['work-bim-project-03','research-cobie']);
      this.edges=this.edges.filter(e=>e.every(id=>this.byId.has(id)));
      this.bind();new ResizeObserver(()=>this.resize()).observe(stage);this.resize();
      this.motionQuery.addEventListener('change',e=>{this.paused=e.matches;this.syncMotionButton();this.invalidate();});
      document.addEventListener('visibilitychange',()=>this.invalidate());this.syncMotionButton();
    }
    syncMotionButton(){const b=document.querySelector('#toggle-motion');b.setAttribute('aria-pressed',String(this.paused));b.setAttribute('aria-label',this.paused?'Resume network motion':'Pause network motion');b.title=this.paused?'Resume motion':'Pause motion';b.innerHTML=this.paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';}
    bind(){
      this.stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.dragged=false;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:this.pan.x,py:this.pan.y};});
      this.stage.addEventListener('pointermove',e=>{if(!this.drag||this.drag.id!==e.pointerId)return;let dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5){this.dragged=true;this.stage.classList.add('dragging');this.stage.setPointerCapture(e.pointerId);this.pan={x:this.drag.px+dx,y:this.drag.py+dy};this.onHover(null);this.invalidate();}});
      const end=e=>{if(this.drag?.id!==e.pointerId)return;this.drag=null;this.stage.classList.remove('dragging');if(this.stage.hasPointerCapture(e.pointerId))this.stage.releasePointerCapture(e.pointerId);setTimeout(()=>{this.dragged=false;},0);};
      this.stage.addEventListener('pointerup',end);this.stage.addEventListener('pointercancel',end);
      this.stage.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();this.setZoom(this.zoom*Math.exp(-e.deltaY*.001));},{passive:false});
      this.stage.addEventListener('keydown',e=>{const delta=35;if(e.key==='ArrowLeft')this.pan.x-=delta;else if(e.key==='ArrowRight')this.pan.x+=delta;else if(e.key==='ArrowUp')this.pan.y-=delta;else if(e.key==='ArrowDown')this.pan.y+=delta;else if(e.key==='+')this.setZoom(this.zoom*1.15);else if(e.key==='-')this.setZoom(this.zoom/1.15);else if(e.key==='0')this.reset();else return;e.preventDefault();this.invalidate();});
    }
    resize(){const r=this.stage.getBoundingClientRect();this.w=r.width;this.h=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.mobile=this.w<700;this.invalidate();}
    setZoom(z){this.zoom=Math.max(.65,Math.min(2.8,z));this.invalidate();}
    reset(){this.zoom=1;this.pan={x:0,y:0};this.turn=0;this.pitch=0;this.invalidate();}
    toggleMotion(){this.paused=!this.paused;this.syncMotionButton();this.invalidate();}
    setVisible(v){this.visible=v;this.invalidate();}
    setFilter(group){this.filter=group;this.reset();this.onHover(null);this.setHover(null);for(const n of this.nodes){const active=group==='all'||n.group===group;n.el.classList.toggle('filtered-out',!active);n.el.classList.toggle('focused-group',group!=='all'&&active);n.el.tabIndex=active?0:-1;if(active)n.el.removeAttribute('aria-hidden');else n.el.setAttribute('aria-hidden','true');}this.invalidate();}
    setHover(id){this.hover=id;const active=id?this.byId.get(id):null;for(const n of this.nodes)n.el.classList.toggle('dim',!!active&&active.type!=='me'&&n.group!==active.group&&n.type!=='me');this.invalidate();}
    coords(n,index){
      let [x,y,z]=n.base;
      if(this.filter!=='all'&&n.group===this.filter){
        const items=this.nodes.filter(a=>a.group===this.filter&&a.type==='project');
        if(n.type==='category'){x=this.mobile?.5:.57;y=.49;}
        else{const i=items.indexOf(n),angle=-Math.PI/2+i*2*Math.PI/items.length;const rx=this.mobile?.33:.29,ry=this.mobile?.34:.35;x=(this.mobile?.5:.58)+Math.cos(angle)*rx;y=.48+Math.sin(angle)*ry;}
      }
      if(this.mobile&&this.filter==='all'){x=.07+x*.86;y=.04+y*.89;}
      const t=this.time;const driftX=Math.sin(t*.35+index*1.7)*3;const driftY=Math.cos(t*.27+index)*3;
      return {x:(x*this.w-this.w/2)*this.zoom+this.w/2+this.pan.x+driftX,y:(35+y*(this.h-70)-this.h/2)*this.zoom+this.h/2+this.pan.y+driftY,z};
    }
    invalidate(){if(!this.raf)this.raf=requestAnimationFrame(t=>this.frame(t));}
    frame(t){this.raf=0;if(!this.visible||document.hidden)return;if(t-this.lastFrame<30&&!this.paused){this.invalidate();return;}if(!this.paused)this.time+=Math.min((t-this.lastFrame)/1000,.05);this.lastFrame=t;this.draw();if(!this.paused)this.invalidate();}
    draw(){
      const c=this.ctx;c.clearRect(0,0,this.w,this.h);this.nodes.forEach((n,i)=>{n.screen=this.coords(n,i);n.el.style.left=n.screen.x+'px';n.el.style.top=n.screen.y+'px';n.el.style.zIndex=String(Math.round(n.screen.z+100));});
      const active=this.hover?this.byId.get(this.hover):null;
      for(const [aid,bid] of this.edges){const a=this.byId.get(aid),b=this.byId.get(bid),p=a.screen,q=b.screen;
        const inGroup=this.filter==='all'||(a.group===this.filter&&b.group===this.filter);if(!inGroup)continue;let alpha=.46;
        const connected=this.hover&&(aid===this.hover||bid===this.hover);if(active){alpha=connected?.8:a.group===active.group&&b.group===active.group?.38:.055;}
        const grad=c.createLinearGradient(p.x,p.y,q.x,q.y);grad.addColorStop(0,`rgba(225,233,242,${alpha})`);grad.addColorStop(.55,`rgba(220,231,245,${alpha*.65})`);grad.addColorStop(1,`rgba(235,241,250,${alpha})`);
        c.strokeStyle=grad;c.lineWidth=connected?1.2:.7;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();
      }
    }
  }
  window.ProjectNetwork=ProjectNetwork;window.portfolioGroupOf=groupOf;
})();
