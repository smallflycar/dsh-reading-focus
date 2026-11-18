// Browser validation for the current engine. Each case asserts what the code does today;
// cases that described removed behaviour (spotlight mode, bounding-box masking, full-width
// dock exemption) were deleted with the behaviour they described.
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const profile=mkdtempSync(resolve('test/reading-focus-profile-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
   '--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let ws,checks=[];
try{
  let port;
  for(let i=0;i<100;i++){
    if(chrome.exitCode!==null)throw Error('browser exited '+chrome.exitCode);
    if(existsSync(profile+'/DevToolsActivePort')){port=readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];break;}
    await wait(100);
  }
  if(!port)throw Error('browser did not start');

  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pathToFileURL(resolve('preview.html')).href)}`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let n=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const [r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
  const call=(method,params={})=>new Promise((r,j)=>{const id=++n;pending.set(id,[r,j]);ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const run=async(label,expr)=>{
    const v=await evaluate(expr);
    assert.equal(v,true,label+': '+JSON.stringify(v));
    checks.push(label);
    console.log('PASS',label);
  };
  const shot=async name=>{
    const x=await call('Page.captureScreenshot',{format:'png'});
    writeFileSync(`test/reading-focus-${name}.png`,Buffer.from(x.data,'base64'));
  };

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1100,height:1000,deviceScaleFactor:2,mobile:false});
  for(let i=0;i<80;i++){
    if(await evaluate("document.readyState==='complete' && typeof startReadingFocus==='function'"))break;
    await wait(100);
  }

  // Build a fixture that mirrors the host DOM: assistant markdown roots inside .xMeOpW_body,
  // including the real code-block structure (banner + content > pre > code).
  await evaluate(`(()=>{
    const vp=document.querySelector('#viewport');
    vp.querySelectorAll('#first,#nested').forEach(x=>x.remove());
    document.head.insertAdjacentHTML('beforeend','<style id="suite-css">'
      +'.xMeOpW_body{display:flex;flex-direction:column;gap:16px;max-width:460px;margin:0 auto 40px;font:14px/24px system-ui}'
      +'.xMeOpW_body ._markdown_suite_1{display:flex;flex-direction:column;gap:16px}'
      +'.xMeOpW_body p{margin:0}'
      +'.xMeOpW_body h1{margin:0;font-size:26px;line-height:32px}'
      +'.xMeOpW_body h4{margin:0;font-size:16px;line-height:24px}'
      +'.md-code-block{border:1px solid #4a5568;border-radius:8px;overflow:hidden}'
      +'.md-code-block .banner{display:flex;justify-content:space-between;padding:4px 10px;font:11px/18px ui-monospace;opacity:.7}'
      +'.md-code-block .content pre{margin:0;padding:10px 12px;font:12px/20px ui-monospace}'
      +'.xMeOpW_body table{border-collapse:collapse;width:100%;font-size:13px}'
      +'.xMeOpW_body td,.xMeOpW_body th{border:1px solid #56637a;padding:4px 6px}'
      +'</style>');
    const md=h=>'<div class="_markdown_suite_1">'+h+'</div>';
    const code='<div class="md-code-block"><div class="banner" data-code-block-banner>'
      +'<span data-text-interaction-exclude>ts</span><div class="action"><button type="button">copy</button></div></div>'
      +'<div class="content" data-code-block-content><pre><code>const x = 1;</code></pre></div></div>';
    const LONG='这一段的文字足够长，长到在窄容器里一定会换行好几次，这样我们才能看清楚颜色是不是连续地往前走。';
    const host=document.createElement('div');
    host.id='suite';
    host.innerHTML='<div class="xMeOpW_body" id="flowA">'
      +md('<h1 id="h1">一级标题不参与渐变</h1>')
      +md('<h4 id="h4">小标题也不参与</h4>')
      +md('<p id="p1">'+LONG+'</p>')
      +md('<p id="short1">短</p>')
      +md('<p id="p2">'+LONG+'</p>')
      +md('<p id="short2">好的。</p>')
      +md('<p id="p3">'+LONG+'收尾。</p>')
      +md(code)
      +md('<p id="p4">'+LONG+'</p>')
      +md('<table><thead><tr><th>列一</th></tr></thead><tbody><tr><td id="cell">单元格</td></tr></tbody></table>')
      +'</div>';
    vp.prepend(host);
    vp.scrollTop=0;
    return true;
  })()`);

  await evaluate(`(()=>{
    const c=document.createElement('div');
    c.hidden=true;document.body.append(c);
    window.tc=c;
    window.off=readingFocus.mountControls(c,false,()=>{});
    window.ui=document.querySelector('[data-reading-focus-ui]').shadowRoot;
    window.layer=ui.querySelector('.layer');
    window.pause=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    window.mode=async m=>{tc.querySelector('[data-mode="'+m+'"]').click();await pause();};
    window.shapes=()=>[...layer.children].map(e=>e.getBoundingClientRect());
    window.overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.1;
    // Wait until colouring settles: highlight count stops growing for a few polls.
    window.settleGradient=async()=>{
      let last=-1,stable=0;
      for(let i=0;i<400;i++){
        const size=CSS.highlights.size;
        if(size>0&&size===last){if(++stable>=4)return true;}else stable=0;
        last=size;
        await new Promise(r=>setTimeout(r,80));
      }
      return last>0;
    };
    // Which ranges each highlight bucket holds, keyed by the colour in its ::highlight rule.
    window.tintItems=()=>{
      // Parse the generated rules without a regex: template-literal escaping would mangle it.
      const rules=[...document.querySelectorAll('style[data-reading-focus-gradient]')];
      const colorOf={};
      for(const sheet of rules){
        for(const chunk of (sheet.textContent||'').split('::highlight(').slice(1)){
          const close=chunk.indexOf(')');
          if(close<0)continue;
          const name=chunk.slice(0,close);
          const brace=chunk.indexOf('color:');
          if(brace<0)continue;
          let value=chunk.slice(brace+6);
          const end=value.indexOf('}');
          if(end>=0)value=value.slice(0,end);
          colorOf[name.trim()]=value.trim();
        }
      }
      const items=[];
      for(const [name,hl] of CSS.highlights){
        const color=colorOf[name];
        if(!color)continue;
        for(const range of hl)for(const r of range.getClientRects())
          items.push({color,text:range.toString(),left:r.left,right:r.right,top:r.top,bottom:r.bottom});
      }
      return items;
    };
    window.gradientLines=()=>{
      const lines=[];
      for(const e of tintItems().sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom)||a.left-b.left)){
        const cy=(e.top+e.bottom)/2;
        let line=lines.find(l=>Math.abs(l.cy-cy)<=8);
        if(!line){line={cy,items:[]};lines.push(line);}
        line.items.push(e);
      }
      lines.sort((a,b)=>a.cy-b.cy);
      return lines.map(l=>{l.items.sort((a,b)=>a.left-b.left);return {
        cy:l.cy,n:l.items.length,
        text:l.items.map(x=>x.text).join(''),
        first:l.items[0].color,last:l.items.at(-1).color};});
    };
    window.colorStep=(a,b)=>{
      const p=c=>((c||'').match(/\d+/g)||[0,0,0]).slice(0,3).map(Number);
      return Math.max(...p(a).map((v,i)=>Math.abs(v-p(b)[i])));
    };
    return true;
  })()`);

  await run('settings mount',`(()=>{const b=tc.querySelector('input[type=checkbox]');if(b.checked)return false;b.click();return b.checked&&!!ui})()`);
  await wait(250);

  // Every mode must render something without throwing. Block focus no longer paints an overlay -
  // it fades the text itself through ::highlight() - so it is asserted against the highlight.
  for(const m of ['ruler','lines','blocks','bands']){
    await run('mode '+m+' paints',`(async()=>{await mode('${m}');const v=document.querySelector('#viewport');v.scrollTop=0;await pause();
      const p=document.querySelector('#p1');p.scrollIntoView({block:'center'});await pause();
      const r=p.getBoundingClientRect();const t=document.elementFromPoint(r.left+60,r.top+8)||document.body;
      t.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,composed:true,clientX:r.left+60,clientY:r.top+8}));
      await pause();await new Promise(x=>setTimeout(x,120));
      if('${m}'==='blocks'){
        const dim=[...CSS.highlights.keys()].filter(k=>k.startsWith('rf-dim-'));
        if(!dim.length)return {noDim:true,shapes:layer.children.length};
        // The active block keeps its own colour, so at least one paragraph stays undimmed.
        const paras=[...document.querySelectorAll('#p1, #p2, #p3, #p4')];
        const hl=CSS.highlights.get(dim[0]);let touched=0;
        for(const para of paras){let hit=false;for(const range of hl){try{if(range.intersectsNode(para))hit=true;}catch(e){}}if(hit)touched++;}
        return layer.children.length===0&&paras.length>0&&touched<paras.length?true:{shapes:layer.children.length,touched,paras:paras.length};
      }
      return shapes().length>0})()`);
  }

  // The two reported defects, asserted directly.
  await run('gradient colours body text only',`(async()=>{
    await mode('gradient');
    const ok=await settleGradient();
    if(!ok)return false;
    const hit=sel=>{const el=document.querySelector(sel);if(!el)return 0;let n=0;
      for(const [name,hl] of CSS.highlights)for(const range of hl){
        try{if(range.intersectsNode(el))n++;}catch(e){}}
      return n;};
    return hit('#p1')>0&&hit('#h1')===0&&hit('#h4')===0&&hit('#cell')===0
      &&hit('#suite pre')===0&&hit('#suite code')===0;
  })()`);
  await shot('gradient-dark');

  await run('gradient keeps colour continuous across short lines',`(async()=>{
    await mode('gradient');
    await settleGradient();
    const lines=gradientLines();
    if(!lines.length)return {debug:{
      highlights:CSS.highlights.size,
      styles:document.querySelectorAll('style[data-reading-focus-gradient]').length,
      ruleText:(document.querySelector('style[data-reading-focus-gradient]')||{}).textContent||'',
      status:(readingFocus?'api':'no-api')}};
    if(lines.length<6)return {tooFewLines:lines.length};
    const steps=[];
    for(let i=1;i<lines.length;i++){
      // Compare the tail of one visual line with the head of the next.
      if(Math.abs(lines[i].cy-lines[i-1].cy)>40)continue;
      steps.push(colorStep(lines[i-1].last,lines[i].first));
    }
    const worst=Math.max(...steps);
    return worst<=40?true:{worst,steps,lines:lines.map(l=>l.text.slice(0,14))};
  })()`);

  await run('gradient junctions land on extremes, not mid-ramp',`(async()=>{
    await mode('gradient');
    await settleGradient();
    const lines=gradientLines();
    if(lines.length<6)return {tooFewLines:lines.length};
    const sat=c=>{const p=(c||'').match(/\d+/g)||[0,0,0];return Math.round(100*Math.max(...p.slice(0,3).map(Number))/196)/100;};
    const junctions=[];
    for(let i=1;i<lines.length;i++){
      if(Math.abs(lines[i].cy-lines[i-1].cy)>40)continue;
      junctions.push({diff:colorStep(lines[i-1].last,lines[i].first),sat:sat(lines[i-1].last)});
    }
    if(!junctions.length)return {noJunctions:true};
    // Adjacent lines must agree exactly, and that agreement must sit at an extreme
    // (fully saturated or fully base) so a wrapped junction never fades out mid-ramp.
    const aligned=junctions.every(j=>j.diff<=6);
    const extreme=junctions.every(j=>j.sat<=0.15||j.sat>=0.85);
    return aligned&&extreme?true:{junctions};
  })()`);

  await run('bands never paint code blocks',`(async()=>{
    await mode('bands');
    await pause();
    const hit=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();
      return shapes().filter(s=>overlap(s,r)).length;};
    const code=hit('#suite pre');
    const banner=hit('#suite .banner');
    const para=hit('#p1');
    if(code===null)return {missing:true};
    return code===0&&banner===0&&para>0?true:{code,banner,para};
  })()`);
  await shot('bands-dark');

  await run('body text still carries bands',`(()=>{
    const cov=sel=>{const el=document.querySelector(sel);if(!el)return 0;const r=el.getBoundingClientRect();
      return shapes().filter(s=>overlap(s,r)).length;};
    return cov('#p1')>0&&cov('#p2')>0&&cov('#p3')>0&&cov('#p4')>0;
  })()`);

  // Headings keep their own type treatment in bands mode; tables are banded like text.
  await run('bands leave headings plain but still colour tables',`(async()=>{
    await mode('bands');
    const v=document.querySelector('#viewport');v.scrollTop=0;await pause();
    const root=document.querySelector('#flowA ._markdown_suite_1');
    const probe=document.createElement('div');probe.id='band-probe';
    probe.innerHTML='<h3 id="probe-h3">标题不上色块</h3><table><tbody><tr><td id="probe-cell">表格上色块</td></tr></tbody></table>';
    root.prepend(probe);await pause();await pause();await pause();
    const hit=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();
      return shapes().filter(s=>overlap(s,r)).length;};
    const res={h1:hit('#h1'),h4:hit('#h4'),h3:hit('#probe-h3'),cell:hit('#probe-cell'),para:hit('#p1')};
    probe.remove();await pause();await pause();
    return res.h1===0&&res.h4===0&&res.h3===0&&res.cell>0&&res.para>0?true:res;
  })()`);

  await run('light theme behaves the same',`(async()=>{
    document.body.removeAttribute('data-ds-dark-theme');
    await pause();
    const hit=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();
      return shapes().filter(s=>overlap(s,r)).length;};
    const ok=hit('#suite pre')===0&&hit('#p1')>0;
    document.body.setAttribute('data-ds-dark-theme','');
    return ok;
  })()`);

  await run('gradient leaves the document untouched',`(async()=>{
    await mode('gradient');
    await settleGradient();
    const root=document.querySelector('#suite');
    const before=root.innerHTML;
    const r=document.createRange();
    r.selectNodeContents(document.querySelector('#p1'));
    const sel=getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    const copied=sel.toString();
    const rs=getSelection();
    const same=copied===document.querySelector('#p1').textContent&&root.innerHTML===before&&rs.rangeCount===1;
    rs.removeAllRanges();
    return same;
  })()`);

  // The checks below share one page and one controller. Each one restores what it changes, and the
  // dispose check must stay last. Typing was impossible before: every keystroke was clamped and
  // written back, so "18" became 12 then 22. `input` may preview, `change` commits.
  await run('font size accepts typed values',`(async()=>{
    await mode('blocks');
    const size=tc.querySelector('[aria-label="正文字号"]');
    size.focus();size.value='';size.dispatchEvent(new Event('input',{bubbles:true}));
    const cleared=size.value;
    size.value='1';size.dispatchEvent(new Event('input',{bubbles:true}));
    const afterFirst=size.value;
    size.value='18';size.dispatchEvent(new Event('change',{bubbles:true}));
    await pause();
    const committed=size.value;
    const bodyPx=getComputedStyle(document.body).getPropertyValue('--dsh-content-font-size').trim();
    // Restoring must hand the host's variable back instead of writing 14px over it.
    tc.querySelector('.reset-font').click();
    await pause();
    const afterReset={size:size.value,body:document.body.style.getPropertyValue('--dsh-content-font-size'),style:!!document.getElementById('rf-typography')};
    return cleared===''&&afterFirst==='1'&&committed==='18'&&bodyPx==='18.00px'&&afterReset.size==='14'&&afterReset.body===''&&!afterReset.style?true:{cleared,afterFirst,committed,bodyPx,afterReset};
  })()`);

  // Extra spacing is stored as a delta over the host's own ladder, so it must survive a reload and
  // keep riding --dsh-content-font-delta instead of hardcoding a line height.
  await run('extra line spacing survives a reload',`(async()=>{
    const size=tc.querySelector('[aria-label="正文字号"]');
    const extra=tc.querySelector('[aria-label="额外行距"]');
    size.value='22';size.dispatchEvent(new Event('change',{bubbles:true}));
    await pause();
    extra.value='6';extra.dispatchEvent(new Event('change',{bubbles:true}));
    await pause();
    const saved={size:size.value,extra:extra.value};
    const rule=((document.getElementById('rf-typography')||{}).textContent||'');
    const div=document.createElement('div');div.hidden=true;document.body.append(div);
    const reloaded=startReadingFocus();reloaded.mountControls(div);
    await pause();
    const restored={size:div.querySelector('[aria-label="正文字号"]').value,extra:div.querySelector('[aria-label="额外行距"]').value};
    reloaded.dispose();div.remove();
    tc.querySelector('.reset-font').click();
    await pause();
    return saved.size==='22'&&saved.extra==='6'&&restored.size==='22'&&restored.extra==='6'
      &&rule.includes('var(--dsh-content-font-delta')&&rule.includes('+ 6px')?true:{saved,restored,rule};
  })()`);

  // A 0.8.3 profile stored a line-height ratio. 18px at 24/14 was 30.86px, i.e. 3px above the
  // host's own 28px; the upgrade must land on that same rendered height.
  await run('old line-height profiles migrate to extra spacing',`(async()=>{
    const key=(()=>{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
      try{const value=JSON.parse(localStorage.getItem(k)||'null');if(value&&typeof value==='object'&&'enabled' in value)return k;}catch(e){}}
      return null;})();
    if(!key)return {noKey:true};
    const before=JSON.parse(localStorage.getItem(key)||'{}');
    localStorage.setItem(key,JSON.stringify({...before,font:{size:18,lineHeight:24/14}}));
    const div=document.createElement('div');div.hidden=true;document.body.append(div);
    const migrated=startReadingFocus();migrated.mountControls(div);
    await pause();
    const restored={size:div.querySelector('[aria-label="正文字号"]').value,extra:div.querySelector('[aria-label="额外行距"]').value};
    migrated.dispose();div.remove();
    localStorage.setItem(key,JSON.stringify(before));
    tc.querySelector('.reset-font').click();
    await pause();
    return restored.size==='18'&&restored.extra==='3'?true:restored;
  })()`);

  // The switch used to be restored on load but never written by itself.
  await run('on/off switch is persisted',`(async()=>{
    const read=()=>{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);
      try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value==='object'&&'enabled' in value)return value.enabled;}catch(e){}}
      return null;};
    const sw=tc.querySelector('input[type=checkbox]');
    if(sw.checked)sw.click();await pause();
    const off=read();
    sw.click();await pause();
    const on=read();
    return off===false&&on===true?true:{off,on};
  })()`);

  await run('disabling clears every overlay',`(async()=>{
    tc.querySelector('input[type=checkbox]').click();
    await pause();
    const empty=layer.children.length===0&&CSS.highlights.size===0;
    tc.querySelector('input[type=checkbox]').click();
    await pause();
    return empty;
  })()`);

  // The plugin writes the host's typography variable and its own extra-spacing rule; unloading it
  // must take both back, and leave a host value it never wrote alone.
  await run('dispose leaves no typography override',`(async()=>{
    const size=tc.querySelector('[aria-label="正文字号"]');
    const extra=tc.querySelector('[aria-label="额外行距"]');
    size.value='20';size.dispatchEvent(new Event('change',{bubbles:true}));
    await pause();
    extra.value='4';extra.dispatchEvent(new Event('change',{bubbles:true}));
    await pause();
    const before={style:!!document.getElementById('rf-typography'),value:document.body.style.getPropertyValue('--dsh-content-font-size'),rule:((document.getElementById('rf-typography')||{}).textContent||'')};
    readingFocus.dispose();
    await pause();
    const after={style:!!document.getElementById('rf-typography'),value:document.body.style.getPropertyValue('--dsh-content-font-size'),host:!!document.querySelector('[data-reading-focus-ui]')};
    return before.style&&before.value!==''&&before.rule.includes('+ 4px')&&!after.style&&after.value===''&&!after.host?true:{before,after};
  })()`);

  console.log('CHECKS',checks.length);
}catch(e){
  console.error('FAIL',e.stack||e);
  process.exitCode=1;
}finally{
  if(ws)ws.close();
  if(chrome.exitCode===null){
    const exited=new Promise(r=>chrome.once('exit',r));
    chrome.kill();
    await Promise.race([exited,wait(3000)]);
    if(chrome.exitCode===null){chrome.kill('SIGKILL');await Promise.race([exited,wait(3000)]);}
  }
  try{rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});}catch{}
}
