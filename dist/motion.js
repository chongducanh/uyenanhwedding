/* All page animation is owned by GSAP. WebGL only draws the GSAP gallery state. */
(() => {
 if (!window.gsap || !window.ScrollTrigger) return;
 gsap.registerPlugin(ScrollTrigger, ScrollSmoother, ScrollToPlugin, SplitText);
 ScrollTrigger.config({ignoreMobileResize:true});
 const root=document.documentElement;
 const $=(s)=>document.querySelector(s), $$=(s)=>gsap.utils.toArray(s);
 const gallery=$('#album'), cards=$$('.ring-card');
 const photoCaption=$('#photo-caption'),photoCount=$('#photo-count');
 const captions=cards.map(card=>Array.from(card.querySelector('figcaption').childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim());
 const prev=$('#photo-prev'),next=$('#photo-next'),galleryWindow=$('.ring-window');
 const viewer=$('#photo-viewer'),viewerImage=$('#viewer-image');
 let viewerIndex=0,viewerOpener=null,viewerClosing=false,viewerScroll=0,viewerWasPaused=false,viewerReturn=null;
 let renderer,smoother=null,mm=null,galleryTween=null,galleryRock=null,portraitTween=null,portraitPosition=0,reduced=false,drag=null;
 const state={angle:0,tiltX:-20,tiltZ:-7};let activeStep=0,lastIndex=-1,needsDraw=true;
 const timelines={};
 const gallerySteps=Math.max(1,cards.length-1),galleryStepAngle=36;
 const ringBackdrops=$$('.ring-backdrop');let backdropLayer=0,backdropRequest=0;
 function setRingBackdrop(index){
  const request=++backdropRequest,incoming=ringBackdrops[1-backdropLayer],outgoing=ringBackdrops[backdropLayer];
  incoming.src=cards[index].querySelector('img').src;
  incoming.decode().then(()=>{
   if(request!==backdropRequest)return;
   gsap.to(incoming,{opacity:1,duration:reduced?0:.65,ease:'power1.inOut',overwrite:true});
   gsap.to(outgoing,{opacity:0,duration:reduced?0:.65,ease:'power1.inOut',overwrite:true});
   backdropLayer=1-backdropLayer;
  }).catch(()=>{});
 }
 const galleryAvailable=()=>{
  root.classList.remove('ring-pending');root.classList.add('ring-has3d');$('.ring-track').inert=root.classList.contains('motion-enabled');galleryWindow.tabIndex=root.classList.contains('motion-enabled')?0:-1;needsDraw=true;
  if(galleryTween?.scrollTrigger){galleryTween.scrollTrigger.enable();ScrollTrigger.refresh();}
 };
 const galleryFallback=()=>{
  root.classList.remove('ring-has3d','ring-pending');$('.ring-track').inert=false;galleryWindow.tabIndex=-1;
  if(galleryTween?.scrollTrigger){galleryTween.scrollTrigger.disable(true);ScrollTrigger.refresh();}
 };
 renderer=new WeddingGalleryRenderer($('.ring-canvas'),cards.map(c=>c.querySelector('img').src),galleryAvailable,galleryFallback);
 if(renderer.gl&&!renderer.failed)root.classList.add('ring-has3d','ring-pending');
 // Photos and web fonts must never block the invitation or its controls.
 document.fonts?.ready.then(()=>ScrollTrigger.refresh());
 const clamp=gsap.utils.clamp(0,1);
 const number=(n)=>String(n).padStart(2,'0');
 const getScroll=()=>smoother?smoother.scrollTop():window.scrollY;
 const scrollToY=(y,animate=true,duration=.95)=>{
  if(!animate||reduced){const position=Math.max(0,Math.min(ScrollTrigger.maxScroll(window),y));if(smoother)smoother.scrollTop(position);else window.scrollTo(0,position);return;}
  gsap.to(window,{scrollTo:{y:Math.max(0,Math.min(ScrollTrigger.maxScroll(window),y)),autoKill:true},duration:animate&&!reduced ? duration : 0,ease:'power2.inOut',overwrite:'auto'});
 };
 function goTo(target,animate=true,duration=.95){
  const el=typeof target==='string'?$(target):target;if(!el)return;
  const photoTarget=el.id==='invitation';
  const pin=ScrollTrigger.getAll().find(st=>st.vars.id===`pin-${photoTarget?'opening':el.id}`);
  const readableProgress={portrait:.1,date:.85,celebration:.25,location:.9,farewell:.30};
  const destination=pin?pin.start+(pin.end-pin.start)*(photoTarget ? .85 : (readableProgress[el.id]||0)):(smoother?smoother.offset(el,'top top'):el.getBoundingClientRect().top+scrollY);
  scrollToY(destination,animate,duration);
 }
 function syncGalleryMotion(){
  const active=!!galleryTween?.scrollTrigger?.isActive&&renderer?.ready&&!reduced&&!viewer.open&&!drag&&!document.hidden;
  if(galleryRock&&galleryRock.paused()===active)galleryRock.paused(!active);
 }
 function updateGallery(){
  syncGalleryMotion();
  if(reduced||!renderer.ready)return;
  const st=galleryTween?.scrollTrigger;
  if(!needsDraw&&!st?.isActive)return;
  renderer.draw(state.angle,state.tiltX,state.tiltZ);needsDraw=false;
  const q=-state.angle/galleryStepAngle,p=clamp(q/gallerySteps);
  activeStep=Math.max(0,Math.min(cards.length-1,Math.round(q)));
  const index=activeStep;
  if(index!==lastIndex){lastIndex=index;photoCount.textContent=`${number(index+1)} / ${number(cards.length)}`;photoCaption.textContent=captions[index];setRingBackdrop(index);}
  gsap.set('.ring-position span',{scaleX:.12+p*.88});
  prev.disabled=activeStep===0;next.disabled=activeStep===cards.length-1;
 }
 function changePhoto(direction){
  const st=galleryTween?.scrollTrigger;if(!st||reduced)return;
  const step=Math.max(0,Math.min(cards.length-1,activeStep+direction));
  scrollToY(st.start+(st.end-st.start)*step/gallerySteps);
 }
 function changePortrait(direction){
  const trigger=portraitTween?.scrollTrigger;if(!trigger||reduced)return;
  const index=Math.max(0,Math.min(4,Math.round(portraitPosition)+direction));
  const time=portraitTween.labels[`portrait-${index}`];
  scrollToY(trigger.start+(trigger.end-trigger.start)*time/portraitTween.duration(),true,.8);
 }
 $('#portrait-prev').addEventListener('click',()=>changePortrait(-1));
 $('#portrait-next').addEventListener('click',()=>changePortrait(1));
 prev.addEventListener('click',()=>changePhoto(-1));next.addEventListener('click',()=>changePhoto(1));
 galleryWindow.addEventListener('keydown',e=>{if(e.target===galleryWindow&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPhoto(Math.max(0,lastIndex),galleryWindow);return;}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changePhoto(e.key==='ArrowLeft'?-1:1);}});
 galleryWindow.addEventListener('pointerdown',e=>{if(reduced||!renderer.ready||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:getScroll(),active:false};syncGalleryMotion();});
 galleryWindow.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id||reduced)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.active){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){drag=null;return;}if(Math.abs(dx)<12)return;drag.active=true;galleryWindow.setPointerCapture(e.pointerId);galleryWindow.classList.add('is-dragging');}
  const st=galleryTween?.scrollTrigger;if(!st)return;
  const travel=gallerySteps*Math.min(innerWidth*.65,420);
  const y=gsap.utils.clamp(st.start,st.end,drag.scroll-dx*(st.end-st.start)/travel);
  gsap.set(window,{scrollTo:{y,autoKill:false}});
 });
 function release(e){
  if(!drag||e.pointerId!==drag.id)return;
  const tap=galleryWindow.contains(e.target)&&!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10&&e.type==='pointerup';
  if(galleryWindow.hasPointerCapture(e.pointerId))galleryWindow.releasePointerCapture(e.pointerId);
  drag=null;galleryWindow.classList.remove('is-dragging');syncGalleryMotion();
  if(tap){const index=renderer.pick(e.clientX,e.clientY);if(index!==null)openPhoto(index,galleryWindow);}
 }
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 galleryWindow.addEventListener('lostpointercapture',()=>{drag=null;galleryWindow.classList.remove('is-dragging');syncGalleryMotion();});
 window.addEventListener('blur',()=>{drag=null;galleryWindow.classList.remove('is-dragging');syncGalleryMotion();});
 // Full-image viewing is independent of ring rotation and always preserves the page position.
 const thumbs=cards.map((card,index)=>{
  const source=card.querySelector('img'),button=document.createElement('button');
  button.type='button';button.className='viewer-thumb';button.setAttribute('aria-label',`Xem ảnh ${index+1}`);button.setAttribute('aria-current','false');
  const img=document.createElement('img');img.src=source.dataset.thumb||source.src;img.alt='';img.loading='lazy';button.append(img);
  button.addEventListener('click',()=>showPhoto(index));$('.viewer-thumbnails').append(button);
  card.querySelector('.photo-window').setAttribute('aria-label',`Xem toàn bộ ảnh: ${captions[index]}`);
  card.querySelector('.photo-window').setAttribute('aria-haspopup','dialog');
  card.querySelector('.photo-window').addEventListener('click',e=>openPhoto(index,e.currentTarget));
  return button;
 });
 function showPhoto(index,direction=0){
  viewerIndex=(index+cards.length)%cards.length;const source=cards[viewerIndex].querySelector('img');
  gsap.killTweensOf(viewerImage);viewerImage.src=source.dataset.full||source.src;viewerImage.alt=source.alt;
  $('#viewer-caption').textContent=captions[viewerIndex];$('#viewer-count').textContent=`${number(viewerIndex+1)} / ${number(cards.length)}`;
  thumbs.forEach((thumb,i)=>thumb.setAttribute('aria-current',String(i===viewerIndex)));
  const strip=$('.viewer-thumbnails'),thumb=thumbs[viewerIndex];
  const thumbX=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,thumb.offsetLeft-strip.offsetLeft-(strip.clientWidth-thumb.offsetWidth)/2));
  gsap.to(strip,{scrollTo:{x:thumbX,autoKill:true},duration:reduced?0:.3,ease:'power1.out',overwrite:true});
  gsap.fromTo(viewerImage,{autoAlpha:reduced?1:.3,x:reduced?0:direction*18},{autoAlpha:1,x:0,duration:reduced?0:.28,ease:'power2.out'});
 }
 function openPhoto(index,opener){
  if(viewer.open||viewerClosing)return;
  viewerScroll=getScroll();viewerOpener=opener||document.activeElement;viewerWasPaused=smoother?.paused()||false;
  const st=galleryTween?.scrollTrigger,card=cards[index];
  viewerReturn={progress:st?.enabled?st.progress:index/gallerySteps,pinned:!!st?.enabled,card,cardTop:card.getBoundingClientRect().top};
  gsap.killTweensOf(window);smoother?.paused(true);root.classList.add('viewer-open');viewer.showModal();syncGalleryMotion();showPhoto(index);
  gsap.fromTo(viewer,{opacity:reduced?1:0},{opacity:1,duration:reduced?0:.25,ease:'power2.out'});
  $('#viewer-close').focus({preventScroll:true});
 }
 function restorePage(){
  root.classList.remove('viewer-open');smoother?.paused(viewerWasPaused);
  const st=galleryTween?.scrollTrigger;
  let destination=viewerScroll;
  if(st?.enabled)destination=st.start+(st.end-st.start)*viewerReturn.progress;
  else if(viewerReturn?.card){const cardTop=viewerReturn.card.getBoundingClientRect().top+(smoother?smoother.scrollTop():scrollY);destination=cardTop-(viewerReturn.pinned?90:viewerReturn.cardTop);}
  if(smoother)smoother.scrollTop(destination);else window.scrollTo(0,destination);
  const focusTarget=viewerOpener?.closest('[inert]')?$('#photo-open'):viewerOpener;focusTarget?.focus({preventScroll:true});viewerClosing=false;syncGalleryMotion();
 }
 function closePhoto(){
  if(!viewer.open||viewerClosing)return;viewerClosing=true;
  gsap.to(viewer,{opacity:0,duration:reduced?0:.18,ease:'power1.out',overwrite:true,onComplete:()=>viewer.close()});
 }
 $('#photo-open').addEventListener('click',e=>openPhoto(Math.max(0,lastIndex),e.currentTarget));
 $('#viewer-close').addEventListener('click',closePhoto);
 $('#viewer-prev').addEventListener('click',()=>showPhoto(viewerIndex-1,-1));$('#viewer-next').addEventListener('click',()=>showPhoto(viewerIndex+1,1));
 viewer.addEventListener('cancel',e=>{e.preventDefault();closePhoto();});viewer.addEventListener('close',restorePage);
 viewer.addEventListener('keydown',e=>{
  if(e.key==='Tab'){const buttons=Array.from(viewer.querySelectorAll('button')).filter(b=>!b.disabled&&b.getClientRects().length),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showPhoto(viewerIndex+(e.key==='ArrowLeft'?-1:1),e.key==='ArrowLeft'?-1:1);}});
 let viewerTouch=null;
 $('.viewer-stage').addEventListener('pointerdown',e=>{if(e.isPrimary)viewerTouch={x:e.clientX,y:e.clientY};});
 $('.viewer-stage').addEventListener('pointerup',e=>{if(!viewerTouch)return;const dx=e.clientX-viewerTouch.x,dy=e.clientY-viewerTouch.y;viewerTouch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)showPhoto(viewerIndex+(dx<0?1:-1),dx<0?1:-1);});
 $('.viewer-stage').addEventListener('pointercancel',()=>viewerTouch=null);
 function setupMotion(){
  if(mm)mm.revert();
  mm=gsap.matchMedia();
  mm.add({mobile:'(max-width: 700px)',desktop:'(min-width: 701px)',short:'(max-height: 600px)',systemReduced:'(prefers-reduced-motion: reduce)'},ctx=>{
   reduced=ctx.conditions.systemReduced;
   root.classList.toggle('reduced',reduced);root.classList.toggle('motion-enabled',!reduced);
   $('.ring-track').inert=!reduced&&renderer.ready;galleryWindow.tabIndex=!reduced&&renderer.ready?0:-1;
   const splits=[];
   $('.farewell-scene').inert=false;
   if(reduced){gsap.set('.event-line span',{scaleX:1});return()=>{root.classList.remove('reduced');};}
   smoother=ScrollSmoother.create({wrapper:'#smooth-wrapper',content:'#smooth-content',smooth:1.05,smoothTouch:.12,effects:false,normalizeScroll:false});
   if(viewer.open)smoother.paused(true);
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
   // Portrait coverflow, inspired by the reference's shallow photographic arc.
   const portraitCards=$$('.portrait-panel'),portraitBackgrounds=$$('.portrait-backdrop');
   const portraitShades=$$('.portrait-panel-shade'),portraitState={position:0};
   const portraitPrev=$('#portrait-prev'),portraitNext=$('#portrait-next');
   let portraitWidth=portraitCards[0].offsetWidth;
   gsap.set(portraitCards,{xPercent:-50,yPercent:-50,x:0,y:0,z:0,rotationY:0,scale:1,opacity:1,zIndex:1,force3D:true});
   gsap.set(portraitBackgrounds,{x:0,scale:1.15,opacity:0,force3D:true});
   gsap.set(portraitShades,{opacity:0});
   function drawPortrait(){
    portraitPosition=portraitState.position;
    portraitCards.forEach((card,i)=>{
     const distance=gsap.utils.wrap(-2.5,2.5,i-portraitPosition),depth=Math.abs(distance);
     gsap.set(card,{x:Math.sin(distance*.47)*portraitWidth*2.2,y:0,z:-depth*(mobile?100:120),rotationY:-distance*15,scale:1-depth*.075,opacity:clamp((2.5-depth)*2),zIndex:Math.round((3-depth)*10)});
     gsap.set(portraitShades[i],{opacity:Math.min(.8,depth*.32)});
     gsap.set(portraitBackgrounds[i],{opacity:Math.max(0,1-depth),x:-distance*24});
    });
    const index=Math.round(portraitPosition);
    $('#portrait-count').textContent=`${number(index+1)} / 05`;
    portraitPrev.disabled=index===0;portraitNext.disabled=index===4;
    gsap.set('.portrait-progress>span',{scaleX:(portraitPosition+1)/5});
   }
   const portrait=gsap.timeline({scrollTrigger:{...pin('portrait','.portrait-stage',mobile?3:3.2),onRefresh:()=>{portraitWidth=portraitCards[0].offsetWidth;drawPortrait();}}});
   portraitTween=portrait;timelines.portrait=portrait;
   portrait.from('.portrait-heading,.portrait-signature',{autoAlpha:0,y:18,stagger:.12,duration:.5,ease:'power1.out'},0)
    .from('.portrait-perspective',{autoAlpha:0,y:45,duration:.65,ease:'power2.out'},0)
    .addLabel('portrait-0',.65).to(portraitState,{duration:.3},.65);
   for(let i=1;i<portraitCards.length;i++){
    portrait.to(portraitState,{position:i,duration:1,ease:'power2.inOut',onUpdate:drawPortrait})
     .addLabel(`portrait-${i}`).to(portraitState,{duration:.4});
   }
   drawPortrait();
   // Retain the approved curved album; its rotation is a separate GSAP property.

   titleReveal('#album-title');
   if(renderer.gl&&!renderer.failed){
    state.angle=0;state.tiltX=-20;state.tiltZ=-7;needsDraw=true;
    galleryTween=gsap.to(state,{angle:-gallerySteps*galleryStepAngle,ease:'none',onUpdate:()=>{needsDraw=true;},scrollTrigger:pin('album','.ring-stage',Math.min(5,Math.max(2.5,gallerySteps*.17)))});timelines.album=galleryTween;
    galleryRock=gsap.to(state,{tiltX:-10,tiltZ:9,duration:4.4,ease:'sine.inOut',repeat:-1,yoyo:true,paused:true,onUpdate:()=>{needsDraw=true;}});
    gsap.ticker.add(updateGallery);updateGallery();
   }
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
    .from('.date-promise',{y:25,autoAlpha:0,duration:.5},1.2)
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
   countdown.from('.countdown-content>.eyebrow',{y:30,autoAlpha:0,duration:.55},0)
    .from('.countdown-title-line',{yPercent:115,stagger:.12,duration:.85,ease:'power2.out'},.1)
    .from('.count-unit',{x:i=>(mobile?[-65,65,-65,65]:[-160,-55,55,160])[i],y:i=>mobile?(i<2?70:100):90,rotation:i=>[-7,-3,3,7][i],scale:.72,autoAlpha:0,stagger:.14,duration:1.1,ease:'power2.out'},.45)
    .from('.count-label',{y:16,autoAlpha:0,stagger:.1,duration:.5},1.05)
    .to(orbit,{strokeDashoffset:0,duration:2.8,ease:'power1.inOut'},.15)
    .from('.countdown-note,.countdown-bottom',{y:22,autoAlpha:0,stagger:.12,duration:.6},1.5)
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
    gsap.ticker.remove(updateGallery);galleryRock?.kill();galleryRock=null;galleryTween=null;portraitTween=null;$('.farewell-scene').inert=false;splits.forEach(s=>s.revert());smoother?.kill();smoother=null;root.classList.remove('motion-enabled');drag=null;
   };
  });
 }
 // Keep the portrait's current image and scroll position when orientation changes.
 let portraitRestore=null;
 addEventListener('resize',()=>{
  const trigger=portraitTween?.scrollTrigger;
  portraitRestore=trigger?.isActive?trigger.progress:null;
  if(portraitRestore!==null)gsap.killTweensOf(window);
 },true);
 gsap.addEventListener('matchMediaInit',()=>{
  const trigger=portraitTween?.scrollTrigger;
  if(trigger?.isActive)portraitRestore=trigger.progress;
 });
 gsap.addEventListener('matchMedia',()=>{
  const progress=portraitRestore;portraitRestore=null;
  if(progress===null||reduced||!portraitTween)return;
  gsap.delayedCall(.03,()=>{
   const trigger=portraitTween?.scrollTrigger;if(!trigger||reduced)return;
   scrollToY(trigger.start+(trigger.end-trigger.start)*progress,false);
  });
 });
 setupMotion();
 // Internal links preserve native URLs while GSAP owns their scrolling.
 $$('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  const target=$(link.getAttribute('href'));if(!target)return;event.preventDefault();history.pushState(null,'',link.getAttribute('href'));goTo(target,true);
  if(link.classList.contains('skip')){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
 }));
 addEventListener('popstate',()=>goTo(location.hash||'#opening',false));
 document.addEventListener('visibilitychange',syncGalleryMotion);
 // Hover feedback also runs through GSAP; focus styling remains immediate.
 $$('button,.map-bottom a,.farewell-link').forEach(el=>{
  el.addEventListener('pointerenter',e=>{if(!reduced&&e.pointerType==='mouse'&&!el.disabled)gsap.to(el,{opacity:.7,duration:.22,ease:'power1.out',overwrite:true});});
  el.addEventListener('pointerleave',()=>gsap.to(el,{opacity:1,duration:reduced?0:.22,overwrite:true,onComplete:()=>gsap.set(el,{clearProps:'opacity'})}));
 });
 const mapButton=$('#map-interact'),map=$('#venue-map'),mapShell=$('.map-shell');
 mapButton.addEventListener('click',()=>{const on=mapButton.getAttribute('aria-pressed')!=='true';mapButton.setAttribute('aria-pressed',String(on));mapButton.textContent=on?'Quay lại cuộn trang':'Tương tác bản đồ';mapShell.classList.toggle('is-interactive',on);map.tabIndex=on?0:-1;});
 addEventListener('resize',()=>{needsDraw=true;});
 ScrollTrigger.addEventListener('refresh',()=>{needsDraw=true;});
 gsap.delayedCall(.15,()=>{ScrollTrigger.refresh();if(location.hash&&$(location.hash))goTo(location.hash,false);});
 // Exposes only animation state for browser QA and future editing.
 window.weddingMotion={get smoother(){return smoother;},get reduced(){return reduced;},timelines,get portraitPosition(){return portraitPosition;},get galleryAngle(){return state.angle;},get galleryTilt(){return {x:state.tiltX,z:state.tiltZ};},gsapVersion:gsap.version};
})();
