/* Coordinates belong to the supplied 1448 × 1086 photograph, never the viewport.
   u spans the usable tabletop; v goes from its back edge towards its front lip. */
(() => {
 'use strict';
 const image={width:1448,height:1086};
 const tabletop={left:82,right:1370,back:480,front:540};
 const point=(u,v)=>({x:tabletop.left+(tabletop.right-tabletop.left)*u,y:tabletop.back+(tabletop.front-tabletop.back)*v});
 const standing=(u,v,width,height,rotation=0,row='back')=>{
  const foot=point(u,v);return{x:foot.x-width/2,y:foot.y-height,w:width,h:height,r:rotation,row,foot};
 };
 const albumCenter=point(.53,.42),cardCenter=point(.70,.52);
 window.WEDDING_TABLE_LAYOUT={
  image,tabletop,point,
  frames:[standing(.25,.67,124,86,-.8,'front'),standing(.213,.28,110,163,-.7),
   standing(.318,.18,126,185,.6),standing(.398,.67,106,142,.8,'front'),standing(.467,.40,108,163,-.4)],
  // Closed cover is half of the full spread mount. Its projection stays behind the lip.
  album:{x:albumCenter.x-258,y:albumCenter.y-129,w:516,h:258,r:-.6,tilt:78,center:albumCenter},
  box:standing(.84,.58,160,208),
  card:{x:cardCenter.x-48,y:cardCenter.y-18,w:96,h:36,r:2,tilt:73},
  wishArea:{x:860,y:282,w:408,h:290},
  petals:[{x:442,y:518,w:13,h:5,r:-16},{x:637,y:518,w:11,h:5,r:23},
    {x:878,y:531,w:14,h:5,r:-12},{x:1098,y:513,w:14,h:6,r:17}]
 };
})();
