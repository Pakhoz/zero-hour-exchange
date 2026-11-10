import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=['index.html','styles.css','v2.css','src/app.js','src/core.js','src/storage.js','src/art.js','src/stories.js','src/audio.js','src/motion.js','manifest.webmanifest','assets/icon.svg'];
// Original pixel emblem, written as PNG without graphics dependencies.
function png(size){
 const data=Buffer.alloc(size*(size*4+1));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const xx=x*128/size,yy=y*128/size;
  const green=(xx>=30&&xx<98&&((yy>=33&&yy<45)||(yy>=83&&yy<95)))||(xx>=30&&xx<46&&yy>=33&&yy<95)||(xx>=30&&xx<85&&yy>=58&&yy<70);
  const pink=xx>=87&&xx<98&&yy>=51&&yy<77;
  const color=green?[114,246,209,255]:pink?[233,140,203,255]:[11,17,26,255];data.set(color,y*(size*4+1)+1+x*4);
 }
 function crc(b){let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
 function chunk(name,body){const type=Buffer.from(name),n=Buffer.alloc(4),end=Buffer.alloc(4);n.writeUInt32BE(body.length);end.writeUInt32BE(crc(Buffer.concat([type,body])));return Buffer.concat([n,type,body,end]);}
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data)),chunk('IEND',Buffer.alloc(0))]);
}
await mkdir(resolve(root,'assets'),{recursive:true});
for(const size of [192,512]){const f=`assets/icon-${size}.png`;await writeFile(resolve(root,f),png(size));files.push(f);}
await copyFile(resolve(root,'index.html'),resolve(root,'play.html'));files.push('play.html');
const hash=createHash('sha256');
for(const f of files){const bytes=await readFile(resolve(root,f));hash.update(f).update(bytes);await mkdir(dirname(resolve(root,'dist',f)),{recursive:true});await writeFile(resolve(root,'dist',f),bytes);}
const sw=await readFile(resolve(root,'sw.js'),'utf8');hash.update(sw);const version=hash.digest('hex').slice(0,12);
await writeFile(resolve(root,'dist/sw.js'),sw.replace('__BUILD_HASH__',version));
await writeFile(resolve(root,'dist/.nojekyll'),'');
console.log(`Built ${files.length+2} static files in dist/ · cache ${version}`);
