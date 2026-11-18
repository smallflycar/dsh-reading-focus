// Rendering rules for the generated artifacts. Kept free of side effects so the test suite can
// rebuild in memory and compare the shipped files byte for byte - a stale bundle must fail the
// tests instead of passing as "built from src".
export function renderClient(source){
  return `window.__ModuleLoader__.load({id:'dsh-reading-focus',factory:(require)=>{\nconst React=require('react');\n${source}\nreturn {inject:['slots'],apply(ctx){ctx.effect(()=>{const controller=startReadingFocus();function SettingsSection({close}){const ref=React.useRef(null);React.useEffect(()=>controller.mountControls(ref.current,false,()=>{close();controller.openWindow();}),[close]);return React.createElement('div',{ref,style:{padding:'16px',color:'var(--dsw-alias-label-primary)',font:'14px/1.6 system-ui'}});}const off=ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'reading-focus',order:65,label:()=> '阅读辅助'},SettingsSection));return ()=>{if(typeof off==='function')off();controller.dispose();};});}};\n}});\n`;
}
export function renderPreview(template, source){
  // Function replacer: the source contains "$" sequences that a string replacement would expand.
  return template.replace('/* ENGINE */', () => source);
}
export function renderIndex(){
  return 'export function apply() {}\n';
}
export function concatSources(style, gradient, engine){
  return style + '\n' + gradient + '\n' + engine;
}
