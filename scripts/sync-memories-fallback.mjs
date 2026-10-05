// Regenerate only the no-JavaScript Memories gallery from each site's photo data.
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('dist/memories-data.js','utf8');
const data=JSON.parse(source.slice(source.indexOf('{')).trim().replace(/;$/, ''));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gallery=items=>`<div class="mem-fallback-grid">${items.map(photo=>`<figure><a href="${escape(photo.full)}"><img src="${escape(photo.src)}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy"></a><figcaption>${escape(photo.caption)}</figcaption></figure>`).join('')}</div>`;
const fallback=`<noscript><style>#memories .mem-stage{display:none}</style><div class="mem-fallback"><p class="eyebrow">02 / BỘ ẢNH CƯỚI</p><p class="mem-edition">Wedding Memories</p><h2>Khung ảnh</h2>${gallery(data.photos)}<h2>Album cưới</h2>${gallery(data.album)}</div></noscript>`;
const html=readFileSync('dist/index.html','utf8'),start=html.indexOf('<noscript>',html.indexOf('id="memories"')),end=html.indexOf('</noscript>',start)+11;
if(start<0||end<11)throw Error('Memories fallback boundary missing');
writeFileSync('dist/index.html',html.slice(0,start)+fallback+html.slice(end));
