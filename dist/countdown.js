/* Wedding time is explicit, independent of the visitor's device timezone. */
(() => {
 const target=Date.parse('2026-10-24T08:30:00+07:00');
 const elements=['days','hours','minutes','seconds'].map(unit=>document.getElementById(`count-${unit}`));
 const note=document.getElementById('countdown-note'),section=document.getElementById('countdown');
 let timer=null,visible=false;
 function remaining(now=Date.now()){
  const total=Math.max(0,Math.floor((target-now)/1000));
  return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60,total};
 }
 function refresh(){
  const left=remaining(),values=[left.days,left.hours,left.minutes,left.seconds];
  const animate=visible&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  elements.forEach((el,i)=>{const value=String(values[i]).padStart(2,'0');if(el.textContent===value)return;el.textContent=value;if(animate&&window.gsap)gsap.fromTo(el,{yPercent:-14,opacity:.45},{yPercent:0,opacity:1,duration:.42,ease:'power2.out',overwrite:true});});
  section.querySelector('em.countdown-title-line').textContent=left.total>0?'đang đến gần':'đã đến';
  note.textContent=left.total>0?'Lễ vu quy 08:30 · Tiệc vu quy 10:30':'Lễ vu quy đã đến · 24.10.2026';
  timer?.kill();if(left.total>0&&!document.hidden&&window.gsap)timer=gsap.delayedCall(1,refresh);
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0}).observe(section);
 document.addEventListener('visibilitychange',refresh);refresh();
 window.WeddingCountdown={target,remaining,refresh};
})();
