/* Wedding Memories — a world-space camera and ten scroll-controlled phases.
   Assets and photographs live in memories-data.js; there is no autoplay. */
(() => {
 'use strict';
 const CONFIG = {
  worldWidth:1440,worldCenterY:605,photoFocusScale:.78,albumScale:.88,
  photoScrollLength:1.12,albumPageScrollLength:1.3,cameraDuration:.65,
  blurAmount:2,mobileBreakpoint:767,mobilePhotoScrollLength:.43,
  mobileAlbumPageScrollLength:.43,scrub:.75
 };
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const hold=(timeline,length)=>timeline.to({}, {duration:length});
 function create({gsap,ScrollTrigger,getSmoother,reduced=false,mobile=false,tablet=false}){
  const section=document.querySelector('#memories'),data=window.WEDDING_MEMORIES_DATA;
  if(!section||!data)return{destroy(){}};
  const stage=section.querySelector('.mem-stage'),world=section.querySelector('.mem-world');
  const wishHost=section.querySelector('.mem-wish-host'),heading=section.querySelector('.mem-heading');
  const caption=section.querySelector('.mem-caption-text'),indexLabel=section.querySelector('.mem-caption-index');
  const hint=section.querySelector('.mem-scroll-hint'),progress=section.querySelector('.mem-progress>span');
  const nav=[...section.querySelectorAll('[data-memory-jump]')];
  const listeners=[],locks=new Set();let destroyed=false,timeline=null,lockedAt=null,lockedScroll=0,wasPaused=false;
  const listen=(target,type,callback,options)=>{target.addEventListener(type,callback,options);listeners.push(()=>target.removeEventListener(type,callback,options));};
  const scroll=()=>getSmoother()?.scrollTop()??window.scrollY;
  const restoreScroll=y=>{const smoother=getSmoother();if(smoother)smoother.scrollTop(y);else window.scrollTo(0,y);};
  function lock(reason){
   if(reduced||locks.has(reason))return;
   if(!locks.size){lockedAt=timeline?.time()??0;lockedScroll=scroll();wasPaused=getSmoother()?.paused()??false;gsap.killTweensOf(window);getSmoother()?.paused(true);document.documentElement.classList.add('mem-interaction-locked');}
   locks.add(reason);
  }
  function unlock(reason){
   if(!locks.delete(reason)||locks.size)return;
   document.documentElement.classList.remove('mem-interaction-locked');
   if(!destroyed){restoreScroll(lockedScroll);getSmoother()?.paused(wasPaused);}
   lockedAt=null;
  }
  const allPhotos=[...data.photos,...data.album];
  const viewer=window.WeddingMemoryViewer.create({photos:allPhotos,getSmoother,reduced,onLock:()=>lock('viewer'),onUnlock:()=>unlock('viewer')});
  const openPhoto=(photo,button)=>viewer.open(photo,button);
  const wish=window.WeddingWishForm.create({mount:wishHost,site:data.site,reduced,onLock:()=>lock('wish'),onUnlock:()=>unlock('wish')});
  const createPhoto=(photo,index)=>{
   const button=el('button','mem-frame');button.type='button';button.dataset.photoId=photo.id;
   button.setAttribute('aria-label',`Xem toàn bộ ảnh: ${photo.caption}`);
   const image=el('img','mem-frame-image');image.src=photo.src;image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.loading='lazy';image.decoding='async';image.draggable=false;
   const surface=el('span','mem-frame-window');surface.append(image);
   button.append(surface);
   if(data.site.frameAsset){const border=el('img','mem-frame-art');border.src=data.site.frameAsset;border.alt='';border.decoding='async';border.draggable=false;button.append(border);button.classList.add('mem-frame--art');}
   button.append(el('span','mem-frame-number',String(index+1).padStart(2,'0')));
   listen(button,'click',()=>openPhoto(photo,button));return button;
  };
  world.replaceChildren();section.classList.toggle('mem-static',reduced);
  let album,frames=[],sceneObjects=[],camera={cx:720,cy:CONFIG.worldCenterY,zoom:1,screenY:.55},bookState={open:0,page:0,close:0};
  const phases=[],photoRanges=[],pageRanges=[];let activePhase='',lastPage=-1;
  if(reduced){
   const tableGallery=el('div','mem-static-frames');frames=data.photos.map(createPhoto);tableGallery.append(...frames);world.append(tableGallery);
   const mount=el('div','mem-static-album');world.append(mount);
   album=window.WeddingAlbum.create({mount,photos:data.album,site:data.site,onPhotoClick:openPhoto,mobile,reduced:true});
   wish.setActive(true);caption.textContent='Những hình ảnh để giữ. Những lời thương để trao.';hint.textContent='Bấm ảnh để xem trọn khung';
   nav.forEach(button=>listen(button,'click',()=>{const target=button.dataset.memoryJump==='wishes'?wishHost:button.dataset.memoryJump==='album'?mount:tableGallery;target.scrollIntoView({behavior:'instant',block:'start'});}));
  }else{
   const backdrop=el('div','mem-world-backdrop');backdrop.setAttribute('aria-hidden','true');world.append(backdrop);
   // One uncut artwork contains the ready-set table, cloth, flowers, candles
   // and pearls, including their original tabletop and contact details.
   const table=el('div','mem-table mem-object');table.setAttribute('aria-hidden','true');
   const tableArt=el('img','mem-table-art');tableArt.src=data.site.tableAsset;tableArt.alt='';
   tableArt.decoding='async';tableArt.width=1122;tableArt.height=1402;table.append(tableArt);world.append(table);
   const contacts=new Map();
   function contact(node,x,y,width,height=22){
    const shadow=el('div','mem-contact');shadow.setAttribute('aria-hidden','true');
    Object.assign(shadow.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'});
    world.append(shadow);contacts.set(node,shadow);return shadow;
   }
   const positions=[
    {x:328,y:442,w:140,h:94,r:-1,row:'front'},
    {x:340,y:336,w:105,h:159,r:-.8,row:'back'},
    {x:477,y:313,w:120,h:182,r:.5,row:'back'},
    {x:543,y:411,w:87,h:128,r:1,row:'front'},
    {x:631,y:343,w:101,h:152,r:-.5,row:'back'}
   ];
   frames=data.photos.map((photo,i)=>{
    const width=Math.min(154,850/data.photos.length),height=width*photo.height/photo.width+16;
    const placement={x:240+i*880/Math.max(1,data.photos.length-1),y:630-height-(i%2)*25,w:width,h:height,r:i%2?4:-4};
    const n=createPhoto(photo,i),p=photo.placement||(data.photos.length===5?positions[i]:placement);
    Object.assign(n.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'});n.dataset.rotation=p.r;n.dataset.row=p.row||'back';n.classList.add('mem-object');world.append(n);contact(n,p.x+5,p.y+p.h-4,p.w*1.08);return n;
   });
   const albumMount=el('div','mem-album-mount mem-object');Object.assign(albumMount.style,{left:'570px',top:'439px',width:'320px',height:'160px'});world.append(albumMount);
   album=window.WeddingAlbum.create({mount:albumMount,photos:data.album,site:data.site,onPhotoClick:openPhoto,mobile,reduced:false});
   contact(albumMount,647,556,188,24);
   const box=el('div','mem-money-box mem-object');box.setAttribute('aria-hidden','true');
   const inside=el('div','mem-box-inside'),door=el('div','mem-box-door');
   if(data.site.boxAsset){const image=el('img','mem-box-art');image.src=data.site.boxAsset;image.alt='';image.decoding='async';door.append(image);}
   else{door.append(el('span','mem-box-slot'),el('span','mem-box-monogram',data.site.initials),el('span','mem-box-label','WITH LOVE'));door.classList.add('mem-box-door--drawn');}
   box.append(inside,door);world.append(box);contact(box,1020,537,151,23);
   // Cropped views of the supplied flower garland, plus pearl strands, occlude
   // only feet/edges. They share the same light direction as the contact shadows.
   const foreground=el('div','mem-table-foreground mem-object');foreground.setAttribute('aria-hidden','true');
   if(data.site.tableAsset){
    const clusters=[{x:328,y:516,w:93,h:42,view:'80 980 310 180'},
     {x:590,y:518,w:68,h:34,view:'340 1040 240 135'},
     {x:783,y:561,w:70,h:37,view:'480 1050 240 145'},
     {x:1069,y:519,w:98,h:45,view:'750 1020 290 170'}];
    clusters.forEach(c=>{const cluster=el('div','mem-flower-contact');Object.assign(cluster.style,{left:c.x+'px',top:c.y+'px',width:c.w+'px',height:c.h+'px'});
     const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',c.view);svg.setAttribute('preserveAspectRatio','none');
     const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',data.site.tableAsset);image.setAttribute('width','1122');image.setAttribute('height','1402');svg.append(image);cluster.append(svg);foreground.append(cluster);});
   }
   const pearls=document.createElementNS('http://www.w3.org/2000/svg','svg');pearls.classList.add('mem-table-pearls');pearls.setAttribute('viewBox','0 0 1440 1000');
   const strand='M352 533C403 555 469 549 510 534 M585 537C609 548 632 546 650 538 M665 581C706 602 779 595 812 578 M963 550C1004 575 1090 574 1121 539';
   ['shadow','thread','beads'].forEach(type=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',strand);path.classList.add('mem-pearl-'+type);pearls.append(path);});
   foreground.append(pearls);world.append(foreground);
   const shadows=[...contacts.values()];
   const interactiveObjects=[...frames,albumMount,box];
   const setDressing=[table,foreground];
   sceneObjects=[...setDressing,...interactiveObjects];
   const dimensions=()=>({width:stage.clientWidth,height:stage.clientHeight});
   const baseScale=()=>{const v=dimensions();return Math.min(v.width*.96/(mobile?1200:CONFIG.worldWidth),v.height*.78/1000);};
   // World-space positions never include the currently transformed camera. This
   // prevents accumulating error and centers the same image after every resize.
   function getCameraTransform(target,widthRatio=.82,heightRatio=.73,screenY=.51){
    const v=dimensions();return {cx:target.offsetLeft+target.offsetWidth/2,cy:target.offsetTop+target.offsetHeight/2,zoom:Math.min(v.width*widthRatio/target.offsetWidth,v.height*heightRatio/target.offsetHeight)/baseScale(),screenY};
   }
   let bookTypeScale=0;
   function renderCamera(){const v=dimensions(),s=baseScale()*camera.zoom;gsap.set(world,{x:v.width/2-camera.cx*s,y:v.height*camera.screenY-camera.cy*s,scale:s,force3D:false});const type=1/Math.min(v.width*CONFIG.albumScale/albumMount.offsetWidth,v.height*.82/albumMount.offsetHeight);if(type!==bookTypeScale){bookTypeScale=type;albumMount.style.setProperty('--mem-book-type-scale',type);}}
   function paintAlbum(){album.setOpen(bookState.open);album.setPage(bookState.page);album.setClose(bookState.close);}
   const targetCamera=(tl,target,length,w=.82,h=.73,y=.51,at)=>tl.to(camera,{cx:()=>getCameraTransform(target,w,h,y).cx,cy:()=>getCameraTransform(target,w,h,y).cy,zoom:()=>getCameraTransform(target,w,h,y).zoom,screenY:y,duration:length,ease:'sine.inOut',onUpdate:renderCamera},at);
   const overview=(tl,length)=>tl.to(camera,{cx:720,cy:CONFIG.worldCenterY,zoom:1,screenY:.55,duration:length,ease:'sine.inOut',onUpdate:renderCamera});
   function focusObjects(tl,focus,at=0){tl.to(sceneObjects.filter(n=>n!==focus),{opacity:.14,duration:mobile?.15:.35},at).to(shadows,{opacity:.08,duration:.2},at).to(focus,{opacity:1,duration:mobile?.15:.35},at);}
   const buildPart=(name,build)=>{const child=gsap.timeline();build(child);const start=timeline.duration();timeline.addLabel(name,start).add(child,start);phases.push({name,start,end:start+child.duration()});return{start,duration:child.duration()};};
   gsap.set(world,{transformOrigin:'0 0'});gsap.set(setDressing,{autoAlpha:1,y:0});gsap.set(interactiveObjects,{autoAlpha:0,y:8});gsap.set(frames,{rotation:i=>Number(frames[i].dataset.rotation),transformOrigin:'50% 100%'});gsap.set(albumMount,{rotation:-4,rotationX:58,transformOrigin:'50% 50%'});gsap.set(shadows,{autoAlpha:0});gsap.set(wishHost,{autoAlpha:0,y:18});gsap.set(door,{transformOrigin:'12% 60%'});
   gsap.set(inside,{autoAlpha:0});
   timeline=gsap.timeline({defaults:{ease:'none'},onUpdate:updateExperience});
   // PHASE 1 — The complete table is already present. Settle the entire camera,
   // then reveal only its interactive objects (and their matching contact shadows).
   buildPart('intro',tl=>{
    tl.fromTo(camera,{zoom:.96},{zoom:1,duration:.34,ease:'sine.out',onUpdate:renderCamera},0)
      .to(frames,{autoAlpha:1,y:0,stagger:.045,duration:.24},.36)
      .to(frames.map(frame=>contacts.get(frame)),{autoAlpha:1,stagger:.045,duration:.24},.36)
      .to([albumMount,contacts.get(albumMount)],{autoAlpha:1,y:0,duration:.24},.56)
      .to([box,contacts.get(box)],{autoAlpha:1,y:0,duration:.24},.68);
    hold(tl,mobile?.18:.35);
   });
   // PHASE 2 — Move the entire camera between framed pictures, then pause to read.
   data.photos.forEach((photo,i)=>{
    const length=mobile?CONFIG.mobilePhotoScrollLength:CONFIG.photoScrollLength,travel=mobile?length*.62:Math.min(CONFIG.cameraDuration,length*.7);
    const part=buildPart(`photo-${i}`,tl=>{focusObjects(tl,frames[i]);targetCamera(tl,frames[i],travel,CONFIG.photoFocusScale,.7,.50,0);tl.to(frames[i],{rotation:0,duration:length*.35},0);hold(tl,length-travel);});
    photoRanges.push({...part,photo,index:i,end:part.start+part.duration});
   });
   timeline.addLabel('photos',photoRanges[0].start);
   // PHASE 3 — Camera returns through the tabletop and travels to the album.
   buildPart('album-focus',tl=>{overview(tl,mobile?.22:.58);tl.to(sceneObjects,{opacity:1,duration:mobile?.16:.3},0).to(shadows,{opacity:1,duration:.2},0);focusObjects(tl,albumMount,mobile?.22:.58);targetCamera(tl,albumMount,mobile?.3:.75,CONFIG.albumScale,.82,.49);tl.to(albumMount,{rotation:0,rotationX:0,duration:mobile?.24:.5},mobile?.22:.58);});
   // PHASE 4 — The cloth cover folds left to reveal the first physical spread.
   buildPart('album-open',tl=>{tl.to(bookState,{open:1,duration:mobile?.34:.8,onUpdate:paintAlbum,ease:'sine.inOut'});hold(tl,mobile?.12:.25);});
   timeline.addLabel('album',timeline.duration());
   // PHASE 5 — One independent scroll segment per spread, based on data count.
   for(let i=0;i<album.spreadCount;i++){
    const length=mobile?CONFIG.mobileAlbumPageScrollLength:CONFIG.albumPageScrollLength;
    const part=buildPart(`spread-${i}`,tl=>{if(i)tl.to(bookState,{page:i,duration:length*.58,ease:'sine.inOut',onUpdate:paintAlbum});hold(tl,i?length*.42:length);});
    pageRanges.push({...part,index:i,end:part.start+part.duration});
   }
   // PHASE 6 — Clickable page buttons open the separately managed fullscreen viewer.
   // PHASE 7 — Close the final spread and return the closed book to the tabletop.
   buildPart('album-close',tl=>{tl.to(bookState,{close:1,duration:mobile?.3:.65,ease:'sine.inOut',onUpdate:paintAlbum});overview(tl,mobile?.25:.6);tl.to(sceneObjects,{opacity:1,duration:.25},mobile?.3:.65).to(shadows,{opacity:1,duration:.25},mobile?.3:.65).to(albumMount,{rotation:-4,rotationX:58,duration:.25},mobile?.3:.65);tl.to(frames,{rotation:i=>Number(frames[i].dataset.rotation),duration:.25},mobile?.3:.65);});
   // PHASE 8 — The same world camera approaches the money box.
   buildPart('box-focus',tl=>{focusObjects(tl,box);targetCamera(tl,box,mobile?.3:.8,.92,.82,.51,0);});
   // PHASE 9 — Door opens; the form lives in a stable, untransformed screen plane.
   buildPart('box-open',tl=>{tl.to(inside,{autoAlpha:1,duration:.16},0).to(door,{rotationY:-112,xPercent:-10,opacity:.15,duration:mobile?.28:.6,ease:'sine.inOut'},0).to(wishHost,{autoAlpha:1,y:0,duration:.2});});
   const formStart=timeline.duration();
   buildPart('wishes',tl=>hold(tl,mobile?1.2:2));
   const formEnd=timeline.duration();
   // PHASE 10 — Reverse the box opening, restore the table, then release the pin.
   buildPart('exit',tl=>{tl.to(wishHost,{autoAlpha:0,y:12,duration:.18}).to(door,{rotationY:0,xPercent:0,opacity:1,duration:mobile?.25:.55,ease:'sine.inOut'}).to(inside,{autoAlpha:0,duration:.18},.18);overview(tl,mobile?.3:.75);tl.to(sceneObjects,{opacity:1,duration:.3},mobile?.43:.73).to(shadows,{opacity:1,duration:.3},mobile?.43:.73);tl.to(camera,{zoom:.94,screenY:.50,duration:mobile?.3:.5,onUpdate:renderCamera});tl.to(world,{opacity:.68,duration:mobile?.2:.4},'>-=0.15');});
   const total=timeline.duration();
   function calculateScrollDistance(){return Math.round(stage.clientHeight*total*(tablet?.85:1));}
   let guard=false;
   function updateExperience(){
    if(destroyed||!timeline)return;
    if(locks.size&&lockedAt!==null&&Math.abs(timeline.time()-lockedAt)>.001&&!guard){guard=true;timeline.time(lockedAt,true);guard=false;renderCamera();return;}
    const time=timeline.time();const phase=phases.find(p=>time>=p.start&&time<=p.end)||phases[0];
    const photo=photoRanges.find(p=>time>=p.start&&time<=p.end),page=pageRanges.find(p=>time>=p.start&&time<=p.end);
    const isAlbum=!!page;const isForm=time>=formStart-.03&&time<formEnd+.02;
    album.setInteractive(isAlbum);wish.setActive(isForm);
    frames.forEach((frame,i)=>{frame.inert=!!page||time>=timeline.labels['album-focus']||!!photo&&photo.index!==i;});
    if(phase&&activePhase!==phase.name){
     activePhase=phase.name;section.dataset.phase=activePhase;
     const focused=photo?frames[photo.index]:isAlbum||activePhase.startsWith('album')?albumMount:isForm||activePhase.startsWith('box')?box:null;
     sceneObjects.forEach(object=>{object.style.filter=focused&&object!==focused&&!mobile?`blur(${CONFIG.blurAmount}px)`:'none';});
     frames.forEach(frame=>{frame.style.zIndex=frame===focused?'20':frame.dataset.row==='front'?'7':'5';});
     albumMount.style.zIndex=focused===albumMount?'20':'8';box.style.zIndex=focused===box?'20':'6';
     caption.textContent=photo?photo.photo.caption:page?'Bấm vào ảnh để xem trọn khung':isForm?'Một lời chúc, một kỷ niệm đẹp.':activePhase.startsWith('album')?'Lật từng trang, giữ từng khoảnh khắc.':activePhase.startsWith('box')?'Gửi lại một lời thương.':'Những điều đẹp đẽ, ở lại cùng nhau.';
     indexLabel.textContent=photo?`${String(photo.index+1).padStart(2,'0')} / ${String(frames.length).padStart(2,'0')}`:page?`${String(page.index+1).padStart(2,'0')} / ${String(album.spreadCount).padStart(2,'0')}`:'';
     hint.textContent=page?'Cuộn chậm để lật trang':isForm?'Cuộn tiếp khi bạn đã sẵn sàng':'Cuộn để khám phá';
    }
    heading.classList.toggle('mem-heading--compact',time>timeline.labels['photo-0']&&time<timeline.labels.exit);
    if(lastPage!==Number(isAlbum)){lastPage=Number(isAlbum);albumMount.style.pointerEvents=isAlbum?'auto':'none';}
    nav.forEach(button=>button.setAttribute('aria-current',String(button.dataset.memoryJump===(isForm?'wishes':isAlbum?'album':photo?'photos':''))));
    gsap.set(progress,{scaleX:time/total});renderCamera();
   }
   const trigger=ScrollTrigger.create({id:'pin-memories',trigger:section,pin:stage,start:'top top',end:()=>'+='+calculateScrollDistance(),animation:timeline,scrub:CONFIG.scrub,invalidateOnRefresh:true,anticipatePin:1,onRefresh:()=>{renderCamera();paintAlbum();if(locks.size&&timeline?.scrollTrigger){const st=timeline.scrollTrigger;lockedScroll=st.start+lockedAt/total*(st.end-st.start);}},onToggle:self=>world.style.willChange=self.isActive?'transform, opacity':'auto'});
   // ScrollTrigger.create doesn't attach itself to a pre-existing timeline.
   timeline.scrollTrigger=trigger;
   nav.forEach(button=>listen(button,'click',()=>{
    const name=button.dataset.memoryJump;unlock('wish');const target=timeline.labels[name]??0;
    const y=trigger.start+(target+(name==='wishes'?.2:name==='album'?.15:.3))/total*(trigger.end-trigger.start);
    gsap.to(window,{scrollTo:{y,autoKill:true},duration:mobile?.65:.9,ease:'power2.inOut',overwrite:'auto'});
   }));
   renderCamera();paintAlbum();updateExperience();
   // Decode dimensions-independent artwork before the first geometry refresh.
   Promise.allSettled([...world.querySelectorAll('img')].slice(0,9).map(img=>img.decode().catch(()=>{}))).then(()=>{if(!destroyed)ScrollTrigger.refresh();});
  }
  function getNavigationState(){
   if(!timeline)return null;
   const time=timeline.time(),phase=phases.find(p=>time>=p.start&&time<=p.end)||phases[0];
   const photo=photoRanges.find(p=>time>=p.start&&time<=p.end),page=pageRanges.find(p=>time>=p.start&&time<=p.end);
   return {label:phase.name,within:Math.max(0,Math.min(1,(time-phase.start)/(phase.end-phase.start))),photoId:photo?.photo.id,albumPhotoId:page?album.spreadPhotoIds[page.index]?.[0]:undefined};
  }
  function timeForNavigationState(token){
   if(!timeline||!token)return 0;
   let label=token.label;
   if(token.photoId){const i=data.photos.findIndex(photo=>photo.id===token.photoId);if(i>=0)label=`photo-${i}`;}
   if(token.albumPhotoId){const i=album.spreadPhotoIds.findIndex(ids=>ids.includes(token.albumPhotoId));if(i>=0)label=`spread-${i}`;}
   const phase=phases.find(p=>p.name===label)||phases[0];return phase.start+(phase.end-phase.start)*Math.max(0,Math.min(1,token.within||0));
  }
  return {timeline,config:CONFIG,phases,photoRanges,pageRanges,getNavigationState,timeForNavigationState,getCameraState:()=>({cx:camera.cx,cy:camera.cy,zoom:camera.zoom,screenY:camera.screenY}),
   destroy(){destroyed=true;viewer.destroy();wish.destroy();album?.destroy();timeline?.scrollTrigger?.kill();timeline?.kill();listeners.forEach(remove=>remove());locks.clear();document.documentElement.classList.remove('mem-interaction-locked');world.replaceChildren();wishHost.replaceChildren();section.classList.remove('mem-static');delete section.dataset.phase;gsap.set([world,wishHost,progress],{clearProps:'all'});heading.classList.remove('mem-heading--compact');}
  };
 }
 window.WeddingMemories={create,CONFIG};
})();
