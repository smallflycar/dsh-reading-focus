// Shown in the settings panel so a loaded build can be identified at a glance.
const RF_VERSION = '0.8.4';
// One source of truth for the typography controls. The size range mirrors the host's own text
// stepper (10-22, default 14). Line height is not a ratio here: the host computes it as
// `24px + (size - 14)` (the `--dsh-content-font-delta` ladder), so this plugin only adds an
// optional extra on top of that instead of re-deriving a competing line height.
const RF_FONT = {sizeMin:10,sizeMax:22,sizeDefault:14,extraMin:0,extraMax:12,lineBase:24,baseSize:14};
// Candidate selector only: all consumers must validate the complete class token.
const RF_ROOT = '.xMeOpW_body > [class*="_markdown_"], [data-reading-focus-preview]';
function rfMarkdownClassToken(token) { return /^_markdown_[A-Za-z0-9]+_\d+$/.test(token); }
function rfRootIdentity({preview, bodyParent, classTokens}) {
  return !!preview || !!bodyParent && classTokens.some(rfMarkdownClassToken);
}
function matchesRoot(node) {
  return !!node && node.nodeType===1 && rfRootIdentity({preview:node.hasAttribute('data-reading-focus-preview'),bodyParent:!!node.parentElement?.classList.contains('xMeOpW_body'),classTokens:[...node.classList]});
}
function queryRoots(node) { return [...node.querySelectorAll(RF_ROOT)].filter(matchesRoot); }
function closestRoot(node) {
  for(let el=node;el;el=el.parentElement)if(matchesRoot(el))return el;
  return null;
}
const RF_BLOCK = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,table';
const RF_OCCLUDERS = '[data-composer-seat], [data-composer-card], [data-composer-overlay], [data-composer-dock], [data-composer-input], [data-code-block-banner], [data-conversation-region="composer"], [data-slot="conversation.input.dock"], [role="toolbar"], [role="menu"], [role="dialog"], dialog[open], [aria-modal="true"], footer';

function rfIntersect(a, b) {
  const r = {left:Math.max(a.left,b.left), top:Math.max(a.top,b.top), right:Math.min(a.right,b.right), bottom:Math.min(a.bottom,b.bottom)};
  return r.right > r.left && r.bottom > r.top ? r : null;
}
function rfSubtract(rect, cut) {
  const i = rfIntersect(rect, cut);
  if (!i) return [rect];
  return [
    {left:rect.left, top:rect.top, right:rect.right, bottom:i.top},
    {left:rect.left, top:i.bottom, right:rect.right, bottom:rect.bottom},
    {left:rect.left, top:i.top, right:i.left, bottom:i.bottom},
    {left:i.right, top:i.top, right:rect.right, bottom:i.bottom}
  ].filter(r => r.right-r.left > .1 && r.bottom-r.top > .1);
}
// Each mode is a different visual device, so each exposes its own set of controls rather than
// sharing one generic "colour + opacity" pair:
//   ruler      - tinted band with two solid edge lines; controls: line colour
//   lines      - clear window over dimmed surroundings; controls: veil colour, veil opacity
//   blocks     - the current block stays at full contrast, everything else recedes. Two ways to
//                make it recede: fade the other text, or dim the page behind a veil.
//   bands      - cycling colour blocks; controls: three colours, block opacity
const RF_DEFAULT_COLORS={
  ruler:{lineColor:'#f0b633',lineOpacity:.9},
  lines:{veilColor:'#000000',veilOpacity:.45},
  blocks:{dimOpacity:.48,veilColor:'#000000',veilOpacity:.30,tintColor:'#4e9ee0',tintOpacity:.08},
  bands:{color:'#f0b633',color2:'#4e9ee0',color3:'#9e70da',opacity:.45}
};
// Suggested colours differ per slot, because the slots do different jobs: a marker line wants
// attention, a dimming veil wants dark neutrals, a band fill wants muted backgrounds. The lists are
// deliberately short - six near-identical dark circles is a decision the user cannot make.
const RF_PRESETS={
  marker:['#f0b633','#e0703f','#e05c6e','#4e9ee0','#39b98a','#9e70da'],
  veil:['#000000','#141a24','#3d4657','#697585'],
  tint:['#4e9ee0','#39b98a','#f0b633','#9e70da'],
  band:['#f0b633','#4e9ee0','#9e70da','#8a94a6']
};
// Band colours come in ready-made sets. Picking three colours by hand was the most confusing part
// of the panel, so the common case is a scheme plus one density slider; hand-picked colours stay
// available behind the "自定义" scheme.
const RF_BAND_SCHEMES=[
  ['vivid','缤纷',['#f0b633','#4e9ee0','#9e70da']],
  ['warm','暖色',['#f0b633','#e0703f','#e05c6e']],
  ['cool','冷色',['#4e9ee0','#39b98a','#7a6de8']],
  ['soft','柔和',['#e7d7a6','#b9d4ec','#d9c8ee']],
  ['custom','自定义',null]
];
const rfBandSchemeColors=name=>{const found=RF_BAND_SCHEMES.find(s=>s[0]===name);return found&&found[2]?(found[2]):null;};
// Per-mode descriptor: which controls to render and what they mean.
const RF_COLOR_SPECS={
  ruler:[
    {key:'lineColor',kind:'color',label:'线条颜色',alphaKey:'lineOpacity',alphaMin:30,alphaMax:100,hint:'上下两条实线和中间的淡色',palette:RF_PRESETS.marker}
  ],
  lines:[
    {key:'veilColor',kind:'color',label:'遮罩颜色',alphaKey:'veilOpacity',alphaMin:15,alphaMax:85,hint:'颜色越深、越不透明，周围压得越暗',palette:RF_PRESETS.veil}
  ],
  // Block focus offers two presentations, each with its own controls.
  blocksFade:[
    {key:'dimOpacity',kind:'opacity',label:'其余文字透明度',hint:'越高，其余文字越淡；当前段落的文字不受影响',min:25,max:85}
  ],
  blocksVeil:[
    {key:'veilColor',kind:'color',label:'遮罩颜色',alphaKey:'veilOpacity',alphaMin:15,alphaMax:70,hint:'颜色越深、越不透明，周围压得越暗',palette:RF_PRESETS.veil},
    {key:'tintColor',kind:'color',label:'当前段落底色',alphaKey:'tintOpacity',alphaMin:5,alphaMax:40,hint:'给正在读的段落加一层淡色',palette:RF_PRESETS.tint}
  ],
  bands:[
    {key:'scheme',kind:'scheme',label:'配色',hint:'三个颜色依次轮换'},
    {key:'opacity',kind:'opacity',label:'色块浓度',hint:'越高，色块越明显；上限保证文字仍然清楚',min:10,max:45},
    {key:'color',kind:'color',label:'色块一',onlyCustom:true,palette:RF_PRESETS.band},
    {key:'color2',kind:'color',label:'色块二',onlyCustom:true,palette:RF_PRESETS.band},
    {key:'color3',kind:'color',label:'色块三',onlyCustom:true,palette:RF_PRESETS.band}
  ]
};
const rfColorSpecs = (mode,blockStyle) => mode==='blocks' ? RF_COLOR_SPECS[blockStyle==='veil'?'blocksVeil':'blocksFade'] : (RF_COLOR_SPECS[mode]||[]);
const rfHasColor = mode => mode==='blocks'||mode==='ruler'||mode==='lines'||mode==='bands';
function rfRgba(hex,opacity){const rgb=typeof hex==='string'?rfParseColor(hex):null;if(!rgb)return null;return `rgba(${rgb.slice(0,3).join(',')},${Number.isFinite(opacity)?opacity:1})`;}
// HSL round-trip so the in-panel picker can offer hue / saturation / lightness sliders instead of
// opening the browser's own colour dialog, which looks nothing like the rest of the panel.
function rfHexToHsl(hex){
  const rgb=rfParseColor(hex);if(!rgb)return {h:40,s:70,l:57};
  const r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}
  const l=(max+min)/2;
  const s=d?d/(1-Math.abs(2*l-1)):0;
  return {h:Math.round(h),s:Math.round(s*100),l:Math.round(l*100)};
}
function rfHslToHex(h,s,l){
  const S=s/100,L=l/100, C=(1-Math.abs(2*L-1))*S, X=C*(1-Math.abs(((h/60)%2)-1)), m=L-C/2;
  let r=0,g=0,b=0;
  if(h<60)[r,g,b]=[C,X,0];else if(h<120)[r,g,b]=[X,C,0];else if(h<180)[r,g,b]=[0,C,X];
  else if(h<240)[r,g,b]=[0,X,C];else if(h<300)[r,g,b]=[X,0,C];else [r,g,b]=[C,0,X];
  const to=v=>Math.max(0,Math.min(255,Math.round((v+m)*255))).toString(16).padStart(2,'0');
  return '#'+to(r)+to(g)+to(b);
}
// Resolve one slot's value, falling back to the mode defaults.
function rfColorValue(state,key,field,fallback){const entry=state.colors?.[key]||{};return entry[field]??RF_DEFAULT_COLORS[key]?.[field]??fallback;}
// Ruler colour at two strengths: a faint fill for the band, a solid line for its two edges.
function rfRulerColor(state,alpha){
  const hex=rfColorValue(state,'ruler','lineColor','#f0b633');
  const base=Number.isFinite(alpha)?alpha:rfColorValue(state,'ruler','lineOpacity',.9);
  const rgb=rfParseColor(hex);if(!rgb)return null;
  return `rgba(${rgb.slice(0,3).join(',')},${base})`;
}
function rfVeilColor(state){const key=state.mode==='blocks'?'blocks':'lines';return rfRgba(rfColorValue(state,key,'veilColor','#000000'),rfColorValue(state,key,'veilOpacity',.4));}
function rfTintColor(state){return rfRgba(rfColorValue(state,'blocks','tintColor','#4e9ee0'),rfColorValue(state,'blocks','tintOpacity',.1));}
// Block focus fades the text itself: the live text colour at reduced alpha blends with whatever
// background the theme uses, so no overlay is needed and the result inherits the real colours.
function rfDimColor(state){
  const sample=document.querySelector('.xMeOpW_body p, .xMeOpW_body li, .xMeOpW_body');
  const rgb=sample?rfParseColor(getComputedStyle(sample).color):null;
  const base=rgb?rgb.slice(0,3):[230,232,238];
  const alpha=rfColorValue(state,'blocks','dimOpacity',.45);
  return `rgba(${base.join(',')},${alpha})`;
}
// Band hues. A named scheme supplies all three; only the custom scheme reads the saved colours.
function rfBandColors(state,dark){
  const scheme=state.bandScheme||'vivid',preset=rfBandSchemeColors(scheme);
  // The dark theme uses the same hues; the default alpha already suits both backgrounds.
  if(preset)return preset.map(hex=>{const rgb=rfParseColor(hex)||[240,182,51];return rgb.slice(0,3).join(',');});
  const fallback=['#f0b633','#4e9ee0','#9e70da'];
  return ['color','color2','color3'].map((field,i)=>{
    const rgb=rfParseColor(rfColorValue(state,'bands',field,fallback[i]))||rfParseColor(fallback[i]);
    return rgb.slice(0,3).join(',');
  });
}
// Gradient palette chips: a pill showing the actual ramp says more than a list of colour names.
const RF_GRADIENT_LABELS={Bright:'红蓝',Blues:'蓝紫',Night:'夜间'};
function rfGradientPill(name){
  const p=RF_GRADIENT_PALETTES[name];if(!p)return 'transparent';
  const rgb=c=>`rgb(${c.slice(0,3).join(',')})`;
  // Only the two accent hues: including the base tone made the chip read as a black bar.
  return `linear-gradient(90deg, ${rgb(p.a)} 0%, ${rgb(p.b)} 100%)`;
}
// Read back the size the reading body actually renders, in the same px units the host's own
// stepper uses, so the panel opens on the host's real value instead of assuming 14px.
function rfHostFontSize(){
  const body=document.querySelector('.xMeOpW_body p, .xMeOpW_body li, .xMeOpW_body');
  if(!body)return RF_FONT.sizeDefault;
  const size=Number.parseFloat(getComputedStyle(body).fontSize);
  return Number.isFinite(size)&&size>0?size:RF_FONT.sizeDefault;
}
// The host owns the line height: 24px plus the `--dsh-content-font-delta` ladder, i.e.
// `size + 10` px. The plugin never restates that number in CSS; it only adds `extra` on top.
function rfHostLineHeight(size){return RF_FONT.lineBase + (size - RF_FONT.baseSize);}
// The host publishes font size on <body>'s inline style, so writing documentElement would lose.
// rfTypographyWritten remembers what this plugin last wrote, so a host-side change can be told
// apart from our own write when the observer fires.
let rfTypographyWritten='';
function rfApplyTypography(font,{writeVar=true}={}){
  const target=document.body;
  const px=Number.isFinite(font?.size)?font.size:null;
  const extra=Number.isFinite(font?.extra)?Math.max(0,font.extra):0;
  let probe=document.getElementById('rf-typography');
  if(!probe){probe=document.createElement('style');probe.id='rf-typography';document.head.append(probe);}
  const rules=[];
  if(px!==null&&writeVar){target.style.setProperty('--dsh-content-font-size',px.toFixed(2)+'px');rfTypographyWritten=px.toFixed(2)+'px';}
  // Only an explicit extra spacing overrides the host ladder, and even then it rides the host's own
  // variable: the size delta still applies, so a later font-size change keeps the added room.
  if(px!==null&&extra>0)rules.push(`.xMeOpW_root .xMeOpW_body,.xMeOpW_root .xMeOpW_body p,.xMeOpW_root .xMeOpW_body li,:is(.xMeOpW_body>*){line-height:calc(${RF_FONT.lineBase}px + var(--dsh-content-font-delta, 0px) + ${extra}px)}`);
  probe.textContent=rules.join('\n');
}
// The plugin owns that style element and any value it wrote itself: unloading it must not leave
// the host document permanently re-typeset, and it must not remove a size the host set later.
function rfClearTypography(){
  document.getElementById('rf-typography')?.remove();
  if(rfTypographyWritten&&document.body.style.getPropertyValue('--dsh-content-font-size')===rfTypographyWritten)document.body.style.removeProperty('--dsh-content-font-size');
  rfTypographyWritten='';
}
// Only adjacent reconciled bands in the same visual lane may be joined.
function rfBandGroups(bands) {
  const groups=[], last=new Map();
  for(const band of bands){
    const g=last.get(band.key),r=g?.rects.at(-1),b=band.rect;
    if(g&&g.hue===band.hue&&g.clipKey===band.clipKey&&Math.min(r.right,b.right)>Math.max(r.left,b.left)&&Math.min(r.bottom,b.bottom)>=Math.max(r.top,b.top))g.rects.push(b);
    else {const next={...band,rects:[b]};groups.push(next);last.set(band.key,next);}
  }
  return groups;
}
function rfBandMask(rects) {
  const box={left:Math.min(...rects.map(r=>r.left)),top:Math.min(...rects.map(r=>r.top)),right:Math.max(...rects.map(r=>r.right)),bottom:Math.max(...rects.map(r=>r.bottom))};
  const width=box.right-box.left,height=box.bottom-box.top;
  // A continuous equal-width stack is one true rounded region, not rounded slices.
  if(rects.every(r=>Math.abs(r.left-box.left)<.01&&Math.abs(r.right-box.right)<.01)){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="4" fill="white"/></svg>`;
    return {box,width,height,url:'data:image/svg+xml,'+encodeURIComponent(svg)};
  }
  const svgRect=(r,round='')=>`<rect x="${r.left-box.left}" y="${r.top-box.top}" width="${r.right-r.left}" height="${r.bottom-r.top}" ${round}/>`;
  let content=rects.map(r=>svgRect(r,'rx="4"')).join('');
  for(let i=0;i<rects.length;i++)for(let j=0;j<i;j++){
    const a=rects[i],b=rects[j],left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),top=Math.max(a.top,b.top),bottom=Math.min(a.bottom,b.bottom);
    if(right>left&&bottom>=top)content+=svgRect({left,right,top:Math.max(Math.min(a.top,b.top),top-4),bottom:Math.min(Math.max(a.bottom,b.bottom),bottom+4)});
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="white">${content}</g></svg>`;
  return {box,width,height,url:'data:image/svg+xml,'+encodeURIComponent(svg)};
}
// Radius values preserve the original box; clipping happens after rounding.
function rfCornerRadii(values,w,h) {
  const parse=(value)=>{const parts=value.trim().split(/\s+/);const n=(v,size)=>Math.max(0,parseFloat(v)||0)*(v?.endsWith('%')?size/100:1);return [n(parts[0],w),n(parts[1]||parts[0],h)];};
  const r=values.map(parse), scale=Math.min(1,w/Math.max(1,r[0][0]+r[1][0]),w/Math.max(1,r[3][0]+r[2][0]),h/Math.max(1,r[0][1]+r[3][1]),h/Math.max(1,r[1][1]+r[2][1]));
  return r.map(([x,y])=>[x*scale,y*scale]);
}
function rfRoundedPath(box,r) {
  const {left:l,top:t,right:x,bottom:y}=box, [a,b,c,d]=r;
  return `M ${l+a[0]} ${t} H ${x-b[0]} A ${b[0]} ${b[1]} 0 0 1 ${x} ${t+b[1]} V ${y-c[1]} A ${c[0]} ${c[1]} 0 0 1 ${x-c[0]} ${y} H ${l+d[0]} A ${d[0]} ${d[1]} 0 0 1 ${l} ${y-d[1]} V ${t+a[1]} A ${a[0]} ${a[1]} 0 0 1 ${l+a[0]} ${t} Z`;
}
function rfPaneMask(region,holes) {
  const w=region.right-region.left,h=region.bottom-region.top,local=r=>({left:r.left-region.left,top:r.top-region.top,right:r.right-region.left,bottom:r.bottom-region.top});
  const clips=[],paths=[];holes.forEach((hole,i)=>{const r=local(hole.rect),clip=local(hole.clip);clips.push(`<clipPath id="c${i}"><rect x="${clip.left}" y="${clip.top}" width="${clip.right-clip.left}" height="${clip.bottom-clip.top}"/></clipPath>`);paths.push(`<path d="${rfRoundedPath(r,hole.radii)}" clip-path="url(#c${i})"/>`);});
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${clips.join('')}<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" style="mask-type:luminance"><rect width="${w}" height="${h}" fill="white"/><g fill="black">${paths.join('')}</g></mask></defs><rect width="${w}" height="${h}" fill="white" mask="url(#m)"/></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
// Pure geometry/policy helpers are shared by the runtime and node unit tests.
function rfLineHeight(fontSize, lineHeight, measured) {
  const font=Number.parseFloat(fontSize), size=Number.isFinite(font)&&font>0?font:16;
  const css=Number.parseFloat(lineHeight), fallback=Number.isFinite(css)&&css>0?css:size*1.5;
  return Number.isFinite(measured)&&measured>=size*.8&&measured<=fallback*2?measured:fallback;
}
function rfLineHole(y,count,lineHeight,box) {
  const pad=Math.max(2,Math.min(5,lineHeight*.12)), half=(count*lineHeight)/2+pad;
  return {left:box.left,right:box.right,top:y-half,bottom:y+half};
}
function rfLineCandidate(visible,view,x,y) {
  return !!(visible&&view&&x>=view.left&&x<=view.right&&y>=view.top&&y<=view.bottom);
}
// Handle focus is frozen at the last reading Y; native capture owns the drag.
function rfHandlePolicy(state,event) {
  if(event.type==='clear')return null;
  if(event.type==='start')return event.scope&&event.scroll?{scope:event.scope,scroll:event.scroll,id:event.id}:null;
  if(!state||event.id!==state.id)return state;
  if(event.type==='end')return null;
  return state;
}
function rfPanePolicy({sameScope, inScroll, structural, protectedControl, excluded}) {
  if(!sameScope||excluded)return 'clear';
  return !inScroll||structural||protectedControl?'freeze':'follow';
}
// The active host composer is rank 9; our own floating panel is rank 1000.
function rfPointerMode(mode) { return mode==='lines'||mode==='ruler'; }
function rfPointerLayer(enabled,mode) { return !!enabled&&rfPointerMode(mode); }
function rfLineRegion(content,outer) { return content&&outer?rfIntersect(content,outer):null; }
function rfRulerEdges(box) {
  const thickness=Math.min(1,(box.bottom-box.top)/2);
  return [{...box,bottom:box.top+thickness},{...box,top:box.bottom-thickness}];
}
function rfBarrierPolicy({known, image, visible, contents, overlay, overlapsText}) {
  return !!(visible&&!contents&&!overlay&&(image||(known&&!overlapsText)));
}
// Five modes, each a distinct visual device. Block focus used to exist twice (paragraph and block
// modes drew the same rectangle with different strengths); it is now one mode with a presentation
// switch, so nothing is offered twice under two names.
const RF_MODES = [['ruler','阅读尺','定位当前行'],['lines','多行聚焦','聚焦附近几行'],['blocks','段落聚焦','当前段落突出'],['bands','色块分段','区分相邻内容'],['gradient','渐变阅读','为正文文字着色']];
// Earlier releases stored the removed `paragraph` mode; it maps onto the merged block mode.
function rfValidMode(mode) { if(mode==='paragraph')return 'blocks'; return RF_MODES.some(m=>m[0]===mode)?mode:'ruler'; }
// Every preference that survives a restart. Loading reads these fields and save() writes exactly
// this list, so a new preference is registered once and cannot be restored on load while never
// being saved - which is how the on/off switch used to lose its state.
const RF_PERSISTED=['enabled','mode','blockStyle','bandScheme','gutterHide','rulerLines','lineCount','segmentStyle','gradientPalette','gradientStrength','colors','font','position'];
function startReadingFocus() {
  const KEY = 'dsh-reading-focus.v1';
  const modes = RF_MODES;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const validNumber = (v,d,a,b) => Number.isFinite(v) ? clamp(v,a,b) : d;
  // Per-mode colours and typography stay optional: an absent entry means "use the built-in
  // default", so upgrading from an older profile keeps working without migration.
  // Every colour slot is a hex value or a 0..1 opacity. Unknown keys are ignored, so a saved
  // profile from any earlier version keeps loading.
  const RF_COLOR_KEYS=['ruler','lines','blocks','bands'];
  const COLOR_FIELDS=/^[a-z]+Color\d?$/i;
  const OPACITY_FIELDS=/^(opacity|[a-z]+Opacity)$/i;
  const hex = v => typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v) ? v : null;
  const readColorFields = entry => { const next={};
    if(!entry||typeof entry!=='object')return next;
    for(const [field,value] of Object.entries(entry)){
      if(COLOR_FIELDS.test(field)){const c=hex(value);if(c)next[field]=c;}
      else if(OPACITY_FIELDS.test(field)&&Number.isFinite(value))next[field]=clamp(value,0,1);
    }
    return next; };
  const savedColors = stored => { const out={}; if(!stored||typeof stored!=='object')return out;
    for(const key of RF_COLOR_KEYS){const next=readColorFields(stored[key]);if(Object.keys(next).length)out[key]=next;}
    // Profiles written before the merge stored block-focus veil colours under `paragraph`.
    const legacy=readColorFields(stored.paragraph);
    if(Object.keys(legacy).length)out.blocks={...legacy,...(out.blocks||{})};
    return out; };
  // Profiles up to 0.8.3 stored a line-height ratio (briefly a px value); both are converted to the
  // extra spacing above the host ladder so an upgrade cannot change the rendered line height.
  const savedFont = stored => { const out={}; if(!stored||typeof stored!=='object')return out;
    if(Number.isFinite(stored.size))out.size=clamp(stored.size,RF_FONT.sizeMin,RF_FONT.sizeMax);
    if(Number.isFinite(stored.extra))out.extra=clamp(stored.extra,RF_FONT.extraMin,RF_FONT.extraMax);
    else if(Number.isFinite(stored.lineHeight)){
      const base=Number.isFinite(out.size)?out.size:RF_FONT.sizeDefault;
      const px=stored.lineHeight<=5?stored.lineHeight*base:stored.lineHeight;
      out.extra=clamp(Math.round(px-rfHostLineHeight(base)),RF_FONT.extraMin,RF_FONT.extraMax);
    }
    if(out.extra!==undefined&&out.size===undefined)out.size=RF_FONT.sizeDefault;
    return out; };
  const oldLineCount=Number.isInteger(saved.size)&&saved.size>=1&&saved.size<=6?saved.size:3;
  const savedScheme=RF_BAND_SCHEMES.some(s=>s[0]===saved.bandScheme)?saved.bandScheme:'vivid';
  const state = {enabled:saved.enabled===true, mode:rfValidMode(saved.mode), blockStyle:['fade','veil'].includes(saved.blockStyle)?saved.blockStyle:(saved.mode==='paragraph'?'veil':'fade'), bandScheme:savedScheme, gutterHide:saved.gutterHide!==false, rulerLines:Number.isInteger(saved.rulerLines)?clamp(saved.rulerLines,1,6):validNumber(saved.size,2,1,6), lineCount:Number.isInteger(saved.lineCount)&&saved.lineCount>=1&&saved.lineCount<=8?saved.lineCount:oldLineCount, segmentStyle:['paragraph','compact'].includes(saved.segmentStyle)?saved.segmentStyle:'paragraph', gradientPalette:Object.hasOwn(RF_GRADIENT_PALETTES,saved.gradientPalette)?saved.gradientPalette:'Bright', gradientStrength:validNumber(saved.gradientStrength,1,.1,1), colors:savedColors(saved.colors), font:savedFont(saved.font), position:saved.position && Number.isFinite(saved.position.x) && Number.isFinite(saved.position.y)?saved.position:null};
  const host = document.createElement('div');
  host.dataset.readingFocusUi = '';
  document.body.append(host);
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = `<style>${RF_CSS}</style><div class="layer" aria-hidden="true"></div>`;
  const layer = shadow.querySelector('.layer');
  const subscribers = new Set(), roots = new Set(), blockCache = new WeakMap();
  let activeBody=null, activeBlock=null, hovering=false, lastX=0, lastY=0, hasPointer=false, panelHover=false, needsHit=false, frame=0, disposed=false, panel=null, panelControls=null, panelFrame=0, panelObserver=null, drag=null, returnFocus=null;
  let occluderCandidates=null, widthDrag=null, pointerX=0, pointerY=0, pointerScope=null, pointerScroll=null, pointerSession=null;
  // Reading ruler and line focus follow the pointer over the text column. The blank gutters on both
  // sides are not reading space, so the effect steps aside there and the whole page becomes visible.
  // A short delay plus a few pixels of slack keeps moving across the edge from flickering.
  let gutterSince=0, gutterHidden=false, gutterTimer=0;
  const RF_GUTTER_SLACK=10, RF_GUTTER_DELAY=110;
  // Horizontal extent of the actual text column, which is narrower than the pane: the space between
  // the column and the width handles is blank margin, not reading space.
  // A brand-new session has a composer but no message body; the effects have nothing to focus on
  // and must stay off until the first answer exists.
  function hasConversation(scope){return !!scope?.querySelector?.(RF_ROOT);}
  function textColumn(scope){
    const body=scope?.querySelector?.('.xMeOpW_body');
    if(body){const r=rect(body);if(r.right-r.left>8)return r;}
    const root=scope?.querySelector?.(RF_ROOT);
    if(root){const r=rect(root);if(r.right-r.left>8)return r;}
    return bandsWidth(scope);
  }
  function gutterState(){
    if(!pointerScope?.isConnected)return false;
    const col=textColumn(pointerScope);
    if(!(col.right>col.left))return false;
    const inGutter=pointerX<col.left-RF_GUTTER_SLACK||pointerX>col.right+RF_GUTTER_SLACK;
    if(!inGutter){
      if(gutterTimer){clearTimeout(gutterTimer);gutterTimer=0;}
      gutterSince=0;gutterHidden=false;return false;
    }
    if(!gutterSince)gutterSince=performance.now();
    if(!gutterHidden&&performance.now()-gutterSince>=RF_GUTTER_DELAY)gutterHidden=true;
    // The pointer may come to rest in the gutter with no further events: schedule one redraw.
    else if(!gutterHidden&&!gutterTimer)gutterTimer=setTimeout(()=>{gutterTimer=0;queue();},RF_GUTTER_DELAY+20);
    return gutterHidden;
  }
  function resetGutter(){if(gutterTimer){clearTimeout(gutterTimer);gutterTimer=0;}gutterSince=0;gutterHidden=false;}
  function clearPointer(){pointerScope=null;pointerScroll=null;pointerSession=null;widthDrag=null;hovering=false;resetGutter();}
  function pointerValid(){return !!(pointerScope?.isConnected&&pointerScroll?.isConnected&&pointerScope.getAttribute('data-conversation-session')===pointerSession&&pointerScroll.closest('[data-conversation-content][data-conversation-session]')===pointerScope);}
  function anchorPointer(scope,scroll){pointerScope=scope;pointerScroll=scroll;pointerSession=scope.getAttribute('data-conversation-session');hovering=true;}
  function save() { const out={}; for(const key of RF_PERSISTED)out[key]=state[key]; try { localStorage.setItem(KEY,JSON.stringify(out)); } catch {} }
  // The host may change the same variable from its own settings; adopting it keeps the panel -
  // and the next nudge - from re-applying a size the user has already replaced. Line height needs
  // no adoption: the extra-spacing rule is written against the host's own delta variable.
  function adoptHostTypography(){
    if(!Number.isFinite(state.font?.size))return;
    const raw=document.body.style.getPropertyValue('--dsh-content-font-size');
    if(!raw||raw===rfTypographyWritten)return;
    const px=Number.parseFloat(raw);
    if(!Number.isFinite(px)||Math.abs(px-state.font.size)<.05)return;
    state.font={size:clamp(px,RF_FONT.sizeMin,RF_FONT.sizeMax),extra:state.font.extra};
    save();sync();
  }
  function sync() { for (const fn of [...subscribers]) fn(); }
  function modalOpen() { return !!document.querySelector('dialog[open], [aria-modal="true"]'); }
  function mountControls(container, floating=false, onOpenWindow=openWindow) {
    container.innerHTML = `<style>${RF_CSS}</style><div class="rf-control-root ${floating?'floating':''}">
      <div class="heading"><div><h2>阅读辅助</h2><p>选择适合自己的阅读方式，不改变正文。<small class="rf-version">v${RF_VERSION}</small></p></div><label class="switch"><input type="checkbox" aria-label="开启阅读辅助"><span></span></label></div>
      <div class="section-label">选择效果</div>
      <div class="mode-grid">${modes.map(([id,label,desc])=>`<button type="button" class="mode-card" data-mode="${id}" aria-pressed="false"><span class="mode-icon icon-${id}" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}</div>
      <div class="mode-options">
        <div class="parameter gradient-palette"><span><strong>配色</strong><small>文字渐变使用哪一组颜色</small></span><div class="palette-row" role="group" aria-label="配色">${Object.keys(RF_GRADIENT_PALETTES).map(name=>`<button type="button" class="palette-pill" data-palette="${name}" aria-pressed="false" aria-label="${RF_GRADIENT_LABELS[name]||name}" title="${RF_GRADIENT_LABELS[name]||name}" style="background:${rfGradientPill(name)}"></button>`).join('')}</div></div>
        <label class="parameter strength-parameter"><span><strong>颜色强度</strong><small>渐变颜色的明显程度</small></span><output class="strength-value"></output><input type="range" min="10" max="100" step="5" aria-label="效果强度"></label>
        <label class="parameter range-size"><span><strong>覆盖行数</strong><small>跟随当前行高</small></span><output class="size-value"></output><input type="range" min="1" max="6" step="1" aria-label="覆盖行数"></label>
        <div class="segment-row"><span><strong>分段样式</strong><small>整个列表合为一块，包含序号和多行内容</small></span><div class="segments" role="group" aria-label="分段样式"><button type="button" data-segment="paragraph" aria-pressed="false">整段色块</button><button type="button" data-segment="compact" aria-pressed="false">紧凑色带</button></div></div>
        <div class="block-style-row"><span><strong>其余内容</strong><small>当前段落以外怎么变弱</small></span><div class="segments" role="group" aria-label="其余内容呈现方式"><button type="button" data-block-style="fade" aria-pressed="false">文字变淡</button><button type="button" data-block-style="veil" aria-pressed="false">遮罩压暗</button></div></div>
        <div class="gutter-row"><span><strong>鼠标移到两侧空白</strong><small>左右留白不算正文，可以让效果让开</small></span><div class="segments" role="group" aria-label="两侧留白时的行为"><button type="button" data-gutter="hide" aria-pressed="false">隐藏效果</button><button type="button" data-gutter="keep" aria-pressed="false">保持显示</button></div></div>
      </div>
      <div class="color-row">
        <div class="section-head"><span class="section-label">颜色</span><button type="button" class="reset-color">恢复默认</button></div>
        <p class="color-hint"></p>
        <div class="color-fields"></div>
      </div>
      <div class="font-row">
        <div class="section-head"><span class="section-label">正文字体</span><button type="button" class="reset-font">恢复默认</button></div>
        <p class="font-hint">与 DSH 共用字号；行高 = DSH 自动值 + 额外行距。「恢复默认」清除本插件的覆盖，回到 DSH 当前设置。</p>
        <div class="font-fields"><label><span>字号</span><span class="stepper"><input type="number" min="${RF_FONT.sizeMin}" max="${RF_FONT.sizeMax}" step="1" inputmode="numeric" aria-label="正文字号"><span class="stepper-btns"><button type="button" data-nudge="1" aria-label="增加">&#9650;</button><button type="button" data-nudge="-1" aria-label="减少">&#9660;</button></span><em>px</em></span></label><label><span>额外行距</span><span class="stepper"><input type="number" min="${RF_FONT.extraMin}" max="${RF_FONT.extraMax}" step="1" inputmode="numeric" aria-label="额外行距"><span class="stepper-btns"><button type="button" data-nudge="1" aria-label="增加">&#9650;</button><button type="button" data-nudge="-1" aria-label="减少">&#9660;</button></span><em>px</em></span></label></div>
      </div>
      ${floating?'':'<button type="button" class="open-window">在正文中实时调节</button><p class="footnote">关闭调节窗不会关闭阅读效果。</p>'}</div>`;
    const check=container.querySelector('input[type=checkbox]'), strength=container.querySelector('[aria-label="效果强度"]'), size=container.querySelector('[aria-label="覆盖行数"]');
    const palettePills=[...container.querySelectorAll('[data-palette]')];
    const fontSize=container.querySelector('[aria-label="正文字号"]'),fontExtra=container.querySelector('[aria-label="额外行距"]');
    // Which colour field currently has its inline picker expanded.
    let openField=null;
    const specFor=mode=>rfColorSpecs(mode,state.blockStyle);
    const modeColor=()=>{const key=state.mode;if(!rfHasColor(key))return null;if(!state.colors[key])state.colors[key]={};return state.colors[key];};
    const entryFor=key=>state.colors?.[key]||{};
    // Build the controls for the current mode from its descriptor, so every mode gets exactly the
    // knobs that make sense for it and nothing generic is shared across different visual devices.
    const renderColorFields=()=>{
      const host=container.querySelector('.color-fields'),specs=specFor(state.mode);
      host.replaceChildren();
      if(!specs.length)return;
      const key=state.mode,entry=entryFor(key);
      const shown=specs.filter(field=>!field.onlyCustom||state.bandScheme==='custom');
      for(const field of shown){
        const row=document.createElement('div');row.className='color-field';
        const head=document.createElement('div');head.className='color-field-head';
        const title=document.createElement('strong');title.textContent=field.label;head.append(title);
        if(field.hint){const hint=document.createElement('small');hint.textContent=field.hint;head.append(hint);}
        if(field.kind==='scheme'){
          row.append(head);
          const line=document.createElement('div');line.className='scheme-row';line.setAttribute('role','group');line.setAttribute('aria-label',field.label);
          for(const [id,label,colors] of RF_BAND_SCHEMES){
            const b=document.createElement('button');b.type='button';b.dataset.scheme=id;
            b.setAttribute('aria-pressed',String(state.bandScheme===id));
            if(colors){
              const dots=document.createElement('span');dots.className='scheme-dots';
              for(const hexColor of colors){const dot=document.createElement('i');dot.style.background=hexColor;dots.append(dot);}
              b.append(dots);b.title=label;b.setAttribute('aria-label',label);
            }else b.textContent='自定义';
            b.addEventListener('click',()=>{state.bandScheme=id;save();sync();queue();});
            line.append(b);
          }
          row.append(line);
        }else if(field.kind==='color'){
          const value=String(entry[field.key]??RF_DEFAULT_COLORS[key]?.[field.key]??'#f0b633');
          row.append(head);
          const sw=document.createElement('div');sw.className='color-swatches';
          const presets=field.palette||RF_PRESETS.band;
          const commit=hexColor=>{const e=modeColor();if(!e)return;e[field.key]=hexColor;save();queue();};
          const custom=document.createElement('button');custom.type='button';custom.className='swatch custom';
          custom.append(document.createElement('i'));
          custom.title='自定义颜色';custom.setAttribute('aria-label',field.label+' 自定义');
          const out=document.createElement('output');out.className='color-value';out.textContent=value.toUpperCase();
          custom.setAttribute('aria-pressed',String(openField===field.key));
          custom.addEventListener('click',event=>{
            event.stopPropagation();
            // Expand the picker in place. A floating popover kept closing itself whenever the host
            // re-rendered the settings page, and an inline one cannot be dismissed by accident.
            openField=openField===field.key?null:field.key;
            renderColorFields();
          });
          for(const hexColor of presets){
            const b=document.createElement('button');b.type='button';b.className='swatch';
            const fill=document.createElement('i');fill.style.background=hexColor;b.append(fill);
            b.dataset.color=hexColor;b.setAttribute('aria-label','使用 '+hexColor.toUpperCase());
            b.setAttribute('aria-pressed',String(value.toLowerCase()===hexColor.toLowerCase()));
            b.addEventListener('click',()=>{commit(hexColor);openField=null;renderColorFields();});
            sw.append(b);
          }
          sw.append(custom,out);
          row.append(sw);
          // Strength is its own row, always visible: picking one of the preset dots must not hide
          // the only way to make the layer stronger or lighter.
          if(field.alphaKey){
            const alphaMin=field.alphaMin??15,alphaMax=field.alphaMax??85;
            const alphaValue=Math.round((entry[field.alphaKey]??RF_DEFAULT_COLORS[key]?.[field.alphaKey]??.45)*100);
            const alphaRow=document.createElement('div');alphaRow.className='alpha-row';
            const alphaLabel=document.createElement('span');alphaLabel.textContent='透明度';
            const alphaInput=document.createElement('input');
            alphaInput.type='range';alphaInput.min=String(alphaMin);alphaInput.max=String(alphaMax);alphaInput.step='5';
            alphaInput.value=String(alphaValue);alphaInput.dataset.field=field.alphaKey;
            alphaInput.setAttribute('aria-label',field.label+' 透明度');
            const alphaOut=document.createElement('output');alphaOut.textContent=alphaValue+'%';
            alphaInput.addEventListener('input',()=>{const e=modeColor();if(!e)return;e[field.alphaKey]=Number(alphaInput.value)/100;alphaOut.textContent=alphaInput.value+'%';save();queue();});
            alphaRow.append(alphaLabel,alphaInput,alphaOut);
            row.append(alphaRow);
          }
          if(openField===field.key)row.append(buildPicker(field,value,out,sw));
        }else{
          const value=Math.round((entry[field.key]??RF_DEFAULT_COLORS[key]?.[field.key]??field.max/100)*100);
          row.append(head);
          const line=document.createElement('div');line.className='color-field-input';
          const input=document.createElement('input');input.type='range';input.min=String(field.min??0);input.max=String(field.max??100);input.step='5';input.value=String(value);input.dataset.field=field.key;input.setAttribute('aria-label',field.label);
          const out=document.createElement('output');out.textContent=value+'%';
          input.addEventListener('input',()=>{const e=modeColor();if(!e)return;e[field.key]=Number(input.value)/100;out.textContent=input.value+'%';save();queue();});
          line.append(input,out);row.append(line);
        }
        host.append(row);
      }
    };
    // Inline colour picker: a disc (angle = hue, distance = saturation), a lightness slider and a
    // hex field. Transparency lives on its own row outside, so it is also adjustable when the
    // colour comes from one of the preset dots.
    function buildPicker(field,initial,out,swatchRow){
      const start=rfHexToHsl(initial);
      let h=start.h,s=start.s,l=start.l;
      const box=document.createElement("div");box.className="rf-picker inline";
      box.innerHTML="<div class=\"rf-picker-head\"><span class=\"rf-picker-chip\"></span><input class=\"rf-picker-hex\" maxlength=\"7\" spellcheck=\"false\" aria-label=\"十六进制颜色值\"></div>"
        +"<div class=\"rf-disc\" role=\"slider\" tabindex=\"0\" aria-label=\"色盘\"><span class=\"rf-disc-dot\"></span></div>"
        +"<label class=\"rf-picker-field\"><span>明度</span><input class=\"rf-light\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" aria-label=\"明度\"><output></output></label>";
      const chip=box.querySelector(".rf-picker-chip"),hexField=box.querySelector(".rf-picker-hex");
      const disc=box.querySelector(".rf-disc"),dot=box.querySelector(".rf-disc-dot");
      const light=box.querySelector(".rf-light"),lightOut=light.nextElementSibling;
      const commit=hexColor=>{const e=modeColor();if(!e)return;e[field.key]=hexColor;out.textContent=hexColor.toUpperCase();
        for(const b of swatchRow.querySelectorAll(".swatch[data-color]"))b.setAttribute("aria-pressed",String(b.dataset.color.toLowerCase()===hexColor.toLowerCase()));
        save();queue();};
      const render=(notify=true)=>{
        const hex=rfHslToHex(h,s,l);
        chip.style.background=`hsl(${h} ${s}% ${l}%)`;
        if(document.activeElement!==hexField)hexField.value=hex.toUpperCase();
        const rad=(h-90)*Math.PI/180,rr=(s/100)*42;
        dot.style.left=(50+Math.cos(rad)*rr)+"%";
        dot.style.top=(50+Math.sin(rad)*rr)+"%";
        light.value=String(l);lightOut.textContent=l+"%";
        if(notify)commit(hex);
      };
      const setFromPointer=event=>{
        const r=disc.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
        const dx=event.clientX-cx,dy=event.clientY-cy;
        h=(Math.atan2(dy,dx)*180/Math.PI+90+360)%360;
        s=Math.max(0,Math.min(1,Math.hypot(dx,dy)/(r.width/2)))*100;
        render();
      };
      disc.addEventListener("pointerdown",event=>{
        event.preventDefault();
        setFromPointer(event);
        const move=ev=>setFromPointer(ev),up=()=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);};
        document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);
      });
      light.addEventListener("input",()=>{l=Number(light.value);render();});
      hexField.addEventListener("input",()=>{
        const raw=hexField.value.trim();
        if(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)){
          const norm=raw.startsWith("#")?raw:"#"+raw;
          const hsl=rfHexToHsl(norm);
          if(hsl){h=hsl.h;s=hsl.s;l=hsl.l;render();}
        }
      });
      render(false);
      return box;
    }
    const COLOR_HEADS={
      ruler:'跟随鼠标的这条线用什么颜色。',
      lines:'中间保持透明，只有周围压暗。',
      blocks:'当前段落保持原样，其余内容按上面的方式变弱。',
      bands:'三个颜色轮换，相邻色块永远不会是同一个颜色。'
    };
    const syncColorControls=()=>{
      const specs=specFor(state.mode);
      container.querySelector('.color-row').hidden=!specs.length;
      container.querySelector('.color-hint').textContent=COLOR_HEADS[state.mode]||'';
      renderColorFields();
    };
    // Font settings are typed in px with stepper arrows, the same control the DSH settings panel
    // uses, so one number means the same thing in both places. `extra` is added to the host's own
    // automatic line height, so 0 means "exactly like DSH".
    const syncFontControls=()=>{const f=state.font;
      const px=Number.isFinite(f.size)?f.size:rfHostFontSize();
      const extra=Number.isFinite(f.extra)?f.extra:0;
      fontSize.value=String(Math.round(px));fontExtra.value=String(Math.round(extra));};
    const refresh=()=>{
      const gradientMode=state.mode==='gradient',lines=state.mode==='lines';
      for(const pill of palettePills){pill.setAttribute('aria-pressed',String(pill.dataset.palette===state.gradientPalette));pill.disabled=!state.enabled;}
      container.querySelector('.gradient-palette').hidden=!gradientMode;
      // The strength slider only drives the gradient; every other mode sets its own opacity in the
      // colour section, so showing a control here that does nothing would be misleading.
      container.querySelector('.strength-parameter').hidden=!gradientMode;
      check.checked=state.enabled;
      for (const b of container.querySelectorAll('[data-mode]')) {b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));b.disabled=!state.enabled;}
      for (const b of container.querySelectorAll('[data-segment]')) {b.setAttribute('aria-pressed',String(b.dataset.segment===state.segmentStyle));b.disabled=!state.enabled;}
      for (const b of container.querySelectorAll('[data-block-style]')) {b.setAttribute('aria-pressed',String(b.dataset.blockStyle===state.blockStyle));b.disabled=!state.enabled;}
      for (const b of container.querySelectorAll('[data-gutter]')) {b.setAttribute('aria-pressed',String(b.dataset.gutter===(state.gutterHide?'hide':'keep')));b.disabled=!state.enabled;}
      strength.disabled=size.disabled=!state.enabled;
      strength.value=String(Math.round(state.gradientStrength*100));
      size.max=lines?'8':'6';size.value=String(lines?state.lineCount:state.rulerLines);
      size.setAttribute('aria-label',lines?'聚焦行数':'覆盖行数');
      container.querySelector('.range-size strong').textContent=lines?'聚焦行数':'覆盖行数';
      container.querySelector('.range-size small').textContent=lines?'按当前正文行高计算，滚动时保持整数行':'覆盖整行的高度，随当前行高自动换算';
      container.querySelector('.size-value').textContent=(lines?state.lineCount:state.rulerLines)+' 行';
      container.querySelector('.strength-value').textContent=Math.round(state.gradientStrength*100)+'%';
      container.querySelector('.range-size').hidden=!['ruler','lines'].includes(state.mode);
      container.querySelector('.segment-row').hidden=state.mode!=='bands';
      container.querySelector('.block-style-row').hidden=state.mode!=='blocks';
      container.querySelector('.gutter-row').hidden=!rfPointerMode(state.mode);
      container.querySelector('.mode-options').hidden=!container.querySelector('.mode-options').querySelector(':scope > :not([hidden])');
      // Only the last visible row keeps no separator, otherwise the group ends on a stray rule.
      const optionRows=[...container.querySelector('.mode-options').children];
      const lastVisible=optionRows.filter(row=>!row.hidden).pop();
      for(const row of optionRows)row.style.borderBottom=row===lastVisible?'0':'';
      container.querySelector('.color-row').hidden=!rfHasColor(state.mode);
      syncColorControls();syncFontControls();
    };
    check.addEventListener('change',()=>setEnabled(check.checked));
    container.addEventListener('click',e=>{
      // Stepper arrows: nudge the adjacent number field, then let its own listener apply the value.
      const nudge=e.target.closest('[data-nudge]');
      if(nudge){
        const input=nudge.closest('.stepper')?.querySelector('input[type=number]');
        if(input){
          const step=Number(input.step)||1,min=Number(input.min),max=Number(input.max);
          const next=clamp((Number(input.value)||min||0)+step*Number(nudge.dataset.nudge),min,max);
          input.value=String(next);input.dispatchEvent(new Event('change',{bubbles:true}));
        }
        return;
      }
      // Gradient palette chips are buttons of their own; handle them before the mode branches.
      const pill=e.target.closest('[data-palette]');
      if(pill){if(Object.hasOwn(RF_GRADIENT_PALETTES,pill.dataset.palette)){state.gradientPalette=pill.dataset.palette;gradient.invalidate();save();sync();}return;}
      const b=e.target.closest('button');if(!b)return;if(b.dataset.mode){clearPointer();activeBody=null;activeBlock=null;state.mode=b.dataset.mode;openField=null;gradient.clear();gradient.scan();save();sync();queue(true);}else if(b.dataset.blockStyle){state.blockStyle=b.dataset.blockStyle;save();sync();queue();}else if(b.dataset.gutter){state.gutterHide=b.dataset.gutter==='hide';resetGutter();save();sync();queue(true);}else if(b.dataset.segment){state.segmentStyle=b.dataset.segment;save();sync();queue();}else if(b.classList.contains('open-window'))onOpenWindow();});
    strength.addEventListener('input',()=>{state.gradientStrength=Number(strength.value)/100;gradient.invalidate();save();sync();queue();});
    const linesMax=()=>state.mode==='lines'?8:6;
    size.addEventListener('input',()=>{const v=clamp(Number(size.value)||1,1,linesMax());size.value=String(v);if(state.mode==='lines')state.lineCount=v;else state.rulerLines=v;save();sync();queue();});
    // Typing must stay possible: `input` only previews values that are already usable and never
    // rewrites the field, while `change` (blur or Enter) clamps and normalises what was typed.
    // Rewriting on every keystroke made "18" land as 12 -> 22.
    const applyFont=(commit)=>{
      const sizeRaw=fontSize.value.trim(),extraRaw=fontExtra.value.trim();
      const sizeNum=sizeRaw===''?NaN:Number(sizeRaw),extraNum=extraRaw===''?NaN:Number(extraRaw);
      const sizeOk=Number.isFinite(sizeNum)&&sizeNum>=RF_FONT.sizeMin&&sizeNum<=RF_FONT.sizeMax;
      const extraOk=Number.isFinite(extraNum)&&extraNum>=RF_FONT.extraMin&&extraNum<=RF_FONT.extraMax;
      if(!commit&&(!sizeOk||!extraOk))return; // a half-typed value must not move the page
      const px=clamp(Number.isFinite(sizeNum)?Math.round(sizeNum):RF_FONT.sizeDefault,RF_FONT.sizeMin,RF_FONT.sizeMax);
      const extra=clamp(Number.isFinite(extraNum)?Math.round(extraNum):RF_FONT.extraMin,RF_FONT.extraMin,RF_FONT.extraMax);
      state.font={size:px,extra};
      rfApplyTypography(state.font);save();
      if(commit)syncFontControls();
      gradient.invalidate();queue();
    };
    for(const el of [fontSize,fontExtra]){
      el.addEventListener('input',()=>applyFont(false));
      el.addEventListener('change',()=>applyFont(true));
    }
    // Clearing the override - not writing 14px - so the host's own current setting comes back.
    container.querySelector('.reset-font').addEventListener('click',()=>{state.font={};rfClearTypography();save();syncFontControls();gradient.invalidate();queue();});
    // Reset only this mode's colours; other modes keep whatever the user picked for them.
    container.querySelector('.reset-color').addEventListener('click',()=>{delete state.colors[state.mode];if(state.mode==='bands')state.bandScheme='vivid';openField=null;save();sync();queue();});
    // Re-read the host's own size before the panel first paints: the plugin may have been switched
    // off while DSH's settings changed.
    adoptHostTypography();
    subscribers.add(refresh);refresh();
    return ()=>{subscribers.delete(refresh);container.replaceChildren();};
  }
  function queuePanel() { if(panel&&!panelFrame&&!disposed) panelFrame=requestAnimationFrame(()=>{panelFrame=0;placePanel();}); }
  function placePanel() {
    if(!panel)return;
    panel.hidden=modalOpen();if(panel.hidden)return;
    const r=panel.getBoundingClientRect(), m=8;
    const pos=state.position||{x:innerWidth-r.width-24,y:Math.max(m,(innerHeight-r.height)/2)};
    let x=clamp(pos.x,m,Math.max(m,innerWidth-r.width-m));
    let y=clamp(pos.y,m,Math.max(m,innerHeight-r.height-m));
    if(!state.position){
      const card=document.querySelector('[data-composer-card]');
      if(card){
        const c=card.getBoundingClientRect();
        if(rfIntersect({left:x,top:y,right:x+r.width,bottom:y+r.height},c)){
          if(c.top-r.height-m>=m)y=c.top-r.height-m;
          else if(c.left-r.width-m>=m)x=c.left-r.width-m;
          else if(c.right+r.width+m<=innerWidth-m)x=c.right+m;
        }
      }
    }
    panel.style.left=x+'px';
    panel.style.top=y+'px';
  }
  function closeWindow() {
    if(!panel)return;
    const hadFocus=!!shadow.activeElement&&panel.contains(shadow.activeElement), title=panel.querySelector('.top');
    if(drag){const id=drag.id;drag=null;if(title.hasPointerCapture(id))title.releasePointerCapture(id);}
    panelObserver?.disconnect();panelObserver=null;if(panelFrame)cancelAnimationFrame(panelFrame);panelFrame=0;panelControls?.();panel.remove();panel=null;panelHover=false;
    if(hadFocus&&returnFocus?.isConnected&&!returnFocus.closest('dialog[open], [aria-modal="true"]'))returnFocus.focus({preventScroll:true});
    returnFocus=null;
  }
  function openWindow() {
    if(disposed)return;if(panel){queuePanel();return;}
    returnFocus=document.activeElement;panel=document.createElement('section');panel.className='panel';panel.setAttribute('aria-label','实时阅读调节窗');
    panel.innerHTML='<div class="top"><strong>实时阅读调节</strong><button type="button" class="close" aria-label="关闭悬浮窗">×</button></div><div class="panel-controls"></div>';
    shadow.append(panel);panelControls=mountControls(panel.querySelector('.panel-controls'),true);
    const title=panel.querySelector('.top');panel.querySelector('.close').addEventListener('click',closeWindow);
    title.addEventListener('pointerdown',e=>{if(drag||e.target.closest('button'))return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};title.setPointerCapture(e.pointerId);e.preventDefault();});
    title.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;state.position={x:e.clientX-drag.dx,y:e.clientY-drag.dy};placePanel();});
    const end=e=>{if(!drag||e.pointerId!==drag.id)return;const id=drag.id,r=panel.getBoundingClientRect();state.position={x:r.left,y:r.top};drag=null;save();if(title.hasPointerCapture(id))title.releasePointerCapture(id);};
    title.addEventListener('pointerup',end);title.addEventListener('pointercancel',end);title.addEventListener('lostpointercapture',end);
    panelObserver=new MutationObserver(records=>{if(records.some(r=>r.target!==host&&!host.contains(r.target)))queuePanel();});
    panelObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal','role']});queuePanel();
  }
  function addRoots(node) { if(node.nodeType!==1||node===host||host.contains(node))return;if(matchesRoot(node))roots.add(node);queryRoots(node).forEach(el=>roots.add(el)); }
  function invalidate() { for(const r of roots)blockCache.delete(r); }
  const gradientSizes=new WeakMap();
  const resizeObserver=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){if(!roots.has(entry.target))continue;const width=entry.contentRect.width;if(gradientSizes.get(entry.target)!==width){gradientSizes.set(entry.target,width);changed=true;}}if(changed)gradient.invalidate();queue(true);});
  function watchRoots(){resizeObserver.disconnect();for(const root of roots)if(root.isConnected)resizeObserver.observe(root);for(const el of document.querySelectorAll('[data-composer-seat], [data-composer-card], [data-composer-dock], [data-composer-seat] [data-testid="todo-panel"]'))resizeObserver.observe(el);}
  const observer=new MutationObserver(records=>{
    let changed=false, structure=false;
    for(const rec of records){if(rec.type==='childList'&&[...rec.addedNodes,...rec.removedNodes].length&&[...rec.addedNodes,...rec.removedNodes].every(n=>n.nodeType===1&&n.matches('[data-reading-focus-gradient]')))continue;const target=rec.target.nodeType===1?rec.target:rec.target.parentElement;if(target===host||host.contains(target)||target?.closest?.('.rf-control-root, [data-reading-focus-gradient]'))continue;
      if(state.enabled&&state.mode==='gradient'){const root=closestRoot(target);if(root){const block=blocks(root).find(b=>b===target||b.contains(target));if(block)gradient.invalidate(block);else if(rec.type!=='childList')for(const item of blocks(root))gradient.invalidate(item);}else if(rec.type==='attributes'&&['class','style','data-ds-dark-theme'].includes(rec.attributeName))gradient.invalidate();}
      if(rec.type==='childList'){for(const node of rec.addedNodes)if(node.nodeType===1)addRoots(node);structure=true;}
      if(rec.type==='attributes'&&rec.attributeName==='class'){addRoots(target);structure=true;}
      if(closestRoot(target))changed=true;
      if(rec.type==='attributes')changed=true;
    }
    // The host's own settings write the same variable; adopt it when the write was not ours.
    if(records.some(rec=>rec.type==='attributes'&&rec.target===document.body&&rec.attributeName==='style'))adoptHostTypography();
    if(structure){for(const r of roots)if(!r.isConnected||!matchesRoot(r)){blockCache.delete(r);roots.delete(r);if(activeBody===r){activeBody=null;activeBlock=null;if(!rfPointerMode(state.mode))hovering=false;}}watchRoots();}
    if(changed||structure){
      occluderCandidates=null;
      if(structure)invalidate();
      if(structure&&state.mode==='gradient')gradient.scan();queue(true);queuePanel();
    }
  });
  function startObservers(){roots.clear();occluderCandidates=null;queryRoots(document).forEach(el=>roots.add(el));watchRoots();observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','aria-modal','role','inert','data-ds-dark-theme','data-conversation-session','hidden','class','style']});}
  function stopObservers(){observer.disconnect();resizeObserver.disconnect();roots.clear();occluderCandidates=null;}
  function blocks(root){
    let cached=blockCache.get(root);
    if(!cached){
      cached=[...root.querySelectorAll(RF_BLOCK)].filter(el=>{
        if(el.closest('[data-turn-process-inline], [data-code-block-banner], [role="toolbar"], [role="button"], button'))return false;
        let p=el.parentElement;
        while(p&&p!==root){if(p.matches(RF_BLOCK))return false;p=p.parentElement;}
        return p===root;
      });
      blockCache.set(root,cached);
    }
    return cached.filter(el=>el.textContent.trim()&&el.getClientRects().length);
  }
  // Bands deliberately group a whole outer list, without changing blocks() navigation.
  // Code blocks are never banded: they keep their own surface and act as a hard barrier.
  // Headings are left plain for the same reason the gradient skips them; tables are banded like
  // any other reading block.
  const RF_CODE_BLOCK = 'pre, [data-code-block-content], .md-code-block';
  const RF_NO_BAND = 'h1,h2,h3,h4,h5,h6';
  function isCodeBlock(el){return el.matches('pre')||!!el.closest('[data-code-block-content], .md-code-block');}
  function codeBlockRects(root){
    const found=[],box=viewport(root);
    for(const el of root.querySelectorAll(RF_CODE_BLOCK)){
      if(el.matches('[data-code-block-content], .md-code-block')&&el.parentElement?.closest('[data-code-block-content], .md-code-block'))continue;
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)continue;
      const r=rfIntersect(rect(el),box);if(r)found.push(r);
    }
    return found;
  }
  function bandsBlocks(root){
    const selector=RF_BLOCK+',ul,ol';
    return [...root.querySelectorAll(selector)].filter(el=>{
      if(el.matches(RF_NO_BAND))return false;
      if(el.closest('[data-turn-process-inline], [data-code-block-banner], [role="toolbar"], [role="button"], button'))return false;
      if(isCodeBlock(el))return false;
      let p=el.parentElement;
      while(p&&p!==root){if(p.matches(selector))return false;p=p.parentElement;}
      return p===root&&el.textContent.trim()&&el.getClientRects().length;
    });
  }
  function bandsWidth(root){
    const rr=rect(root), fallback={left:rr.left-14,right:rr.right+14};
    // Handles are siblings of this root's conversation scrollport, never global.
    const scroll=root.closest('[data-conversation-scroll]');
    const body=scroll?.parentElement;
    if(!body?.matches('[data-conversation-content]'))return fallback;
    const left=body.querySelector(':scope > [data-width-handle="left"]');
    const right=body.querySelector(':scope > [data-width-handle="right"]');
    if(!left||!right||!left.getClientRects().length||!right.getClientRects().length)return fallback;
    const l=rect(left),r=rect(right);
    if(l.right<=l.left||r.right<=r.left||l.right>=r.left)return fallback;
    return {left:l.right,right:r.left};
  }
  function viewport(el){
    let box={left:0,top:0,right:innerWidth,bottom:innerHeight};
    for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p), x=/(auto|scroll|hidden|clip)/.test(s.overflowX),y=/(auto|scroll|hidden|clip)/.test(s.overflowY);if(x||y){const r=p.getBoundingClientRect(),l=r.left+p.clientLeft,t=r.top+p.clientTop;box={left:x?Math.max(box.left,l):box.left,right:x?Math.min(box.right,l+p.clientWidth):box.right,top:y?Math.max(box.top,t):box.top,bottom:y?Math.min(box.bottom,t+p.clientHeight):box.bottom};}}
    return box;
  }
  function rect(el){const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
  // Real line box of the reading pane, so "N lines" means N actual text lines even when the user
  // has changed font size or line spacing. Cached per frame: draw() calls this on every scroll
  // tick and getComputedStyle would force a style recalc each time.
  let lineHeightCache=new Map(),lineHeightFrame=0;
  function lineHeight(scope){
    const now=performance.now();
    if(now-lineHeightFrame>200)lineHeightCache=new Map(),lineHeightFrame=now;
    const key=scope||document.documentElement;
    if(lineHeightCache.has(key))return lineHeightCache.get(key);
    const probe=key.querySelector?.('.xMeOpW_body p, .xMeOpW_body li');
    let value=24;
    if(probe){const s=getComputedStyle(probe);value=rfLineHeight(s.fontSize,s.lineHeight,probe.getClientRects()[0]?.height);}
    else{const s=getComputedStyle(key);value=rfLineHeight(s.fontSize,s.lineHeight,NaN);}
    lineHeightCache.set(key,value);return value;
  }
  // The composer seat and the status dock are controls, not reading text.
  function composerRect(scope){
    const seat=scope?.querySelector('[data-composer-seat]')||document.querySelector('[data-composer-seat]');
    if(!seat||!seat.getClientRects().length)return null;
    const r=rect(seat);
    return rfIntersect(r,rect(scope||document.body));
  }
  const gradient=createGradientController({state,roots,blocks,viewport,notify:sync,flowOf:root=>rootGroup(root)[0]});
  function blockRect(el, list, i, padded){
    const r=rect(el), root=closestRoot(el), rr=rect(root);
    if(el.tagName==='LI'){
      const parent=el.parentElement;
      if(parent&&/^(OL|UL)$/.test(parent.tagName)){
        const pr=rect(parent);
        if(getComputedStyle(parent).direction==='rtl')r.right=Math.max(r.right,pr.right);
        else r.left=Math.min(r.left,pr.left);
      }
    }
    if(padded){const prev=i>0?rect(list[i-1]):null,next=i+1<list.length?rect(list[i+1]):null;r.left=Math.max(rr.left,r.left-10);r.right=Math.min(rr.right,r.right+10);r.top=Math.max(prev?(prev.bottom+r.top)/2:r.top-6,r.top-6);r.bottom=Math.min(next?(r.bottom+next.top)/2:r.bottom+6,r.bottom+6);}
    return r;
  }
  function isHostOccluder(el){
    if(el===host||host.contains(el)||el.matches('[data-text-interaction-surface]'))return false;
    for(const root of roots){
      if(el===root||el.contains(root))return false;
      if(root.contains(el))return el.matches('[data-composer-seat], [data-composer-card], [data-composer-overlay], [data-composer-dock], [data-composer-input], [data-code-block-banner], [data-conversation-region="composer"], [data-slot="conversation.input.dock"], [role="toolbar"], [role="menu"], [role="dialog"], dialog[open], [aria-modal="true"]');
    }
    return true;
  }
  function occluders(){
    const found=[];
    if(!occluderCandidates)occluderCandidates=[...document.querySelectorAll(RF_OCCLUDERS)];
    for(const el of occluderCandidates){
      if(!el.isConnected||!isHostOccluder(el))continue;
      const s=getComputedStyle(el);if(el.closest('[hidden], [aria-hidden="true"]')||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)continue;
      const candidates=[el];
      while(candidates.length){const c=candidates.pop(),cs=getComputedStyle(c),r=rect(c);if(cs.display==='none'||cs.visibility==='hidden')continue;if(cs.display==='contents'||r.right<=r.left||r.bottom<=r.top)candidates.push(...c.children);else found.push(r);}
    }
    return found;
  }
  // Only real panels and small controls are exempt in lines mode, not structural seats.
  function lineOccluders(scope){
    const found=[], selector='[data-composer-card], [data-composer-seat] section[data-testid="todo-panel"], [role="menu"], [role="listbox"], [role="dialog"], dialog[open], [aria-modal="true"], [data-composer-overlay] > *, [role="toolbar"] button, [role="toolbar"] [role="button"], [role="toolbar"] a, [role="toolbar"] input, footer button, footer [role="button"], footer a, footer span';
    for(const dock of scope.querySelectorAll('[data-composer-dock]')){
      const card=dock.parentElement?.querySelector(':scope > [data-composer-card]');if(!card)continue;
      const children=[...dock.children],boxes=[];while(children.length){const el=children.pop(),s=getComputedStyle(el),r=rect(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||el.closest('[hidden], [aria-hidden="true"]'))continue;if(s.display==='contents'||r.right<=r.left||r.bottom<=r.top)children.push(...el.children);else boxes.push(r);}
      if(boxes.length){const cardBox=rect(card),box={left:Math.max(cardBox.left,Math.min(...boxes.map(r=>r.left))-2),top:Math.min(...boxes.map(r=>r.top))-1,right:Math.min(cardBox.right,Math.max(...boxes.map(r=>r.right))+2),bottom:Math.max(...boxes.map(r=>r.bottom))+1},clip=viewport(dock);if(rfIntersect(box,clip))found.push({rect:box,clip,radii:rfCornerRadii(['10px','10px','10px','10px'],box.right-box.left,box.bottom-box.top)});}
    }
    for(const el of document.querySelectorAll(selector)){
      const popup=el.matches('[role="menu"], [role="listbox"], [role="dialog"], dialog[open], [aria-modal="true"]');
      if(!el.isConnected||(!popup&&!isHostOccluder(el))||el.closest('[hidden], [aria-hidden="true"], [data-composer-dock]'))continue;
      if(!popup&&el.closest('[data-conversation-scroll]')&&!el.closest('[data-composer-seat], [data-composer-overlay], [data-conversation-region="composer"]'))continue;
      const owner=el.closest('[data-conversation-content]');if(owner&&owner!==scope)continue;
      if(el.matches('span')&&(el.children.length||!el.textContent.trim()))continue;
      const st=getComputedStyle(el),r=rect(el);if(st.display==='none'||st.visibility==='hidden'||Number(st.opacity)===0||r.right<=r.left||r.bottom<=r.top)continue;
      // Full-width overlay anchors and leaf wrappers are structural, never exempt.
      if(!el.matches('[data-composer-card], section[data-testid="todo-panel"], [data-code-block-banner], [role="menu"], [role="listbox"], [role="dialog"], dialog[open], [aria-modal="true"]') && (r.right-r.left)>(rect(scope).right-rect(scope).left)*.8)continue;
      const clip=viewport(el);if(rfIntersect(r,clip))found.push({rect:r,clip,radii:rfCornerRadii([st.borderTopLeftRadius,st.borderTopRightRadius,st.borderBottomRightRadius,st.borderBottomLeftRadius],r.right-r.left,r.bottom-r.top)});
    }
    return found;
  }
  function patchShapes(shapes){
    let i=0;for(const spec of shapes){let e=layer.children[i];if(!e){e=document.createElement('div');e.className='shape';layer.append(e);}const r=spec.rect;e.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.right-r.left}px;height:${r.bottom-r.top}px;background:${spec.color};${spec.extra||''}`;i++;}
    while(layer.children.length>i)layer.lastElementChild.remove();
  }
  // Block focus fades the text itself instead of covering the page: `::highlight()` can set a text
  // colour without touching the DOM, and one range may span a whole subtree, so a focus change
  // costs a couple of ranges rather than one per text node.
  const dimName='rf-dim-'+Math.random().toString(36).slice(2);
  let dimStyle=null,dimHighlight=null,dimRule='';
  function dimSupported(){return !!window.CSS?.highlights&&typeof Highlight==='function';}
  function clearDim(){
    if(dimHighlight&&CSS.highlights.get(dimName)===dimHighlight)CSS.highlights.delete(dimName);
    dimHighlight=null;if(dimStyle){dimStyle.remove();}dimStyle=null;dimRule='';
  }
  function paintDim(block,color){
    if(!dimSupported())return false;
    if(!dimHighlight){dimHighlight=new Highlight();CSS.highlights.set(dimName,dimHighlight);}
    if(!dimStyle){dimStyle=document.createElement('style');dimStyle.dataset.readingFocusDim='';document.head.append(dimStyle);}
    if(dimRule!==color){dimRule=color;dimStyle.textContent=`::highlight(${dimName}){color:${color}}`;}
    const highlight=dimHighlight;highlight.clear();
    for(const root of roots){
      if(!root.isConnected)continue;
      if(block&&root.contains(block)){
        const before=document.createRange();
        before.setStartBefore(root);before.setEndBefore(block);
        if(!before.collapsed)highlight.add(before);
        const after=document.createRange();
        after.setStartAfter(block);after.setEndAfter(root);
        if(!after.collapsed)highlight.add(after);
      }else{
        const whole=document.createRange();whole.selectNodeContents(root);highlight.add(whole);
      }
    }
    return true;
  }
  // All markdown roots of one assistant answer read as a single flow. A tool call interrupts the
  // answer visually - the host renders the text before and after it as separate markdown roots -
  // but it is still one continuous piece of reading, so the colour pattern must continue across
  // the interruption rather than restarting from base. Roots from a different answer (another
  // turn) stay separate, so a new answer does open at base.
  function rootGroup(root){
    const lane=root.closest('.xMeOpW_body')||root.parentElement;
    if(!lane)return [root];
    const scope=flowScope(lane)||lane;
    const all=[...scope.querySelectorAll(RF_ROOT)].filter(matchesRoot);
    if(!all.length)return [root];
    // Keep only top-level roots: a root nested inside another root already reads as part of it.
    const top=all.filter(el=>!all.some(other=>other!==el&&other.contains(el)));
    const turn=flowTurn(root);
    const group=turn===null?top:top.filter(el=>flowTurn(el)===turn);
    return group.length?group:[root];
  }
  // The element that holds every flow item of one answer, including the tool-call rows that sit
  // between two text segments. Undefined when the host does not expose it.
  function flowScope(node){
    return node.closest('[data-slot="conversation.chat.flow"]')||node.closest('[data-chat-turn]')?.parentElement||null;
  }
  // Turn number of the answer a root belongs to; null when the host does not mark it.
  function flowTurn(node){
    const turn=node.closest('[data-chat-turn]')?.getAttribute('data-chat-turn');
    return turn===undefined||turn===null||turn===''?null:turn;
  }
  function groupRegion(root,group,index){
    const r=rect(root);
    if(index>0)r.top=(rect(group[index-1]).bottom+r.top)/2;
    if(index+1<group.length)r.bottom=(r.bottom+rect(group[index+1]).top)/2;
    return rfIntersect(r,viewport(root));
  }
  // A lane is bounded by the actual scroll/clipping ancestor chain and session.
  function laneOf(root){
    const chain=[];
    for(let p=root;p;p=p.parentElement){const s=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(s.overflowX+' '+s.overflowY))chain.push(p);}
    const scroll=root.closest('[data-conversation-scroll]');
    return {scroll,session:root.closest('[data-conversation-session]'),fallback:scroll?null:rootGroup(root)[0],chain};
  }
  function sameLane(a,b){return a.scroll===b.scroll&&a.session===b.session&&a.fallback===b.fallback&&a.chain.length===b.chain.length&&a.chain.every((x,i)=>x===b.chain[i]);}
  function bandBarriers(rawRects){
    const selector='[data-turn-process-inline], [data-turn-process], [data-step-process], [data-chat-flow-kind="turn-process"], [data-chat-flow-kind="tool"], [data-chat-flow-kind="received-task"], [data-chat-steering-batch], .xMeOpW_body img, .xMeOpW_body video, .xMeOpW_body canvas';
    const result=[];
    const candidates=new Set(document.querySelectorAll(selector));
    for(const el of document.querySelectorAll('[data-chat-flow-kind]:not([data-chat-flow-kind="assistant-step"])'))if(!matchesRoot(el)&&!queryRoots(el).length)candidates.add(el);
    for(const body of document.querySelectorAll('.xMeOpW_body'))for(const el of body.children)if(!matchesRoot(el)&&!queryRoots(el).length)candidates.add(el);
    for(const el of candidates){
      if(!el.isConnected||el.closest('[data-text-interaction-surface], [hidden], [aria-hidden="true"]'))continue;
      const s=getComputedStyle(el),r=rect(el),image=el.matches('img,video,canvas');
      const content=!!el.textContent.trim()||!!el.querySelector('img,video,canvas');
      const visible=s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0&&r.right>r.left&&r.bottom>r.top;
      if(rfBarrierPolicy({known:content,image,visible,contents:s.display==='contents',overlay:/^(absolute|fixed)$/.test(s.position),overlapsText:rawRects.some(raw=>rfIntersect(raw,r))}))result.push(r);
    }
    return result;
  }
  // Last block that had focus, kept briefly so a tool-call row between two paragraphs does not
  // blank the effect. Coordinates are recomputed each frame, so scrolling is safe.
  let focusHold={block:null,at:0,scrollY:0};
  function draw(){
    const shapes=[],modal=modalOpen();layer.classList.toggle('pointer-layer',rfPointerLayer(state.enabled&&!modal,state.mode));
    // The text fade belongs to block focus alone; leaving the mode must remove it immediately.
    if(state.mode!=='blocks'&&dimHighlight)clearDim();
    if(!state.enabled||modal){if(modal)clearPointer();clearDim();patchShapes(shapes);return;}
    if(state.mode==='gradient'){patchShapes(shapes);return;}
    const dark=document.body.hasAttribute('data-ds-dark-theme');
    if(rfPointerMode(state.mode)){
      if(!pointerValid()){clearPointer();patchShapes(shapes);return;}
      if(!hasConversation(pointerScope)){resetGutter();patchShapes(shapes);return;}
      // Pointer parked in the empty gutter beside the text column: step out of the way so the page
      // is fully visible. The anchor is kept, so returning to the text restores instantly.
      if(state.gutterHide&&gutterState()){patchShapes(shapes);return;}
      const region=rfLineRegion(rect(pointerScope),viewport(pointerScope)),cuts=lineOccluders(pointerScope);
      if(region){
        // The veil dims everything outside the readable rows.
        const veil=rfVeilColor(state);
        // The composer is a control surface, not body text: keep it readable as one lit region
        // instead of punching a reading band through it. A band line across the input looks like
        // a stray highlight and hides the caret.
        const composer=composerRect(pointerScope);
        // Over the composer the pointer is on a control, not inside prose: light the whole pane
        // and skip the reading band entirely, so no stray bar floats across the input box.
        const overComposer=!!composer&&lastY>=composer.top;
        if(state.mode==='lines'){
          // Line focus: the rows under the pointer stay fully transparent at normal brightness and
          // only the surrounding area is dimmed, so the veil is the only thing colour affects.
          if(overComposer){
            shapes.push({rect:region,color:veil});
          }else{
            const hole=rfLineHole(lastY,state.lineCount,lineHeight(pointerScope),region);
            const mask=rfPaneMask(region,[{rect:hole,clip:region,radii:[[0,0],[0,0],[0,0],[0,0]]},...cuts]);
            shapes.push({rect:region,color:veil,extra:`mask-image:url("${mask}");mask-repeat:no-repeat;mask-size:100% 100%`});
          }
        }else{
          // Reading ruler: a soft tinted band spanning the reading width with a solid line along its
          // top and bottom edge. The lines are what makes the row boundaries readable; the fill is
          // deliberately faint. Both take the user's colour.
          const left=pointerScope.querySelector(':scope > [data-width-handle="left"]'),right=pointerScope.querySelector(':scope > [data-width-handle="right"]');
          const l=left?.getClientRects().length?rect(left):null,r=right?.getClientRects().length?rect(right):null;
          const width=l&&r&&l.right>l.left&&r.right>r.left&&l.right<r.left?{left:l.right,right:r.left}:{left:region.left,right:region.right};
          // Height follows whole text lines plus a little breathing room.
          const lh=lineHeight(pointerScope),inner=state.rulerLines*lh,pad=Math.max(3,Math.round(lh*.22));
          const h=inner+pad*2;
          const band=rfIntersect({left:width.left,right:width.right,top:lastY-h/2,bottom:lastY+h/2},region);
          if(band){
            const mask=rfPaneMask(band,cuts),extra=`mask-image:url("${mask}");mask-repeat:no-repeat;mask-size:100% 100%`;
            // The user's opacity drives both parts: solid edges and a correspondingly faint fill.
            const strength=rfColorValue(state,'ruler','lineOpacity',.9);
            const fill=rfRulerColor(state,Math.min(1,strength*.22));
            if(fill)shapes.push({rect:band,color:fill,extra});
            const edgeColor=rfRulerColor(state,Math.max(.25,strength));
            if(edgeColor)for(const edge of rfRulerEdges(band)){const edgeMask=rfPaneMask(edge,cuts);shapes.push({rect:edge,color:edgeColor,extra:`mask-image:url("${edgeMask}");mask-repeat:no-repeat;mask-size:100% 100%`});}
          }
        }
      }
      patchShapes(shapes);return;
    }
    const cuts=occluders();
    function add(r,clip,color,extra=''){let visible=rfIntersect(r,clip);if(!visible)return;let parts=[visible];for(const cut of cuts)parts=parts.flatMap(part=>rfSubtract(part,cut));for(const part of parts)shapes.push({rect:part,color,extra});}
    if(state.mode==='bands'){
      const bands=[], lanes=[], paragraph=state.segmentStyle==='paragraph', codeRects=[];
      // Colours cycle over the whole answer, never per markdown root: numbering that restarts
      // inside each root made a tool-split answer repeat the same hue for long runs.
      const palette=rfBandColors(state,dark);
      const bandOpacity=rfColorValue(state,'bands','opacity',.42);
      // A counter per lane keeps vertical continuity for side-by-side panes.
      const cycle=new Map();
      for(const root of roots){
        if(!root.isConnected)continue;
        const clip=viewport(root), list=bandsBlocks(root), width=bandsWidth(root), identity=laneOf(root);
        let lane=lanes.find(l=>sameLane(l.identity,identity)&&Math.abs(l.left-width.left)<.5&&Math.abs(l.right-width.right)<.5);
        if(!lane){lane={identity,left:width.left,right:width.right};lanes.push(lane);}
        codeRects.push(...codeBlockRects(root));
        list.forEach(el=>{const i=list.indexOf(el),raw=blockRect(el,list,i,false),r={...raw,left:width.left,right:width.right,top:raw.top-(paragraph?6:0),bottom:raw.bottom+(paragraph?6:0)};const n=cycle.get(lane)||0;cycle.set(lane,n+1);const hue=palette[n%palette.length];bands.push({rect:r,raw,clip,key:lane,clipKey:lane,hue,color:`rgba(${hue},${bandOpacity})`});});
      }
      // Inside <li> the blocks above still see list markers; code inside a list item is barred too.
      const barriers=[...cuts,...bandBarriers(bands.map(b=>b.raw)),...codeRects];
      bands.sort((a,b)=>a.raw.top-b.raw.top||a.raw.left-b.raw.left);
      for(const lane of lanes){
        const row=bands.filter(b=>b.key===lane);let partition={};
        if(row.length)row[0].key=partition;
        for(let i=1;i<row.length;i++){
          const a=row[i-1],b=row[i],gap=b.raw.top-a.raw.bottom;
          const corridor={left:Math.max(a.rect.left,b.rect.left),right:Math.min(a.rect.right,b.rect.right),top:Math.min(a.raw.bottom,b.raw.top),bottom:Math.max(a.raw.bottom,b.raw.top)};
          const blocked=barriers.some(c=>rfIntersect(c,{...corridor,top:corridor.top-.01,bottom:corridor.bottom+.01}));
          if(blocked||gap>24){if(a.rect.bottom>b.rect.top){const mid=(a.raw.bottom+b.raw.top)/2;a.rect.bottom=Math.min(a.rect.bottom,mid);b.rect.top=Math.max(b.rect.top,mid);}partition={};b.key=partition;continue;}
          b.key=partition;
          // Merge only neighbours that share a hue; two different hues must keep their seam.
          if(a.hue===b.hue){
            if(b.rect.top-a.rect.bottom<=(paragraph?1:0)){const mid=(a.rect.bottom+b.rect.top)/2;a.rect.bottom=mid;b.rect.top=mid;}
          }else if(paragraph){
            // Preserve as much whitespace as available, up to 6px; overlap gets a seam.
            const space=Math.min(6,Math.max(0,gap)),mid=(a.raw.bottom+b.raw.top)/2;
            a.rect.bottom=mid-space/2;b.rect.top=mid+space/2;
          }else if(a.rect.bottom>b.rect.top){const mid=(a.raw.bottom+b.raw.top)/2;a.rect.bottom=mid;b.rect.top=mid;}
        }
      }
      for(const group of rfBandGroups(bands)){
        const mask=rfBandMask(group.rects);
        // Draw union once so overlapping same-colour slices never double alpha.
        const visible=rfIntersect(mask.box,group.clip);if(!visible)continue;let parts=[visible];for(const cut of barriers)parts=parts.flatMap(part=>rfSubtract(part,cut));
        for(const part of parts){const extra=`mask-image:url("${mask.url}");mask-repeat:no-repeat;mask-size:${mask.width}px ${mask.height}px;mask-position:${mask.box.left-part.left}px ${mask.box.top-part.top}px`;shapes.push({rect:part,color:group.color,extra});}
      }
      patchShapes(shapes);return;
    }
    // Paragraph focus: the block under the pointer stays as it is and everything else recedes.
    // Two ways to make it recede - fade the other glyphs, or dim the page behind a veil.
    if(state.mode==='blocks'){
      // Crossing a tool-call row briefly leaves the prose. Reuse the last focused block for a beat
      // instead of snapping back to full contrast; a scroll invalidates it because the geometry
      // behind it has moved.
      let block=hovering&&activeBlock?.isConnected?activeBlock:null;
      const held=!block&&focusHold.block&&focusHold.block.isConnected&&performance.now()-focusHold.at<160&&focusHold.scrollY===scrollY;
      if(held)block=focusHold.block;
      if(!block){focusHold.block=null;clearDim();patchShapes(shapes);return;}
      focusHold={block,at:performance.now(),scrollY};
      if(state.blockStyle!=='veil'&&paintDim(block,rfDimColor(state))){patchShapes(shapes);return;}
      // Veil presentation, or a browser without CSS Custom Highlight.
      clearDim();
      const group=activeBody?rootGroup(activeBody):[];
      const regions=group.map((root,i)=>groupRegion(root,group,i)).filter(Boolean);
      const list=activeBody?blocks(activeBody):[],index=list.indexOf(block);
      const hole=index<0?null:blockRect(block,list,index,true);
      if(hole){
        const veil=rfVeilColor(state),tint=rfTintColor(state);
        for(const region of regions){
          for(const piece of rfSubtract(region,hole))add(piece,region,veil);
          if(tint)add(hole,region,tint);
        }
      }
      patchShapes(shapes);return;
    }
    patchShapes(shapes);
  }
  function handleScope(target){
    const handle=target?.closest?.('[data-width-handle]'),scope=handle?.closest('[data-conversation-content][data-conversation-session]');
    return handle&&scope&&handle.parentElement===scope?scope:null;
  }
  function focusHandle(scope,y){
    if(!scope)return false;
    if(pointerValid()&&pointerScope===scope)return true;
    const scroll=scope.querySelector('[data-conversation-scroll]');
    if(!scroll||scroll.closest('[data-conversation-content][data-conversation-session]')!==scope)return false;
    anchorPointer(scope,scroll);lastY=y;lastX=pointerX;return true;
  }
  function protectedScope(target){
    const control=target?.closest?.('[data-composer-card], [data-composer-seat] section[data-testid="todo-panel"], [data-composer-overlay] > *, [data-composer-dock] button, [data-composer-dock] [role="button"], [data-composer-dock] a, [data-composer-dock] span');
    return control?.closest('[data-conversation-content][data-conversation-session]')||null;
  }
  function panePolicy(target,scope,scroll){
    const targetScope=target?.closest?.('[data-conversation-content][data-conversation-session]');
    const view=scroll&&rfIntersect(rect(scroll),viewport(scroll));
    const excluded=!!target?.closest?.('[role="menu"], [role="listbox"], [role="dialog"], dialog[open], [aria-modal="true"]');
    return rfPanePolicy({sameScope:!!scope&&targetScope===scope,inScroll:!!view&&target?.closest?.('[data-conversation-scroll]')===scroll&&rfLineCandidate(view,view,pointerX,pointerY),structural:!!target?.closest?.('[data-composer-seat], [data-composer-dock], [data-conversation-region="composer"], [data-slot="conversation.input.dock"]'),protectedControl:!!protectedScope(target),excluded});
  }
  function hit(){
    const target=document.elementFromPoint(pointerX,pointerY);
    if(rfPointerMode(state.mode)){
      if(pointerScope&&!pointerValid())clearPointer();
      if(widthDrag){if(pointerValid()&&widthDrag.scope===pointerScope&&widthDrag.scroll===pointerScroll)return;clearPointer();return;}
      const scope=target?.closest?.('[data-conversation-content][data-conversation-session]');
      const handle=handleScope(target);
      if(handle){if(pointerScope&&pointerScope!==handle)clearPointer();focusHandle(handle,pointerY);return;}
      const scroll=target?.closest?.('[data-conversation-scroll]');
      const policy=panePolicy(target,scope,scroll);
      if(policy==='follow'){anchorPointer(scope,scroll);lastX=pointerX;lastY=pointerY;return;}
      if(policy==='freeze'&&pointerValid()&&pointerScope===scope)return;
      clearPointer();return;
    }
    const targetCut=target?.closest?.(RF_OCCLUDERS);
    if((targetCut&&isHostOccluder(targetCut)) || (target?.closest?.('.xMeOpW_body') && !closestRoot(target) && target.closest('.xMeOpW_body')!==target)){hovering=false;return;}
    // Read every candidate rectangle first, decide afterwards: interleaving rect reads with the
    // elementFromPoint above is what makes a scroll-costly forced layout.
    let best=null,dist=Infinity;
    for(const root of roots){
      if(!root.isConnected)continue;
      const rr=rect(root),r=rfIntersect(rr,viewport(root));
      if(!r||lastX<r.left-12||lastX>r.right+12)continue;
      let top=r.top-12,bottom=r.bottom+12;
      if(root.parentElement?.matches('.xMeOpW_body')){
        const prev=root.previousElementSibling,next=root.nextElementSibling;
        if(matchesRoot(prev))top=Math.min(top,(rect(prev).bottom+rr.top)/2);
        if(matchesRoot(next))bottom=Math.max(bottom,(rr.bottom+rect(next).top)/2);
      }
      if(lastY<top||lastY>bottom)continue;
      for(const el of blocks(root)){const b=rect(el),d=lastY<b.top?b.top-lastY:lastY>b.bottom?lastY-b.bottom:0;if(d<dist){dist=d;best={root,el};}}
    }
    if(best){activeBody=best.root;activeBlock=best.el;hovering=true;}else hovering=false;
  }
  // The paragraph hit-test feeds the pointer modes and block focus only; running it for bands and
  // gradient (which never read the result) costs a layout pass on every scroll frame.
  const modeNeedsHit=()=>rfPointerMode(state.mode)||state.mode==='blocks';
  function queue(rehit=false){if(rehit&&!panelHover&&hasPointer&&modeNeedsHit())needsHit=true;if(state.enabled&&!frame&&!disposed)frame=requestAnimationFrame(()=>{frame=0;if(needsHit){needsHit=false;hit();}draw();});}
  function onMove(e){
    if(!state.enabled)return;
    panelHover=e.composedPath().includes(host);
    if(panelHover){needsHit=false;return;}
    pointerX=e.clientX;pointerY=e.clientY;hasPointer=true;
    if(!modeNeedsHit()){lastX=e.clientX;lastY=e.clientY;return;}
    const target=document.elementFromPoint(pointerX,pointerY);
    const scope=rfPointerMode(state.mode)?handleScope(target):null;
    const freeze=rfPointerMode(state.mode)&&(widthDrag||(pointerValid()&&((scope&&pointerScope===scope)||panePolicy(target,pointerScope,pointerScroll)==='freeze')));
    if(!freeze){lastX=e.clientX;lastY=e.clientY;}
    needsHit=true;queue();
  }
  function onWidthDown(e){
    if(!state.enabled||!rfPointerMode(state.mode)||e.button!==0||modalOpen())return;
    pointerX=e.clientX;pointerY=e.clientY;const scope=handleScope(e.target);if(!scope||!focusHandle(scope,e.clientY))return;
    widthDrag=rfHandlePolicy(widthDrag,{type:'start',scope,scroll:pointerScroll,id:e.pointerId});needsHit=false;queue();
  }
  function onWidthEnd(e){
    if(!widthDrag||e.pointerId!==widthDrag.id)return;
    if(e.type==='pointercancel'){clearPointer();needsHit=false;patchShapes([]);return;}
    widthDrag=rfHandlePolicy(widthDrag,{type:'end',id:e.pointerId});
    if(e.type!=='lostpointercapture'){pointerX=e.clientX;pointerY=e.clientY;}
    const target=document.elementFromPoint(pointerX,pointerY),scope=handleScope(target);
    if((scope&&scope===pointerScope&&pointerValid())||(pointerValid()&&panePolicy(target,pointerScope,pointerScroll)==='freeze')){needsHit=false;queue();}else {lastX=pointerX;lastY=pointerY;hasPointer=true;queue(true);}
  }
  function onWidthBlur(){if(rfPointerMode(state.mode)){clearPointer();needsHit=false;patchShapes([]);}}
  function onVisibility(){if(document.hidden)onWidthBlur();}
  function widthListeners(add){const method=add?'addEventListener':'removeEventListener';document[method]('pointerdown',onWidthDown,true);for(const name of ['pointerup','pointercancel','lostpointercapture'])document[method](name,onWidthEnd,true);window[method]('blur',onWidthBlur);document[method]('visibilitychange',onVisibility);}
  function setEnabled(enabled){const changed=state.enabled!==enabled;state.enabled=enabled;if(enabled){widthListeners(true);startObservers();adoptHostTypography();gradient.scan();queue();}else{gradient.clear();clearDim();widthListeners(false);clearPointer();stopObservers();if(frame)cancelAnimationFrame(frame);frame=0;layer.classList.remove('pointer-layer');patchShapes([]);hovering=false;needsHit=false;hasPointer=false;panelHover=false;}if(changed)save();sync();}
  function onKey(e){const path=e.composedPath(),inPanel=path.includes(host),editing=path.some(n=>n?.matches?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||n?.isContentEditable);if(e.defaultPrevented||modalOpen())return;if(e.key==='Escape'&&inPanel&&panel){e.preventDefault();e.stopPropagation();closeWindow();return;}if(e.key==='Escape'&&state.enabled&&!editing&&hovering){setEnabled(false);return;}}
  // Scrolling must repaint from the pointer position the user already has, synchronously in the
  // scroll handler: re-running elementFromPoint mid-scroll samples a stale hit target and makes
  // the overlay follow the text one frame late (text slides out, then the mask snaps back).
  function onScroll(){
    if(!state.enabled)return;
    if(rfPointerMode(state.mode)&&pointerValid()){
      // Pointer modes anchor to the pane and a fixed y, so the region is already current.
      if(!frame){frame=requestAnimationFrame(()=>{frame=0;draw();});}
    }else{
      queue(true);
    }
    queuePanel();
  }
  const onLayout=()=>{queue(true);queuePanel();};const onResize=()=>{if(state.mode==='gradient')gradient.invalidate();onLayout();};
  // Adopt a saved font on load, but never write one that was never customised.
  if(Object.keys(state.font).length)rfApplyTypography(state.font);document.addEventListener('pointermove',onMove,{passive:true});document.addEventListener('keydown',onKey);window.addEventListener('scroll',onScroll,true);window.addEventListener('resize',onResize);
  // The on/off choice is a preference like any other: restoring it means the user does not have to
  // re-enable the effect after every restart.
  if(state.enabled)setEnabled(true);else sync();
  return {mountControls,openWindow,dispose(){disposed=true;gradient.dispose();clearDim();widthListeners(false);clearPointer();stopObservers();closeWindow();rfClearTypography();subscribers.clear();if(frame)cancelAnimationFrame(frame);document.removeEventListener('pointermove',onMove);document.removeEventListener('keydown',onKey);window.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',onResize);host.remove();}};
}
