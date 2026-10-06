/* Native background audio. Keep play() inside trusted gestures for mobile browsers. */
(() => {
  const MUSIC = Object.freeze({
    tracks: ['audio/beautiful-in-white.mp3', 'audio/marry-you.mp3', 'audio/ngay-dau-tien.mp3', 'audio/le-duong.mp3'],
    volume: 0.32
  });
  const assetBase = document.currentScript.src;
  const audio = document.createElement('audio');
  audio.id = 'wedding-background-music';
  audio.loop = true;
  audio.autoplay = true;
  audio.preload = 'auto';
  audio.volume = MUSIC.volume;
  audio.hidden = true;
  audio.setAttribute('aria-hidden', 'true');
  document.body.append(audio);

  let pending = false, selection = 0;
  function chooseTrack() {
    selection++;
    pending = false;
    const track = MUSIC.tracks[Math.floor(Math.random() * MUSIC.tracks.length)];
    audio.src = new URL(track, assetBase).href;
  }
  function tryPlay() {
    if (document.hidden || !audio.paused || pending) return;
    pending = true;
    // An autoplay rejection is normal; a later trusted tap/key press retries it.
    const currentSelection = selection;
    audio.play().catch(() => {}).finally(() => {
      if (currentSelection === selection) pending = false;
    });
  }
  function onGesture(event) {
    if (!event.isTrusted || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)) return;
    tryPlay();
  }
  // pointerup supplies activation on touch devices where pointerdown does not.
  ['pointerdown', 'pointerup', 'keydown'].forEach(type => {
    addEventListener(type, onGesture, { capture: true, passive: true });
  });
  // Do not leave sound playing in a hidden tab or a cached page.
  audio.addEventListener('playing', () => { if (document.hidden) audio.pause(); });
  addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); else tryPlay(); });
  addEventListener('pagehide', () => audio.pause());
  addEventListener('pageshow', event => {
    // Cached back/forward visits count as a new opening; tab switches do not.
    if (event.persisted) chooseTrack();
    tryPlay();
  });
  chooseTrack();
  tryPlay();
})();
