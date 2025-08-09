export class WinScene{
  constructor(Engine){ this.E = Engine; this.t = 0; }
  enter(){
    this.E.showDialog(
      "Amazing! MrPi collected every golden token.\nThe islanders cheer, and a new adventure awaits…",
      "Play Again",
      ()=> location.reload()
    );
  }
  exit(){ this.E.hideDialog(); }
  update(dt){ this.t += dt; }
  draw(g,w,h){
    const grd = g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#dff5ff'); grd.addColorStop(1,'#bfe8ff');
    g.fillStyle = grd; g.fillRect(0,0,w,h);
    g.fillStyle='#0b2238'; g.font='bold 28px system-ui,sans-serif'; g.textAlign='center';
    g.fillText('You collected all tokens!', w/2, h/2-8);
    g.font='18px system-ui,sans-serif'; g.fillText('Tap “Play Again” to restart', w/2, h/2+18);
  }
}
