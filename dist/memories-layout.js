/* Source-space staging for the supplied white-cloth / burgundy-satin table.
   u spans the usable tabletop; v runs from its back edge to the front lip.
   The artwork stays whole: camera motion never assembles decorative layers. */
(() => {
 'use strict';
 const image={width:1448,height:1086};
 const tabletop={left:72,right:1374,back:666,front:752};
 const point=(u,v)=>({x:tabletop.left+(tabletop.right-tabletop.left)*u,y:tabletop.back+(tabletop.front-tabletop.back)*v});
 const standing=(u,v,width,height,rotation=0,row='back')=>{
  const foot=point(u,v);return{x:foot.x-width/2,y:foot.y-height,w:width,h:height,r:rotation,row,foot};
 };
 const albumCenter=point(.59,.58),cardCenter=point(.742,.57);
 window.WEDDING_TABLE_LAYOUT={
  image,tabletop,point,
  frames:[standing(.26,.82,155,119,-.4,'front'),standing(.205,.36,112,150,-.5),
   standing(.323,.28,136,181,.4),standing(.395,.85,110,147,.5,'front'),standing(.485,.54,116,155,-.3)],
  // The closed cover occupies half the spread mount. Its footprint stays on cloth.
  album:{x:albumCenter.x-220,y:albumCenter.y-110,w:440,h:220,r:-1.2,tilt:76,center:albumCenter},
  box:standing(.865,.87,218,218),
  card:{x:cardCenter.x-42,y:cardCenter.y-16,w:84,h:32,r:-4,tilt:73},
  wishArea:{x:967,y:443,w:365,h:330},
  // The supplied sprite includes sample photos. A hollow SVG mask discards them
  // entirely; the site's own photographs occupy the measured inner apertures.
  frameArtwork:{width:1774,height:887,
   portrait:{bounds:[1324,302,415,500],outer:[[1324,319],[1689,302],[1739,779],[1368,802]],aperture:[[1412,390],[1622,379],[1657,711],[1445,721]]},
   // Rotate the clean isolated shell for the horizontal photograph. The supplied
   // horizontal frame is overlapped by a neighbouring stand; never paint it.
   landscape:{bounds:[302,-1739,500,415],outer:[[319,-1324],[302,-1689],[779,-1739],[802,-1368]],aperture:[[390,-1412],[379,-1622],[711,-1657],[721,-1445]],transform:'matrix(0 -1 1 0 0 0)'}
  },
  // Box art is normalized to its body footprint, excluding the long cloth apron.
  boxArtwork:{
   groom:{width:1122,height:1402,crop:[0,98,1122,1072],slot:{x:533,y:357,w:294,h:32,angle:4.9}},
   bride:{width:1198,height:1313,crop:[0,25,1198,1075],slot:{x:556,y:288,w:303,h:34,angle:4.9}}
  }
 };
})();
