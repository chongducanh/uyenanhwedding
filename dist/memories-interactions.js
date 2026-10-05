/* Wedding Memories interactions. No scroll timeline is created here: the scene owns
   camera motion, while these APIs temporarily lock it for deliberate interaction. */
(() => {
  'use strict';
  let uid = 0;
  // Unsaved wishes survive matchMedia teardown (e.g. phone rotation), in memory only.
  const wishDrafts = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const motion = () => window.gsap;
  const safeFocus = node => {
    if (node?.isConnected && !node.closest('[inert]')) node.focus({ preventScroll: true });
  };
  const fit = (bounds, ratio) => {
    const width = Math.min(bounds.width, bounds.height * ratio);
    const height = width / ratio;
    return { left: bounds.left + (bounds.width - width) / 2,
      top: bounds.top + (bounds.height - height) / 2, width, height };
  };

  // PHASE 6 — Fullscreen viewer, outside transformed / pinned scene containers.
  window.WeddingMemoryViewer = {
    create({ photos = [], getSmoother = () => null, reduced = false, onLock = () => {}, onUnlock = () => {} } = {}) {
      const id = `mem-viewer-${++uid}`;
      const dialog = make('dialog', 'mem-viewer');
      dialog.setAttribute('aria-labelledby', `${id}-title`);
      const backdrop = make('div', 'mem-viewer-shade');
      backdrop.setAttribute('aria-hidden', 'true');
      const bar = make('div', 'mem-viewer-bar');
      const title = make('h2', 'mem-viewer-title', 'Kỷ niệm ngày cưới');
      title.id = `${id}-title`;
      const count = make('span', 'mem-viewer-count');
      count.setAttribute('aria-live', 'polite');
      const closeButton = make('button', 'mem-viewer-close', 'Đóng');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Đóng ảnh toàn màn hình');
      const image = make('img', 'mem-viewer-image');
      image.alt = '';
      image.decoding = 'async';
      image.draggable = false;
      const previous = make('button', 'mem-viewer-prev', '←');
      previous.type = 'button';
      previous.setAttribute('aria-label', 'Xem ảnh trước');
      const next = make('button', 'mem-viewer-next', '→');
      next.type = 'button';
      next.setAttribute('aria-label', 'Xem ảnh tiếp theo');
      const caption = make('p', 'mem-viewer-caption');
      const status = make('p', 'mem-viewer-status');
      status.setAttribute('role', 'status');
      bar.append(title, count, closeButton);
      dialog.append(backdrop, image, bar, previous, next, caption, status);
      document.body.append(dialog);

      let state = 'closed', photo = null, index = -1, opener = null;
      let token = 0, destroyed = false, pausedBefore = false, savedScroll = 0;
      let scrollTrigger = null, triggerProgress = 0, activeSmoother = null;
      let oldOverflow = '', oldBodyOverflow = '', oldScrollBehavior = '', oldPadding = '';
      let targetRect = null, currentRatio = 2 / 3;
      const listeners = [];
      const listen = (element, type, handler, options) => {
        element.addEventListener(type, handler, options);
        listeners.push(() => element.removeEventListener(type, handler, options));
      };
      const isReduced = () => typeof reduced === 'function' ? reduced() : reduced;
      const readScroll = () => getSmoother()?.scrollTop() ?? window.scrollY;
      const rememberPosition = () => {
        savedScroll = readScroll();
        scrollTrigger = (window.ScrollTrigger?.getAll() || []).filter(trigger => {
          const el = trigger.trigger;
          return trigger.pin && el instanceof Element && opener && el.contains(opener)
            && trigger.end > trigger.start;
        }).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0] || null;
        triggerProgress = scrollTrigger
          ? Math.max(0, Math.min(1, (savedScroll - scrollTrigger.start) / (scrollTrigger.end - scrollTrigger.start))) : 0;
      };
      const restorePosition = () => {
        const destination = scrollTrigger && scrollTrigger.end > scrollTrigger.start
          ? scrollTrigger.start + triggerProgress * (scrollTrigger.end - scrollTrigger.start) : savedScroll;
        const smoother = getSmoother();
        if (smoother) smoother.scrollTop(destination);
        else window.scrollTo({ top: destination, left: 0, behavior: 'instant' });
        window.ScrollTrigger?.update();
      };
      const geometry = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const side = width <= 600 ? 14 : 78;
        const top = height <= 450 ? 54 : 74;
        const bottom = height <= 450 ? 44 : 78;
        return fit({ left: side, top, width: Math.max(1, width - side * 2),
          height: Math.max(1, height - top - bottom) }, currentRatio);
      };
      const applyGeometry = () => {
        targetRect = geometry();
        Object.assign(image.style, {
          left: `${targetRect.left}px`, top: `${targetRect.top}px`,
          width: `${targetRect.width}px`, height: `${targetRect.height}px`
        });
      };
      const sourceGeometry = () => {
        if (!opener?.isConnected) return null;
        const source = opener.matches('img') ? opener : $('img', opener) || opener;
        const bounds = source.getBoundingClientRect();
        if (!bounds.width || !bounds.height || bounds.bottom < 0 || bounds.top > innerHeight) return null;
        // A uniform scale preserves the photo's natural aspect ratio even if a
        // thumbnail uses object-fit:cover; it never stretches a face to fit.
        return fit(bounds, currentRatio);
      };
      const killMotion = () => motion()?.killTweensOf([image, backdrop, bar, previous, next, caption]);
      const animateIn = source => {
        const gsap = motion();
        if (!gsap || isReduced()) {
          image.style.opacity = '1';
          backdrop.style.opacity = '1';
          state = 'open';
          return;
        }
        gsap.set([bar, previous, next, caption], { opacity: 0 });
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: .32 });
        const from = source ? { x: source.left - targetRect.left, y: source.top - targetRect.top,
          scale: source.width / targetRect.width, opacity: .8 } : { x: 0, y: 12, scale: .96, opacity: 0 };
        gsap.fromTo(image, from, { x: 0, y: 0, scale: 1, opacity: 1, duration: .58,
          ease: 'power3.inOut', onComplete: () => { if (state === 'opening') state = 'open'; } });
        gsap.to([bar, previous, next, caption], { opacity: 1, duration: .28, delay: .22 });
      };
      const loadFull = (selected, requestToken) => {
        // Only this explicit user action requests a full-size image.
        const full = selected.full || selected.src;
        if (!full || full === image.getAttribute('src')) return;
        const buffer = new Image();
        buffer.decoding = 'async';
        buffer.src = full;
        const ready = buffer.decode ? buffer.decode() : new Promise((resolve, reject) => {
          buffer.onload = resolve;
          buffer.onerror = reject;
        });
        ready.then(() => {
          if (destroyed || token !== requestToken || state === 'closed' || state === 'closing') return;
          image.src = full;
          if (!selected.width || !selected.height) {
            currentRatio = buffer.naturalWidth / buffer.naturalHeight || currentRatio;
            applyGeometry();
          }
          status.textContent = '';
        }).catch(() => {
          if (token === requestToken && state !== 'closed') {
            status.textContent = 'Chưa tải được ảnh lớn. Bạn vẫn có thể xem ảnh hiện tại.';
          }
        });
      };
      const show = (selected, animateFromSource) => {
        photo = selected;
        index = photos.findIndex(item => item.id === selected.id);
        currentRatio = selected.width && selected.height ? selected.width / selected.height : 2 / 3;
        const existing = opener && (opener.matches('img') ? opener : $('img', opener));
        image.src = (animateFromSource && existing?.currentSrc) || selected.src || selected.thumb || selected.full;
        image.alt = selected.alt || 'Ảnh cưới của cô dâu và chú rể';
        caption.textContent = selected.caption || '';
        count.textContent = index >= 0 ? `${index + 1} / ${photos.length}` : '';
        status.textContent = '';
        previous.hidden = next.hidden = photos.length < 2;
        applyGeometry();
        const gsap = motion();
        gsap?.set(image, { x: 0, y: 0, scale: 1, opacity: 1 });
        if (animateFromSource) animateIn(sourceGeometry());
        else if (gsap && !isReduced()) gsap.fromTo(image, { opacity: .15, scale: .985 }, { opacity: 1, scale: 1, duration: .3, ease: 'power2.out' });
        loadFull(selected, ++token);
      };
      const open = (selected, source) => {
        if (destroyed) return;
        if (typeof selected === 'string') selected = photos.find(item => item.id === selected);
        if (!selected) return;
        if (state !== 'closed') { if (state !== 'closing') show(selected, false); return; }
        state = 'opening';
        opener = source instanceof Element ? source : document.activeElement;
        rememberPosition();
        activeSmoother = getSmoother();
        pausedBefore = activeSmoother?.paused() || false;
        onLock();
        activeSmoother?.paused(true);
        const html = document.documentElement;
        oldOverflow = html.style.overflow;
        oldBodyOverflow = document.body.style.overflow;
        oldScrollBehavior = html.style.scrollBehavior;
        oldPadding = document.body.style.paddingRight;
        const scrollbar = Math.max(0, innerWidth - html.clientWidth);
        if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
        html.style.overflow = 'hidden';
        html.style.scrollBehavior = 'auto';
        document.body.style.overflow = 'hidden';
        document.documentElement.classList.add('mem-viewer-is-open');
        dialog.showModal();
        show(selected, true);
        safeFocus(closeButton);
      };
      const finishClose = () => {
        if (state === 'closed') return;
        state = 'closed';
        token++;
        if (dialog.open) dialog.close();
        const html = document.documentElement;
        html.style.overflow = oldOverflow;
        document.body.style.overflow = oldBodyOverflow;
        document.body.style.paddingRight = oldPadding;
        html.classList.remove('mem-viewer-is-open');
        restorePosition();
        getSmoother()?.paused(pausedBefore);
        onUnlock();
        safeFocus(opener);
        restorePosition();
        html.style.scrollBehavior = oldScrollBehavior;
        image.removeAttribute('src');
        photo = null;
      };
      const close = () => {
        if (state === 'closed' || state === 'closing') return;
        state = 'closing';
        token++;
        killMotion();
        restorePosition();
        const gsap = motion();
        if (!gsap || isReduced()) { finishClose(); return; }
        const source = sourceGeometry();
        gsap.to([bar, previous, next, caption], { opacity: 0, duration: .18 });
        gsap.to(backdrop, { opacity: 0, duration: .4 });
        gsap.to(image, { x: source ? source.left - targetRect.left : 0,
          y: source ? source.top - targetRect.top : 12,
          scale: source ? source.width / targetRect.width : .96,
          opacity: source ? .9 : 0, duration: .45, ease: 'power3.inOut', onComplete: finishClose });
      };
      const step = direction => {
        if (state === 'closed' || state === 'closing' || photos.length < 2) return;
        killMotion();
        motion()?.set([bar, previous, next, caption, backdrop], { opacity: 1 });
        state = 'open';
        show(photos[(Math.max(0, index) + direction + photos.length) % photos.length], false);
      };
      listen(closeButton, 'click', close);
      listen(previous, 'click', () => step(-1));
      listen(next, 'click', () => step(1));
      listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
      listen(dialog, 'click', event => { if (event.target === dialog || event.target === backdrop) close(); });
      listen(dialog, 'keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
        }
        if (event.key === 'Tab') {
          const buttons = [...dialog.querySelectorAll('button')].filter(button => !button.hidden && !button.disabled);
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); safeFocus(last); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); safeFocus(first); }
        }
      });
      listen(window, 'resize', () => {
        if (state === 'closed' || state === 'closing') return;
        killMotion();
        motion()?.set([bar, previous, next, caption, backdrop], { opacity: 1 });
        motion()?.set(image, { x: 0, y: 0, scale: 1, opacity: 1 });
        state = 'open';
        applyGeometry();
      });
      listen(dialog, 'close', () => { if (state !== 'closed') { killMotion(); finishClose(); } });
      return { open, close, destroy() {
        if (destroyed) return;
        killMotion();
        if (state !== 'closed') finishClose();
        destroyed = true;
        token++;
        listeners.forEach(remove => remove());
        dialog.remove();
      } };
    }
  };

  // PHASE 9 — A replaceable submission boundary; the demo never pretends that
  // localStorage sends a message to the couple. Hosts may override this callback.
  if (typeof window.onWeddingWishSubmit !== 'function') {
    window.onWeddingWishSubmit = async data => {
      const key = `wedding-wishes:${data.siteKey || 'wedding'}`;
      let wishes = [];
      try { wishes = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { /* Ignore corrupt earlier demo data. */ }
      if (!Array.isArray(wishes)) wishes = [];
      const entry = { name: data.name, message: data.message, anonymous: data.anonymous, createdAt: data.createdAt };
      try { localStorage.setItem(key, JSON.stringify([...wishes.slice(-29), entry])); }
      catch (_) { throw new Error('Thiết bị chưa cho phép lưu lời chúc. Bạn hãy thử lại hoặc giữ lại lời chúc để gửi riêng.'); }
      return { savedLocally: true, message: 'Đã lưu lời chúc trên thiết bị này. Lời chúc chưa được gửi đến cô dâu chú rể.' };
    };
    window.onWeddingWishSubmit.isLocalDemo = true;
  }
  window.WeddingWishForm = {
    create({ mount, site = {}, reduced = false, onLock = () => {}, onUnlock = () => {} } = {}) {
      const id = `mem-wish-${++uid}`;
      const draftKey = site.key || 'wedding';
      const element = make('section', 'mem-wish');
      element.setAttribute('aria-labelledby', `${id}-title`);
      element.tabIndex = -1;
      const monogram = make('p', 'mem-wish-monogram', site.initials || 'A & U');
      monogram.setAttribute('aria-hidden', 'true');
      const title = make('h3', 'mem-wish-title', 'Gửi một lời thương');
      title.id = `${id}-title`;
      const intro = make('p', 'mem-wish-intro', `Dành cho ${site.names || 'cô dâu và chú rể'}`);
      const form = make('form', 'mem-wish-form');
      const nameLabel = make('label', 'mem-wish-label', 'Tên của bạn');
      const name = make('input', 'mem-wish-input');
      name.id = `${id}-name`;
      name.name = 'name';
      name.type = 'text';
      name.autocomplete = 'name';
      name.maxLength = 80;
      name.required = true;
      name.placeholder = 'Bạn tên là…';
      nameLabel.htmlFor = name.id;
      const messageLabel = make('label', 'mem-wish-label', 'Lời chúc');
      const message = make('textarea', 'mem-wish-input mem-wish-message');
      message.id = `${id}-message`;
      message.name = 'message';
      message.rows = 3;
      message.maxLength = 1200;
      message.required = true;
      message.placeholder = 'Một lời chúc dành cho ngày chung đôi…';
      messageLabel.htmlFor = message.id;
      const anonLabel = make('label', 'mem-wish-anonymous');
      const anonymous = make('input');
      anonymous.type = 'checkbox';
      anonymous.name = 'anonymous';
      anonLabel.append(anonymous, make('span', '', 'Gửi lời chúc ẩn danh'));
      const initialDraft = wishDrafts.get(draftKey);
      if (initialDraft) {
        name.value = initialDraft.name;
        message.value = initialDraft.message;
        anonymous.checked = initialDraft.anonymous;
        name.disabled = anonymous.checked;
        name.required = !anonymous.checked;
      }
      let lastSuccessfulDraft = null;
      const readDraft = () => ({ name: name.value.slice(0, 80), message: message.value.slice(0, 1200), anonymous: anonymous.checked });
      const sameDraft = (a, b) => Boolean(a && b && a.name === b.name && a.message === b.message && a.anonymous === b.anonymous);
      const saveDraft = () => {
        const draft = readDraft();
        if (sameDraft(draft, lastSuccessfulDraft) || (!draft.name && !draft.message && !draft.anonymous)) wishDrafts.delete(draftKey);
        else wishDrafts.set(draftKey, draft);
        return draft;
      };
      const submit = make('button', 'mem-wish-submit', 'Gửi lời chúc');
      submit.type = 'submit';
      const notice = make('p', 'mem-wish-notice', window.onWeddingWishSubmit.isLocalDemo ? 'Lời chúc được lưu trên thiết bị này.' : '');
      notice.id = `${id}-notice`;
      form.setAttribute('aria-describedby', notice.id);
      const status = make('p', 'mem-wish-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const resume = make('button', 'mem-wish-resume', 'Tiếp tục xem thiệp ↓');
      resume.type = 'button';
      form.append(nameLabel, name, messageLabel, message, anonLabel, submit, notice, status);
      element.append(monogram, title, intro, form, resume);
      mount?.append(element);
      let locked = false, active = false, requestedActive = false, busy = false, destroyed = false, focusTimer = 0;
      let refreshFocus = null, refreshSelection = null, refreshing = false, refreshFrame = 0;
      const listeners = [];
      const listen = (node, type, handler, options) => {
        node.addEventListener(type, handler, options);
        listeners.push(() => node.removeEventListener(type, handler, options));
      };
      const lock = () => {
        if (locked || !active || destroyed) return;
        locked = true;
        element.classList.add('mem-wish-is-editing');
        onLock();
      };
      const applyActive = value => {
        active = value;
        element.inert = !value;
        element.setAttribute('aria-hidden', String(!value));
        element.classList.toggle('mem-wish-is-active', value);
      };
      const unlock = () => {
        if (!locked) return;
        locked = false;
        element.classList.remove('mem-wish-is-editing');
        onUnlock();
        applyActive(requestedActive);
      };
      const setActive = value => {
        requestedActive = Boolean(value);
        // Do not inert a focused field during a resize / timeline refresh.
        if (locked && !requestedActive) return;
        applyActive(requestedActive);
      };
      // ScrollTrigger temporarily reparents its pin during refresh. On mobile a
      // keyboard's height-only resize can therefore blur a field without any
      // user intent to leave. Keep the lock through that single refresh, then
      // restore only the same field; actual navigation always cancels recovery.
      const cancelRefreshFocus = () => {
        refreshFocus = null;
        refreshSelection = null;
        cancelAnimationFrame(refreshFrame);
        refreshFrame = 0;
      };
      const refreshInit = () => {
        refreshing = true;
        cancelRefreshFocus();
        const focused = document.activeElement;
        if (!locked || !element.contains(focused) || focused === resume || focused === element) return;
        refreshFocus = focused;
        if (typeof focused.selectionStart === 'number') {
          refreshSelection = [focused.selectionStart, focused.selectionEnd, focused.selectionDirection];
        }
        clearTimeout(focusTimer);
      };
      const refreshDone = () => {
        refreshing = false;
        if (!refreshFocus) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          const target = refreshFocus, selection = refreshSelection;
          refreshFocus = null;
          refreshSelection = null;
          if (destroyed || !locked || !target?.isConnected) return;
          const focused = document.activeElement;
          const detachedFocus = !focused || focused === document.body || focused === document.documentElement;
          if (detachedFocus) {
            safeFocus(target);
            if (selection && typeof target.setSelectionRange === 'function') {
              target.setSelectionRange(...selection);
            }
          }
          if (!element.contains(document.activeElement)) unlock();
        });
      };
      const triggerEvents = window.ScrollTrigger;
      if (triggerEvents) {
        triggerEvents.addEventListener('refreshInit', refreshInit);
        triggerEvents.addEventListener('refresh', refreshDone);
        listeners.push(() => {
          triggerEvents.removeEventListener('refreshInit', refreshInit);
          triggerEvents.removeEventListener('refresh', refreshDone);
        });
      }
      listen(document, 'pointerdown', event => {
        if (!element.contains(event.target) || event.target.closest('.mem-wish-resume')) cancelRefreshFocus();
      }, true);
      listen(document, 'keydown', event => {
        if (event.key === 'Tab' || event.key === 'Escape') cancelRefreshFocus();
      }, true);
      listen(element, 'pointerdown', event => {
        if (event.target.closest('.mem-wish-resume')) return;
        lock();
        const control = event.target.closest('input,textarea,button');
        if (control && !control.disabled) safeFocus(control);
      });
      listen(element, 'focusin', event => { clearTimeout(focusTimer); if (event.target !== resume && event.target !== element) lock(); });
      listen(element, 'focusout', event => {
        clearTimeout(focusTimer);
        if (event.relatedTarget && !element.contains(event.relatedTarget)) cancelRefreshFocus();
        if (refreshFocus && (refreshing || refreshFrame) && !event.relatedTarget) return;
        focusTimer = setTimeout(() => {
          if (!element.contains(document.activeElement) && !refreshFocus) unlock();
        }, 0);
      });
      listen(resume, 'click', () => {
        cancelRefreshFocus();
        safeFocus(element);
        unlock();
      });
      listen(anonymous, 'change', () => {
        name.disabled = anonymous.checked;
        name.required = !anonymous.checked;
        name.setCustomValidity('');
        saveDraft();
      });
      listen(name, 'input', () => { name.setCustomValidity(''); saveDraft(); });
      listen(message, 'input', () => { message.setCustomValidity(''); saveDraft(); });
      listen(form, 'submit', async event => {
        event.preventDefault();
        if (busy || destroyed) return;
        const cleanName = name.value.trim().slice(0, 80);
        const cleanMessage = message.value.trim().slice(0, 1200);
        name.setCustomValidity(!anonymous.checked && !cleanName ? 'Bạn hãy nhập tên hoặc chọn gửi ẩn danh.' : '');
        message.setCustomValidity(!cleanMessage ? 'Bạn hãy viết một lời chúc.' : '');
        if (!form.reportValidity()) return;
        const submittedDraft = saveDraft();
        lock();
        busy = true;
        submit.setAttribute('aria-disabled', 'true');
        submit.textContent = window.onWeddingWishSubmit.isLocalDemo ? 'Đang lưu lời chúc…' : 'Đang gửi lời chúc…';
        notice.textContent = window.onWeddingWishSubmit.isLocalDemo ? 'Lời chúc được lưu trên thiết bị này.' : '';
        form.setAttribute('aria-busy', 'true');
        status.textContent = '';
        status.classList.remove('mem-wish-error');
        try {
          const result = await window.onWeddingWishSubmit({
            name: anonymous.checked ? 'Ẩn danh' : cleanName,
            message: cleanMessage, anonymous: anonymous.checked,
            siteKey: site.key || 'wedding', wedding: site.names || '',
            date: site.dateLabel || '', createdAt: new Date().toISOString()
          });
          lastSuccessfulDraft = submittedDraft;
          // Do not erase a newer edit made while an async host callback was pending.
          if (sameDraft(wishDrafts.get(draftKey), submittedDraft)) wishDrafts.delete(draftKey);
          if (destroyed) return;
          status.textContent = typeof result?.message === 'string'
            ? result.message.slice(0, 400) : 'Cảm ơn lời chúc của bạn.';
          if (result?.savedLocally === false) notice.textContent = '';
          const isReduced = typeof reduced === 'function' ? reduced() : reduced;
          if (motion() && !isReduced) motion().fromTo(status, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: .3 });
        } catch (error) {
          if (destroyed) return;
          status.classList.add('mem-wish-error');
          status.textContent = (error instanceof Error && error.message)
            ? error.message.slice(0, 300) : 'Chưa thể lưu lời chúc. Bạn hãy thử lại.';
        } finally {
          if (!destroyed) {
            busy = false;
            submit.removeAttribute('aria-disabled');
            submit.textContent = 'Gửi lời chúc';
            form.removeAttribute('aria-busy');
          }
        }
      });
      setActive(false);
      return { element, setActive, destroy() {
        if (destroyed) return;
        saveDraft();
        destroyed = true;
        cancelRefreshFocus();
        clearTimeout(focusTimer);
        unlock();
        motion()?.killTweensOf(status);
        listeners.forEach(remove => remove());
        element.remove();
      } };
    }
  };
})();
