/* A data-driven film helix. This experience owns only #journey and its viewer;
   Wedding Memories keeps its own timeline, album, wishes and fullscreen dialog. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const clamp=(min,max,value)=>Math.max(min,Math.min(max,value));
  const markerPosition=(index,count)=>count===1?.5:.12+index/(count-1)*.76;
  // A single, unwrapped ribbon coordinate. Index only contributes a fixed offset;
  // every frame and debug sample is evaluated on this same continuous 3D curve.
  function getHelixTransform(progress,index,g,settings,count) {
    const offset=index*settings.frameSpacing;
    const q=(offset-progress)/settings.frameSpacing;
    const angle=settings.focusAngle+(progress-offset)*Math.PI*2*settings.turns;
    const depth=Math.cos(angle),front=clamp(0,1,(depth+1)/(Math.cos(settings.focusAngle)+1));
    const proximity=1/(1+Math.pow(q/1.3,2));
    // Camera follows the ribbon gently; tanh keeps its finite ends inside the stage.
    const follow=(progress/settings.frameSpacing/Math.max(1,count-1)-.5)*.8;
    const z=depth*g.depth;
    return {
      x:Math.sin(angle)*g.radiusX,
      y:g.centerY+g.radiusY*Math.tanh(q*.72+follow)-g.height*.5,
      z,
      rotationY:-Math.sin(angle-settings.focusAngle)*g.yaw,
      rotationZ:Math.sin(angle)*3+Math.sin(q*.8),
      scale:.58+.28*front+.14*proximity,
      opacity:.35+.40*front+.25*proximity,
      zIndex:1000+Math.round(z*2),
      angle,offset
    };
  }
  function renderJourney(config) {
    const section=document.querySelector('#journey');if(!section)return null;
    const scene=section.querySelector('.journey-scene');scene.replaceChildren();
    const axis=make('div','journey-axis');axis.setAttribute('aria-hidden','true');
    axis.append(make('span','journey-cap journey-cap--start'),make('span','journey-line'),make('span','journey-progress'),make('span','journey-cap journey-cap--end'));
    const markers=make('ol','journey-markers');markers.setAttribute('aria-label','Các dấu mốc của chúng mình');
    const film=make('div','journey-films');
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
      paper.append(window,number,filmLabel);button.append(paper);film.append(button);
      return {item,marker,dot,copy,button,paper};
    });
    scene.append(film,axis,markers);return {section,scene,axis,items,film,progress:axis.querySelector('.journey-progress')};
  }
  function create({gsap,ScrollTrigger,Flip=window.Flip,getSmoother=()=>null,reduced=false,mobile=false,tablet=false}) {
    const config=window.JOURNEY_CONFIG,dom=renderJourney(config);if(!dom)return {destroy(){}};
    const {section,scene,axis,items,film,progress}=dom,stage=section.querySelector('.journey-stage');
    const heading=section.querySelector('.journey-heading'),footer=section.querySelector('.journey-footer'),chapter=section.querySelector('.journey-current');
    const lengths=config.scroll[mobile?'mobile':tablet?'tablet':'desktop'],phases=[],listeners=[],fades=[];
    const helix=config.helix,filmState={progress:-.36*helix.frameSpacing};
    let filmGeometry=null,debugPoints=[];
    const debugEnabled=!!config.debug?.showFilmPath&&['localhost','127.0.0.1','::1'].includes(location.hostname);
    let timeline=null,trigger=null,lockedAt=null,pausedBefore=false,guard=false,destroyed=false,active='';
    const getScroll=()=>getSmoother()?.scrollTop()??window.scrollY;
    const setScroll=y=>getSmoother()?getSmoother().scrollTop(y):window.scrollTo(0,y);
    const lock=()=>{if(lockedAt!==null)return;lockedAt=timeline?.time()??0;pausedBefore=getSmoother()?.paused()??false;gsap.killTweensOf(window);getSmoother()?.paused(true);};
    const getResumeScroll=fallback=>trigger&&lockedAt!==null?trigger.start+lockedAt/timeline.duration()*(trigger.end-trigger.start):fallback;
    const unlock=y=>{setScroll(y);lockedAt=null;getSmoother()?.paused(pausedBefore);ScrollTrigger.update();};
    const viewer=window.JourneyPhotoViewer.create({gsap,Flip,reduced,lock,unlock,getScroll,getResumeScroll});
    const listen=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push(()=>node.removeEventListener(event,fn));};
    items.forEach(({button,item,marker})=>{
      listen(button,'click',()=>viewer.openPhotoViewer(button,item));
      if(!reduced)marker.dataset.side='right';
    });
    section.classList.toggle('journey-static',reduced);section.classList.toggle('journey-enhanced',!reduced);
    function geometry() {
      const width=stage.clientWidth,height=stage.clientHeight,landscape=width>height&&height<601;
      const frameWidth=Math.min(width*(mobile?.30:tablet?.24:.20),mobile?164:260,height*(landscape?.205:.245));
      const depth=mobile?54:tablet?145:230;
      const top=height*(landscape?.26:mobile?.235:.245),bottom=height*(landscape?.83:.865);
      return {width,height,frameWidth,top,bottom,centerY:(top+bottom)/2,radiusY:(bottom-top)*.30,
        radiusX:Math.min(width*(mobile?.34:.28),(width/2-frameWidth*.50-14)/(1+depth/1400)),
        depth,yaw:mobile?16:tablet?25:34};
    }
    function transformAt(progress,index) {
      return getHelixTransform(progress,index,filmGeometry||geometry(),helix,items.length);
    }
    function renderFilm() {
      if(reduced||destroyed||!filmGeometry)return;
      items.forEach(({button},index)=>{
        const {angle,offset,...pose}=transformAt(filmState.progress,index);
        gsap.set(button,{...pose,xPercent:-50,yPercent:-50,force3D:true});
      });
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
      stage.style.setProperty('--journey-axis-top',g.top+'px');stage.style.setProperty('--journey-axis-bottom',(g.height-g.bottom)+'px');
      renderFilm();
    }
    function advanceFilm(tl,frameCoordinate,duration,at=0,ease='sine.inOut') {
      // No photo-specific tweens: advancing this scalar moves every frame together.
      return tl.to(filmState,{progress:frameCoordinate*helix.frameSpacing,duration,ease},at);
    }
    function updateTimelineProgress(tl,value,duration,at=0) {tl.to(progress,{scaleY:value,duration,ease:'none'},at);}
    function activateMilestone(tl,index) {
      const item=items[index],duration=lengths.marker;
      if(index)tl.to(items[index-1].copy,{opacity:.35,duration:duration*.5},0);
      updateTimelineProgress(tl,markerPosition(index,items.length),duration*.64);
      tl.to(item.copy,{opacity:1,y:0,duration:duration*.36},duration*.64)
        .to(item.dot,{opacity:1,scale:1.08,duration:duration*.18,ease:'sine.inOut'},duration*.64)
        .to(item.dot,{scale:1,duration:duration*.18,ease:'sine.inOut'},duration*.82);
      advanceFilm(tl,index-.16,duration);
    }
    function focusJourneyPhoto(tl,index) {
      const length=lengths.photo+(index===items.length-1?lengths.finalHold:0);
      // The frame crosses the front of the SAME helix. Slow travel is its reading hold.
      advanceFilm(tl,index+.08,length);
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
      sizePhotos();gsap.set(items.map(i=>i.button),{xPercent:-50,yPercent:-50,transformOrigin:'50% 50%',force3D:true});
      buildDebugPath();renderFilm();
      gsap.set(progress,{scaleY:0,transformOrigin:'50% 0'});gsap.set(items.map(i=>i.copy),{opacity:.22,y:6});gsap.set(items.map(i=>i.dot),{opacity:.32});
      timeline=gsap.timeline({defaults:{ease:'none'},onUpdate:updateExperience});
      const part=(name,index,build)=>{const child=gsap.timeline();build(child);const start=timeline.duration();timeline.addLabel(name,start).add(child,start);phases.push({name,index,start,end:start+child.duration()});};
      part('intro',undefined,tl=>{
        tl.fromTo(heading,{opacity:.2,y:18},{opacity:1,y:0,duration:lengths.intro*.7},0)
          .fromTo(axis,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .fromTo(film,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .to({},{duration:lengths.intro*.3});
        advanceFilm(tl,-.28,lengths.intro,0);
      });
      items.forEach((_,i)=>{part(`marker-${i}`,i,tl=>activateMilestone(tl,i));part(`photo-${i}`,i,tl=>focusJourneyPhoto(tl,i));});
      part('outro',undefined,playOutro);
      trigger=ScrollTrigger.create({id:'pin-journey',trigger:section,pin:stage,start:'top top',end:()=>'+='+calculateJourneyScrollDistance(),animation:timeline,
        scrub:mobile?.5:.85,anticipatePin:1,invalidateOnRefresh:true,onRefreshInit:sizePhotos,onRefresh:updateExperience,
        onToggle:self=>items.forEach(({button})=>button.style.willChange=self.isActive?'transform, opacity':'auto')});
      timeline.scrollTrigger=trigger;updateExperience();
    }
    if(reduced) {
      chapter.textContent=`${items.length} dấu mốc · Một hành trình`;
      items.forEach(({button,marker},i)=>{
        marker.append(button);
        fades.push(gsap.fromTo(marker,{opacity:.75},{opacity:1,ease:'none',scrollTrigger:{trigger:marker,start:'top 95%',end:'top 65%',scrub:true}}));
      });film.remove();
    } else buildJourneyTimeline();
    Promise.allSettled([...scene.querySelectorAll('img')].map(image=>image.decode())).then(()=>{if(!destroyed)ScrollTrigger.refresh();});
    function getNavigationState() {
      const time=timeline?.time()??0,phase=phases.find(p=>time>=p.start&&time<p.end)||phases.at(-1);
      return phase?{label:phase.name,within:clamp(0,1,(time-phase.start)/(phase.end-phase.start))}:null;
    }
    function timeForNavigationState(token) {const phase=phases.find(p=>p.name===token?.label)||phases[0];return phase?phase.start+(phase.end-phase.start)*clamp(0,1,token?.within||0):0;}
    return {timeline,phases,config,filmState,transformAt,calculateJourneyScrollDistance,getNavigationState,timeForNavigationState,viewer,
      refresh(){sizePhotos();ScrollTrigger.refresh();},
      destroy(){destroyed=true;viewer.destroy();trigger?.kill();timeline?.kill();fades.forEach(t=>{t.scrollTrigger?.kill();t.kill();});listeners.forEach(fn=>fn());
        section.classList.remove('journey-enhanced');section.classList.add('journey-static');delete section.dataset.phase;scene.replaceChildren();gsap.set([stage,scene,heading,axis,footer],{clearProps:'all'});}
    };
  }
  window.JourneyExperience={create,renderJourney,getHelixTransform};
})();
