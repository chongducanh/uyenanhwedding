/* A data-driven cinematic film reel. This experience owns only #journey and its viewer;
   Wedding Memories keeps its own timeline, album, wishes and fullscreen dialog. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const decodedImages=new Set();
  const clamp=(min,max,value)=>Math.max(min,Math.min(max,value));
  const markerPosition=(index,count)=>count===1?.5:.12+index/(count-1)*.76;
  // The film is a single open helix around the fixed timeline. The camera
  // follows its vertical travel; cells never reset or fly to independent targets.
  function getFilmTransform(progress,index,g,settings,count) {
    const coordinate=index-progress/settings.frameSpacing;
    const angle=settings.focusAngle+coordinate*settings.angularSpacing;
    const front=(Math.cos(angle)+1)/2;
    const y=g.centerY-g.height/2+coordinate*g.pitch;
    const edgeDistance=Math.min(y+g.height/2-g.filmTop,g.filmBottom-y-g.height/2);
    const edge=clamp(0,1,(edgeDistance+g.frameHeight*.45)/(g.frameHeight*.65));
    const visible=edge*edge*(3-2*edge);
    const z=g.depth*Math.cos(angle);
    return {
      x:g.radius*Math.sin(angle),y,z,
      rotationY:Math.atan2(g.depth*Math.sin(angle),g.radius*Math.cos(angle))*180/Math.PI,
      rotationZ:Math.atan(g.slope)*180/Math.PI,scale:1,
      opacity:(.28+.72*front)*visible,
      zIndex:1000+Math.round(z*3)+2,offset:index*settings.frameSpacing,
      angle,front,direction:1,lift:0
    };
  }

  function renderJourney(config) {
    const section=document.querySelector('#journey');if(!section)return null;
    const scene=section.querySelector('.journey-scene');scene.replaceChildren();
    const axis=make('div','journey-axis');axis.setAttribute('aria-hidden','true');
    axis.append(make('span','journey-cap journey-cap--start'),make('span','journey-line'),make('span','journey-progress'),make('span','journey-cap journey-cap--end'));
    const markers=make('ol','journey-markers');markers.setAttribute('aria-label','Các dấu mốc của chúng mình');
    const film=make('div','journey-films journey-film-ribbon');
    const items=config.milestones.map((item,index)=>{
      const marker=make('li','journey-marker');marker.style.setProperty('--marker',markerPosition(index,config.milestones.length));marker.dataset.side=index%2?'left':'right';marker.dataset.milestone=item.id;
      const dot=make('span','journey-dot');dot.setAttribute('aria-hidden','true');
      const copy=make('div','journey-marker-copy'),date=make('time','journey-date',item.date),title=make('h3','journey-milestone-title',item.title);
      date.dateTime=item.date.split('.').reverse().join('-');copy.append(date,title);marker.append(dot,copy);markers.append(marker);
      const button=make('button','journey-photo');button.type='button';button.dataset.milestone=item.id;button.setAttribute('aria-label',`Xem kỷ niệm: ${item.title}, ${item.date}`);
      const paper=make('span','journey-paper'),window=make('span','journey-image-window');
      if(item.fit==='contain')paper.style.setProperty('--journey-image-fit','contain');
      const placeholder=make('span','journey-placeholder');placeholder.setAttribute('aria-hidden','true');
      placeholder.append(make('span','journey-placeholder-monogram',config.initials),make('span','journey-placeholder-date',item.date));window.append(placeholder);
      if(item.imageReady&&item.image){
        const image=make('img','journey-image');image.src=item.image;image.alt=item.alt;image.decoding='async';image.loading=index?'lazy':'eager';image.draggable=false;
        if(item.width&&item.height){image.width=item.width;image.height=item.height;}
        image.addEventListener('load',()=>{placeholder.hidden=true;},{once:true});image.addEventListener('error',()=>{image.hidden=true;},{once:true});window.append(image);
      }
      const number=make('span','journey-film-number',String(index+1).padStart(2,'0'));number.setAttribute('aria-hidden','true');
      const filmLabel=make('span','journey-film-label','OUR JOURNEY');filmLabel.setAttribute('aria-hidden','true');
      paper.append(window,number,filmLabel);button.append(paper);
      const group=make('div','journey-photo-group'),plane=make('div','journey-photo-plane');plane.append(button);group.append(plane);film.append(group);
      return {item,marker,dot,copy,button,paper,group,plane};
    });
    film.append(axis);scene.append(film,markers);return {section,scene,axis,items,film,progress:axis.querySelector('.journey-progress')};
  }
  function create({gsap,ScrollTrigger,Flip=window.Flip,getSmoother=()=>null,reduced=false,mobile=false,tablet=false}) {
    const config=window.JOURNEY_CONFIG,dom=renderJourney(config);if(!dom)return {destroy(){}};
    const {section,scene,axis,items,film,progress}=dom,stage=section.querySelector('.journey-stage');
    const heading=section.querySelector('.journey-heading'),footer=section.querySelector('.journey-footer'),chapter=section.querySelector('.journey-current');
    const lengths=config.scroll[mobile?'mobile':tablet?'tablet':'desktop'],phases=[],listeners=[],fades=[];
    const flow=config.flow,filmState={progress:-.76*flow.frameSpacing};
    const ribbon=reduced?null:window.JourneyFilmRibbon.create({container:film,count:items.length,settings:config.ribbon});
    let filmGeometry=null,debugPoints=[];
    const surfaceStates=items.map(()=>({lift:0}));
    const photoSurfaces=reduced?[]:items.map(item=>window.JourneyFilmRibbon.createPhotoSurface(item,config.ribbon));
    let liftTween=null,resolveLift=null;
    function cancelLift() {liftTween?.kill();liftTween=null;resolveLift?.();resolveLift=null;}
    function preparePhoto(button) {
      const index=items.findIndex(item=>item.button===button);if(reduced||index<0)return Promise.resolve();
      cancelLift();surfaceStates.forEach((state,i)=>{if(i!==index)state.lift=0;});
      return new Promise(resolve=>{resolveLift=resolve;liftTween=gsap.to(surfaceStates[index],{lift:1,duration:.26,ease:'power2.inOut',onUpdate:renderFilm,onComplete:()=>{liftTween=null;resolveLift=null;resolve();}});});
    }
    function restorePhoto(button,immediate=false) {
      const index=items.findIndex(item=>item.button===button);cancelLift();if(reduced||index<0)return;
      if(immediate||destroyed){surfaceStates[index].lift=0;renderFilm();return;}
      liftTween=gsap.to(surfaceStates[index],{lift:0,duration:.3,ease:'sine.inOut',onUpdate:renderFilm,onComplete:()=>{liftTween=null;}});
    }
    const debugEnabled=!!config.debug?.showFilmPath&&['localhost','127.0.0.1','::1'].includes(location.hostname);
    let timeline=null,trigger=null,lockedAt=null,pausedBefore=false,guard=false,destroyed=false,active='',focusFrame=0;
    const getScroll=()=>getSmoother()?.scrollTop()??window.scrollY;
    const setScroll=y=>getSmoother()?getSmoother().scrollTop(y):window.scrollTo(0,y);
    const lock=()=>{if(lockedAt!==null)return;lockedAt=timeline?.time()??0;pausedBefore=getSmoother()?.paused()??false;gsap.killTweensOf(window);getSmoother()?.paused(true);};
    const getResumeScroll=fallback=>trigger&&lockedAt!==null?trigger.start+lockedAt/timeline.duration()*(trigger.end-trigger.start):fallback;
    const unlock=y=>{setScroll(y);lockedAt=null;getSmoother()?.paused(pausedBefore);ScrollTrigger.update();};
    const viewer=window.JourneyPhotoViewer.create({gsap,Flip,reduced,lock,unlock,getScroll,getResumeScroll,preparePhoto,restorePhoto});
    const listen=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push(()=>node.removeEventListener(event,fn));};
    // Image decoding may refresh/reparent the pin just after keyboard navigation.
    // Restore only focus that this refresh detached; never take it from a control.
    let refreshFocus=null;
    const capturePhotoFocus=()=>{refreshFocus=items.find(item=>item.button===document.activeElement)?.button||null;};
    const restorePhotoFocus=()=>{
      const button=refreshFocus;refreshFocus=null;
      if(!button?.isConnected||document.activeElement!==document.body)return;
      cancelAnimationFrame(focusFrame);
      focusFrame=requestAnimationFrame(()=>{focusFrame=0;if(!destroyed&&document.activeElement===document.body)button.focus({preventScroll:true});});
    };
    ScrollTrigger.addEventListener('refreshInit',capturePhotoFocus);ScrollTrigger.addEventListener('refresh',restorePhotoFocus);
    listeners.push(()=>{ScrollTrigger.removeEventListener('refreshInit',capturePhotoFocus);ScrollTrigger.removeEventListener('refresh',restorePhotoFocus);});
    items.forEach(({button,item,marker},index)=>{
      listen(button,'click',()=>viewer.openPhotoViewer(button,item));
      // Bring distant or rear-facing cells into their reading phase for keyboard
      // access, without affecting mouse clicks or a returning fullscreen photo.
      listen(button,'keydown',event=>{
        if(event.key!=='Tab'||reduced||viewer.isOpen||!trigger)return;
        const nextIndex=index+(event.shiftKey?-1:1),next=items[nextIndex];if(!next)return;
        const rect=next.button.getBoundingClientRect();
        if(rect.left>=0&&rect.right<=stage.clientWidth&&Number(next.button.dataset.visibility)>.65)return;
        event.preventDefault();
        const phase=phases.find(p=>p.name===`photo-${nextIndex}`);
        const time=phase.start+(phase.end-phase.start)*.75;
        setScroll(trigger.start+time/timeline.duration()*(trigger.end-trigger.start));
        ScrollTrigger.update();trigger.getTween()?.progress(1);
        cancelAnimationFrame(focusFrame);
        focusFrame=requestAnimationFrame(()=>{focusFrame=0;if(!destroyed)next.button.focus({preventScroll:true});});
      });
      if(!reduced)marker.dataset.side='right';
    });
    section.classList.toggle('journey-static',reduced);section.classList.toggle('journey-enhanced',!reduced);
    function geometry() {
      const width=stage.clientWidth,height=stage.clientHeight,landscape=width>height&&height<601;
      const frameWidth=Math.min(mobile?width*.32:tablet?208:244,height*(landscape?.255:.315));
      const top=height*(landscape?.26:mobile?.235:.245),bottom=height*(landscape?.83:.865);
      const radius=Math.min(mobile?width*.31:tablet?width*.285:282,width/2-frameWidth*.48-22);
      const pitch=height*(landscape?.195:.185);
      const filmTop=height*(landscape?.23:.215),filmBottom=height*.895;
      return {width,height,frameWidth,frameHeight:frameWidth*1.34,top,bottom,filmTop,filmBottom,
        radius,centerY:height*.555,pitch,angularSpacing:flow.angularSpacing,slope:pitch/(flow.angularSpacing*radius),
        depth:radius*(mobile?.48:tablet?.65:.76)};
    }
    function transformAt(progress,index) {
      const pose=getFilmTransform(progress,index,filmGeometry||geometry(),flow,items.length);
      const lift=surfaceStates[index]?.lift||0;
      pose.lift=lift;
      if(lift){pose.rotationY*=1-lift;pose.rotationZ*=1-lift;}
      return pose;
    }
    function renderFilm() {
      if(reduced||destroyed||!filmGeometry)return;
      items.forEach(({button,group,plane},index)=>{
        const transform=transformAt(filmState.progress,index);
        const {offset,angle,front,direction,lift,opacity,...pose}=transform;
        // Composite opacity after projecting the complete curved cell. Fading
        // individual overlapping texture strips would leave visible seams.
        gsap.set(plane,{...pose,opacity:1,xPercent:-50,yPercent:-50,force3D:true});
        group.style.opacity=String(opacity);group.style.zIndex=String(pose.zIndex);
        // Pointer hits come from the curved pixels; the planar button remains
        // the keyboard/ARIA and Flip anchor, without an invisible flat hitbox.
        button.dataset.visibility=String(opacity);button.style.pointerEvents='none';
        photoSurfaces[index]?.render(transform);
      });
      ribbon.render(filmState.progress,filmGeometry,transformAt,surfaceStates.reduce((sum,s)=>sum+s.lift,0));
      debugPoints.forEach(({node,index})=>{
        const pose=transformAt(filmState.progress,index);
        gsap.set(node,{x:pose.x,y:pose.y,z:pose.z,opacity:.3+.6*(pose.z/filmGeometry.depth+1)/2,force3D:true});
      });
    }
    function buildDebugPath() {
      if(!debugEnabled||reduced)return;
      const guide=make('div','journey-path-guide');guide.setAttribute('aria-hidden','true');film.prepend(guide);
      const samples=Math.max(72,items.length*24);
      for(let i=0;i<=samples;i++){
        const node=make('span','journey-path-point');guide.append(node);
        debugPoints.push({node,index:-.35+(items.length-.3)*i/samples});
      }
    }
    function sizePhotos() {
      if(reduced)return;
      filmGeometry=geometry();const g=filmGeometry;
      stage.style.setProperty('--journey-frame-width',g.frameWidth+'px');
      stage.style.setProperty('--journey-film-top',g.filmTop+'px');stage.style.setProperty('--journey-film-bottom',(g.height-g.filmBottom)+'px');
      stage.style.setProperty('--journey-axis-top',g.top+'px');stage.style.setProperty('--journey-axis-bottom',(g.height-g.bottom)+'px');
      photoSurfaces.forEach(surface=>surface.resize(g));
      renderFilm();
    }
    function advanceFilm(tl,frameCoordinate,duration,at=0,ease='sine.inOut') {
      // No photo-specific tweens: advancing this scalar moves every frame together.
      return tl.to(filmState,{progress:frameCoordinate*flow.frameSpacing,duration,ease},at);
    }
    function updateTimelineProgress(tl,value,duration,at=0) {tl.to(progress,{scaleY:value,duration,ease:'none'},at);}
    function activateMilestone(tl,index) {
      const item=items[index],duration=lengths.marker;
      if(index)tl.to(items[index-1].copy,{opacity:.35,duration:duration*.5},0);
      updateTimelineProgress(tl,markerPosition(index,items.length),duration*.64);
      tl.to(item.copy,{opacity:1,y:0,duration:duration*.36},duration*.64)
        .to(item.dot,{opacity:1,scale:1.08,duration:duration*.18,ease:'sine.inOut'},duration*.64)
        .to(item.dot,{scale:1,duration:duration*.18,ease:'sine.inOut'},duration*.82);
      advanceFilm(tl,index-.62,duration);
    }
    function focusJourneyPhoto(tl,index) {
      const length=lengths.photo+(index===items.length-1?lengths.finalHold:0);
      // The whole reel turns into the reading position, then holds for the photo.
      advanceFilm(tl,index+.04,length*.64);
      tl.to({},{duration:length*.36});
      if(index===items.length-1)updateTimelineProgress(tl,1,length*.64,0);
    }
    function playOutro(tl) {
      advanceFilm(tl,items.length-1+.48,lengths.outro);
      tl.to(scene,{scale:.96,opacity:.65,duration:lengths.outro*.38,ease:'sine.inOut'},lengths.outro*.62)
        .to(heading,{opacity:.65,y:-8,duration:lengths.outro*.38},lengths.outro*.62);
    }
    function calculateJourneyScrollDistance() {
      return Math.round(stage.clientHeight*(lengths.intro+items.length*(lengths.marker+lengths.photo)+lengths.finalHold+lengths.outro));
    }
    function updateExperience() {
      if(destroyed||!timeline)return;
      if(lockedAt!==null&&Math.abs(timeline.time()-lockedAt)>.001&&!guard){guard=true;timeline.time(lockedAt,true);guard=false;return;}
      const time=timeline.time(),phase=phases.find(p=>time>=p.start&&time<p.end)||phases.at(-1);
      if(phase&&active!==phase.name){
        active=phase.name;section.dataset.phase=active;
        const index=phase.index;
        chapter.textContent=index===undefined?`${items.length} dấu mốc · Một hành trình`:`${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')} — ${items[index].item.title}`;
        items.forEach(({marker},i)=>{if(i===index)marker.setAttribute('aria-current','step');else marker.removeAttribute('aria-current');});
      }
      renderFilm();
    }
    function buildJourneyTimeline() {
      sizePhotos();gsap.set(items.map(i=>i.plane),{xPercent:-50,yPercent:-50,transformOrigin:'50% 50%',force3D:true});
      buildDebugPath();renderFilm();
      gsap.set(progress,{scaleY:0,transformOrigin:'50% 0'});gsap.set(items.map(i=>i.copy),{opacity:.38,y:6});gsap.set(items.map(i=>i.dot),{opacity:.32});
      timeline=gsap.timeline({defaults:{ease:'none'},onUpdate:updateExperience});
      const part=(name,index,build)=>{const child=gsap.timeline();build(child);const start=timeline.duration();timeline.addLabel(name,start).add(child,start);phases.push({name,index,start,end:start+child.duration()});};
      part('intro',undefined,tl=>{
        tl.fromTo(heading,{opacity:.2,y:18},{opacity:1,y:0,duration:lengths.intro*.7},0)
          .fromTo(axis,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .fromTo(film,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .to({},{duration:lengths.intro*.3});
        advanceFilm(tl,-.68,lengths.intro,0);
      });
      items.forEach((_,i)=>{part(`marker-${i}`,i,tl=>activateMilestone(tl,i));part(`photo-${i}`,i,tl=>focusJourneyPhoto(tl,i));});
      part('outro',undefined,playOutro);
      trigger=ScrollTrigger.create({id:'pin-journey',trigger:section,pin:stage,start:'top top',end:()=>'+='+calculateJourneyScrollDistance(),animation:timeline,
        scrub:mobile?.5:.85,anticipatePin:1,invalidateOnRefresh:true,onRefreshInit:sizePhotos,onRefresh:updateExperience,
        onToggle:self=>items.forEach(({plane})=>plane.style.willChange=self.isActive?'transform, opacity':'auto')});
      timeline.scrollTrigger=trigger;updateExperience();
    }
    if(reduced) {
      chapter.textContent=`${items.length} dấu mốc · Một hành trình`;
      items.forEach(({button,marker},i)=>{
        marker.append(button);
        fades.push(gsap.fromTo(marker,{opacity:.75},{opacity:1,ease:'none',scrollTrigger:{trigger:marker,start:'top 95%',end:'top 65%',scrub:true}}));
      });scene.prepend(axis);film.remove();
    } else buildJourneyTimeline();
    const pendingImages=[...scene.querySelectorAll('img')].filter(image=>!decodedImages.has(image.src));
    if(pendingImages.length)Promise.allSettled(pendingImages.map(image=>image.decode().then(()=>decodedImages.add(image.src))))
      .then(()=>{if(!destroyed)ScrollTrigger.refresh();});
    function getNavigationState() {
      const time=timeline?.time()??0,phase=phases.find(p=>time>=p.start&&time<p.end)||phases.at(-1);
      return phase?{label:phase.name,within:clamp(0,1,(time-phase.start)/(phase.end-phase.start))}:null;
    }
    function timeForNavigationState(token) {const phase=phases.find(p=>p.name===token?.label)||phases[0];return phase?phase.start+(phase.end-phase.start)*clamp(0,1,token?.within||0):0;}
    return {timeline,phases,config,filmState,ribbon,transformAt,calculateJourneyScrollDistance,getNavigationState,timeForNavigationState,viewer,
      refresh(){sizePhotos();ScrollTrigger.refresh();},
      destroy(){destroyed=true;cancelAnimationFrame(focusFrame);cancelLift();viewer.destroy();photoSurfaces.forEach(surface=>surface.destroy());ribbon?.destroy();trigger?.kill();timeline?.kill();fades.forEach(t=>{t.scrollTrigger?.kill();t.kill();});listeners.forEach(fn=>fn());
        section.classList.remove('journey-enhanced');section.classList.add('journey-static');delete section.dataset.phase;scene.replaceChildren();gsap.set([stage,scene,heading,axis,footer],{clearProps:'all'});}
    };
  }
  window.JourneyExperience={create,renderJourney,getFilmTransform};
})();
