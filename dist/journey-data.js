/* Shared by both sites. Keep the existing groom/bride identity as the only
   variant switch; the wedding milestone reuses its dateLabel directly.
   All four photographs are owner-supplied and retain their original order. */
(() => {
  const site = window.WEDDING_MEMORIES_DATA.site;
  window.JOURNEY_CONFIG = {
    siteVariant: site.key, // Existing 'groom' = nhà trai / 'bride' = nhà gái.
    names: site.names,
    initials: site.initials,
    title: 'Hành trình của 2 đứa mình',
    milestones: [
      {id:'meet', title:'Làm quen', date:'07.04.2024', image:'images/journey/journey-meet-preview.webp', full:'images/journey/journey-meet-full.webp', imageReady:true, width:1200, height:900, fit:'contain', alt:`Chiếc laptop bên cửa sổ — kỷ niệm làm quen của ${site.names}`},
      {id:'confession', title:'Tỏ tình', date:'24.08.2024', image:'images/journey/journey-confession-preview.webp', full:'images/journey/journey-confession-full.webp', imageReady:true, width:675, height:1200, alt:`${site.names} chụp ảnh bên nhau trước gương, lưu giữ kỷ niệm tỏ tình`},
      {id:'proposal', title:'Cầu hôn', date:'06.06.2025', image:'images/journey/journey-proposal-preview.webp', full:'images/journey/journey-proposal-full.webp', imageReady:true, width:900, height:1200, alt:`${site.names} dưới tán cây với bó hoa đỏ và chiếc nhẫn cầu hôn`},
      {id:'wedding', title:'Đám cưới', date:site.dateLabel, image:'images/journey/journey-wedding-preview.webp', full:'images/journey/journey-wedding-full.webp', imageReady:true, width:800, height:1200, alt:`${site.names} trong trang phục cưới, ngồi bên nhau giữa vườn hoa`}
    ],
    // One material coordinate drives both photo cells and the connecting stock.
    // Radians between cells, focus bearing, and vertical pitch define the coil.
    flow: {frameSpacing:1, angularSpacing:2.12, focusAngle:-.76, frontBend:.04, sideBend:.90},
    ribbon: {patchesPerJoin:16, stockWidth:1.08, holePitch:14, photoSlices:24},
    debug: {showFilmPath:false}, // Local development only; ignored on hosted origins.
    scroll: {
      desktop: {intro:.8, marker:.7, photo:1.1, finalHold:.25, outro:.9},
      tablet: {intro:.55, marker:.5, photo:.8, finalHold:.2, outro:.65},
      mobile: {intro:.32, marker:.28, photo:.5, finalHold:.12, outro:.4}
    }
  };
})();
