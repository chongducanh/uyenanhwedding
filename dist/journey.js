/* A data-driven film helix. This experience owns only #journey and its viewer;
   Wedding Memories keeps its own timeline, album, wishes and fullscreen dialog. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const clamp=(min,max,value)=>Math.max(min,Math.min(max,value));
  const markerPosition=(index,count)=>count===1?.5:.12+index/(count-1)*.76;
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
    let timeline=null,trigger=null,lockedAt=null,pausedBefore=false,guard=false,destroyed=false,active='';
    const getScroll=()=>getSmoother()?.scrollTop()??window.scrollY;
    const setScroll=y=>getSmoother()?getSmoother().scrollTop(y):window.scrollTo(0,y);
    const lock=()=>{if(lockedAt!==null)return;lockedAt=timeline?.time()??0;pausedBefore=getSmoother()?.paused()??false;gsap.killTweensOf(window);getSmoother()?.paused(true);};
    const getResumeScroll=fallback=>trigger&&lockedAt!==null?trigger.start+lockedAt/timeline.duration()*(trigger.end-trigger.start):fallback;
    const unlock=y=>{setScroll(y);lockedAt=null;getSmoother()?.paused(pausedBefore);ScrollTrigger.update();};
    const viewer=window.JourneyPhotoViewer.create({gsap,Flip,reduced,lock,unlock,getScroll,getResumeScroll});
    const listen=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push(()=>node.removeEventListener(event,fn));};
    items.forEach(({button,item})=>listen(button,'click',()=>viewer.openPhotoViewer(button,item)));
    section.classList.toggle('journey-static',reduced);section.classList.toggle('journey-enhanced',!reduced);
    function geometry() {
      const width=stage.clientWidth,height=stage.clientHeight;
      const frameWidth=Math.min(width*(mobile?.40:tablet?.27:.235),mobile?188:280,height*(mobile?.25:.30));
      return {width,height,frameWidth,frameHeight:frameWidth*1.34,top:height*(mobile?.235:.245),bottom:height*.865,
        radiusX:width*(mobile?.30:tablet?.33:.325),depth:mobile?38:tablet?85:160};
    }
    function helixPose(index,pose) {
      const g=geometry(),side=index%2?1:-1,point=markerPosition(index,items.length);
      const markerY=g.top+(g.bottom-g.top)*point;
      const compactLandscape=g.width>g.height&&g.height<601;
      const focusY=mobile&&!compactLandscape?markerY:clamp(g.top+g.frameHeight*.38,g.bottom-g.frameHeight*.42,markerY);
      const focusX=side*(g.frameWidth*.60+(compactLandscape?105:mobile?8:tablet?135:125));
      const poses={
        back:{x:side*g.radiusX,y:markerY-g.height*.5,z:-g.depth,rotationY:-side*(mobile?10:24),rotationZ:side*6,scale:.76,opacity:.32},
        approaching:{x:side*g.radiusX*.78,y:focusY-g.height*.5,z:-g.depth*.25,rotationY:-side*(mobile?7:18),rotationZ:side*3,scale:.88,opacity:.64},
        focus:{x:focusX,y:focusY-g.height*.5,z:g.depth*.48,rotationY:-side*(mobile?1:3),rotationZ:side*.8,scale:1,opacity:1},
        crossing:{x:-side*g.radiusX*.22,y:markerY-g.height*.5-22,z:-g.depth*.70,rotationY:side*(mobile?7:25),rotationZ:side*7,scale:.65,opacity:.24},
        passed:{x:-side*g.radiusX*.94,y:markerY-g.height*.5-14,z:-g.depth*1.3,rotationY:side*(mobile?10:28),rotationZ:-side*5,scale:.64,opacity:.24},
        settle:{x:side*g.radiusX*.92,y:markerY-g.height*.5,z:-g.depth*.45,rotationY:-side*(mobile?8:18),rotationZ:side*4,scale:.74,opacity:.45}
      };
      return poses[pose];
    }
    function sizePhotos() {
      if(reduced)return;
      const g=geometry();stage.style.setProperty('--journey-frame-width',g.frameWidth+'px');
      stage.style.setProperty('--journey-axis-top',g.top+'px');stage.style.setProperty('--journey-axis-bottom',(g.height-g.bottom)+'px');
    }
    function movePhotoAlongFilmPath(tl,index,pose,duration,at) {
      const vars={duration,ease:'sine.inOut'};
      for(const key of ['x','y','z','rotationY','rotationZ','scale','opacity'])vars[key]=()=>helixPose(index,pose)[key];
      return tl.to(items[index].button,vars,at);
    }
    function updateTimelineProgress(tl,value,duration,at=0) {tl.to(progress,{scaleY:value,duration,ease:'none'},at);}
    function activateMilestone(tl,index) {
      const item=items[index],duration=lengths.marker;
      updateTimelineProgress(tl,markerPosition(index,items.length),duration*.64);
      tl.to(item.copy,{opacity:1,y:0,duration:duration*.36},duration*.64)
        .to(item.dot,{opacity:1,scale:1.08,duration:duration*.18,ease:'sine.inOut'},duration*.64)
        .to(item.dot,{scale:1,duration:duration*.18,ease:'sine.inOut'},duration*.82);
      movePhotoAlongFilmPath(tl,index,'approaching',duration,0);
      if(index)resetPreviousPhoto(tl,index-1,duration);
    }
    function resetPreviousPhoto(tl,index,duration) {
      movePhotoAlongFilmPath(tl,index,'crossing',duration*.55,0);
      movePhotoAlongFilmPath(tl,index,'passed',duration*.45,duration*.55);
    }
    function focusJourneyPhoto(tl,index) {
      const length=lengths.photo+(index===items.length-1?lengths.finalHold:0);
      movePhotoAlongFilmPath(tl,index,'focus',length*.58,0);
      if(index===items.length-1)updateTimelineProgress(tl,1,length*.58,0);
      tl.to({},{duration:length*.42},length*.58);
    }
    function playOutro(tl) {
      items.forEach((_,i)=>movePhotoAlongFilmPath(tl,i,'settle',lengths.outro*.52,0));
      tl.to({},{duration:lengths.outro*.16},lengths.outro*.52)
        .to(scene,{scale:.95,opacity:.62,duration:lengths.outro*.32,ease:'sine.inOut'},lengths.outro*.68)
        .to(heading,{opacity:.6,y:-8,duration:lengths.outro*.32},lengths.outro*.68);
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
      // Layering follows continuous depth, so crossing frames never pop forward.
      items.forEach(({button})=>{button.style.zIndex=String(300+Math.round(Number(gsap.getProperty(button,'z'))));});
    }
    function buildJourneyTimeline() {
      sizePhotos();gsap.set(items.map(i=>i.button),{xPercent:-50,yPercent:-50,transformOrigin:'50% 50%',force3D:true});
      items.forEach(({button},i)=>gsap.set(button,helixPose(i,'back')));
      gsap.set(progress,{scaleY:0,transformOrigin:'50% 0'});gsap.set(items.map(i=>i.copy),{opacity:.22,y:6});gsap.set(items.map(i=>i.dot),{opacity:.32});
      timeline=gsap.timeline({defaults:{ease:'none'},onUpdate:updateExperience});
      const part=(name,index,build)=>{const child=gsap.timeline();build(child);const start=timeline.duration();timeline.addLabel(name,start).add(child,start);phases.push({name,index,start,end:start+child.duration()});};
      part('intro',undefined,tl=>{
        tl.fromTo(heading,{opacity:.2,y:18},{opacity:1,y:0,duration:lengths.intro*.7},0)
          .fromTo(axis,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .fromTo(film,{opacity:.2},{opacity:1,duration:lengths.intro*.7},0)
          .to({},{duration:lengths.intro*.3});
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
    return {timeline,phases,config,calculateJourneyScrollDistance,getNavigationState,timeForNavigationState,viewer,
      refresh(){sizePhotos();ScrollTrigger.refresh();},
      destroy(){destroyed=true;viewer.destroy();trigger?.kill();timeline?.kill();fades.forEach(t=>{t.scrollTrigger?.kill();t.kill();});listeners.forEach(fn=>fn());
        section.classList.remove('journey-enhanced');section.classList.add('journey-static');delete section.dataset.phase;scene.replaceChildren();gsap.set([stage,scene,heading,axis,footer],{clearProps:'all'});}
    };
  }
  window.JourneyExperience={create,renderJourney};
})();
