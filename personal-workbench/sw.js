const PREFIX = 'vcl-personal-workbench-';
const CACHE = PREFIX + 'v1';
const scopePath = new URL('./', self.location.href).pathname;
const SHELL = [
  './','./index.html','./manifest.webmanifest','./css/style.css','./css/monochrome.css',
  './js/app.js','./js/util.js','./js/validation.js','./js/data.js','./js/store.js','./js/weather.js',
  './js/quotes.js','./js/charts.js','./js/excel.js','./vendor/xlsx.full.min.js',
  ...['ai','dashboard','ideas','info','learning','ledger','notes','settings','stocks','todos','work'].map(name=>'./js/views/'+name+'.js'),
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png',
];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scopePath)) return;
  if(req.mode==='navigate') {
    event.respondWith(fetch(req).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));
    return;
  }
  if(!SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(req))||fetch(req)));
});
