// Regenerate the no-JS Journey dates from the same browser configuration.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};
vm.runInNewContext(readFileSync(resolve(root,'dist/memories-data.js'),'utf8'),context);
vm.runInNewContext(readFileSync(resolve(root,'dist/journey-data.js'),'utf8'),context);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows=context.window.JOURNEY_CONFIG.milestones.map(m=>`<li><time>${escape(m.date)}</time>${escape(m.title)}</li>`).join('');
const fallback=`<noscript><style>#journey .journey-footer{display:none}#journey .journey-stage{padding-bottom:0}</style><div class="journey-noscript"><ol>${rows}</ol></div></noscript>`;
const path=resolve(root,'dist/index.html'),html=readFileSync(path,'utf8');
const updated=html.replace(/(<!-- journey-fallback:start -->)[\s\S]*?(<!-- journey-fallback:end -->)/,`$1${fallback}$2`);
if(updated===html&&!html.includes(fallback))throw new Error('Journey fallback markers not found');
writeFileSync(path,updated);
console.log('Journey static dates synchronized.');
