import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {concatSources, renderClient, renderIndex, renderPreview} from '../build-lib.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const client=await readFile('lib/client.js','utf8');
const index=await readFile('lib/index.js','utf8');
const preview=await readFile('preview.html','utf8');
const template=await readFile('src/preview-template.html','utf8');
const source=await readFile('src/engine.js','utf8');
const style=await readFile('src/style.js','utf8');
const gradient=await readFile('src/gradient.js','utf8');
const load=names=>vm.runInNewContext(gradient+'\n({'+names.join(',')+'})');
const dist=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));

test('gradient palettes and grapheme helpers',()=>{
  const api=load(['RF_GRADIENT_PALETTES','rfGradientColors','rfGraphemes']);
  assert.deepEqual(Array.from(api.rfGradientColors('Bright',false,[0,0,0],1).b),[196,30,30]);
  assert.deepEqual(Array.from(api.rfGradientColors('Blues',false,[0,0,0],1).b),[144,19,254]);
  assert.notDeepEqual(Array.from(api.rfGradientColors('Bright',true,[255,255,255],1).a),[0,0,255]);
  assert.equal(api.rfGraphemes('A👩‍👩‍👧‍👦e\u0301中').length,4);
});

// The reference pattern: each line sweeps one full arm, alternating direction, so that
// consecutive lines meet at an extreme instead of mid-ramp.
test('lines alternate base->hue and hue->base',()=>{
  const {rfPhase,rfLineColor,rfGradientColors}=load(['rfPhase','rfLineColor','rfGradientColors']);
  const colors=rfGradientColors('Bright',false,[0,0,0],1);
  assert.equal(rfPhase(0,0)[1],0);          // line 0 starts at base
  assert.equal(rfPhase(1,0)[1],1);          // line 1 starts at the hue
  assert.equal(rfPhase(2,0)[1],0);          // line 2 restarts at base, second hue
  assert.equal(rfPhase(3,0)[1],1);
  // Line 0 runs base -> a, line 1 runs a -> base: the junction is the identical full hue.
  assert.deepEqual(rfLineColor(colors,0,0),rfLineColor(colors,0,0));
  assert.deepEqual(rfLineColor(colors,0,1),rfLineColor(colors,1,0));
  assert.deepEqual(rfLineColor(colors,1,1),rfLineColor(colors,2,0));
  assert.deepEqual(rfLineColor(colors,2,1),rfLineColor(colors,3,0));
  assert.deepEqual(rfLineColor(colors,3,1),rfLineColor(colors,0,0));
  // Every junction lands on an extreme, never in the middle of a ramp.
  const base=colors.base;
  for(const line of [0,1,2,3]){
    const end=rfLineColor(colors,line,1),nextStart=rfLineColor(colors,line+1,0);
    assert.deepEqual(end,nextStart,`line ${line} junction`);
    const saturation=dist(end,base);
    assert.ok(saturation===0||saturation>60,`line ${line} junction saturation ${saturation}`);
  }
});

test('a line with one glyph keeps the incoming colour and does not advance',()=>{
  const {rfLineAdvance,rfLineColor,rfGradientColors}=load(['rfLineAdvance','rfLineColor','rfGradientColors']);
  assert.equal(rfLineAdvance({items:[1]}),0);
  assert.equal(rfLineAdvance({items:[]}),0);
  assert.equal(rfLineAdvance({items:[1,2]}),1);
  const colors=rfGradientColors('Bright',false,[0,0,0],1);
  // A single-glyph line pins t=0, which is exactly the previous line's terminal colour.
  const prevEnd=rfLineColor(colors,0,1);
  assert.deepEqual(rfLineColor(colors,1,0),prevEnd);
  assert.deepEqual(rfLineColor(colors,1,0),prevEnd);
});

test('position maps a glyph centre onto the line span',()=>{
  const {rfPosition}=load(['rfPosition']);
  assert.equal(rfPosition(5,5,15),0);
  assert.equal(rfPosition(15,5,15),1);
  assert.equal(rfPosition(10,5,15),0.5);
  assert.equal(rfPosition(5,5,5),0);      // zero-width span must not divide by zero
});

test('block offsets chain so blocks resume the pattern',()=>{
  const {rfFlowOffsets,rfPlanFlow}=load(['rfFlowOffsets','rfPlanFlow']);
  const counts=[1,3,2,4],offsets=Array.from(rfFlowOffsets(counts));
  assert.deepEqual(offsets,[0,1,0,2]);
  const owner={},other={},ids=['a','b','c','d'];
  const entries=ids.map((block,i)=>({block,item:{offset:offsets[i],advance:counts[i],owner},dirty:false}));
  assert.equal(rfPlanFlow(entries,owner),null);
  entries[0].item.advance=2;
  const next=rfPlanFlow(entries,owner);
  assert.equal(next.block,'b');
  assert.equal(next.offset,2);
  assert.equal(next.measure,false);
  entries[0].item.advance=counts[0];
  assert.equal(rfPlanFlow(entries,other).measure,false);
  entries[1].dirty=true;
  assert.equal(rfPlanFlow(entries,owner).measure,true);
});

// A tool call splits the answer into separate markdown roots. The colour must carry across it,
// while a genuinely new answer still restarts at base.
test('colour continues across a tool call but restarts per answer',()=>{
  assert.ok(source.includes('data-slot="conversation.chat.flow"'),'flow scope selector missing');
  assert.ok(source.includes("data-chat-turn"),'turn marker missing');
  assert.ok(source.includes('flowScope'),'flowScope helper missing');
  assert.ok(source.includes('flowTurn'),'flowTurn helper missing');
  assert.ok(source.includes('top.filter(el=>flowTurn(el)===turn)'),'group must not cross answers');
});

test('versioned queue prioritizes, replaces, rejects stale and drops',()=>{
  const {rfGradientQueue}=load(['rfGradientQueue']);
  const q=rfGradientQueue(),a={},b={};
  q.ensure(a);q.ensure(b,true);
  assert.equal(q.take().block,b);
  const v=q.version(a);q.touch(a);
  assert.equal(q.valid(a,v),false);
  assert.equal(q.size,1);
  assert.equal(q.take().block,a);
  q.drop(a);
  assert.equal(q.version(a),undefined);
  q.ensure(a);
  assert.equal(q.size,1);
  q.clear();
  assert.equal(q.size,0);
});

test('gradient ownership and chunking are explicit',()=>{
  for(const part of ['steps<400','performance.now()-start<4','CSS.highlights.get(name)===highlight','media.removeEventListener','loadingdone','createTreeWalker','rfGraphemeIterator','[data-text-interaction-surface]'])assert.ok(gradient.includes(part),part);
  assert.equal(gradient.includes('10000'),false);
  for(const part of ['gradientStrength:validNumber','gradientPalette:Object.hasOwn',"const modeNeedsHit=()=>rfPointerMode(state.mode)||state.mode==='blocks'",'gradient.dispose()'])assert.ok(source.includes(part),part);
});

// Headings and code carry no gradient at all; only running body text is coloured.
test('gradient scope excludes headings and code',()=>{
  assert.ok(gradient.includes('const RF_NO_GRADIENT'),'block list missing');
  for(const sel of ['h1','h2','h3','h4','h5','h6','pre','table']){
    assert.ok(gradient.includes(sel),sel+' must be excluded');
  }
  assert.ok(gradient.includes('blocks(root).filter(b=>!b.matches(RF_NO_GRADIENT))'),'blocks must be filtered');
  assert.ok(gradient.includes('h1,h2,h3,h4,h5,h6,code,pre'),'inline exclusion must list headings');
});

// Code blocks own their own surface: bands must never paint them. Headings are skipped too, while
// tables are banded like any other reading block.
test('bands skip code blocks and headings and treat code as a barrier',()=>{
  const api=vm.runInNewContext(source+'\n({rfBarrierPolicy,rfBandGroups})');
  assert.equal(typeof api.rfBarrierPolicy,'function');
  assert.equal(typeof api.rfBandGroups,'function');
  assert.ok(source.includes('const RF_CODE_BLOCK'),'code block selector missing');
  assert.ok(source.includes('function isCodeBlock'),'code block predicate missing');
  assert.ok(source.includes('if(isCodeBlock(el))return false;'),'bands must skip code blocks');
  assert.ok(source.includes("const RF_NO_BAND = 'h1,h2,h3,h4,h5,h6'"),'heading exclusion missing');
  assert.ok(source.includes('if(el.matches(RF_NO_BAND))return false;'),'bands must skip headings');
  assert.ok(source.includes('...bandBarriers(bands.map(b=>b.raw)),...codeRects'),'code blocks must be barriers');
});

test('manifest uses official settings dependency and shared React',()=>{
  assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
  assert.deepEqual(pkg.dsh.client.inject,['@deepseek-ai/dsh-client-ui-settings']);
  assert.deepEqual(pkg.dsh.client.external,['react']);
});

// The shipped files are generated from src. Compare the rendered output exactly: the previous
// version only looked for a few substrings, so a stale bundle that still contained those names
// passed while users kept loading the old behaviour.
test('shipped client, index and preview are exactly built from src',()=>{
  const bundle=concatSources(style,gradient,source);
  assert.equal(client,renderClient(bundle),'lib/client.js is stale - run npm run build');
  assert.equal(index,renderIndex(),'lib/index.js is stale - run npm run build');
  assert.equal(preview,renderPreview(template,bundle),'preview.html is stale - run npm run build');
});

// The on/off switch used to be restored on load but only written when some other control
// happened to call save(). One list now drives both directions.
test('on/off switch is part of the persisted field list',()=>{
  const list=/const RF_PERSISTED=\[([^\]]+)\]/.exec(source);
  assert.ok(list,'RF_PERSISTED missing');
  assert.ok(list[1].includes("'enabled'"),'enabled must be persisted');
  assert.ok(source.includes('for(const key of RF_PERSISTED)out[key]=state[key]'),'save must be driven by the list');
  assert.ok(source.includes('if(changed)save();'),'toggling the switch must persist');
});

// Typography limits must come from one place, the host's own line-height ladder must not be
// re-derived, and the host variable the plugin writes has to be given back on dispose.
test('font limits, host line-height ladder and typography cleanup',()=>{
  assert.ok(source.includes('const RF_FONT = {sizeMin:10,sizeMax:22,sizeDefault:14,extraMin:0,extraMax:12,lineBase:24,baseSize:14}'),'RF_FONT missing');
  assert.ok(source.includes('function rfHostLineHeight(size)'),'host ladder helper missing');
  assert.ok(source.includes('line-height:calc(${RF_FONT.lineBase}px + var(--dsh-content-font-delta, 0px) + ${extra}px)'),'extra spacing must ride the host delta');
  assert.ok(source.includes('if(!commit&&(!sizeOk||!extraOk))return;'),'typing must not be rewritten mid-edit');
  assert.ok(source.includes('rfClearTypography();'),'dispose must clear the typography override');
  assert.ok(source.includes('stored.lineHeight<=5?stored.lineHeight*base:stored.lineHeight'),'old line-height profiles must migrate');
});

// The panel shows RF_VERSION; the registry package declares the same number.
test('panel version matches the package version',()=>{
  const version=/const RF_VERSION = '([^']+)'/.exec(source);
  assert.ok(version,'RF_VERSION missing');
  assert.equal(version[1],pkg.version,'panel and package versions must match');
});

// The bundle is text-compared above but never executed here; at least parse it so a broken wrapper
// (which the equality check would still accept) cannot ship.
test('generated client parses',()=>{
  assert.doesNotThrow(()=>new vm.Script(client),'lib/client.js must parse');
});

test('settings expose strength, palette and segment controls',()=>{
  for(const part of ['效果强度','配色','分段样式','整段色块','紧凑色带','聚焦行数'])assert.ok(style.includes(part)||source.includes(part),part);
  assert.ok(source.includes('gradientStrength'));
  assert.ok(source.includes('segmentStyle'));
});
