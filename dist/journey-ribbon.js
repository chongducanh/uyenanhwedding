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
    // Include film leaders beyond both end frames, rather than ending at a photo.
    for(let i=-1;i<count;i++) {
      const tail=i<0||i===count-1,steps=tail?Math.ceil(subdivisions/2):subdivisions;
      const connection={index:i,tail,patches:[]};connections.push(connection);
      for(let n=0;n<steps;n++) {
        const node=svg('svg','journey-ribbon-patch');node.setAttribute('aria-hidden','true');node.setAttribute('focusable','false');
        node.dataset.filmJoin=String(i);node.dataset.filmPatch=String(n);
        const shadow=svg('path','journey-ribbon-shadow'),body=svg('path','journey-ribbon-body'),rails=svg('path','journey-ribbon-rails'),edges=svg('path','journey-ribbon-edges');
        rails.setAttribute('fill-rule','evenodd');node.append(shadow,body,rails,edges);container.prepend(node);
        const patch={node,shadow,body,rails,edges,start:n/steps,end:(n+1)/steps};patches.push(patch);connection.patches.push(patch);
      }
    }
    function render(progress,g,transformAt) {
      if(destroyed||(progress===lastProgress&&g===lastGeometry))return;
      if(g!==lastGeometry)patches.forEach(({node})=>node.setAttribute('viewBox',`0 0 ${g.width} ${g.height}`));
      lastProgress=progress;lastGeometry=g;
      connections.forEach(connection=>{
        const index=connection.index;
        const from=index<0?-settings.leaderLength:index;
        const to=index===count-1?index+settings.leaderLength:index+1;
        const a=framePlane(transformAt(progress,from),g),b=framePlane(transformAt(progress,to),g);
        // Going forward through the film exits the left edge and enters the right.
        // Endpoints are the exact photo edges, including its scale and rotation.
        const start=index<0?a.center:add(a.center,mul(a.across,-1));
        const end=index===count-1?b.center:add(b.center,b.across);
        const handle=Math.max(.45,Math.min(1.5,distance(start,end)/g.frameWidth));
        const c1=add(start,mul(a.across,-handle)),c2=add(end,mul(b.across,handle));
        const surface=(t,v=0)=>{
          const center=curve(start,c1,c2,end,t);
          const neck=1-(1-settings.neckWidth)*Math.sin(Math.PI*t)**2;
          let span=mul(mix(a.vertical,b.vertical,t),neck);
          if(index<0)span=mul(span,.62+.38*t);
          if(index===count-1)span=mul(span,1-.38*t);
          return add(center,mul(span,v));
        };
        // Arc-length spacing keeps perforations regular as a connector bends.
        const arc=[0],arcSteps=48;
        let previous=surface(0);
        for(let k=1;k<=arcSteps;k++){const next=surface(k/arcSteps);arc.push(arc.at(-1)+distance(next,previous));previous=next;}
        const total=arc.at(-1),holes=[];
        const tAtLength=value=>{let k=1;while(k<arcSteps&&arc[k]<value)k++;return (k-1+(value-arc[k-1])/Math.max(.001,arc[k]-arc[k-1]))/arcSteps;};
        for(let length=settings.holePitch/2;length<total-settings.holePitch/3;length+=settings.holePitch){
          holes.push({t:tAtLength(length),lo:tAtLength(Math.max(0,length-settings.holePitch*.17)),hi:tAtLength(Math.min(total,length+settings.holePitch*.17))});
        }
        connection.patches.forEach(patch=>{
          const ts=Array.from({length:samples+1},(_,i)=>patch.start+(patch.end-patch.start)*i/samples);
          const line=v=>ts.map(t=>project(surface(t,v),g));
          const top=line(-1),bottom=line(1),outline=polygon([...top,...[...bottom].reverse()]);
          let rails=polygon([...top,...line(-.88).reverse()])+polygon([...line(.88),...[...bottom].reverse()]);
          for(const hole of holes){
            // Clip a punched hole at patch seams so adjacent pieces stay continuous.
            const lo=Math.max(patch.start,hole.lo),hi=Math.min(patch.end,hole.hi);
            if(hi<=lo)continue;
            for(const side of [-1,1])rails+=polygon([[lo,side*.97],[hi,side*.97],[hi,side*.91],[lo,side*.91]].map(([t,v])=>project(surface(t,v),g)));
          }
          const depth=surface((patch.start+patch.end)/2)[2],light=.48+.52*(depth/g.depth+1)/2;
          patch.node.style.zIndex=String(1000+Math.round(depth*2)-1);
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
