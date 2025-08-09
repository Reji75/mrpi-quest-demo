import { IntroScene } from './scenes/IntroScene.js';
import { IslandScene } from './scenes/IslandScene.js';
import { WinScene } from './scenes/WinScene.js';

/* --------- tiny engine --------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = () => canvas.width;
const H = () => canvas.height;

const dialog = document.getElementById('dialog');
const actionBtn = document.getElementById('actionBtn');

/** scene manager **/
const Scenes = {
  stack: [],
  push(scene){ this.stack.push(scene); scene.enter(); },
  replace(scene){ const old = this.stack.pop(); old && old.exit?.(); this.push(scene); },
  current(){ return this.stack[this.stack.length-1]; }
};

let last = performance.now();
function loop(t){
  const dt = Math.min(0.033, (t - last) / 1000); last = t;
  // resize (keeps aspect while allowing CSS scale)
  const ratio = 640/400; // logical aspect
  if (canvas.clientWidth && canvas.clientHeight){
    const wantW = 640;
    const wantH = Math.round(wantW/ratio);
    if (canvas.width !== wantW || canvas.height !== wantH){
      canvas.width = wantW; canvas.height = wantH;
    }
  }
  Scenes.current().update(dt);
  Scenes.current().draw(ctx, W(), H());
  requestAnimationFrame(loop);
}

/* --------- input: keys + tap + joystick --------- */
const keys = new Set();
window.addEventListener('keydown', e => keys.add(e.key));
window.addEventListener('keyup', e => keys.delete(e.key));

const pointer = {active:false,x:0,y:0,dx:0,dy:0};
function pointerEvt(e, down){
  const rect = canvas.getBoundingClientRect();
  const p = 'touches' in e ? e.touches[0] : e;
  pointer.x = (p.clientX - rect.left) * (canvas.width / rect.width);
  pointer.y = (p.clientY - rect.top) * (canvas.height / rect.height);
  pointer.active = down;
}
canvas.addEventListener('pointerdown', e => pointerEvt(e, true));
canvas.addEventListener('pointermove', e => pointerEvt(e, pointer.active));
canvas.addEventListener('pointerup',   e => pointerEvt(e, false));
canvas.addEventListener('pointerleave',e => pointerEvt(e, false));
canvas.addEventListener('touchstart', e => { pointerEvt(e, true); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchmove',  e => { pointerEvt(e, true); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchend',   e => { pointerEvt(e, false); e.preventDefault(); }, {passive:false});

/* touch joystick */
const joy = document.getElementById('joystick');
const stick = joy.querySelector('.stick');
const joyState = {dx:0,dy:0,active:false};
let joyTouchId = null;
function joyHandle(e, down){
  const rect = joy.getBoundingClientRect();
  const t = (e.touches ? [...e.touches].find(t=> t.identifier===joyTouchId) || e.touches[0] : e);
  if (!t) return;
  const x = t.clientX - rect.left - rect.width/2;
  const y = t.clientY - rect.top - rect.height/2;
  const len = Math.hypot(x,y);
  const max = rect.width/2 - 20;
  const nx = len ? x/len : 0, ny = len ? y/len : 0;
  const mag = Math.min(1, len/max);
  joyState.dx = nx*mag; joyState.dy = ny*mag; joyState.active = down;
  stick.style.transform = `translate(${nx*max}px, ${ny*max}px)`;
}
joy.addEventListener('touchstart',e=>{ joyTouchId = e.changedTouches[0].identifier; joyHandle(e,true); },{passive:false});
joy.addEventListener('touchmove', e=>{ joyHandle(e,true); e.preventDefault(); },{passive:false});
['touchend','touchcancel'].forEach(evt=>{
  joy.addEventListener(evt, e=>{ if ([...e.changedTouches].some(t=>t.identifier===joyTouchId)){ joyState.active=false; joyState.dx=joyState.dy=0; stick.style.transform='translate(0,0)'; }});
});

/* --------- helpers used by scenes --------- */
export const Engine = {
  canvas, ctx, keys, pointer, joyState,
  showDialog(text, buttonLabel='Continue', onClick=null){
    dialog.textContent = text;
    dialog.classList.remove('hidden');
    actionBtn.textContent = buttonLabel;
    actionBtn.classList.remove('hidden');
    actionBtn.onclick = () => {
      dialog.classList.add('hidden'); actionBtn.classList.add('hidden');
      onClick && onClick();
    };
  },
  hideDialog(){ dialog.classList.add('hidden'); actionBtn.classList.add('hidden'); },
  changeTo(scene){ Scenes.replace(scene); },
};

/* --------- boot --------- */
Scenes.push(new IntroScene(Engine, ()=> new IslandScene(Engine, ()=> new WinScene(Engine))));
requestAnimationFrame(loop);
