/* The official recording plays only inside a visible, user-opened player. */
(() => {
 'use strict';
 const TRACK={title:'Beautiful in White',artist:'Shane Filan',videoId:'06-XXOTP3Gc'};
 const root=document.createElement('aside');root.className='wedding-music';
 root.setAttribute('aria-label','Nhạc cưới');
 root.innerHTML=`
  <section class="wedding-music-panel" id="wedding-music-panel" aria-label="Beautiful in White — Shane Filan" hidden>
   <div class="wedding-music-heading"><div><p>Beautiful in White</p><span>Shane Filan</span></div><button class="wedding-music-close" type="button" aria-label="Đóng và tắt nhạc">×</button></div>
   <div class="wedding-music-player"></div>
   <a class="wedding-music-source" href="https://www.youtube.com/watch?v=06-XXOTP3Gc" target="_blank" rel="noopener noreferrer">Xem bản chính thức trên YouTube</a>
  </section>
  <button class="wedding-music-toggle" type="button" aria-expanded="false" aria-controls="wedding-music-panel">
   <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></svg><span>Nhạc cưới</span>
  </button>`;
 document.body.append(root);
 const panel=root.querySelector('.wedding-music-panel'),mount=root.querySelector('.wedding-music-player');
 const toggle=root.querySelector('.wedding-music-toggle'),label=toggle.querySelector('span'),close=root.querySelector('.wedding-music-close');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let opened=false;
 function openPlayer(){
  if(opened)return;
  opened=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');label.textContent='Tắt nhạc';
  const frame=document.createElement('iframe');
  const url=new URL('https://www.youtube.com/embed/'+TRACK.videoId);
  url.search=new URLSearchParams({autoplay:'1',loop:'1',playlist:TRACK.videoId,controls:'1',playsinline:'1',rel:'0',origin:location.origin});
  frame.src=url.href;frame.title=TRACK.title+' — '+TRACK.artist+' (video chính thức)';
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  mount.replaceChildren(frame);
  if(window.gsap){gsap.killTweensOf(panel);gsap.fromTo(panel,{opacity:0,y:8},{opacity:1,y:0,duration:reduced()?0:.25,ease:'power1.out'});}
  close.focus({preventScroll:true});
 }
 function closePlayer(restoreFocus=true){
  if(!opened)return;
  opened=false;toggle.setAttribute('aria-expanded','false');label.textContent='Nhạc cưới';
  // Removing the player stops playback immediately; never leave hidden audio.
  mount.replaceChildren();
  if(window.gsap){gsap.killTweensOf(panel);gsap.to(panel,{opacity:0,y:6,duration:reduced()?0:.18,onComplete:()=>{if(!opened)panel.hidden=true;}});}
  else panel.hidden=true;
  if(restoreFocus)toggle.focus({preventScroll:true});
 }
 toggle.addEventListener('click',()=>opened?closePlayer():openPlayer());
 close.addEventListener('click',()=>closePlayer());
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();closePlayer();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closePlayer(false);});
 window.addEventListener('pagehide',()=>closePlayer(false));
})();
