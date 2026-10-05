/* Journey-only viewer. Flip moves the original film paper, never a duplicate.
   Native dialog owns the focus trap; the scene owns scroll position and locking. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  function create({gsap,Flip,reduced,lock,unlock,getScroll,getResumeScroll}) {
    const dialog=make('dialog','journey-viewer');dialog.setAttribute('aria-labelledby','journey-viewer-title');
    const shade=make('div','journey-viewer-shade');shade.setAttribute('aria-hidden','true');
    const slot=make('div','journey-viewer-slot');
    const bar=make('div','journey-viewer-bar'),title=make('h2','journey-viewer-title');title.id='journey-viewer-title';
    const closeButton=make('button','journey-viewer-close','Đóng ×');closeButton.type='button';closeButton.setAttribute('aria-label','Đóng ảnh hành trình');
    const hint=make('p','journey-viewer-hint','Cuộn tiếp để trở về hành trình');
    bar.append(title,closeButton);dialog.append(shade,slot,bar,hint);document.body.append(dialog);
    let state='closed',paper=null,opener=null,flip=null,travel=null,destroyed=false;
    let savedScroll=0,pendingScroll=0,scrollIntent=0,lastWheel=0,touchY=null;
    let oldOverflow='',oldBodyOverflow='',oldPadding='',lastStyle='';
    const listeners=[];
    const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
    function measureViewer() {
      const image=paper?.querySelector('img'),ratio=image?.naturalWidth?image.naturalWidth/image.naturalHeight:3/4;
      const height=Math.min(innerHeight*.82,innerHeight-120),width=Math.min(innerWidth*.90,height*ratio);
      Object.assign(slot.style,{width:width+'px',height:width/ratio+'px'});
    }
    function openPhotoViewer(button,item) {
      if(destroyed||state!=='closed')return;
      state='opening';opener=button;paper=button.querySelector('.journey-paper');
      savedScroll=getScroll();pendingScroll=0;scrollIntent=0;touchY=null;travel?.kill();lock();
      lastStyle=paper.getAttribute('style')||'';
      const source=Flip.getState(paper);
      const html=document.documentElement;
      oldOverflow=html.style.overflow;oldBodyOverflow=document.body.style.overflow;oldPadding=document.body.style.paddingRight;
      const gutter=Math.max(0,innerWidth-html.clientWidth);
      if(gutter)document.body.style.paddingRight=gutter+'px';
      html.style.overflow='hidden';document.body.style.overflow='hidden';
      title.textContent=`${item.title} · ${item.date}`;slot.append(paper);measureViewer();dialog.showModal();
      closeButton.focus({preventScroll:true});
      gsap.set([shade,bar,hint],{opacity:reduced?1:0});
      flip=Flip.from(source,{duration:reduced?0:.6,ease:'power3.inOut',scale:true,absolute:true,
        onComplete:()=>{if(state==='opening')state='open';}});
      gsap.to([shade,bar,hint],{opacity:1,duration:reduced?0:.35});
      // Full images are fetched only after an explicit click, and only if configured.
      if(item.imageReady&&item.full&&item.full!==item.image){
        const image=paper.querySelector('img'),full=new Image();full.src=item.full;
        full.decode().then(()=>{if(!destroyed&&paper?.contains(image)&&state!=='closed'&&state!=='closing'){image.src=item.full;measureViewer();}}).catch(()=>{});
      }
    }
    function finishClose() {
      if(state==='closed')return;
      state='closed';flip=null;
      if(dialog.open)dialog.close();
      document.documentElement.style.overflow=oldOverflow;document.body.style.overflow=oldBodyOverflow;document.body.style.paddingRight=oldPadding;
      paper?.setAttribute('style',lastStyle);
      const destination=getResumeScroll(savedScroll);
      unlock(destination);
      if(opener?.isConnected)opener.focus({preventScroll:true});
      if(pendingScroll&&!destroyed){
        travel=gsap.to(window,{scrollTo:{y:destination+pendingScroll,autoKill:true},duration:reduced?0:.48,ease:'power1.out',overwrite:'auto'});
      }
      paper=null;opener=null;
    }
    function closePhotoViewer(forward=0,immediate=false) {
      if(state==='closed'||state==='closing')return;
      state='closing';pendingScroll=forward;flip?.kill();gsap.killTweensOf([shade,bar,hint]);
      // Keep the native top-layer open while returning the paper. Flip's temporary
      // absolute positioning would otherwise be covered by the dialog itself.
      const target=Flip.fit(paper,opener,{scale:true,getVars:true});
      const finish=()=>{opener.append(paper);gsap.set(paper,{clearProps:'all'});finishClose();};
      if(reduced||immediate){finish();return;}
      flip=gsap.to(paper,{...target,duration:.48,ease:'power3.inOut',onComplete:finish});
      gsap.to([shade,bar,hint],{opacity:0,duration:.44});
    }
    function handleViewerScroll(event) {
      if(state==='closed')return;
      if(event.ctrlKey)return; // Leave browser pinch/zoom untouched.
      event.preventDefault();
      if(state==='closing')return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1),now=performance.now();
      scrollIntent=now-lastWheel>240?0:scrollIntent;lastWheel=now;
      if(delta<=0){scrollIntent=0;return;}
      scrollIntent+=delta;
      if(scrollIntent>=44)closePhotoViewer(Math.min(innerHeight*.38,Math.max(60,scrollIntent)));
    }
    listen(dialog,'wheel',handleViewerScroll,{passive:false});
    listen(dialog,'touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null;},{passive:true});
    listen(dialog,'touchmove',e=>{if(touchY===null||e.touches.length!==1)return;const delta=touchY-e.touches[0].clientY;if(delta>28){e.preventDefault();closePhotoViewer(Math.min(innerHeight*.35,Math.max(65,delta*2)));}},{passive:false});
    listen(dialog,'keydown',e=>{
      if(['ArrowDown','PageDown',' '].includes(e.key)&&!e.shiftKey&&!(e.key===' '&&e.target===closeButton)){e.preventDefault();closePhotoViewer(Math.min(180,innerHeight*.25));}
      if(e.key==='Tab'){e.preventDefault();closeButton.focus({preventScroll:true});}
    });
    listen(dialog,'cancel',e=>{e.preventDefault();closePhotoViewer();});
    listen(dialog,'click',e=>{if(e.target===dialog||e.target===shade)closePhotoViewer();});
    listen(closeButton,'click',()=>closePhotoViewer());
    listen(dialog,'close',()=>{if(state!=='closed')closePhotoViewer(0,true);});
    listen(window,'resize',()=>{
      if(state==='closed'||state==='closing')return;
      flip?.kill();gsap.set(paper,{clearProps:'all'});measureViewer();gsap.set([shade,bar,hint],{opacity:1});state='open';
    });
    return {openPhotoViewer,closePhotoViewer,handleViewerScroll,get isOpen(){return state!=='closed';},
      destroy(){if(destroyed)return;destroyed=true;travel?.kill();flip?.kill();if(state!=='closed'){state='open';closePhotoViewer(0,true);}gsap.killTweensOf([shade,bar,hint]);listeners.forEach(fn=>fn());dialog.remove();}
    };
  }
  window.JourneyPhotoViewer={create};
})();
