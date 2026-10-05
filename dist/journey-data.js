/* Shared by both sites. Keep the existing groom/bride identity as the only
   variant switch; the wedding milestone reuses its dateLabel directly.
   Add the four real files below and set imageReady:true after choosing them. */
(() => {
  const site = window.WEDDING_MEMORIES_DATA.site;
  window.JOURNEY_CONFIG = {
    siteVariant: site.key, // Existing 'groom' = nhà trai / 'bride' = nhà gái.
    names: site.names,
    initials: site.initials,
    title: 'Hành trình của 2 đứa mình',
    milestones: [
      {id:'meet', title:'Làm quen', date:'07.04.2024', image:'images/journey/journey-meet.jpg', imageReady:false, alt:`Kỷ niệm làm quen của ${site.names}`},
      {id:'confession', title:'Tỏ tình', date:'24.08.2024', image:'images/journey/journey-confession.jpg', imageReady:false, alt:`Kỷ niệm tỏ tình của ${site.names}`},
      {id:'proposal', title:'Cầu hôn', date:'06.06.2025', image:'images/journey/journey-proposal.jpg', imageReady:false, alt:`Kỷ niệm cầu hôn của ${site.names}`},
      {id:'wedding', title:'Đám cưới', date:site.dateLabel, image:'images/journey/journey-wedding.jpg', imageReady:false, alt:`Ngày cưới của ${site.names}`}
    ],
    scroll: {
      desktop: {intro:.8, marker:.7, photo:1.1, finalHold:.25, outro:.9},
      tablet: {intro:.55, marker:.5, photo:.8, finalHold:.2, outro:.65},
      mobile: {intro:.32, marker:.28, photo:.5, finalHold:.12, outro:.4}
    }
  };
})();
