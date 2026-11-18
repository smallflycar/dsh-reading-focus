const RF_CSS = `
:host{all:initial}
.layer{position:fixed;inset:0;z-index:4;pointer-events:none}
.layer.pointer-layer{z-index:10}
.shape{position:fixed;pointer-events:none;box-sizing:border-box}
.panel{position:fixed;z-index:1000;width:min(320px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#d5dbe4);border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#27354a);box-shadow:var(--dsw-elevation-prominent,0 8px 30px #0003);font:13px/1.5 system-ui,sans-serif}
.panel[hidden],.rf-control-root [hidden]{display:none!important}
.top{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:move;touch-action:none;border-bottom:1px solid var(--dsw-alias-border-l2,#dce1e8)}
.top .close{border:0;background:transparent;color:inherit;font-size:21px;line-height:1;cursor:pointer}
.panel-controls{padding:12px 14px}
.rf-control-root{font:14px/1.5 system-ui,sans-serif;color:var(--dsw-alias-label-primary,#27354a);max-width:720px;box-sizing:border-box}
.rf-control-root *{box-sizing:border-box}
.rf-control-root button{font:inherit;color:inherit;cursor:pointer}
.rf-control-root button:focus-visible,.rf-control-root input:focus-visible,.top button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f70d9);outline-offset:2px}
.heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}
.heading h2{font-size:21px;line-height:1.3;margin:0 0 5px}
.heading p,.footnote{margin:0;color:var(--dsw-alias-label-secondary,#68778a);font-size:13px}
.switch{position:relative;display:inline-flex;flex:none;margin-top:3px}
.switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.switch span{display:block;width:38px;height:22px;border-radius:20px;background:var(--dsw-alias-border-l2,#abb6c5)}
.switch span:after{content:'';display:block;width:16px;height:16px;margin:3px;background:white;border-radius:50%;transition:transform .12s}
.switch input:checked+span{background:var(--dsw-alias-state-business-primary,#4f70d9)}
.switch input:checked+span:after{transform:translateX(16px)}
.switch input:focus-visible+span{outline:2px solid #4f70d9;outline-offset:3px}
.section-label{font-size:13px;font-weight:650;margin-bottom:9px}
.mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
/* An odd number of modes would leave one card alone in the last row; let it span instead. */
.mode-card{position:relative;text-align:left;display:flex;align-items:center;gap:12px;min-width:0;border:1px solid var(--dsw-alias-border-l2,#d8dee8);border-radius:var(--dsw-radius-md,9px);padding:12px;background:transparent}
.mode-card[aria-pressed=true]{border-color:var(--dsw-alias-state-business-primary,#4f70d9);background:var(--dsw-alias-state-business-tertiary,rgba(78,112,217,.08))}
.mode-card[aria-pressed=true]::after{content:'✓';position:absolute;right:5px;top:2px;font-size:12px;font-weight:700;color:var(--dsw-alias-label-primary,#27354a)}
.mode-card:disabled,.segments button:disabled{opacity:.7;cursor:default}
.mode-card strong,.mode-card small,.parameter strong,.parameter small,.segment-row strong,.segment-row small,.block-style-row strong,.block-style-row small,.gutter-row strong,.gutter-row small{display:block}
.mode-card strong{font-size:13px}
.mode-card small,.parameter small,.segment-row small,.block-style-row small,.gutter-row small,.steps small{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#78879a)}
.mode-icon{width:40px;height:34px;border:1px solid var(--dsw-alias-border-l2,#c8d1dd);border-radius:5px;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:5px;flex:none}
.mode-icon i{height:2px;background:var(--dsw-alias-label-tertiary,#a2afbf);border-radius:3px}
.mode-icon i:nth-child(2){height:5px;background:var(--dsw-alias-state-business-primary,#718be0);opacity:.7}
.icon-bands i{height:5px;opacity:.65;background:#88a5e4}
.icon-bands i:nth-child(1){background:#e4bf78}
.icon-bands i:nth-child(3){background:#bca1d9}
.icon-gradient i,.icon-gradient i:nth-child(2){height:2px;opacity:1;background:linear-gradient(90deg,#333,#2855c4,#a82a42)}
.gradient-palette select{max-width:150px;color:inherit;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l2,#d8dee8);border-radius:6px;padding:4px}
.gradient-status{font-size:12px;color:var(--dsw-alias-label-secondary,#68778a);margin:8px 0}
.mode-options{margin-top:14px}
.mode-options:empty{display:none}
.parameter{display:grid;grid-template-columns:1fr auto;gap:8px;padding:14px 0;border-bottom:1px solid var(--dsw-alias-border-l2,#dce1e8)}
.parameter strong,.segment-row strong,.block-style-row strong,.gutter-row strong{font-size:13px}
.parameter output{align-self:start;border-radius:12px;background:var(--dsw-alias-interactive-bg-hover,#eef1f6);padding:2px 8px;font-size:12px}
.parameter input{grid-column:1/-1;width:100%;accent-color:var(--dsw-alias-state-business-primary,#4f70d9)}
.color-row,.font-row{margin-top:18px;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2,#dce1e8)}
.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.section-head .section-label{margin:0}
.color-hint,.font-hint{margin:6px 0 0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary,#78879a)}
.color-fields{display:grid;gap:16px;margin-top:12px}
.color-field{display:grid;gap:9px}
.color-field-head strong{display:block;font-size:12px}
.color-field-head small{display:block;font-size:11px;color:var(--dsw-alias-label-secondary,#78879a)}
.alpha-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;font-size:11px;color:var(--dsw-alias-label-secondary,#78879a)}
.alpha-row input{width:100%;accent-color:var(--dsw-alias-state-business-primary,#4f70d9)}
.alpha-row output{font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
.color-field-input{display:flex;align-items:center;gap:10px}
.color-field-input input[type=range]{flex:1;accent-color:var(--dsw-alias-state-business-primary,#4f70d9)}
.color-field-input output{font-size:12px;color:var(--dsw-alias-label-secondary,#78879a);font-variant-numeric:tabular-nums;min-width:44px;text-align:right}
.color-swatches{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
.swatch{width:26px;height:26px;box-sizing:border-box;border-radius:50%;border:2px solid transparent;background:none;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.swatch[aria-pressed=true]{border-color:var(--dsw-alias-label-primary,#1b2330)}
.swatch>i{display:block;width:100%;height:100%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
.swatch.custom>i{background:conic-gradient(from 90deg,#e05c6e,#f0b633,#39b98a,#4e9ee0,#9e70da,#e05c6e);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
/* In-panel colour picker: hue / saturation / lightness, no native dialog. */
.rf-control-root{position:relative}
.rf-picker{display:grid;gap:12px;margin-top:10px;padding:12px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover,#f4f6fa);border:1px solid var(--dsw-alias-border-l2,#e3e8f0)}
.rf-picker-head{display:flex;align-items:center;gap:10px}
.rf-picker-chip{width:34px;height:24px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.rf-picker-head{display:flex;align-items:center;gap:10px}
.rf-picker-chip{width:30px;height:24px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.rf-picker-hex{flex:1;min-width:0;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2,#d8dee8);border-radius:6px;background:var(--dsw-alias-bg-layer-2,#fff);color:inherit;font:inherit;font-size:12px;letter-spacing:.5px;text-align:center}
.rf-disc{position:relative;width:132px;height:132px;margin:0 auto;border-radius:50%;cursor:crosshair;background:radial-gradient(circle at 50% 50%,#fff 0%,rgba(255,255,255,0) 72%),conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.rf-disc-dot{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.5);pointer-events:none}
.rf-picker-field{display:grid;grid-template-columns:42px 1fr 40px;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary,#78879a)}
.rf-picker-field input{width:100%}
.rf-picker-field output{text-align:right;font-variant-numeric:tabular-nums}
/* Gradient palette chips: the ramp itself is the icon. */
.palette-row{display:flex;gap:8px;grid-column:1/-1;margin-top:4px}
.palette-pill{width:58px;height:24px;border-radius:999px;border:2px solid transparent;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14);cursor:pointer;padding:0}
.palette-pill[aria-pressed=true]{border-color:var(--dsw-alias-label-primary,#1b2330)}
.palette-pill:disabled{opacity:.6;cursor:default}
/* Numeric steppers: type the value or use the arrows, like the host's own font-size field. */
.stepper{display:inline-flex;align-items:center;gap:5px}
.stepper input[type=number]{width:58px;padding:4px 4px 4px 8px;border:1px solid var(--dsw-alias-border-l2,#d8dee8);border-radius:6px;background:var(--dsw-alias-bg-layer-2,#fff);color:inherit;font:inherit;font-size:13px;text-align:center;appearance:textfield}
.stepper input[type=number]::-webkit-outer-spin-button,.stepper input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.stepper-btns{display:inline-flex;flex-direction:column;gap:1px}
.stepper-btns button{width:18px;height:13px;padding:0;line-height:1;font-size:7px;border:1px solid var(--dsw-alias-border-l2,#d8dee8);background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-secondary,#68778a);border-radius:3px;cursor:pointer}
.stepper-btns button:hover{color:var(--dsw-alias-label-primary,#1b2330);border-color:var(--dsw-alias-label-secondary,#9aa4b2)}
.stepper input[type=number]:focus{outline:2px solid var(--dsw-alias-state-business-primary,#4f70d9);outline-offset:1px}
.stepper em{font-style:normal;font-size:11px;color:var(--dsw-alias-label-secondary,#78879a)}
.number-parameter{grid-template-columns:1fr auto}
.number-parameter .stepper{grid-column:2;grid-row:1;align-self:center}
/* Band schemes: a colour set is easier to judge than three separate pickers. */
.scheme-row{display:flex;flex-wrap:wrap;gap:6px}
.scheme-row button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2,#d8dee8);background:transparent;border-radius:999px;padding:4px 9px;font-size:12px;cursor:pointer}
.scheme-row button[aria-pressed=true]{border-color:var(--dsw-alias-state-business-primary,#4f70d9);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary,#4f70d9) inset}
.scheme-dots{display:inline-flex;align-items:center}
.scheme-dots i{width:11px;height:11px;border-radius:50%;margin-left:-3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.scheme-dots i:first-child{margin-left:0}
.color-value{margin-left:auto;font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#78879a)}
.reset-color,.reset-font{border:1px solid var(--dsw-alias-border-l2,#d8dee8);background:transparent;color:var(--dsw-alias-label-secondary,#68778a);border-radius:6px;padding:3px 9px;font-size:11px;cursor:pointer;white-space:nowrap}
.reset-color:hover,.reset-font:hover{color:var(--dsw-alias-label-primary,#1b2330)}
.font-fields{display:grid;gap:8px;margin-top:10px}
.font-fields label{display:grid;grid-template-columns:44px 1fr;align-items:center;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#78879a)}
.font-fields .stepper{justify-self:start}
.font-fields input{width:100%;accent-color:var(--dsw-alias-state-business-primary,#4f70d9)}
.segment-row,.block-style-row,.gutter-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 0;border-bottom:1px solid var(--dsw-alias-border-l2,#dce1e8)}
.segments{display:flex;border:1px solid var(--dsw-alias-border-l2,#d8dee8);border-radius:7px;padding:2px;white-space:nowrap}
.segments button{border:0;background:transparent;border-radius:5px;padding:5px 8px;font-size:12px}
.segments button[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover,#e9edf5);font-weight:650}
.steps{display:flex;align-items:center;gap:8px;padding:12px 0}
.steps button{border:1px solid var(--dsw-alias-border-l2,#d8dee8);background:transparent;border-radius:6px;padding:5px 9px}
.open-window{width:100%;margin-top:20px;padding:10px;border:0;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-state-business-primary,#4f70d9);color:#fff!important;font-weight:600!important}
:host-context(body[data-ds-dark-theme]) .open-window,body[data-ds-dark-theme] .open-window{color:#18233a!important}
.footnote{margin-top:8px;text-align:center}
.floating .heading{margin-bottom:12px}
.floating .heading h2{font-size:14px;margin:0}
.floating .heading p,.floating .mode-card small{display:none}
.floating .section-label{margin-bottom:6px}
.floating .mode-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.floating .mode-card{display:block;text-align:center;padding:7px 2px}
.floating .mode-card strong{font-size:11px}
.floating .mode-icon{display:none}
.floating .mode-options{margin-top:10px}
.floating .parameter,.floating .segment-row,.floating .block-style-row,.floating .gutter-row{padding:9px 0}
.floating .parameter small{display:none}
.floating .segment-row,.floating .block-style-row,.floating .gutter-row{display:block}
.floating .segments{margin-top:6px;justify-content:space-between}
.floating .segments button{flex:1}
@media(max-width:480px){.rf-control-root:not(.floating) .mode-grid{grid-template-columns:1fr}
.segment-row,.block-style-row,.gutter-row{align-items:flex-start;flex-direction:column}
}

`;
