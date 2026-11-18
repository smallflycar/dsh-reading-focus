// Colour palettes for the gradient mode. Each palette pairs a base tone with two accents.
const RF_GRADIENT_PALETTES = {
  Bright:{base:[0,0,0],a:[0,0,255],b:[196,30,30]},
  Blues:{base:[0,0,0],a:[0,0,255],b:[144,19,254]},
  Night:{base:[255,255,255],a:[158,141,252],b:[86,170,255]}
};
const rfMix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// Each visual line sweeps one full arm of the palette, alternating direction:
//   line 0  base -> A      line 1  A -> base
//   line 2  base -> B      line 3  B -> base   (then repeat)
// Consecutive lines therefore meet at an extreme - either fully saturated or fully base -
// and never in the middle of a ramp, which is what keeps a wrapped junction readable.
function rfPhase(line,t){switch(((line%4)+4)%4){case 0:return ['a',t];case 1:return ['a',1-t];case 2:return ['b',t];default:return ['b',1-t];}}
function rfPosition(x,first,last){return last>first?Math.max(0,Math.min(1,(x-first)/(last-first))):0;}
// A line with a single glyph can only show one colour, so it shows the colour it is entered
// with and leaves the pattern untouched. Advancing it instead would place that lone glyph on
// the arm's terminal colour and break the junction on both sides of the line.
function rfLineAdvance(line){return line.items.length>1?1:0;}
function rfNextOffset(offset,advance){return (offset+advance)%4;}
function rfFlowOffsets(counts){let n=0;return counts.map(count=>{const offset=n;n=rfNextOffset(n,count);return offset;});}
function rfPlanFlow(entries,owner){let offset=0;for(const entry of entries){if(entry.dirty||!entry.item||entry.item.offset!==offset||entry.item.owner!==owner)return {block:entry.block,offset,measure:entry.dirty||!entry.item};offset=rfNextOffset(offset,entry.item.advance);}return null;}
function rfLineColor(colors,line,t){const [side,phase]=rfPhase(line,t);return rfMix(colors.base,colors[side],Math.round(phase*31)/31).map(Math.round);}
function* rfGraphemeIterator(text){
  if(typeof Intl.Segmenter==='function'){for(const x of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text))yield {start:x.index,end:x.index+x.segment.length};return;}
  let index=0,join=false,current=null;for(const ch of text){const start=index;index+=ch.length;if(current&&(/\p{Mark}/u.test(ch)||/[\uFE00-\uFE0F]/u.test(ch)||ch==='\u200d'||join))current.end=index;else {if(current)yield current;current={start,end:index};}join=ch==='\u200d';}if(current)yield current;
}
function rfGraphemes(text){return [...rfGraphemeIterator(text)];}
// Accepts rgb()/rgba() as well as #rgb/#rrggbb, because the colour picker produces hex.
function rfParseColor(s){
  if(typeof s!=='string')return null;
  const trimmed=s.trim();
  const hex=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if(hex){
    const h=hex[1].length===3?hex[1].split('').map(c=>c+c).join(''):hex[1];
    return [Number.parseInt(h.slice(0,2),16),Number.parseInt(h.slice(2,4),16),Number.parseInt(h.slice(4,6),16),1];
  }
  const m=/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(trimmed);
  if(!m)return null;
  const a=m[4]===undefined?1:m[4].endsWith('%')?parseFloat(m[4])/100:+m[4];
  return [+m[1],+m[2],+m[3],a];
}
function rfGradientColors(palette,dark,original,strength){
  const target=RF_GRADIENT_PALETTES[palette],base=dark?[255,255,255]:[0,0,0];
  const adapt=c=>dark?(palette==='Night'?c:rfMix(c,[255,255,255],.52)):(palette==='Night'?rfMix(c,[0,0,0],.48):c);
  return {base:rfMix(original,base,strength),a:rfMix(original,adapt(target.a),strength),b:rfMix(original,adapt(target.b),strength)};
}
// Blocks that are never coloured: headings, code and tabular surfaces keep their own colour.
const RF_NO_GRADIENT='h1,h2,h3,h4,h5,h6,pre,table,figure,[data-code-block-content],[data-markdown-variant="compact"]';
// Versioned queue helper; a changed version can never publish stale work.
function rfGradientQueue(){
  const versions=new Map(),queued=new Map();
  return {touch(block,priority=false){const v=(versions.get(block)||0)+1;versions.set(block,v);queued.delete(block);queued.set(block,{version:v,priority});return v;},ensure(block,priority=false){if(!versions.has(block))this.touch(block,priority);},version:block=>versions.get(block),valid:(block,version)=>versions.get(block)===version,drop(block){versions.delete(block);queued.delete(block);},take(){let key;for(const [k,v] of queued){if(key===undefined)key=k;if(v.priority){key=k;break;}}if(key===undefined)return null;const entry=queued.get(key);queued.delete(key);return {block:key,...entry};},get size(){return queued.size;},clear(){versions.clear();queued.clear();}};
}
function createGradientController({state,roots,blocks,viewport,notify,flowOf}){
  const prefix='rf-gradient-'+Math.random().toString(36).slice(2),registry=new Map(),cache=new Map(),dirty=new Set();
  const media=window.matchMedia('(forced-colors: active)');let style=null,frame=0,status='',job=null,scanFrame=0,generation=0,flows=[],rerun=false,statusDirty=false;
  // Only running body text is coloured. Headings and code keep the original text colour: a
  // large heading glyph would otherwise carry a whole colour sweep by itself, which reads as
  // an artefact rather than a reading aid. Inline emphasis inside a paragraph stays coloured.
  const excluded='a,h1,h2,h3,h4,h5,h6,code,pre,kbd,samp,var,tt,table,thead,tbody,tfoot,tr,th,td,caption,figure,figcaption,math,svg,canvas,img,picture,video,button,input,textarea,select,label,summary,details,sup,sub,bdi,bdo,[dir="rtl"],[contenteditable]:not([contenteditable="false"]),[role="button"],[role="toolbar"],[role="menu"],[data-text-interaction-surface],[data-turn-process-inline],[data-code-block-banner],[data-code-block-content],[data-markdown-variant="compact"]';
  const active=()=>state.enabled&&state.mode==='gradient';
  const supported=()=>!!window.CSS?.highlights&&typeof Highlight==='function'&&!media.matches;
  function setStatus(s){if(s!==status){status=s;notify();}}
  // Cheap "is there still work" check: only the first non-clean block per flow needs looking at.
  function statusPending(){if(job)return true;for(const flow of flows)for(const block of flow.blocks)if(dirty.has(block)||!cache.has(block))return true;return false;}
  // No progress readout in the UI: internal state only, and only when it truly changes.
  function updateStatus(){if(!statusDirty)return;statusDirty=false;setStatus(media.matches?'forced-colors':!window.CSS?.highlights||typeof Highlight!=='function'?'unsupported':job||statusPending()?'busy':'');}
  function clearRegistry(){for(const {name,highlight} of registry.values())if(CSS.highlights.get(name)===highlight)CSS.highlights.delete(name);registry.clear();style?.remove();style=null;}
  function discard(j){if(!j)return;for(const [color,range] of j.added)registry.get(color)?.highlight.delete(range);for(const [color,range] of j.removed)registry.get(color)?.highlight.add(range);}
  function cancel(){generation++;if(frame)cancelAnimationFrame(frame);frame=0;discard(job);job=null;rerun=false;}
  function clear(){cancel();if(scanFrame)cancelAnimationFrame(scanFrame);scanFrame=0;clearRegistry();cache.clear();dirty.clear();flows=[];}
  function bucket(color){let b=registry.get(color);if(b)return b;if(!style){style=document.createElement('style');style.dataset.readingFocusGradient='';document.head.append(style);}const name=prefix+'-'+registry.size,highlight=new Highlight();style.append(document.createTextNode(`::highlight(${name}){color:${color}}\n`));CSS.highlights.set(name,highlight);b={name,highlight};registry.set(color,b);return b;}
  function removeItem(item){if(!item)return;for(const [color,ranges] of item.colors){const b=registry.get(color);if(b)for(const range of ranges)b.highlight.delete(range);}}
  function visible(el){const r=el.getBoundingClientRect(),v=viewport(el);return !!v&&r.bottom>=v.top-150&&r.top<=v.bottom+150&&r.right>=v.left&&r.left<=v.right;}
  function scan(){
    if(!active()){clear();setStatus('');return;}if(!supported()){clear();statusDirty=true;updateStatus();return;}
    const grouped=new Map(),ordered=[...roots].filter(r=>r.isConnected).sort((a,b)=>a===b?0:a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
    for(const root of ordered){const key=flowOf(root);if(!grouped.has(key))grouped.set(key,{root:key,roots:[],blocks:[]});const f=grouped.get(key);f.roots.push(root);f.blocks.push(...blocks(root).filter(b=>!b.matches(RF_NO_GRADIENT)));}
    const next=[...grouped.values()],live=new Set(next.flatMap(f=>f.blocks));
    const changed=next.length!==flows.length||next.some((f,i)=>f.root!==flows[i]?.root||f.blocks.length!==flows[i]?.blocks.length||f.blocks.some((b,k)=>b!==flows[i].blocks[k]));
    if(changed)cancel();flows=next;
    for(const block of cache.keys())if(!live.has(block)){removeItem(cache.get(block));cache.delete(block);dirty.delete(block);}
    for(const block of live)if(!cache.has(block)||cache.get(block).parent!==block.parentElement)dirty.add(block);
    for(const block of dirty)if(!live.has(block))dirty.delete(block);
    statusDirty=true;updateStatus();schedule();
  }
  // Only the first unresolved block in each flow can run; its prefix is known.
  function nextWork(){const candidates=[];for(const flow of flows){const next=rfPlanFlow(flow.blocks.map(block=>({block,item:cache.get(block),dirty:dirty.has(block)})),flow.root);if(next)candidates.push({...next,flow});}return candidates.find(c=>c.flow.roots.some(visible))||candidates[0]||null;}
  function schedule(){if(!frame&&(job||nextWork()))frame=requestAnimationFrame(work);}
  function begin(entry){const {block,flow,offset,measure}=entry,old=cache.get(block),walker=measure?document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.parentElement||!node.data)return NodeFilter.FILTER_REJECT;for(let p=node.parentElement;p&&block.contains(p);p=p.parentElement)if(p.matches(excluded))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}}):null;const dark=document.body.hasAttribute('data-ds-dark-theme'),raw=rfParseColor(getComputedStyle(flow.root).color),colors=rfGradientColors(state.gradientPalette,dark,raw?.slice(0,3)||(dark?[255,255,255]:[0,0,0]),state.gradientStrength);return {block,blockRect:measure?block.getBoundingClientRect():null,offset,owner:flow.root,walker,node:null,segments:null,lines:measure?[]:old.lines,lineIndex:0,itemIndex:0,phase:offset,colors:new Map(),palette:colors,stage:measure?'measure':'color',added:[],removed:[],epoch:generation};}
  function retry(j){discard(j);job=null;rerun=false;dirty.add(j.block);}
  function work(){frame=0;const start=performance.now(),epoch=generation;let steps=0;
    while(active()&&epoch===generation&&steps<400&&performance.now()-start<4){
      if(!job){const entry=nextWork();if(!entry)break;if(!entry.block.isConnected){scan();break;}job=begin(entry);}
      const j=job;if(j.epoch!==generation||!j.block.isConnected){discard(j);job=null;continue;}
      if(j.stage==='measure'){
        if(!j.node){j.node=j.walker.nextNode();if(!j.node){j.stage='color';continue;}const el=j.node.parentElement,st=getComputedStyle(el);if(st.display==='none'||st.visibility==='hidden'||st.direction==='rtl'||st.writingMode!=='horizontal-tb'){j.node=null;continue;}j.snapshot=j.node.data;j.segments=rfGraphemeIterator(j.snapshot);}
        if(!j.node.isConnected||!j.block.contains(j.node)||!j.node.data.startsWith(j.snapshot)){retry(j);continue;}
        const next=j.segments.next();if(next.done){j.node=null;j.segments=null;continue;}steps++;const seg=next.value,text=j.snapshot.slice(seg.start,seg.end);if(/^\s+$/u.test(text)||/[\u0590-\u08ff\u202a-\u202e\u2066-\u2069]/u.test(text))continue;
        const range=document.createRange();range.setStart(j.node,seg.start);range.setEnd(j.node,seg.end);const origin=j.blockRect;const rects=range.getClientRects();
        for(const r of rects){if(r.width<=0||r.height<=0)continue;const top=r.top-origin.top,bottom=r.bottom-origin.top,left=r.left-origin.left,right=r.right-origin.left;let line=j.lines.at(-1);const overlap=line?Math.min(line.bottom,bottom)-Math.max(line.top,top):0;if(!line||overlap<Math.min(line.bottom-line.top,bottom-top)*.5){line={top,bottom,first:(left+right)/2,last:(left+right)/2,items:[]};j.lines.push(line);}line.top=Math.min(line.top,top);line.bottom=Math.max(line.bottom,bottom);line.first=Math.min(line.first,(left+right)/2);line.last=Math.max(line.last,(left+right)/2);line.items.push({node:j.node,start:seg.start,end:seg.end,left,right});}
      }else if(j.stage==='color'){
        const line=j.lines[j.lineIndex];if(!line){j.stage='publish';j.iterator=j.colors.entries();j.current=null;continue;}const item=line.items[j.itemIndex++];if(!item){j.phase+=rfLineAdvance(line);j.lineIndex++;j.itemIndex=0;continue;}steps++;
        if(!item.node.isConnected||!j.block.contains(item.node)||item.end>item.node.length){retry(j);continue;}
        const rgb=rfLineColor(j.palette,j.phase,rfPosition((item.left+item.right)/2,line.first,line.last)),color=`rgb(${rgb.join(',')})`;if(!j.colors.has(color))j.colors.set(color,[]);const ranges=j.colors.get(color),last=ranges.at(-1);if(last&&last.endContainer===item.node&&last.endOffset===item.start)last.setEnd(item.node,item.end);else {const r=document.createRange();r.setStart(item.node,item.start);r.setEnd(item.node,item.end);ranges.push(r);}
      }else if(j.stage==='publish'){
        if(!j.current){const next=j.iterator.next();if(next.done){j.stage='remove';j.old=cache.get(j.block);j.oldIterator=j.old?.colors.entries();continue;}j.current={color:next.value[0],ranges:next.value[1],index:0};}
        const c=j.current,range=c.ranges[c.index++];if(!range){j.current=null;continue;}bucket(c.color).highlight.add(range);j.added.push([c.color,range]);steps++;
      }else {
        if(!j.oldCurrent&&j.oldIterator){const next=j.oldIterator.next();if(!next.done)j.oldCurrent={color:next.value[0],ranges:next.value[1],index:0};}
        if(j.oldCurrent){const c=j.oldCurrent,range=c.ranges[c.index++];if(range){registry.get(c.color)?.highlight.delete(range);j.removed.push([c.color,range]);steps++;continue;}j.oldCurrent=null;continue;}
        cache.set(j.block,{offset:j.offset,owner:j.owner,parent:j.block.parentElement,lines:j.lines,advance:j.lines.reduce((n,line)=>n+rfLineAdvance(line),0),colors:j.colors});if(!rerun)dirty.delete(j.block);rerun=false;j.added=[];j.removed=[];job=null;
      }
    }
    if(epoch!==generation)return;statusDirty=true;updateStatus();schedule();
  }
  function invalidate(block){if(!active())return;if(!block){cancel();for(const flow of flows)for(const item of flow.blocks)dirty.add(item);}else {dirty.add(block);if(job?.block===block)rerun=true;}if(!scanFrame)scanFrame=requestAnimationFrame(()=>{scanFrame=0;scan();});}
  function onForced(){if(media.matches){clear();statusDirty=true;updateStatus();}else scan();}media.addEventListener('change',onForced);
  const fonts=document.fonts;function onFonts(){invalidate();}fonts?.addEventListener('loadingdone',onFonts);
  return {scan,invalidate,clear,status:()=>status,dispose(){clear();media.removeEventListener('change',onForced);fonts?.removeEventListener('loadingdone',onFonts);}};
}
