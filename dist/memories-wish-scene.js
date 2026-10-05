/* One paper object, from its tabletop footprint to the real money-box slot.
   Geometry is measured in the pinned viewport after the world camera renders. */
(() => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  function create({gsap, stage, host, world, anchor, box, slot, wish, mobile}) {
    const paper = wish.element;
    const state = {lift: 0, insert: 0, ambient: 1};
    const shade = document.createElement('div');
    shade.className = 'mem-wish-shade';
    shade.setAttribute('aria-hidden', 'true');
    stage.insertBefore(shade, host);
    let confirmed = false, confirmation = null, destroyed = false;
    gsap.set(paper, {transformOrigin: '50% 50%', transformPerspective: 6000});
    function localRect(node) {
      const rect = node.getBoundingClientRect(), viewport = stage.getBoundingClientRect();
      return {x: rect.left - viewport.left, y: rect.top - viewport.top,
        width: rect.width, height: rect.height};
    }
    function calculateSlotTarget() {
      // This anchor follows the actual opening in the supplied box artwork.
      const rect = localRect(slot), scale = rect.width * .86 / paper.offsetWidth;
      return {x: rect.x + rect.width / 2, y: rect.y + rect.height * .65,
        scale, width: rect.width, height: rect.height};
    }
    function cardOnTable() {
      const rect = localRect(anchor);
      return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
        scale: rect.width / paper.offsetWidth};
    }
    function cardInForeground() {
      return {x: stage.clientWidth * .46,
        y: stage.clientHeight * .48, scale: 1};
    }
    function render() {
      if (destroyed || wish.locked) return;
      if (state.ambient < .001 && state.lift === 0) {
        gsap.set(paper, {autoAlpha: 0}); gsap.set(shade, {opacity: 0}); world.style.filter = ''; return;
      }
      const start = cardOnTable(), front = cardInForeground();
      const lift = clamp(state.lift), insertion = clamp(state.insert);
      const w = paper.offsetWidth, h = paper.offsetHeight;
      let x = mix(start.x, front.x, lift), y = mix(start.y, front.y, lift);
      let scale = mix(start.scale, front.scale, lift), rotation = mix(window.WEDDING_TABLE_LAYOUT.card.r, 0, lift);
      let rotationX = mix(window.WEDDING_TABLE_LAYOUT.card.tilt, 0, lift), clip = 0, opacity = 1;
      if (insertion > 0) {
        const target = calculateSlotTarget();
        // First fly with the lower edge aligned just above the slot, then feed
        // the sheet down through a fixed clipping line. It never teleports.
        const travel = clamp(insertion / .68), eased = gsap.parseEase('power2.inOut')(travel);
        const entryHeight = h * target.scale;
        const arrivalY = target.y - entryHeight / 2;
        x = mix(front.x, target.x, eased);
        y = mix(front.y, arrivalY, eased) - Math.sin(Math.PI * travel) * (mobile ? 18 : 38);
        scale = mix(1, target.scale, eased);
        rotation = Math.sin(Math.PI * travel) * -7;
        rotationX = 0;
        const feed = clamp((insertion - .68) / .32);
        y += entryHeight * feed;
        clip = feed * 100;
        opacity = feed > .94 ? 1 - (feed - .94) / .06 : 1;
        if (feed >= .99 && wish.submitted) playSubmittedConfirmation();
      }
      const distant = lift === 0 ? Number(gsap.getProperty(box, 'opacity')) * state.ambient : 1;
      gsap.set(paper, {x: x - w / 2, y: y - h / 2, scale, rotation, rotationX,
        opacity: opacity * distant, visibility: opacity * distant > .001 ? 'visible' : 'hidden',
        clipPath: `inset(0 0 ${clip}% 0)`,
        boxShadow: lift > .1 ? '8px 22px 60px #18081270' : '3px 5px 6px #210b0aa6'});
      const stationery = (1 - lift) + clamp(insertion / .6);
      gsap.set(wish.letterhead, {y: h * .25 * stationery, scale: 1 + .4 * stationery, transformOrigin: '50% 0'});
      const writingOpacity = clamp((lift - .70) / .30) * (1 - clamp(insertion / .18));
      if (!wish.submitted) gsap.set(wish.writing, {autoAlpha: writingOpacity});
      else gsap.set(wish.thanks, {opacity: 1 - clamp(insertion / .24)});
      const atmosphere = lift * (1 - clamp(insertion / .7));
      gsap.set(shade, {opacity: atmosphere * .17});
      world.style.filter = atmosphere > .01 ? `blur(${atmosphere * 1.6}px)` : '';
    }
    function liftWishCard(timeline, duration) {
      timeline.to(state, {lift: 1, duration, ease: 'sine.inOut', onUpdate: render}, 0);
    }
    function activateWishForm(active) { wish.setActive(active); }
    function prepareCardForInsert() { wish.setActive(false); }
    function insertCardIntoSlot(timeline, duration) {
      timeline.to(state, {insert: 1, duration, ease: 'none', onUpdate: render});
    }
    function playSubmittedConfirmation() {
      if (confirmed) return;
      confirmed = true;
      confirmation = gsap.fromTo(box, {scale: 1}, {scale: 1.01, duration: .3,
        repeat: 1, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 100%'});
    }
    function exitMoneyBoxScene() { prepareCardForInsert(); render(); }
    return {state, render, calculateSlotTarget, liftWishCard, activateWishForm,
      prepareCardForInsert, insertCardIntoSlot, playSubmittedConfirmation, exitMoneyBoxScene,
      destroy() {destroyed = true; confirmation?.kill(); gsap.killTweensOf(paper); shade.remove(); world.style.filter = '';}
    };
  }
  window.WeddingWishScene = {create};
})();
