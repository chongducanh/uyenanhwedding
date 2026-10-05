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
  // Photo strips and film rails sample the same cylindrical surface. Curvature
  // is local to the cell; its edges and tangents are also the connector anchors.
  function localCurve(x,halfWidth,bend) {
    if(Math.abs(bend)<.0001)return [x,0,0];
    const radius=halfWidth/bend,angle=x/radius;
    return [radius*Math.sin(angle),0,radius*(Math.cos(angle)-1)];
  }
  function framePlane(pose,g) {
    const y=pose.rotationY*Math.PI/180,z=pose.rotationZ*Math.PI/180;
    const right=[Math.cos(y)*Math.cos(z),Math.cos(y)*Math.sin(z),-Math.sin(y)];
    const up=[-Math.sin(z),Math.cos(z),0],normal=[Math.sin(y)*Math.cos(z),Math.sin(y)*Math.sin(z),Math.cos(y)];
    const halfWidth=g.frameWidth*pose.scale/2,halfHeight=g.frameHeight*pose.scale/2;
    const center=[pose.x,pose.y,pose.z];
    const at=(u,v=0)=>{
      const local=localCurve(u*halfWidth,halfWidth,pose.bend||0);
      return add(add(add(center,mul(right,local[0])),mul(normal,local[2])),mul(up,v*halfHeight));
    };
    const tangent=u=>{const angle=u*(pose.bend||0);return add(mul(right,Math.cos(angle)),mul(normal,-Math.sin(angle)));};
    return {center,across:mul(right,halfWidth),vertical:mul(up,halfHeight),at,tangent};
  }
  function createPhotoSurface({paper,item,group,button},settings) {
    const imageWindow=paper.querySelector('.journey-image-window');
    const layer=document.createElement('span');layer.className='journey-photo-surface';layer.setAttribute('aria-hidden','true');
    const strips=Array.from({length:settings.photoSlices},()=>{
      const strip=document.createElement('span');strip.className='journey-photo-slice';layer.append(strip);return strip;
    });
    group.append(layer);
    const open=()=>button.click();layer.addEventListener('click',open);
    let halfWidth=0,imageWidth=0,imageHeight=0,arcWidth=0,geometry=null,verticalOffset=0,lastPose='';
    function resize(g) {
      halfWidth=g.frameWidth/2;imageWidth=imageWindow.clientWidth;imageHeight=imageWindow.clientHeight;arcWidth=imageWidth/strips.length;
      geometry=g;verticalOffset=(imageWindow.offsetTop+imageHeight/2-g.frameHeight/2)/(g.frameHeight/2);
      const ratio=item.width/item.height;
      const ratioFits=ratio>imageWidth/imageHeight;
      const scaleByWidth=item.fit==='contain'?ratioFits:!ratioFits;
      const paintedWidth=scaleByWidth?imageWidth:imageHeight*ratio,paintedHeight=paintedWidth/ratio;
      strips.forEach((strip,i)=>{
        strip.style.width=(arcWidth+2)+'px';strip.style.height=imageHeight+'px';
        strip.style.backgroundImage=`url("${item.image}")`;
        strip.style.backgroundSize=`${paintedWidth}px ${paintedHeight}px`;
        strip.style.backgroundPosition=`${(imageWidth-paintedWidth)/2-i*arcWidth+1}px ${(imageHeight-paintedHeight)/2}px`;
      });lastPose='';
    }
    function render(pose) {
      if(!geometry)return;
      const key=[pose.x,pose.y,pose.z,pose.rotationY,pose.rotationZ,pose.scale,pose.bend].join(',');
      if(key===lastPose)return;lastPose=key;
      const surface=framePlane(pose,geometry);
      strips.forEach((strip,i)=>{
        const left=-imageWidth/2+i*arcWidth;
        const a=localCurve(left,halfWidth,pose.bend),b=localCurve(left+arcWidth,halfWidth,pose.bend);
        const center=mix(surface.at(left/halfWidth,verticalOffset),surface.at((left+arcWidth)/halfWidth,verticalOffset),.5);
        const width=distance(a,b)+2,yaw=Math.atan2(a[2]-b[2],b[0]-a[0])*180/Math.PI;
        // A complete world-space pose per slice avoids browsers flattening a
        // nested 3D photo at exactly the side turn. Only transforms change.
        strip.style.transform=`translate(-50%,-50%) translate3d(${center[0]}px,${center[1]}px,${center[2]}px) rotateZ(${pose.rotationZ}deg) rotateY(${pose.rotationY+yaw}deg) scale(${pose.scale*width/(arcWidth+2)},${pose.scale})`;
        strip.style.zIndex=String(1000+Math.round(center[2]*3));
      });
    }
    return {resize,render,destroy(){layer.removeEventListener('click',open);layer.remove();}};
  }
  function project(p,g) {const scale=PERSPECTIVE/(PERSPECTIVE-p[2]);return [g.width/2+p[0]*scale,g.height/2+p[1]*scale];}
  function create({container,count,settings}) {
    const patches=[],connections=[];
    let destroyed=false,lastProgress=NaN,lastGeometry=null,lastLift=NaN;
    const subdivisions=settings.patchesPerJoin, samples=5;
    // Curved photo cells and flexible stock form one material strip.
    // Pixels, rails and connector tangents sample the same cylindrical surface.
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
      addConnection('cell',i,8);
      addConnection(i===count-1?'leader':'join',i,i===count-1?8:subdivisions);
    }
    function render(progress,g,transformAt,lift=0) {
      if(destroyed||(progress===lastProgress&&g===lastGeometry&&lift===lastLift))return;
      if(g!==lastGeometry)patches.forEach(({node})=>node.setAttribute('viewBox',`0 0 ${g.width} ${g.height}`));
      lastProgress=progress;lastGeometry=g;lastLift=lift;
      let ribbonLength=0;
      connections.forEach(connection=>{
        const index=connection.index;
        const cell=connection.kind==='cell',head=index<0,tail=index===count-1&&!cell;
        const aPose=transformAt(progress,head?-.48:index),bPose=transformAt(progress,tail?count-1+.48:index+1);
        const a=framePlane(aPose,g),b=framePlane(bPose,g);
        a.vertical=mul(a.vertical,settings.stockWidth);b.vertical=mul(b.vertical,settings.stockWidth);
        const start=cell?a.at(-1):a.at(1),end=cell?a.at(1):b.at(-1);
        const reach=Math.min(distance(start,end)*.43,g.radius*.72);
        const c1=add(start,mul(a.tangent(1),reach)),c2=add(end,mul(b.tangent(-1),-reach));
        const surface=(t,v=0)=>cell?a.at(t*2-1,v*settings.stockWidth):
          add(curve(start,c1,c2,end,t),mul(mix(a.vertical,b.vertical,t*t*(3-2*t)),v));
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
          patch.node.style.zIndex=String(1000+Math.round((cell?aPose.z:depth)*3));
          patch.node.style.opacity=String(light);
          patch.body.setAttribute('d',outline);patch.shadow.setAttribute('d','M'+bottom.map(point).join('L'));patch.rails.setAttribute('d',rails);
          patch.edges.setAttribute('d','M'+top.map(point).join('L')+'M'+bottom.map(point).join('L'));
        });
      });
    }
    return {render,project,framePlane,get patchCount(){return patches.length;},destroy(){destroyed=true;patches.forEach(({node})=>node.remove());}};
  }
  window.JourneyFilmRibbon={create,framePlane,localCurve,project,createPhotoSurface};
})();
