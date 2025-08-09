export class IntroScene{
  constructor(Engine, nextFactory){
    this.E = Engine; this.nextFactory = nextFactory;
    this.t = 0; this.phase = 0; // 0 fade, 1 pan, 2 dialog
  }
  enter(){
    this.E.showDialog(
      "A gentle breeze… MrPi wakes up on a tiny island. \"Where am I?\"\nA friendly crab scuttles by: \"Our golden MrPi tokens blew across the beach! Can you help collect them?\"",
      "I'm on it!",
      ()=>{ this.phase = 3; }
    );
  }
  exit(){ this.E.hideDialog(); }

  update(dt){
    this.t += dt;
    // nothing fancy here; cutscene is the dialog
    if (this.phase === 3){
      this.E.changeTo(this.nextFactory());
    }
  }
  draw(g,w,h){
    // soft gradient “ocean”
    const grd = g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#bfe8ff'); grd.addColorStop(1,'#9ed7ff');
    g.fillStyle = grd; g.fillRect(0,0,w,h);

    // simple island silhouette
    const cx=w/2, cy=h*0.58;
    g.fillStyle='#7ed0ff'; g.beginPath(); g.arc(cx, cy, 150, 0, Math.PI*2); g.fill(); // lagoon
    g.fillStyle='#f7d58a'; g.beginPath(); g.arc(cx, cy, 105, 0, Math.PI*2); g.fill(); // sand

    // title
    g.fillStyle='#17364b'; g.font='bold 28px system-ui, sans-serif';
    g.fillText('MrPi drifts ashore…', 24, 40);
  }
}
