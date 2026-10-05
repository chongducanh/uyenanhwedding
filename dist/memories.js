/* Wedding Memories — a world-space camera and a reversible scroll story.
   Assets and photographs live in memories-data.js; there is no autoplay. */
(() => {
 'use strict';
 const CONFIG = {
  worldWidth:1448,worldCenterY:500,photoFocusScale:.78,albumScale:.88,
  photoScrollLength:1.12,albumPageScrollLength:1.3,cameraDuration:.65,
  blurAmount:2,mobileBreakpoint:767,mobilePhotoScrollLength:.43,
  mobileAlbumPageScrollLength:.43,scrub:.75
 };
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const hold=(timeline,length)=>timeline.to({}, {duration:length});
 function create({gsap,ScrollTrigger,getSmoother,reduced=false,mobile=false,tablet=false}){
  const section=document.querySelector('#memories'),data=window.WEDDING_MEMORIES_DATA,layout=window.WEDDING_TABLE_LAYOUT;
  if(!section||!data)return{destroy(){}};
  const stage=section.querySelector('.mem-stage'),world=section.querySelector('.mem-world');
  const wishHost=section.querySelector('.mem-wish-host'),heading=section.querySelector('.mem-heading');
  const captionHint=section.querySelector('.mem-caption-hint');
  const caption=section.querySelector('.mem-caption-text'),indexLabel=section.querySelector('.mem-caption-index');
  const progress=section.querySelector('.mem-progress>span');
  const nav=[...section.querySelectorAll('[data-memory-jump]')];
  const listeners=[],locks=new Set();let destroyed=false,timeline=null,lockedAt=null,lockedScroll=0,wasPaused=false,wishScene=null,submissionTravel=null;
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
  const wish=window.WeddingWishForm.create({mount:wishHost,site:data.site,reduced,onLock:()=>lock('wish'),onUnlock:()=>unlock('wish'),onSubmitted:()=>continuePastCard(true),onResume:()=>continuePastCard(false)});
  listen(wish.element,'wedding-wish-acknowledged',()=>{section.dataset.state='CARD_SUBMITTED';});
  function continuePastCard(submitted){
   if(reduced||destroyed||!timeline?.scrollTrigger)return;
   wish.releaseEditing();
   const st=timeline.scrollTrigger;
   const target=timeline.labels[submitted?'card-inserted':'card-insert']+(submitted?.08:.02);
   submissionTravel=gsap.to(window,{scrollTo:{y:st.start+target/timeline.duration()*(st.end-st.start),autoKill:true},duration:submitted?3: .6,ease:'none',overwrite:'auto'});
  }
  const createPhoto=(photo,index)=>{
   const button=el('button','mem-frame');button.type='button';button.dataset.photoId=photo.id;
   button.setAttribute('aria-label',`Xem toàn bộ ảnh: ${photo.caption}`);
   const image=el('img','mem-frame-image');image.src=photo.src;image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.loading='lazy';image.decoding='async';image.draggable=false;
   const surface=el('span','mem-frame-window');surface.append(image);
   button.append(surface);
   if(data.site.frameAsset)mountFrameArtwork(button,surface,photo,index);
   button.append(el('span','mem-frame-number',String(index+1).padStart(2,'0')));
   listen(button,'click',()=>openPhoto(photo,button));return button;
  };
  function mountFrameArtwork(button,surface,photo,index){
   const art=layout.frameArtwork,shape=art[photo.width>photo.height?'landscape':'portrait'];
   const [x,y,w,h]=shape.bounds,points=shape.aperture;
   const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
   const width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-top;
   Object.assign(surface.style,{left:(left-x)/w*100+'%',top:(top-y)/h*100+'%',width:width/w*400+'%',height:height/h*400+'%',
    clipPath:`polygon(${points.map(p=>`${(p[0]-left)/width*100}% ${(p[1]-top)/height*100}%`).join(',')})`});
   const svg=(tag,attributes)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));return node;};
   const id=`memory-frame-${data.site.key}-${index}`,border=svg('svg',{class:'mem-frame-art',viewBox:shape.bounds.join(' '),preserveAspectRatio:'none','aria-hidden':'true'});
   const defs=svg('defs',{}),clip=svg('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
   const polygon=points=>'M'+points.map(p=>p.join(' ')).join('L')+'Z';
   clip.append(svg('path',{d:polygon(shape.outer)+polygon(points),'clip-rule':'evenodd'}));defs.append(clip);
   const shell=svg('g',{'clip-path':`url(#${id})`});
   shell.append(svg('image',{href:data.site.frameAsset,width:art.width,height:art.height,transform:shape.transform||''}));
   border.append(defs,shell);
   button.append(border);button.classList.add('mem-frame--art');button.classList.toggle('mem-frame--landscape',photo.width>photo.height);
  }
  world.replaceChildren();section.classList.toggle('mem-static',reduced);
  const overviewCamera=()=>({cx:mobile?677:CONFIG.worldWidth/2,cy:mobile?520:CONFIG.worldCenterY,zoom:1,screenY:tablet?.52:.5});
  let album,frames=[],sceneObjects=[],camera=overviewCamera(),bookState={open:0,page:0,close:0};
  const phases=[],photoRanges=[],pageRanges=[];let activePhase='',lastPage=-1;
  if(reduced){
   const tableGallery=el('div','mem-static-frames');frames=data.photos.map(createPhoto);tableGallery.append(...frames);world.append(tableGallery);
   const mount=el('div','mem-static-album');world.append(mount);
   album=window.WeddingAlbum.create({mount,photos:data.album,site:data.site,onPhotoClick:openPhoto,mobile,reduced:true});
   wish.setActive(true);captionHint.textContent='Bấm ảnh để xem trọn khung';caption.textContent='Những hình ảnh để giữ. Những lời thương để trao.';
   nav.forEach(button=>listen(button,'click',()=>{const target=button.dataset.memoryJump==='wishes'?wishHost:button.dataset.memoryJump==='album'?mount:tableGallery;target.scrollIntoView({behavior:'instant',block:'start'});}));
  }else{
   world.classList.add('wedding-scene');
   const objectLayer=el('div','mem-object-layer wedding-objects');world.append(objectLayer);
   const place=(node,p)=>Object.assign(node.style,{left:p.x/layout.image.width*100+'%',top:p.y/layout.image.height*100+'%',width:p.w/layout.image.width*100+'%',height:p.h/layout.image.height*100+'%'});
   // One uncut artwork contains the ready-set table, cloth, flowers, candles
   // and pearls, including their original tabletop and contact details.
   const table=el('div','mem-table mem-object wedding-table-base');table.setAttribute('aria-hidden','true');
   const tableArt=el('img','mem-table-art');tableArt.src=data.site.tableAsset;tableArt.alt='';
   tableArt.decoding='async';tableArt.width=layout.image.width;tableArt.height=layout.image.height;table.append(tableArt);world.append(table);
   const contacts=new Map();
   function contact(node,x,y,width,height=22){
    const shadow=el('div','mem-contact');shadow.setAttribute('aria-hidden','true');
    place(shadow,{x,y,w:width,h:height});
    objectLayer.append(shadow);contacts.set(node,shadow);return shadow;
   }
   const positions=layout.frames;
   frames=data.photos.map((photo,i)=>{
    const width=Math.min(154,850/data.photos.length),height=width*photo.height/photo.width+16;
    const placement={x:240+i*880/Math.max(1,data.photos.length-1),y:630-height-(i%2)*25,w:width,h:height,r:i%2?4:-4};
    const n=createPhoto(photo,i),p=photo.placement||(data.photos.length===5?positions[i]:placement);
    place(n,p);n.dataset.rotation=p.r;n.dataset.row=p.row||'back';n.classList.add('mem-object');objectLayer.append(n);contact(n,p.x+2,p.y+p.h-2,p.w*1.01,9);return n;
   });
   const easel=el('div','mem-album-easel mem-object');easel.setAttribute('aria-hidden','true');place(easel,layout.easel);
   easel.append(el('i','mem-easel-leg mem-easel-leg--left'),el('i','mem-easel-leg mem-easel-leg--right'),el('i','mem-easel-ledge'));world.append(easel);
   contact(easel,layout.easel.x+15,layout.easel.footY-4,layout.easel.w-30,12);
   const albumMount=el('div','mem-album-mount mem-object');place(albumMount,layout.album);objectLayer.append(albumMount);
   album=window.WeddingAlbum.create({mount:albumMount,photos:data.album,site:data.site,onPhotoClick:openPhoto,mobile,reduced:false});

   const box=el('div','mem-money-box mem-object');box.setAttribute('aria-hidden','true');
   const boxImage=el('img','mem-box-art');boxImage.src=data.site.boxAsset;boxImage.alt='';boxImage.decoding='async';
   const boxSurface=el('div','mem-box-surface');boxSurface.append(boxImage);box.append(boxSurface);place(box,layout.box);
   const art=layout.boxArtwork[data.site.key],crop=art.crop;
   Object.assign(boxImage.style,{left:-crop[0]/crop[2]*100+'%',top:-crop[1]/crop[3]*100+'%',width:art.width/crop[2]*100+'%',height:art.height/crop[3]*100+'%'});
   const slot=el('span','mem-money-slot');Object.assign(slot.style,{left:(art.slot.x-crop[0])/crop[2]*100+'%',top:(art.slot.y-crop[1])/crop[3]*100+'%',width:art.slot.w/crop[2]*100+'%',height:art.slot.h/crop[3]*100+'%'});
   slot.dataset.angle=art.slot.angle;box.append(slot);objectLayer.append(box);contact(box,layout.box.x+24,layout.box.foot.y-10,layout.box.w*.85,17).classList.add('mem-contact--box');
   const cardAnchor=el('div','mem-card-anchor');cardAnchor.setAttribute('aria-hidden','true');place(cardAnchor,layout.card);objectLayer.append(cardAnchor);
   const wishArea=el('div','mem-wish-area');wishArea.setAttribute('aria-hidden','true');place(wishArea,layout.wishArea);objectLayer.append(wishArea);
   wishScene=window.WeddingWishScene.create({gsap,stage,host:wishHost,world,anchor:cardAnchor,box,slot,wish,mobile});
   const shadows=[...contacts.values()];
   const interactiveObjects=[...frames,albumMount,box];
   const setDressing=[table,easel];
   sceneObjects=[...setDressing,...interactiveObjects];
   const lightScene={amount:0};
   const paintEdgeContrast=()=>stage.style.setProperty('--mem-light-scene',lightScene.amount);
   const dimensions=()=>({width:stage.clientWidth,height:stage.clientHeight});
   // Fit the interactive scene, allowing the satin drape to extend below the
   // viewport. On phones only the non-interactive outer cloth is cropped.
   const baseScale=()=>{const v=dimensions();return mobile?Math.min(v.width*.96/1265,v.height*.68/780):Math.min(v.width*.96/layout.image.width,v.height*.96/760);};
   // Read the true laid-out bounds and invert only the world camera matrix.
   // Frame rotations are below one degree; offset bounds avoid rotation drift.
   function getFocusTransform(target,widthRatio=.82,heightRatio=.73,screenY=.51){
    const v=dimensions(),rect=target.getBoundingClientRect(),wr=world.getBoundingClientRect();
    const scale=Number(gsap.getProperty(world,'scaleX'))||1;
    const width=target.offsetWidth,height=target.offsetHeight;
    const cx=(rect.left+rect.width/2-wr.left)/scale,cy=(rect.top+rect.height/2-wr.top)/scale;
    const focusScale=Math.min(v.width*widthRatio/width,v.height*heightRatio/height);
    return {cx,cy,zoom:focusScale/baseScale(),screenY};
   }
   let bookTypeScale=0;
   function renderCamera(){const v=dimensions(),s=baseScale()*camera.zoom;gsap.set(world,{x:v.width/2-camera.cx*s,y:v.height*camera.screenY-camera.cy*s,scale:s,force3D:false});const type=1/Math.min(v.width*CONFIG.albumScale/albumMount.offsetWidth,v.height*.82/albumMount.offsetHeight);if(type!==bookTypeScale){bookTypeScale=type;albumMount.style.setProperty('--mem-book-type-scale',type);}wishScene?.render();}
   function paintAlbum(){album.setOpen(bookState.open);album.setPage(bookState.page);album.setClose(bookState.close);}
   const targetCamera=(tl,target,length,w=.82,h=.73,y=.51,at)=>tl.to(camera,{cx:()=>getFocusTransform(target,w,h,y).cx,cy:()=>getFocusTransform(target,w,h,y).cy,zoom:()=>getFocusTransform(target,w,h,y).zoom,screenY:y,duration:length,ease:'sine.inOut',onUpdate:renderCamera},at);
   const overview=(tl,length)=>tl.to(camera,{...overviewCamera(),duration:length,ease:'sine.inOut',onUpdate:renderCamera});
   function focusObjects(tl,focus,at=0){tl.to(wishScene.state,{ambient:0,duration:.3},at);tl.to(sceneObjects.filter(n=>n!==focus),{opacity:.14,duration:mobile?.15:.35},at).to(shadows,{opacity:.08,duration:.2},at).to(focus,{opacity:1,duration:mobile?.15:.35},at);}
   const buildPart=(name,build)=>{const child=gsap.timeline();build(child);const start=timeline.duration();timeline.addLabel(name,start).add(child,start);phases.push({name,start,end:start+child.duration()});return{start,duration:child.duration()};};
   gsap.set(world,{transformOrigin:'0 0'});gsap.set(setDressing,{autoAlpha:1,y:0});gsap.set(interactiveObjects,{autoAlpha:1,y:0});gsap.set(frames,{rotation:i=>Number(frames[i].dataset.rotation),transformOrigin:'50% 100%'});gsap.set(albumMount,{rotation:layout.album.r,rotationX:layout.album.tilt,transformOrigin:'50% 50%'});gsap.set(shadows,{autoAlpha:1});gsap.set(wishHost,{autoAlpha:1});
   timeline=gsap.timeline({defaults:{ease:'none'},onUpdate:updateExperience});
   // PHASE 1 — The table and its resting objects are already complete.
   // Only the shared camera settles; no object or decorative layer rises.
   buildPart('intro',tl=>{
    tl.fromTo(camera,{zoom:.98},{zoom:1,duration:.48,ease:'sine.out',onUpdate:renderCamera},0);
    hold(tl,mobile?.20:.40);
   });
   // PHASE 2 — Move the entire camera between framed pictures, then pause to read.
   function focusTablePhoto(photo,i){
    const length=mobile?CONFIG.mobilePhotoScrollLength:CONFIG.photoScrollLength,travel=mobile?length*.62:Math.min(CONFIG.cameraDuration,length*.7);
    const part=buildPart(`photo-${i}`,tl=>{focusObjects(tl,frames[i]);targetCamera(tl,frames[i],travel,tablet?.68:CONFIG.photoFocusScale,.7,.50,0);hold(tl,length-travel);});
    photoRanges.push({...part,photo,index:i,end:part.start+part.duration});
   }
   data.photos.forEach(focusTablePhoto);
   timeline.addLabel('photos',photoRanges[0].start);
   // PHASE 3 — Camera returns through the tabletop and travels to the album.
   function focusAlbum(tl){overview(tl,mobile?.22:.58);tl.to(sceneObjects,{opacity:1,duration:mobile?.16:.3},0).to(shadows,{opacity:1,duration:.2},0);focusObjects(tl,albumMount,mobile?.22:.58);targetCamera(tl,albumMount,mobile?.3:.75,CONFIG.albumScale,.82,.49);tl.to(albumMount,{rotation:0,rotationX:0,duration:mobile?.24:.5},mobile?.22:.58);}
   buildPart('album-focus',focusAlbum);
   // PHASE 4 — The cloth cover folds left to reveal the first physical spread.
   function openAlbum(tl){tl.to(bookState,{open:1,duration:mobile?.34:.8,onUpdate:paintAlbum,ease:'sine.inOut'});hold(tl,mobile?.12:.25);}
   buildPart('album-open',openAlbum);
   timeline.addLabel('album',timeline.duration());
   // PHASE 5 — One independent scroll segment per spread, based on data count.
   function flipAlbumPage(i){
    const length=mobile?CONFIG.mobileAlbumPageScrollLength:CONFIG.albumPageScrollLength;
    const part=buildPart(`spread-${i}`,tl=>{if(i)tl.to(bookState,{page:i,duration:length*.58,ease:'sine.inOut',onUpdate:paintAlbum});hold(tl,i?length*.42:length);});
    pageRanges.push({...part,index:i,end:part.start+part.duration});
   }
   for(let i=0;i<album.spreadCount;i++)flipAlbumPage(i);
   // PHASE 6 — Clickable page buttons open the separately managed fullscreen viewer.
   // PHASE 7 — Close the final spread and return the closed book to the tabletop.
   function closeAlbum(tl){
    const folding=mobile?.3:.65;
    tl.to(bookState,{close:1,duration:folding,ease:'sine.inOut',onUpdate:paintAlbum},0);
    overview(tl,mobile?.25:.6);
    tl.to(sceneObjects,{opacity:1,duration:.25},folding)
      .to(shadows,{opacity:1,duration:.25},folding)
      .to(albumMount,{rotation:layout.album.r,rotationX:layout.album.tilt,duration:.25},folding)
      .to(frames,{rotation:i=>Number(frames[i].dataset.rotation),duration:.25},folding)
      .to(wishScene.state,{ambient:1,duration:.3},folding);
   }
   buildPart('album-close',closeAlbum);
   // PHASE 8 — Keep the complete scene visible around the closed money box.
   function focusMoneyBox(tl){
    targetCamera(tl,wishArea,mobile?.38:.85,tablet?.68:.76,.62,.5,0);
    tl.to(lightScene,{amount:1,duration:mobile?.38:.85,onUpdate:paintEdgeContrast},0);
    tl.to(sceneObjects,{opacity:1,duration:.3},0).to(shadows,{opacity:1,duration:.3},0);
    hold(tl,mobile?.16:.3);
   }
   buildPart('box-focus',focusMoneyBox);
   // PHASE 9 — The same paper lifts off the table; the box never opens.
   buildPart('card-lift',tl=>{
    if(mobile)tl.to(camera,{cx:()=>getFocusTransform(wishArea).cx-85,duration:.55,ease:'sine.inOut',onUpdate:renderCamera},0);
    wishScene.liftWishCard(tl,mobile?.55:1);
   });
   const formStart=timeline.duration();
   buildPart('wishes',tl=>hold(tl,mobile?1.3:2));
   const formEnd=timeline.duration();
   buildPart('card-insert',tl=>wishScene.insertCardIntoSlot(tl,mobile?.9:1.5));
   buildPart('card-inserted',tl=>hold(tl,mobile?.14:.3));
   // PHASE 10 — See the whole table one last time before releasing the pin.
   buildPart('exit',tl=>{overview(tl,mobile?.45:.85);tl.to(lightScene,{amount:0,duration:mobile?.45:.85,onUpdate:paintEdgeContrast},0);hold(tl,mobile?.18:.4);});
   const total=timeline.duration();
   function calculateScrollDistance(){return Math.round(stage.clientHeight*total*(tablet?.85:1));}
   let guard=false;
   function updateExperience(){
    if(destroyed||!timeline)return;
    if(locks.size&&lockedAt!==null&&Math.abs(timeline.time()-lockedAt)>.001&&!guard){guard=true;timeline.time(lockedAt,true);guard=false;renderCamera();return;}
    const time=timeline.time();const phase=phases.find(p=>time>=p.start&&time<=p.end)||phases[0];
    const photo=photoRanges.find(p=>time>=p.start&&time<=p.end),page=pageRanges.find(p=>time>=p.start&&time<=p.end);
    const isAlbum=!!page;const isForm=time>=formStart&&time<formEnd;
    const isWish=time>=timeline.labels['box-focus'];
    album.setInteractive(isAlbum);wishScene.activateWishForm(isForm);
    frames.forEach((frame,i)=>{frame.inert=!!page||time>=timeline.labels['album-focus']||!!photo&&photo.index!==i;});
    if(phase&&activePhase!==phase.name){
     activePhase=phase.name;section.dataset.phase=activePhase;
     if(activePhase==='card-insert')wishScene.prepareCardForInsert();
     if(activePhase==='exit')wishScene.exitMoneyBoxScene();
     const focused=photo?frames[photo.index]:isAlbum||activePhase.startsWith('album')?albumMount:isWish?box:null;
     sceneObjects.forEach(object=>{object.style.filter=focused&&!isWish&&object!==focused&&!mobile?`blur(${CONFIG.blurAmount}px)`:'none';});
     frames.forEach(frame=>{frame.style.zIndex=frame===focused?'60':frame.dataset.row==='front'?'24':'20';});
     albumMount.style.zIndex=focused===albumMount?'60':'26';box.style.zIndex=focused===box?'60':'28';
     caption.textContent=photo?photo.photo.caption:page?'Lật từng trang, giữ từng khoảnh khắc.':isForm?'Một lời chúc, một kỷ niệm đẹp.':activePhase.startsWith('album')?'Lật từng trang, giữ từng khoảnh khắc.':activePhase.startsWith('box')?'Gửi lại một lời thương.':'Những điều đẹp đẽ, ở lại cùng nhau.';
     captionHint.textContent=page?'Bấm ảnh để xem trọn khung':'';
     indexLabel.textContent=photo?`${String(photo.index+1).padStart(2,'0')} / ${String(frames.length).padStart(2,'0')}`:page?`${String(page.index+1).padStart(2,'0')} / ${String(album.spreadCount).padStart(2,'0')}`:'';
     section.dataset.state=photo?'PHOTO_FOCUS':page?'ALBUM_PAGE':isForm?(wish.submitted?'CARD_SUBMITTED':'CARD_INTERACTIVE'):({'intro':'TABLE_OVERVIEW','album-focus':'ALBUM_FOCUS','album-open':'ALBUM_OPEN','album-close':'ALBUM_CLOSING','box-focus':'MONEY_BOX_FOCUSED','card-lift':'CARD_PICKING_UP','card-insert':'CARD_INSERTING','card-inserted':'CARD_INSERTED','exit':'SCENE_EXITING'}[activePhase]||'TABLE_OVERVIEW');
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
    const name=button.dataset.memoryJump;if(wish.locked)wish.releaseEditing();const target=timeline.labels[name]??0;
    const y=trigger.start+(target+(name==='wishes'?.2:name==='album'?.15:.3))/total*(trigger.end-trigger.start);
    gsap.to(window,{scrollTo:{y,autoKill:true},duration:mobile?.65:.9,ease:'power2.inOut',overwrite:'auto'});
   }));
   renderCamera();paintAlbum();updateExperience();
   // Decode dimensions-independent artwork before the first geometry refresh.
   const frameTexture=new Image();frameTexture.src=data.site.frameAsset;
   Promise.allSettled([tableArt,boxImage,frameTexture,...world.querySelectorAll('.mem-frame-image,.mem-album-cover-image')].map(img=>img.decode().catch(()=>{}))).then(()=>{if(!destroyed)ScrollTrigger.refresh();});
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
  return {timeline,config:CONFIG,phases,photoRanges,pageRanges,getNavigationState,timeForNavigationState,getCardState:()=>wishScene?{lift:wishScene.state.lift,insert:wishScene.state.insert,slot:wishScene.calculateSlotTarget()}:null,layout,getCameraState:()=>({cx:camera.cx,cy:camera.cy,zoom:camera.zoom,screenY:camera.screenY}),
   destroy(){destroyed=true;submissionTravel?.kill();wishScene?.destroy();viewer.destroy();wish.destroy();album?.destroy();timeline?.scrollTrigger?.kill();timeline?.kill();listeners.forEach(remove=>remove());locks.clear();document.documentElement.classList.remove('mem-interaction-locked');world.replaceChildren();wishHost.replaceChildren();section.classList.remove('mem-static');stage.style.removeProperty('--mem-light-scene');delete section.dataset.phase;delete section.dataset.state;gsap.set([world,wishHost,progress],{clearProps:'all'});heading.classList.remove('mem-heading--compact');}
  };
 }
 window.WeddingMemories={create,CONFIG};
})();
