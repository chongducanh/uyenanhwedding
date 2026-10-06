/* GSAP owns page motion; WeddingMemories owns its gallery and viewer lifecycle. */
(() => {
 if (!window.gsap || !window.ScrollTrigger) return;
 gsap.registerPlugin(ScrollTrigger, ScrollSmoother, ScrollToPlugin, SplitText, Flip);
 ScrollTrigger.config({ignoreMobileResize:true});
 const root=document.documentElement;
 const $=(s)=>document.querySelector(s), $$=(s)=>gsap.utils.toArray(s);
 let smoother=null,mm=null,reduced=false,memories=null,journey=null;
 const timelines={};
 // Photos and web fonts must never block the invitation or its controls.
 document.fonts?.ready.then(()=>ScrollTrigger.refresh());
 const scrollToY=(y,animate=true,duration=.95)=>{
  if(!animate||reduced){const position=Math.max(0,Math.min(ScrollTrigger.maxScroll(window),y));if(smoother)smoother.scrollTop(position);else window.scrollTo(0,position);return;}
  gsap.to(window,{scrollTo:{y:Math.max(0,Math.min(ScrollTrigger.maxScroll(window),y)),autoKill:true},duration:animate&&!reduced ? duration : 0,ease:'power2.inOut',overwrite:'auto'});
 };
 function goTo(target,animate=true,duration=.95){
  const selector=typeof target==='string'&&['#album','#portrait'].includes(target)?'#memories':target;
  const el=typeof selector==='string'?$(selector):selector;if(!el)return;
  const photoTarget=el.id==='invitation';
  const pin=el.id==='memories'?memories?.timeline?.scrollTrigger:ScrollTrigger.getAll().find(st=>st.vars.id===`pin-${photoTarget?'opening':el.id}`);
  const readableProgress={journey:.12,memories:.12,date:.85,celebration:.25,location:.9,farewell:.30};
  const destination=pin?pin.start+(pin.end-pin.start)*(photoTarget ? .85 : (readableProgress[el.id]||0)):(smoother?smoother.offset(el,'top top'):el.getBoundingClientRect().top+scrollY);
  scrollToY(destination,animate,duration);
 }
 // Accelerate wheel input only; GSAP still owns smoothing and pin coordinates.
 // Native touch, zoom gestures, embedded media and form scrolling stay native.
 const WHEEL_MULTIPLIER=1.2;
 function enableWheelBoost(){
  const editable='input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  function onWheel(event){
   if(event.defaultPrevented||!event.cancelable||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;
   if(smoother?.paused()||root.classList.contains('mem-interaction-locked')||document.querySelector('dialog[open]'))return;
   const target=event.target instanceof Element?event.target:null;
   if(target?.closest(editable+', [role="dialog"]')||document.activeElement?.matches(editable))return;
   for(let node=target;node&&node!==document.body&&node!==root;node=node.parentElement){
    if(node.scrollHeight>node.clientHeight+1&&/(auto|scroll|overlay)/.test(getComputedStyle(node).overflowY))return;
   }
   const style=getComputedStyle(document.body);
   const lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2||16;
   const unit=event.deltaMode===1?lineHeight:event.deltaMode===2?innerHeight:1;
   event.preventDefault();
   window.scrollBy({top:event.deltaY*unit*WHEEL_MULTIPLIER,left:0,behavior:'instant'});
  }
  window.addEventListener('wheel',onWheel,{passive:false});
  return()=>window.removeEventListener('wheel',onWheel);
 }
 function setupMotion(){
  if(mm)mm.revert();
  mm=gsap.matchMedia();
  mm.add({mobile:'(max-width: 700px)',desktop:'(min-width: 701px)',galleryMobile:'(max-width: 767px)',galleryTablet:'(min-width: 768px) and (max-width: 1023px)',short:'(max-height: 600px)',systemReduced:'(prefers-reduced-motion: reduce)'},ctx=>{
   reduced=ctx.conditions.systemReduced;
   root.classList.toggle('reduced',reduced);root.classList.toggle('motion-enabled',!reduced);
   Object.keys(timelines).forEach(key=>delete timelines[key]);
   const splits=[];
   $('.farewell-scene').inert=false;
   // Reduced motion keeps the gallery and full-image viewer usable without pinned motion.
   if(reduced){
    gsap.set('.event-line span',{scaleX:1});
    const journeyExperience=window.JourneyExperience?.create({gsap,ScrollTrigger,Flip,getSmoother:()=>smoother,reduced:true,mobile:ctx.conditions.galleryMobile,tablet:ctx.conditions.galleryTablet});
    journey=journeyExperience||null;
    const experience=window.WeddingMemories?.create({gsap,ScrollTrigger,getSmoother:()=>smoother,reduced:true,mobile:ctx.conditions.galleryMobile,tablet:ctx.conditions.galleryTablet});
    memories=experience||null;if(experience?.timeline)timelines.memories=experience.timeline;
    return()=>{journeyExperience?.destroy();journey=null;experience?.destroy();memories=null;root.classList.remove('reduced');};
   }
   smoother=ScrollSmoother.create({wrapper:'#smooth-wrapper',content:'#smooth-content',smooth:1.05,smoothTouch:.12,effects:false,normalizeScroll:false});
   const removeWheelBoost=enableWheelBoost();
   const mobile=ctx.conditions.mobile,flowMap=mobile||ctx.conditions.short;
   const pin=(id,stage,length)=>({id:`pin-${id}`,trigger:`#${id}`,pin:stage,pinSpacer:id==='location'?$('.location-pin-spacer'):undefined,start:'top top',end:()=>`+=${innerHeight*length}`,scrub:.65,invalidateOnRefresh:true,anticipatePin:1});
   function titleReveal(selector){
    const split=SplitText.create(selector,{type:'lines,words',mask:'lines',autoSplit:true,aria:'auto',onSplit(self){return gsap.from(self.words,{yPercent:110,autoAlpha:0,stagger:.06,ease:'none',scrollTrigger:{trigger:selector,start:'top 92%',end:'top 42%',scrub:.5,invalidateOnRefresh:true}});}});splits.push(split);
   }
   // A single pinned scene opens the envelope directly onto a full-screen photograph.
   const opening=gsap.timeline({scrollTrigger:pin('opening','.opening-stage',mobile?2.5:2.65)});timelines.opening=opening;
   opening.addLabel('sealed',0)
    .to('.opening-intro,.opening-dateline',{autoAlpha:0,y:-12,duration:.5,ease:'power1.in'},.1)
    .to('.opening-card .card-seal',{scale:.8,autoAlpha:0,duration:.4,ease:'power2.in'},.18)
    .addLabel('unfold',.5)
    .to('.opening-card .flap-left',{rotationY:-105,xPercent:-8,duration:1.7,ease:'power2.inOut'},'unfold')
    .to('.opening-card .flap-right',{rotationY:105,xPercent:8,duration:1.7,ease:'power2.inOut'},'unfold+=0.08')
    .to('.opening-card .flap-top',{rotationX:105,yPercent:-8,duration:1.8,ease:'power2.inOut'},'unfold+=0.18')
    .to('.opening-card .flap-bottom',{rotationX:-105,yPercent:8,duration:1.8,ease:'power2.inOut'},'unfold+=0.28')
    .fromTo('.opening-photo img',{scale:1.13},{scale:1,duration:3.2,ease:'power1.out'},.65)
    .addLabel('photo',2.8)
    .from('.photo-invitation-shade',{autoAlpha:0,duration:1,ease:'power1.out'},2.05)
    .from('.photo-invitation-kicker',{y:18,autoAlpha:0,duration:.6},2.65)
    .from('.photo-name',{yPercent:110,autoAlpha:0,stagger:.16,duration:.85,ease:'power2.out'},2.8)
    .from('.photo-invitation-copy',{y:24,autoAlpha:0,duration:.7},3.25)
    .from('.photo-invitation-details',{y:20,autoAlpha:0,duration:.65},3.55)
    .to('.opening-photo',{duration:1.15},4.2);
   // Create pins in DOM order: Journey always releases before Wedding Memories.
   const journeyExperience=window.JourneyExperience?.create({gsap,ScrollTrigger,Flip,getSmoother:()=>smoother,reduced,mobile:ctx.conditions.galleryMobile,tablet:ctx.conditions.galleryTablet});
   journey=journeyExperience||null;if(journey?.timeline)timelines.journey=journey.timeline;
   // Keep gallery layout, navigation and modal state inside one disposable experience.
   const experience=window.WeddingMemories?.create({gsap,ScrollTrigger,getSmoother:()=>smoother,reduced,mobile:ctx.conditions.galleryMobile,tablet:ctx.conditions.galleryTablet});
   memories=experience||null;if(experience?.timeline)timelines.memories=experience.timeline;
   // 03 — The date assembles in opposing directions, then receives a drawn underline.
   const path=$('.date-swoosh path'),length=path.getTotalLength();
   gsap.set(path,{strokeDasharray:length,strokeDashoffset:length});
   const date=gsap.timeline({scrollTrigger:pin('date','.calendar-stage',1.25)});timelines.date=date;
   date.from('.calendar-intro',{y:25,autoAlpha:0,duration:.35},0)
    .from('.date-day',{xPercent:-65,yPercent:15,autoAlpha:0,duration:.9,ease:'power2.out'},0)
    .from('.date-month',{xPercent:65,yPercent:-15,autoAlpha:0,duration:.9,ease:'power2.out'},.08)
    .from('.date-divider',{scaleY:0,duration:.7,ease:'power2.out'},.2)
    .from('.calendar-details>*',{y:45,autoAlpha:0,stagger:.12,duration:.65},.5)
    .to(path,{strokeDashoffset:0,duration:.9,ease:'power1.inOut'},.9)
    .from('.month-heading',{y:20,autoAlpha:0,duration:.5},.35)
    .from('.month-grid thead',{y:10,autoAlpha:0,duration:.4},.5)
    .from('.month-day',{y:15,autoAlpha:0,stagger:.018,duration:.45,ease:'power1.out'},.6)
    .from('.wedding-heart',{scale:.6,autoAlpha:0,duration:.65,ease:'back.out(1.5)'},1.2)
    .from('.month-legend',{y:12,autoAlpha:0,duration:.5},1.35)
    .to('.date-composition',{scale:1.025,duration:.8,ease:'none'},1.7)
    .to('.month-calendar',{duration:.55},2.5);
   // The clock assembles while pinned; real-time digits live on separate inner elements.
   const orbit=$('.countdown-orbit-line'),orbitLength=orbit.getTotalLength();
   gsap.set(orbit,{strokeDasharray:orbitLength,strokeDashoffset:orbitLength});
   const countdown=gsap.timeline({scrollTrigger:pin('countdown','.countdown-stage',mobile?1.35:1.45)});timelines.countdown=countdown;
   countdown.from('.countdown-title-line',{yPercent:115,stagger:.12,duration:.85,ease:'power2.out'},.1)
    .from('.count-unit',{x:i=>(mobile?[-65,65,-65,65]:[-160,-55,55,160])[i],y:i=>mobile?(i<2?70:100):90,rotation:i=>[-7,-3,3,7][i],scale:.72,autoAlpha:0,stagger:.14,duration:1.1,ease:'power2.out'},.45)
    .from('.count-label',{y:16,autoAlpha:0,stagger:.1,duration:.5},1.05)
    .to(orbit,{strokeDashoffset:0,duration:2.8,ease:'power1.inOut'},.15)
    .from('.countdown-note',{y:22,autoAlpha:0,stagger:.12,duration:.6},1.5)
    .addLabel('read',2.1)
    .to('.countdown-clock',{duration:1.1},'read')
    .to('.countdown-clock',{scale:1.045,y:-8,duration:.7,ease:'sine.inOut'},3.2)
    .to('.countdown-orbit',{rotation:55,duration:3.9,ease:'none'},0);
   // 04 — Two event scenes share one horizontal timeline, with a reading pause on each.
   titleReveal('#celebration-title');
   const schedule=gsap.timeline({scrollTrigger:pin('celebration','.schedule-stage',mobile?1.8:2)});timelines.celebration=schedule;
   schedule.from('.event-card:first-child .event-copy>*',{y:25,autoAlpha:0,stagger:.08,duration:.5},0)
    .from('.event-card:first-child .event-photo img',{scale:1.12,duration:1.2,ease:'none'},0)
    .to('.event-track',{xPercent:-50,duration:1.45,ease:'power2.inOut'},.85)
    .from('.event-card:last-child .event-photo img',{scale:1.12,duration:1,ease:'none'},1.6)
    .from('.event-card:last-child .event-copy>*',{y:25,autoAlpha:0,stagger:.07,duration:.5},1.85)
    .to('.event-line span',{scaleX:1,duration:3,ease:'none'},0)
    .to('.event-track',{duration:.35},2.65);
   // 05 — The destination follows the same paper, type and unhurried reveal as the invitation.
   const locationTrigger=flowMap?{id:'location-reveal',trigger:'#location',start:'top 82%',end:'top 8%',scrub:.6,invalidateOnRefresh:true}:pin('location','.location-stage',1.15);
   const location=gsap.timeline({scrollTrigger:locationTrigger});timelines.location=location;
   location.from('.venue-kicker',{y:18,autoAlpha:0,duration:.5},0)
    .from('.venue-title-line',{yPercent:112,stagger:.14,duration:.85,ease:'power2.out'},.1)
    .from('.venue-address',{y:20,autoAlpha:0,stagger:.13,duration:.65},.5);
   if(flowMap){
    gsap.from('.venue-map-composition',{clipPath:'inset(8% 6% 8% 6%)',y:30,ease:'none',scrollTrigger:{trigger:'.venue-map-composition',start:'top 94%',end:'top 52%',scrub:.6}});
   }else{
    location.from('.venue-map-composition',{clipPath:'inset(15% 10% 15% 10%)',y:38,autoAlpha:0,duration:.9,ease:'power2.out'},.6)
     .to('.venue-intro',{duration:.5},1.6);
   }
   // The last page settles inside the full-width envelope; the folds close in reverse order.
   gsap.set('.closing-card-space,.closing-summary,.closing-dateline',{autoAlpha:0});
   gsap.set('.closing-card .flap-left',{rotationY:-105,xPercent:-8});
   gsap.set('.closing-card .flap-right',{rotationY:105,xPercent:8});
   gsap.set('.closing-card .flap-top',{rotationX:105,yPercent:-8});
   gsap.set('.closing-card .flap-bottom',{rotationX:-105,yPercent:8});
   gsap.set('.closing-card .card-seal',{autoAlpha:0,scale:.8});
   const farewell=gsap.timeline({scrollTrigger:pin('farewell','.farewell-stage',3),onUpdate:()=>{$('.farewell-scene').inert=farewell.time()>farewell.labels.collect;}});timelines.farewell=farewell;
   farewell.from('.farewell-photo',{clipPath:'inset(14% 18% 14% 18%)',duration:1.25,ease:'power2.out'},0)
    .from('.farewell-photo img',{scale:1.14,duration:2,ease:'none'},0)
    .from('.farewell-content .eyebrow',{y:20,autoAlpha:0,duration:.4},.2)
    .from('.farewell-line',{yPercent:115,stagger:.2,duration:.9,ease:'power2.out'},.45)
    .from('.farewell-note',{y:25,autoAlpha:0,duration:.6},1)
    .from('.farewell-signature',{y:25,autoAlpha:0,duration:.6},1.25)
    .from('.farewell-link',{y:18,autoAlpha:0,duration:.5},1.6)
    .to('.farewell-content',{duration:.5},2)
    .addLabel('collect',2.8)
    .to('.farewell-bottom,.farewell-link',{autoAlpha:0,duration:.35},2.65)
    .to('.closing-card-space',{autoAlpha:1,duration:.45},'collect')
    .to('.farewell-scene',{scale:mobile?.38:.3,x:0,y:0,rotation:0,transformOrigin:'50% 50%',borderRadius:3,duration:1.55,ease:'power2.inOut'},'collect')
    .to('.farewell-scene',{scale:.08,autoAlpha:0,duration:.9,ease:'power1.in'},4.7)
    .addLabel('fold',4.45)
    .to('.closing-card .flap-bottom',{rotationX:0,yPercent:0,duration:1.45,ease:'power2.inOut'},'fold')
    .to('.closing-card .flap-top',{rotationX:0,yPercent:0,duration:1.45,ease:'power2.inOut'},'fold+=0.08')
    .to('.closing-card .flap-right',{rotationY:0,xPercent:0,duration:1.45,ease:'power2.inOut'},'fold+=0.2')
    .to('.closing-card .flap-left',{rotationY:0,xPercent:0,duration:1.45,ease:'power2.inOut'},'fold+=0.28')
    .to('.closing-card .card-seal',{scale:1,autoAlpha:1,duration:.6,ease:'power2.out'},6)
    .fromTo('.closing-summary,.closing-dateline',{y:16,autoAlpha:0},{y:0,autoAlpha:1,stagger:.12,duration:.7},6.1)
    .to('.closing-card',{duration:.7},6.95);
   // Shared scroll position and chapter labels.
   gsap.to('.page-progress',{scaleX:1,ease:'none',scrollTrigger:{id:'page-progress',trigger:'#smooth-content',start:'top top',end:'bottom bottom',scrub:true}});
   ScrollTrigger.refresh();
   return()=>{
    removeWheelBoost();
    // Restore any gallery modal scroll lock before disposing the shared smoother.
    journeyExperience?.destroy();journey=null;experience?.destroy();memories=null;$('.farewell-scene').inert=false;splits.forEach(s=>s.revert());smoother?.kill();smoother=null;root.classList.remove('motion-enabled');
   };
  });
 }
 // Capture a logical gallery position before resize changes its pin length or pagination.
 // The same token survives both matchMedia rebuilds and GSAP's delayed resize refresh.
 let memoriesRestore=null,restoreTask=null,resizeSettled=null,restoringMemories=false;
 let galleryViewport={width:innerWidth,height:innerHeight};
 function captureMemoriesResize(){
  if(galleryViewport.width===innerWidth&&galleryViewport.height===innerHeight)return;
  galleryViewport={width:innerWidth,height:innerHeight};
  const activeExperience=journey?.timeline?.scrollTrigger?.isActive?journey:memories;
  const trigger=activeExperience?.timeline?.scrollTrigger;
  if(!memoriesRestore&&trigger?.isActive&&!reduced){
   memoriesRestore={experience:activeExperience===journey?'journey':'memories',navigation:activeExperience.getNavigationState?.()||null,progress:trigger.progress};
   gsap.killTweensOf(window);
  }
  // A resize which causes no refresh must leave the current view untouched.
  resizeSettled?.kill();
  resizeSettled=gsap.delayedCall(.6,()=>{memoriesRestore=null;resizeSettled=null;});
 }
 function restoreMemoriesAfterRefresh(){
  if(!memoriesRestore||restoringMemories||reduced)return;
  restoreTask?.kill();
  restoreTask=gsap.delayedCall(.01,()=>{
   restoreTask=null;
   const saved=memoriesRestore,experience=saved?.experience==='journey'?journey:memories,timeline=experience?.timeline,trigger=timeline?.scrollTrigger;
   if(!saved||!trigger||!trigger.enabled||reduced)return;
   const time=saved.navigation?experience.timeForNavigationState?.(saved.navigation):null;
   const progress=typeof time==='number'&&Number.isFinite(time)&&timeline.duration()>0
    ?gsap.utils.clamp(0,1,time/timeline.duration()):saved.progress;
   restoringMemories=true;
   try{
    // Direct positioning does not unpause the smoother or steal a focused form field.
    scrollToY(trigger.start+(trigger.end-trigger.start)*progress,false);
   }finally{restoringMemories=false;}
  });
 }
 addEventListener('resize',captureMemoriesResize,true);
 gsap.addEventListener('matchMediaInit',captureMemoriesResize);
 ScrollTrigger.addEventListener('refreshInit',captureMemoriesResize);
 ScrollTrigger.addEventListener('refresh',restoreMemoriesAfterRefresh);
 gsap.addEventListener('matchMedia',restoreMemoriesAfterRefresh);
 function clearPendingScrollRestore(){
  memoriesRestore=null;restoreTask?.kill();restoreTask=null;
  resizeSettled?.kill();resizeSettled=null;restoringMemories=false;
  gsap.killTweensOf(window);
  galleryViewport={width:innerWidth,height:innerHeight};
 }
 function resetPageToTop(){
  clearPendingScrollRestore();
  ScrollTrigger.clearScrollMemory('manual');
  smoother?.scrollTop(0);
  window.scrollTo({top:0,left:0,behavior:'instant'});
  ScrollTrigger.update();
 }
 setupMotion();
 resetPageToTop();
 addEventListener('pageshow',event=>{
  if(event.persisted){
   // Dispose cached viewers/form locks before rebuilding the pinned scenes.
   clearPendingScrollRestore();
   setupMotion();
  }
  resetPageToTop();
 });
 // Internal links preserve native URLs while GSAP owns their scrolling.
 $$('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  const href=link.getAttribute('href'),selector=['#album','#portrait'].includes(href)?'#memories':href;
  const target=$(selector);if(!target)return;event.preventDefault();history.pushState(null,'',selector);goTo(target,true);
  if(link.classList.contains('skip')){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
 }));
 addEventListener('popstate',()=>goTo(location.hash||'#opening',false));
 // Hover feedback also runs through GSAP; focus styling remains immediate.
 $$('button,.map-bottom a,.farewell-link').filter(el=>!el.closest('#memories,.mem-viewer,#journey,.journey-viewer')).forEach(el=>{
  el.addEventListener('pointerenter',e=>{if(!reduced&&e.pointerType==='mouse'&&!el.disabled)gsap.to(el,{opacity:.7,duration:.22,ease:'power1.out',overwrite:true});});
  el.addEventListener('pointerleave',()=>gsap.to(el,{opacity:1,duration:reduced?0:.22,overwrite:true,onComplete:()=>gsap.set(el,{clearProps:'opacity'})}));
 });
 const mapButton=$('#map-interact'),map=$('#venue-map'),mapShell=$('.map-shell');
 mapButton.addEventListener('click',()=>{const on=mapButton.getAttribute('aria-pressed')!=='true';mapButton.setAttribute('aria-pressed',String(on));mapButton.textContent=on?'Quay lại cuộn trang':'Tương tác bản đồ';mapShell.classList.toggle('is-interactive',on);map.tabIndex=on?0:-1;});
 gsap.delayedCall(.15,()=>ScrollTrigger.refresh());
 // Exposes only animation state for browser QA and future editing.
 window.weddingMotion={get smoother(){return smoother;},get reduced(){return reduced;},get memories(){return memories;},get journey(){return journey;},timelines,gsapVersion:gsap.version};
})();
