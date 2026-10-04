/* Keep the October calendar's today marker in the couple's timezone. */
(() => {
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
 const cells=Array.from(document.querySelectorAll('.month-cell')),legend=document.querySelector('.today-legend');
 let timer=null;
 function refresh(now=new Date()){
  const parts=Object.fromEntries(formatter.formatToParts(now).map(part=>[part.type,part.value]));
  const key=`${parts.year}-${parts.month}-${parts.day}`;
  cells.forEach(cell=>{const today=cell.dataset.date===key;cell.classList.toggle('is-today',today);if(today)cell.setAttribute('aria-current','date');else cell.removeAttribute('aria-current');});
  legend.hidden=!key.startsWith('2026-10-');
  document.getElementById('today-label').textContent=`Hôm nay · ${parts.day}/${parts.month}`;
  timer?.kill();if(!document.hidden&&window.gsap)timer=gsap.delayedCall(60,()=>refresh());
 }
 document.addEventListener('visibilitychange',()=>refresh());refresh();
 window.WeddingCalendar={refresh};
})();
