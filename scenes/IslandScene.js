export class IslandScene{
  constructor(Engine, winFactory){
    this.E = Engine; this.winFactory = winFactory;
    this.w = 640; this.h = 400;
    // player
    this.player = { x:320, y:210, spd:160, img:new Image(), size:42, target:null };
    this.player.img.src = 'mrpi_logo_transparent.png';

    // tokens
    this.coinImg = new Image();
    this.coinImg.src = 'mrpi_token_transparent.png';
    this.tokens = [];
    this.total = 7;

    // camera (follows player)
    this.cam = { x:0, y:0 };

    // place tokens around island ring
    const ringR = 95;
    for(let i=0;i<this.total;i++){
      const a = i/this.total*2*Math.PI + (i%2?0.3:-0.2);
      this.tokens.push({ x:320 + Math.cos(a)*ringR, y:210 + Math.sin(a)*ringR, got:false, r:18 });
    }
  }
  enter(){ /* no-op */ }
  exit(){ /* no-op */ }

  #inputVec(){
    const {keys, joyState, pointer} = this.E;
    let dx=0, dy=0;

    // keyboard
    if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
    if (keys.has('ArrowRight')|| keys.has('d')) dx += 1;
    if (keys.has('ArrowUp')   || keys.has('w')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) dy += 1;

    // virtual joystick
    if (joyState.active){
      dx += joyState.dx; dy += joyState.dy;
    }

    // tap-to-move
    if (pointer.active){
      this.player.target = {x:pointer.x, y:pointer.y};
    }

    // steer to target
    if (this.player.target){
      const tx = this.player.target.x - this.player.x;
      const ty = this.player.target.y - this.player.y;
      const dist = Math.hypot(tx,ty);
      if (dist < 6) { this.player.target = null; }
      else { dx += tx/dist; dy += ty/dist; }
    }

    const len = Math.hypot(dx,dy);
    return len ? {dx:dx/len, dy:dy/len} : {dx:0,dy:0};
  }

  update(dt){
    const v = this.#inputVec();
    this.player.x += v.dx * this.player.spd * dt;
    this.player.y += v.dy * this.player.spd * dt;

    // clamp to island circle (soft)
    const cx=320, cy=210, rSand=110;
    const vx = this.player.x - cx, vy = this.player.y - cy;
    const d = Math.hypot(vx,vy);
    if (d > rSand-8){
      const k = (rSand-8)/d;
      this.player.x = cx + vx*k; this.player.y = cy + vy*k;
    }

    // collect tokens
    for (const t of this.tokens){
      if (!t.got && Math.hypot(this.player.x - t.x, this.player.y - t.y) < 26){
        t.got = true;
      }
    }
    const got = this.tokens.filter(t=>t.got).length;
    if (got === this.total){
      // small pause then win
      setTimeout(()=> this.E.changeTo(this.winFactory()), 450);
    }

    // camera follow (not strictly needed but ready for bigger maps)
    this.cam.x += (this.player.x - this.cam.x - this.w/2) * 0.08;
    this.cam.y += (this.player.y - this.cam.y - this.h/2) * 0.08;
  }

  draw(g,w,h){
    g.clearRect(0,0,w,h);

    // background ocean gradient
    const grd = g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#dff5ff'); grd.addColorStop(1,'#bfe8ff');
    g.fillStyle = grd; g.fillRect(0,0,w,h);

    // “camera” transform (kept identity for this small map)
    g.save();

    // island (water/shore/sand) — simple circles
    const cx = 320, cy = 210;
    g.fillStyle = '#7ED0FF'; g.beginPath(); g.arc(cx, cy, 150, 0, Math.PI*2); g.fill(); // lagoon
    g.fillStyle = '#50c878aa'; g.beginPath(); g.arc(cx, cy, 128, 0, Math.PI*2); g.fill(); // green ring
    g.fillStyle = '#f7d58a'; g.beginPath(); g.arc(cx, cy, 108, 0, Math.PI*2); g.fill(); // sand

    // a palm-ish tree (simple)
    g.fillStyle = '#2a8a2a';
    g.beginPath(); g.arc(cx+60, cy-10, 26, 0, Math.PI*2); g.fill();
    g.fillRect(cx+57, cy-10, 6, 42);
    g.fillStyle = '#3a9a3a';
    g.beginPath(); g.arc(cx+76, cy-4, 20, 0, Math.PI*2); g.fill();

    // tokens
    for (const t of this.tokens){
      if (t.got) continue;
      const s = 28;
      if (this.coinImg.complete) g.drawImage(this.coinImg, t.x-s/2, t.y-s/2, s, s);
      else { g.fillStyle='#f7b500'; g.beginPath(); g.arc(t.x,t.y,12,0,Math.PI*2); g.fill(); }
    }

    // player
    const p = this.player;
    const ps = p.size;
    if (p.img.complete) g.drawImage(p.img, p.x-ps/2, p.y-ps*0.9, ps, ps);
    else { g.fillStyle='#111'; g.beginPath(); g.arc(p.x,p.y,12,0,Math.PI*2); g.fill(); }

    g.restore();

    // score
    const got = this.tokens.filter(t=>t.got).length;
    g.fillStyle='#0b2238'; g.font='bold 22px system-ui, sans-serif';
    g.textAlign='center';
    g.fillText(`Score: ${got} / ${this.total}`, w/2, h-12);
    g.textAlign='left';
  }
}
