// Sound audition page served by the local hub at /sfx.
// Lists every effect's candidates and the music tracks from theme/sfx/catalog.json;
// ticking a candidate saves it back to catalog.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib.mjs'

const SFX = join(ROOT, 'theme', 'sfx')
const CATALOG = join(SFX, 'catalog.json')
const readCatalog = () => JSON.parse(readFileSync(CATALOG, 'utf8'))

export async function handleSfx(req, res, url) {
  if (url.pathname === '/sfx' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(page(readCatalog())), true
  }
  const file = url.pathname.match(/^\/sfx-file\/(ui|music)\/([\w-]+\.mp3)$/)
  if (file) {
    const p = join(SFX, file[1], file[2])
    if (!existsSync(p)) return false
    res.writeHead(200, { 'content-type': 'audio/mpeg' })
    return res.end(readFileSync(p)), true
  }
  if (url.pathname === '/sfx/use' && req.method === 'POST') {
    let body = ''
    for await (const c of req) body += c
    const { effect, use, music } = JSON.parse(body)
    const cat = readCatalog()
    if (effect && Array.isArray(use) && use.length) cat.effects[effect].use = use
    if (music && cat.music.tracks[music]) cat.music.use = music
    writeFileSync(CATALOG, JSON.stringify(cat, null, 2) + '\n')
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end('{"ok":true}'), true
  }
  return false
}

function page(cat) {
  const fx = Object.entries(cat.effects).map(([key, e]) => `
    <section class="fx">
      <div class="fx-h"><h2>${e.label}</h2><code>${key}</code></div>
      <div class="cands">${e.candidates.map((c) => `
        <label class="cand ${e.use.includes(c) ? 'on' : ''}">
          <input type="checkbox" data-effect="${key}" value="${c}" ${e.use.includes(c) ? 'checked' : ''}>
          <button type="button" ${c.startsWith('synth:') ? `data-synth="${c.slice(6)}"` : `data-play="/sfx-file/ui/${c}.mp3"`}>▶</button>
          <span>${c.startsWith('synth:') ? c + '（合成）' : c}</span>
        </label>`).join('')}
      </div>
    </section>`).join('')
  const music = Object.entries(cat.music.tracks).map(([key, t]) => `
    <label class="track ${cat.music.use === key ? 'on' : ''}">
      <input type="radio" name="music" value="${key}" ${cat.music.use === key ? 'checked' : ''}>
      <div><b>${t.title}</b><small>${t.author} · <a href="${t.source}" target="_blank">来源</a> · CC0</small></div>
      <audio controls loop preload="none" src="/sfx-file/music/${key}.mp3"></audio>
    </label>`).join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>音效试听</title>
<style>
body{margin:0;background:#000;color:#f5f5f7;font-family:Inter,"PingFang SC",sans-serif}
.bar{height:3px;background:linear-gradient(90deg,#4a9fc4,#b6e3f4,#fff,#b4e98d,#e8e07a,#f2845c,#d94a4a)}
main{max-width:1000px;margin:0 auto;padding:2.5rem 1.5rem 4rem}
h1{font-size:2.4rem;letter-spacing:-.04em;margin:.2rem 0 .4rem}
.sub{color:#8e8e93;margin-bottom:1.6rem;line-height:1.6}
.vol{display:flex;gap:.8rem;align-items:center;color:#c7c7cc;font-size:.9rem;margin-bottom:1.5rem}
.fx{border:1px solid #1c1c1e;border-radius:16px;padding:1rem 1.1rem;margin-bottom:.8rem;background:#0a0a0a}
.fx-h{display:flex;align-items:baseline;gap:.6rem;margin-bottom:.6rem}
h2{font-size:1.05rem;margin:0}
code{color:#8e8e93;font-size:.8rem}
.cands{display:flex;flex-wrap:wrap;gap:.5rem}
.cand{display:flex;align-items:center;gap:.45rem;border:1px solid #2c2c2e;border-radius:999px;padding:.3rem .7rem .3rem .4rem;font-size:.85rem;cursor:pointer}
.cand.on{border-color:#a6e07a;background:rgba(166,224,122,.08)}
.cand button,.play{background:#fff;color:#000;border:0;border-radius:999px;width:1.7rem;height:1.7rem;cursor:pointer;font-size:.7rem}
.track{display:grid;grid-template-columns:auto 1fr 300px;gap:.8rem;align-items:center;border:1px solid #1c1c1e;border-radius:16px;padding:.8rem 1rem;margin-bottom:.6rem;background:#0a0a0a}
.track.on{border-color:#a6e07a}
.track small{display:block;color:#8e8e93;margin-top:.2rem}
.track a{color:#c7c7cc}
h3{margin:2rem 0 .8rem}
.saved{position:fixed;right:1.2rem;bottom:1.2rem;background:#fff;color:#000;border-radius:999px;padding:.45rem 1rem;font-size:.85rem;opacity:0;transition:opacity .3s}
</style></head><body><div class="bar"></div><main>
<a href="/" style="color:#8e8e93">← 返回导航页</a>
<h1>音效试听</h1>
<div class="sub">点 ▶ 试听，勾选的就是演示时使用的音效（勾多个时随机挑一个，避免重复感）。改动直接保存到 <code>theme/sfx/catalog.json</code>，刷新演示页面后生效。全部素材为 CC0，来源见 <code>theme/sfx/CREDITS.md</code>。</div>
<div class="vol">试听音量 <input id="vol" type="range" min="0" max="1" step="0.05" value="0.6"> <span>建议在讲话时的音量下判断会不会太吵</span></div>
${fx}
<h3>背景音乐</h3>
${music}
</main><div class="saved" id="saved">已保存</div>
<script>
const vol=document.getElementById('vol');
document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();const a=new Audio(b.dataset.play);a.volume=+vol.value;a.play()}));
let actx;
const SYNTH={'soft-tick':(v)=>{actx??=new AudioContext();const a=actx,t=a.currentTime+0.005,out=a.createGain();out.gain.value=v*0.6;out.connect(a.destination);
 const p=(f,f2,d,pk,ty)=>{const o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g).connect(out);o.start(t);o.stop(t+d+0.02)};
 p(1320,880,0.06,0.28,'sine');p(2640,2400,0.03,0.08,'triangle');
 const n=Math.floor(a.sampleRate*0.03),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
 const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=3200;f.Q.value=2;const g=a.createGain();g.gain.value=0.1;s.connect(f).connect(g).connect(out);s.start(t)}};
document.querySelectorAll('[data-synth]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();SYNTH[b.dataset.synth]?.(+vol.value)}));
document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>{a.volume=+vol.value*0.5;document.querySelectorAll('audio').forEach(o=>{if(o!==a)o.pause()})}));
const toast=()=>{const s=document.getElementById('saved');s.style.opacity=1;setTimeout(()=>s.style.opacity=0,1200)};
const post=(d)=>fetch('/sfx/use',{method:'POST',body:JSON.stringify(d)}).then(toast);
document.querySelectorAll('input[type=checkbox]').forEach(c=>c.addEventListener('change',()=>{
  const k=c.dataset.effect;const use=[...document.querySelectorAll('input[data-effect="'+k+'"]:checked')].map(x=>x.value);
  if(!use.length){c.checked=true;return}
  c.closest('label').classList.toggle('on',c.checked);post({effect:k,use})}));
document.querySelectorAll('input[name=music]').forEach(r=>r.addEventListener('change',()=>{
  document.querySelectorAll('.track').forEach(t=>t.classList.remove('on'));r.closest('.track').classList.add('on');post({music:r.value})}));
</script></body></html>`
}
