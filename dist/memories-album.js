/* Physical album: GSAP owns time; this module only paints the supplied state. */
(() => {
  'use strict';
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
  const node = (tag, className, text) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = text;
    return result;
  };

  // Three changing editorial rhythms. Thirty photos produce ten spreads.
  function paginate(photos, mobile) {
    const rhythm = mobile ? [2] : [3, 2, 4];
    const spreads = [];
    let offset = 0;
    while (offset < photos.length) {
      const remaining = photos.length - offset;
      let count = Math.min(rhythm[spreads.length % rhythm.length], remaining);
      if (!mobile && remaining - count === 1) count += 1;
      const pictures = photos.slice(offset, offset + count);
      const split = Math.ceil(pictures.length / 2);
      const reverse = spreads.length % 2 === 0;
      spreads.push({
        left: pictures.slice(0, reverse && pictures.length === 3 ? 1 : split),
        right: pictures.slice(reverse && pictures.length === 3 ? 1 : split),
        number: spreads.length + 1,
        layout: pictures.length === 2 ? 'duet' : pictures.length === 3 ? 'story' : 'collection'
      });
      offset += count;
    }
    return spreads;
  }

  function create({ mount, photos = [], site = {}, onPhotoClick, mobile = false, reduced = false }) {
    if (!mount) throw new Error('WeddingAlbum requires a mount element.');
    const spreads = paginate(photos, mobile);
    const count = Math.max(1, spreads.length);
    const spreadPhotoIds = Object.freeze(spreads.map(spread => Object.freeze([...spread.left, ...spread.right].map(photo => photo.id))));
    const element = node('div', `mem-album${mobile ? ' mem-album--mobile' : ''}${reduced ? ' mem-album--reduced' : ''}`);
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', `Album cưới ${site.names || ''}`.trim());
    mount.append(element);

    let destroyed = false;
    let interactive = Boolean(reduced);
    let open = 0;
    let close = 0;
    let position = 0;
    let currentIndex = -1;
    let activeFace = '';

    function photoButton(photo, index) {
      const figure = node('figure', 'mem-album-photo');
      const button = node('button', 'mem-album-photo-button');
      button.type = 'button';
      button.dataset.photoId = photo.id || '';
      button.setAttribute('aria-label', `Xem ảnh: ${photo.caption || photo.alt || `${index + 1}`}`);
      button.tabIndex = -1;
      const img = node('img', 'mem-album-photo-image');
      img.alt = photo.alt || photo.caption || 'Ảnh cưới';
      if (photo.width) img.width = photo.width;
      if (photo.height) img.height = photo.height;
      img.loading = reduced ? 'lazy' : 'eager';
      img.decoding = 'async';
      img.draggable = false;
      // Only current / next spreads are built. Never load full viewer images here.
      img.src = photo.src || photo.thumb || photo.full || '';
      img.style.objectPosition = photo.objectPosition || '50% 50%';
      button.append(img);
      button.addEventListener('click', () => {
        if (interactive && button.tabIndex === 0 && typeof onPhotoClick === 'function') onPhotoClick(photo, button);
      });
      figure.append(button);
      if (photo.caption) figure.append(node('figcaption', 'mem-album-photo-caption', photo.caption));
      return figure;
    }

    if (reduced) {
      element.append(node('p', 'mem-album-static-heading', 'Những trang ký ức'));
      const gallery = node('div', 'mem-album-static-grid');
      photos.forEach((photo, i) => gallery.append(photoButton(photo, i)));
      element.append(gallery);
      const buttons = [...element.querySelectorAll('button')];
      buttons.forEach(button => { button.tabIndex = 0; });
      return {
        element, spreadCount: count,
        get spreadPhotoIds() { return spreadPhotoIds; },
        setOpen() {}, setPage() {}, setClose() {},
        setInteractive(value) {
          interactive = Boolean(value);
          buttons.forEach(button => { button.tabIndex = interactive ? 0 : -1; });
        },
        destroy() { destroyed = true; element.remove(); }
      };
    }

    const book = node('div', 'mem-album-book');
    const leftBoard = node('div', 'mem-album-board mem-album-board--left');
    const rightBoard = node('div', 'mem-album-board mem-album-board--right');
    const leftPage = node('div', 'mem-album-page mem-album-page--left');
    const rightPage = node('div', 'mem-album-page mem-album-page--right');
    const turning = node('div', 'mem-album-turn');
    const front = node('div', 'mem-album-turn-face mem-album-turn-front');
    const back = node('div', 'mem-album-turn-face mem-album-turn-back');
    const shadow = node('div', 'mem-album-turn-shadow');
    turning.append(front, back);
    const spine = node('div', 'mem-album-spine');
    const cover = node('div', 'mem-album-cover');
    cover.setAttribute('aria-hidden', 'true');
    const coverFront = node('div', 'mem-album-cover-front');
    const coverBack = node('div', 'mem-album-cover-back');
    const label = node('div', 'mem-album-cover-label');
    label.append(node('span', 'mem-album-cover-kicker', 'WEDDING MEMORIES'));
    label.append(node('span', 'mem-album-cover-initials', site.initials || 'A & U'));
    label.append(node('span', 'mem-album-cover-names', site.names || ''));
    label.append(node('span', 'mem-album-cover-date', site.dateLabel || ''));
    if (site.albumCover) {
      const coverImage = node('img', 'mem-album-cover-image');
      coverImage.src = site.albumCover;
      coverImage.alt = '';
      coverImage.decoding = 'async';
      coverImage.draggable = false;
      coverFront.append(coverImage);
      coverFront.classList.add('mem-album-cover-front--art');
    }
    coverFront.append(label);
    coverBack.append(node('span', 'mem-album-inside-monogram', site.initials || 'A & U'));
    cover.append(coverFront, coverBack);
    book.append(leftBoard, rightBoard, leftPage, rightPage, shadow, turning, spine, cover);
    element.append(book);
    const progress = node('p', 'mem-album-pagination');
    progress.setAttribute('aria-live', 'off');
    element.append(progress);

    function renderPage(host, pictures, side, spread) {
      host.replaceChildren();
      host.classList.toggle('mem-album-page--pair', pictures.length > 1);
      host.dataset.layout = spread.layout;
      const heading = node('div', 'mem-album-page-heading');
      heading.append(node('span', '', side === 'left' ? 'THE WEDDING JOURNAL' : (site.dateLabel || 'OUR STORY')));
      heading.append(node('span', '', String((spread.number - 1) * 2 + (side === 'left' ? 1 : 2)).padStart(2, '0')));
      const picturesNode = node('div', 'mem-album-page-pictures');
      pictures.forEach((photo, i) => picturesNode.append(photoButton(photo, i)));
      if (!pictures.length) picturesNode.append(node('p', 'mem-album-page-dedication', site.dateLabel));
      host.append(heading, picturesNode, node('div', 'mem-album-page-foot', site.names || ''));
    }

    // The two sides of a turning sheet join adjacent spreads. This remains
    // deterministic when the scroll reverses or jumps directly several pages.
    function renderSpread(index) {
      if (index === currentIndex) return;
      currentIndex = index;
      const here = spreads[index] || { left: [], right: [], number: 1, layout: 'duet' };
      const next = spreads[Math.min(index + 1, count - 1)] || here;
      renderPage(leftPage, here.left, 'left', here);
      renderPage(rightPage, next.right, 'right', next);
      renderPage(front, here.right, 'right', here);
      renderPage(back, next.left, 'left', next);
      activeFace = '';
    }

    function setFocusable(host, enabled) {
      host.setAttribute('aria-hidden', enabled ? 'false' : 'true');
      host.style.pointerEvents = enabled ? 'auto' : 'none';
      host.querySelectorAll('button').forEach(button => { button.tabIndex = enabled ? 0 : -1; });
    }

    function paint() {
      if (destroyed) return;
      const openness = open * (1 - close);
      const index = Math.min(count - 1, Math.floor(position));
      const fraction = index === count - 1 ? 0 : position - index;
      renderSpread(index);
      book.style.transform = `translate3d(${-25 * (1 - openness)}%,0,0)`;
      cover.style.transform = `translateZ(${5 - 7 * openness}px) rotateY(${-180 * openness}deg)`;
      // Back of the cover settles under the left page once fully open.
      cover.style.zIndex = openness > .98 ? '0' : '6';
      leftPage.style.opacity = String(clamp((openness - .28) / .42));
      leftBoard.style.opacity = String(clamp(openness * 2));
      spine.style.opacity = String(openness);
      turning.style.transform = `translateZ(2px) rotateY(${-180 * fraction}deg)`;
      shadow.style.opacity = String(Math.sin(fraction * Math.PI) * .38 * openness);
      shadow.style.transform = `translateX(${-fraction * 55}%) scaleX(${.15 + Math.sin(fraction * Math.PI) * .85})`;
      progress.style.opacity = String(openness);
      const pageLabel = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      if (progress.textContent !== pageLabel) progress.textContent = pageLabel;

      // Do not expose hidden, reverse-facing, or moving photos to tab navigation.
      const canUse = interactive && openness > .985;
      const faces = canUse ? (fraction < .015 ? 'rest' : fraction > .985 ? 'landed' : 'turning') : 'off';
      if (faces !== activeFace) {
        activeFace = faces;
        setFocusable(leftPage, faces === 'rest');
        setFocusable(rightPage, faces === 'landed');
        setFocusable(front, faces === 'rest');
        setFocusable(back, faces === 'landed');
      }
    }

    paint();
    return {
      element,
      spreadCount: count,
      get spreadPhotoIds() { return spreadPhotoIds; },
      setOpen(progress) { const next = clamp(progress); if (next !== open) { open = next; paint(); } },
      setPage(value) { const next = clamp(value, 0, count - 1); if (next !== position) { position = next; paint(); } },
      setClose(progress) { const next = clamp(progress); if (next !== close) { close = next; paint(); } },
      setInteractive(value) { const next = Boolean(value); if (next !== interactive) { interactive = next; activeFace = ''; paint(); } },
      destroy() {
        destroyed = true;
        element.remove();
      }
    };
  }

  window.WeddingAlbum = Object.freeze({ create });
})();
