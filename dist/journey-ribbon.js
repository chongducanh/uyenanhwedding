/* A continuous, flexible film surface between the real photo planes.
   Geometry is evaluated from Journey's shared travel value, never a second tween.
   Small SVG patches are perspective-projected and depth-sorted with the photos;
   transparent film and punched rails keep the central time axis readable. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg', PERSPECTIVE=1400;
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  const svg=(tag,cls)=>{const n=document.createElementNS(NS,tag);if(cls)n.setAttribute('class',cls);return n;};
  const point=p=>p.map(v=>v.toFixed(2)).join(',');
  const polygon=points=>'M'+points.map(point).join('L')+'Z';
  const curve=(a,b,c,d,t)=>add(add(mul(a,(1-t)**3),mul(b,3*(1-t)**2*t)),add(mul(c,3*(1-t)*t*t),mul(d,t**3)));
  function framePlane(pose,g) {
    // Matches GSAP's rotateZ · rotateY · scale order, with centered photo origins.
    const y=pose.rotationY*Math.PI/180,z=pose.rotationZ*Math.PI/180;
    return {center:[pose.x,pose.y,pose.z],
      across:mul([Math.cos(y)*Math.cos(z),Math.cos(y)*Math.sin(z),-Math.sin(y)],g.frameWidth*pose.scale/2),
      vertical:mul([-Math.sin(z),Math.cos(z),0],g.frameHeight*pose.scale/2)};
  }
  function project(p,g) {const scale=PERSPECTIVE/(PERSPECTIVE-p[2]);return [g.width/2+p[0]*scale,g.height/2+p[1]*scale];}
  function create({container,count,settings}) {
    const patches=[],connections=[];
    let destroyed=false,lastProgress=NaN,lastGeometry=null;
    const subdivisions=settings.patchesPerJoin, samples=5;
    // Alternating flat photo cells and flexible stock form one material strip.
    // A cell uses exactly the same plane as its clickable DOM photograph.
    const addConnection=(kind,index,steps)=>{
      const connection={kind,index,patches:[]};connections.push(connection);
      for(let n=0;n<steps;n++) {
        const node=svg('svg','journey-ribbon-patch');node.setAttribute('aria-hidden','true');node.setAttribute('focusable','false');
        node.dataset.filmOrder=String(connections.length-1);node.dataset.filmKind=kind;node.dataset.filmJoin=String(index);node.dataset.filmPatch=String(n);
        const shadow=svg('path','journey-ribbon-shadow'),body=svg('path','journey-ribbon-body'),rails=svg('path','journey-ribbon-rails'),edges=svg('path','journey-ribbon-edges');
        rails.setAttribute('fill-rule','evenodd');node.append(shadow,body,rails,edges);container.prepend(node);
        const patch={node,shadow,body,rails,edges,start:n/steps,end:(n+1)/steps};patches.push(patch);connection.patches.push(patch);
      }
    };
    addConnection('leader',-1,8);
    for(let i=0;i<count;i++){
      addConnection('cell',i,1);
      addConnection(i===count-1?'leader':'join',i,i===count-1?8:subdivisions);
    }
    function render(progress,g,transformAt) {
      if(destroyed||(progress===lastProgress&&g===lastGeometry))return;
      if(g!==lastGeometry)patches.forEach(({node})=>node.setAttribute('viewBox',`0 0 ${g.width} ${g.height}`));
      lastProgress=progress;lastGeometry=g;
      let ribbonLength=0;
      connections.forEach(connection=>{
        const index=connection.index;
        const cell=connection.kind==='cell',head=index<0,tail=index===count-1&&!cell;
        const aPose=transformAt(progress,head?-.48:index),bPose=transformAt(progress,tail?count-1+.48:index+1);
        const a=framePlane(aPose,g),b=framePlane(bPose,g);
        a.vertical=mul(a.vertical,settings.stockWidth);b.vertical=mul(b.vertical,settings.stockWidth);
        const aDirection=mul(a.across,aPose.direction),bDirection=mul(b.across,bPose.direction);
        const start=add(a.center,mul(aDirection,cell?-1:1));
        const end=cell?add(a.center,aDirection):add(b.center,mul(bDirection,-1));
        const reach=Math.min(distance(start,end)*.43,g.radius*.72);
        const c1=add(start,mul(aDirection,reach/Math.hypot(...aDirection)));
        const c2=add(end,mul(bDirection,-reach/Math.hypot(...bDirection)));
        const surface=(t,v=0)=>add(cell?mix(start,end,t):curve(start,c1,c2,end,t),
          mul(cell?a.vertical:mix(a.vertical,b.vertical,t*t*(3-2*t)),v));
        // Arc-length spacing keeps perforations regular as a connector bends.
        const arc=[0],arcSteps=48;
        let previous=surface(0);
        for(let k=1;k<=arcSteps;k++){const next=surface(k/arcSteps);arc.push(arc.at(-1)+distance(next,previous));previous=next;}
        const total=arc.at(-1),holes=[];
        const tAtLength=value=>{let k=1;while(k<arcSteps&&arc[k]<value)k++;return (k-1+(value-arc[k-1])/Math.max(.001,arc[k]-arc[k-1]))/arcSteps;};
        const halfHole=settings.holePitch*.17;
        const firstHole=Math.floor((ribbonLength-halfHole)/settings.holePitch)*settings.holePitch+settings.holePitch/2;
        for(let global=firstHole;global<ribbonLength+total+halfHole;global+=settings.holePitch){
          const lo=Math.max(0,global-ribbonLength-halfHole),hi=Math.min(total,global-ribbonLength+halfHole);
          if(hi>lo)holes.push({lo:tAtLength(lo),hi:tAtLength(hi)});
        }
        ribbonLength+=total;
        connection.patches.forEach(patch=>{
          const ts=Array.from({length:samples+1},(_,i)=>patch.start+(patch.end-patch.start)*i/samples);
          const line=v=>ts.map(t=>project(surface(t,v),g));
          const top=line(-1),bottom=line(1),outline=polygon([...top,...[...bottom].reverse()]);
          let rails=polygon([...top,...line(-.935).reverse()])+polygon([...line(.935),...[...bottom].reverse()]);
          for(const hole of holes){
            // Clip a punched hole at patch seams so adjacent pieces stay continuous.
            const lo=Math.max(patch.start,hole.lo),hi=Math.min(patch.end,hole.hi);
            if(hi<=lo)continue;
            for(const side of [-1,1])rails+=polygon([[lo,side*.983],[hi,side*.983],[hi,side*.948],[lo,side*.948]].map(([t,v])=>project(surface(t,v),g)));
          }
          const middle=(patch.start+patch.end)/2,depth=surface(middle)[2];
          const leaderFade=connection.kind==='leader'?Math.pow(head?middle:1-middle,1.2):1;
          const light=(cell?aPose.opacity:aPose.opacity+(bPose.opacity-aPose.opacity)*middle)*leaderFade;
          // Photo cells and stock cross the fixed axis at the same depth.
          patch.node.style.zIndex=String(1000+Math.round(depth*3));
          patch.node.style.opacity=String(light);
          patch.body.setAttribute('d',outline);patch.shadow.setAttribute('d','M'+bottom.map(point).join('L'));patch.rails.setAttribute('d',rails);
          patch.edges.setAttribute('d','M'+top.map(point).join('L')+'M'+bottom.map(point).join('L'));
        });
      });
    }
    return {render,project,framePlane,get patchCount(){return patches.length;},destroy(){destroyed=true;patches.forEach(({node})=>node.remove());}};
  }
  window.JourneyFilmRibbon={create,framePlane,project};
})();
