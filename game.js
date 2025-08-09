/* MrPi Island Quest — Isometric Prototype (Phaser 3) */
/* No external assets: everything is drawn at runtime */

(() => {
  const TILE_W = 64;      // diamond width
  const TILE_H = 32;      // diamond height
  const MAP_W  = 12;      // grid width
  const MAP_H  = 12;      // grid height

  let score = 0;
  let lives = 3;
  const hud = {
    score: () => document.getElementById('score').textContent = score,
    lives: () => document.getElementById('lives').textContent = lives,
    status: (t) => document.getElementById('status').textContent = t
  };

  // isometric helpers
  const isoToScreen = (ix, iy, iz = 0) => ({
    x: (ix - iy) * (TILE_W/2),
    y: (ix + iy) * (TILE_H/2) - iz
  });

  class IsoScene extends Phaser.Scene {
    constructor(){ super('iso'); }

    preload(){}

    create(){
      // Fit canvas to parent #game
      const parent = document.getElementById('game');
      const w = parent.clientWidth;
      const h = parent.clientHeight;

      this.cameras.main.setBackgroundColor(0x000000); // hidden by container style
      this.center = new Phaser.Math.Vector2(w/2, h/2 + 40);

      // Group/containers
      this.world = this.add.container(this.center.x, this.center.y);

      // Create a very simple round island mask (just for vibe)
      this._drawBackdrop();

      // Build diamond tiles
      this._buildTiles();

      // Entities
      this.player = this._spawnPlayer(6, 6);
      this.coins  = this._scatterCoins(7);
      this.crabs  = this._spawnCrabs(3);

      // Input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      // Swipe / tap: compute direction vector to last pointer position
      this.pointer = null;
      this.input.on('pointerdown', (p)=> this.pointer = p);
      this.input.on('pointerup', ()=> this.pointer = null);
      this.input.on('pointermove', (p)=> { if(this.pointer) this.pointer = p; });

      hud.status('Ready.');
      hud.score(); hud.lives();

      // Camera little float
      this.tweens.add({
        targets: this.world,
        y: this.center.y + 6,
        duration: 1800,
        yoyo: true, repeat:-1, ease:'sine.inOut'
      });
    }

    _drawBackdrop(){
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      // soft vignette edges drawn by CSS shadows — nothing else needed here
    }

    _buildTiles(){
      const g = this.add.graphics();
      const ringR = 4.5; // where “water/grass/sand” color rings will change

      for(let y=0;y<MAP_H;y++){
        for(let x=0;x<MAP_W;x++){
          // distance from center for tint rings
          const dx = x - MAP_W/2 + 0.5;
          const dy = y - MAP_H/2 + 0.5;
          const d = Math.hypot(dx,dy);

          let color;
          if (d > ringR+2) color = 0xd0ecff;     // pale water
          else if (d > ringR) color = 0xa5d6ff;  // deeper water ring
          else if (d > ringR-2) color = 0x53a86a;// grass ring
          else color = 0xe8c98e;                 // sand center

          const p = isoToScreen(x, y);
          g.fillStyle(color, 1);
          g.beginPath();
          // draw diamond tile
          g.moveTo(this.center.x + p.x,                 this.center.y + p.y);
          g.lineTo(this.center.x + p.x + TILE_W/2,      this.center.y + p.y + TILE_H/2);
          g.lineTo(this.center.x + p.x,                 this.center.y + p.y + TILE_H);
          g.lineTo(this.center.x + p.x - TILE_W/2,      this.center.y + p.y + TILE_H/2);
          g.closePath();
          g.fill();
        }
      }

      // One simple “tree”
      const t = isoToScreen(8, 7);
      const tree = this.add.container(this.center.x + t.x, this.center.y + t.y + TILE_H/2);
      const trunk = this.add.rectangle(0, 0, 10, 24, 0x6b4c2e).setOrigin(0.5,1);
      const crown = this.add.ellipse(0, -22, 90, 60, 0x2f8c46).setStrokeStyle(4, 0x246a36);
      tree.add([crown, trunk]);
      this.world.add(tree);
    }

    _spawnPlayer(gx, gy){
      const p = this.add.container(0,0);
      const face = this.add.circle(0, -10, 12, 0xffffff).setStrokeStyle(3,0x222222);
      const hat  = this.add.rectangle(0, -22, 26, 8, 0x1d2330).setOrigin(0.5,1);
      const brim = this.add.rectangle(0, -22, 34, 4, 0x1d2330).setOrigin(0.5,0.5);
      const eyeL = this.add.circle(-6, -12, 3, 0x111111);
      const eyeR = this.add.circle( 6, -12, 3, 0x111111);
      const tux  = this.add.ellipse(0, 6, 24, 28, 0x1b2a38);
      p.add([tux, face, hat, brim, eyeL, eyeR]);

      p.gx = gx; p.gy = gy; p.iz = 0;
      p.speed = 6; // tiles per second
      p.target = {gx, gy};
      this._placeIso(p);
      this.world.add(p);

      // bobbing
      this.tweens.add({ targets:p, y: '+=3', duration: 800, yoyo:true, repeat:-1, ease:'sine.inOut' });
      return p;
    }

    _placeIso(obj){
      const s = isoToScreen(obj.gx, obj.gy, obj.iz);
      obj.x = s.x; obj.y = s.y;
    }

    _scatterCoins(n){
      const group = this.add.group();
      let placed = 0;
      while(placed < n){
        const gx = Phaser.Math.Between(2, MAP_W-3);
        const gy = Phaser.Math.Between(2, MAP_H-3);
        // avoid player start
        if (gx === 6 && gy === 6) continue;

        const c = this.add.container(0,0);
        const s = this.add.circle(0,0, 8, 0xf2b20c).setStrokeStyle(3, 0x9a6a00);
        const shine = this.add.arc(0,-3, 6, 300, 20, false, 0xffffff, 0.85);
        c.add([s, shine]);
        c.gx = gx; c.gy = gy; c.iz = 2;
        this._placeIso(c);
        this.world.add(c);
        group.add(c);

        this.tweens.add({targets:c, y:'-=4', duration:1000, yoyo:true, repeat:-1, ease:'sine.inOut'});
        placed++;
      }
      return group;
    }

    _spawnCrabs(count){
      const g = this.add.group();
      for(let i=0;i<count;i++){
        const pathR = Phaser.Math.Between(3, 4); // ring to patrol
        let theta = Phaser.Math.FloatBetween(0, Math.PI*2);
        const crab = this.add.container(0,0);
        const body = this.add.circle(0,0,10,0xe24b3c).setStrokeStyle(3,0xb13528);
        const eye1 = this.add.circle(-4,-6,2,0xffffff).setStrokeStyle(2,0x000000);
        const eye2 = this.add.circle( 4,-6,2,0xffffff).setStrokeStyle(2,0x000000);
        const dot1 = this.add.circle(-4,-6,1,0x000000);
        const dot2 = this.add.circle( 4,-6,1,0x000000);
        crab.add([body, eye1, eye2, dot1, dot2]);
        crab.theta = theta; crab.r = pathR;
        crab.speed = 0.8 + Math.random()*0.6; // radians/sec
        this._placeCrab(crab);
        this.world.add(crab);
        g.add(crab);

        this.tweens.add({targets:crab, y:'+=2', duration:700, yoyo:true, repeat:-1, ease:'sine.inOut'});
      }
      return g;
    }
    _placeCrab(crab){
      // convert polar ring position into grid approx (centered)
      const cx = MAP_W/2, cy = MAP_H/2;
      const gx = cx + crab.r*Math.cos(crab.theta);
      const gy = cy + crab.r*Math.sin(crab.theta);
      const s = isoToScreen(gx, gy, 1);
      crab.x = s.x; crab.y = s.y;
      crab.gx = gx; crab.gy = gy;
    }

    update(time, dtMS){
      const dt = dtMS/1000;

      // keyboard
      let dx=0, dy=0;
      if (this.cursors.left.isDown || this.wasd.A.isDown)  dx -= 1;
      if (this.cursors.right.isDown|| this.wasd.D.isDown)  dx += 1;
      if (this.cursors.up.isDown   || this.wasd.W.isDown)  dy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown)  dy += 1;

      // swipe / drag
      if (this.pointer){
        // vector from player screen pos to pointer
        const ps = isoToScreen(this.player.gx, this.player.gy);
        const px = this.center.x + ps.x;
        const py = this.center.y + ps.y;
        const vx = this.pointer.x - px;
        const vy = this.pointer.y - py;
        // convert screen vector toward iso axes (roughly)
        const toIsoX =  (vx/(TILE_W/2) - vy/(TILE_H/2))/2;
        const toIsoY = -(vx/(TILE_W/2) + vy/(TILE_H/2))/2;
        dx += Phaser.Math.Clamp(toIsoX, -1, 1);
        dy += Phaser.Math.Clamp(toIsoY, -1, 1);
      }

      // normalize
      if (dx || dy){
        const len = Math.hypot(dx,dy) || 1;
        dx/=len; dy/=len;
        this.player.gx = Phaser.Math.Clamp(this.player.gx + dx*this.player.speed*dt, 1, MAP_W-2);
        this.player.gy = Phaser.Math.Clamp(this.player.gy + dy*this.player.speed*dt, 1, MAP_H-2);
        this._placeIso(this.player);
      }

      // wobble “jump” when moving
      this.player.iz = (dx||dy) ? 6*Math.abs(Math.sin(time*0.01)) : 0;

      // coin collection
      this.coins.children.iterate((c)=>{
        if (!c) return;
        const d = Phaser.Math.Distance.Between(c.gx, c.gy, this.player.gx, this.player.gy);
        if (d < 0.7){
          c.destroy();
          score++; hud.score();
          hud.status('Nice! +1 MrPi token');
          this.tweens.addCounter({
            from:0, to:100, duration:350,
            onUpdate: t=>{
              const k = t.getValue()/100;
              this.cameras.main.setZoom(1+0.02*Math.sin(k*Math.PI));
            },
            onComplete: ()=> this.cameras.main.setZoom(1)
          });
        }
      });

      // crabs patrol + collision
      this.crabs.children.iterate((crab)=>{
        crab.theta += crab.speed*dt;
        this._placeCrab(crab);
        const d = Phaser.Math.Distance.Between(crab.gx, crab.gy, this.player.gx, this.player.gy);
        if (d < 0.7){
          // hit once then give brief i-frames
          if (!crab._cool){
            crab._cool = true;
            this.time.delayedCall(600, ()=> crab._cool=false);
            lives = Math.max(0, lives-1); hud.lives();
            hud.status('Ouch! Crab got you.');
            this.tweens.add({targets:this.world, x:this.center.x+6, duration:60, yoyo:true, repeat:6,
              onComplete:()=> this.world.x = this.center.x});
          }
        }
      });
    }
  }

  // ----- Boot Phaser -----
  const parent = document.getElementById('game');
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#bfe6ff',
    scene: [IsoScene],
    physics: { default: 'arcade' } // (unused but fine)
  };
  const game = new Phaser.Game(config);

  // Resize with container
  window.addEventListener('resize', () => {
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    game.scale.resize(w, h);
  });
})();
