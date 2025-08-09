:root{
  --sky:#92d4f2;
  --panel:#e9f4ff;
  --ink:#222;
  --accent:#ffcd00;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--sky)}
.wrap{max-width:680px;margin:0 auto;padding:16px}
h1{margin:.2rem 0 0;font-size:clamp(24px,5vw,40px)}
.hint{margin:.2rem 0 1rem;opacity:.85}

#game{
  width:100%;
  aspect-ratio: 3 / 4;        /* Phaser canvas will auto-fit here */
  background:linear-gradient(#cfefff,#bfe6ff);
  border:4px solid #2e2e2e;border-radius:14px;
  overflow:hidden;
}

.controls{display:flex;flex-direction:column;align-items:center;margin:14px 0 6px}
.controls .row{display:flex;gap:18px;margin-top:10px}
.btn{
  appearance:none;border:0;border-radius:14px;
  font-size:28px;line-height:1;padding:18px 22px;
  background:#ffd73a;box-shadow:0 8px 0 #c4a52b, 0 10px 18px rgba(0,0,0,.2);
  cursor:pointer; user-select:none;
}
.btn:active{transform:translateY(2px);box-shadow:0 6px 0 #c4a52b}
#up{margin-top:4px;margin-bottom:6px}

/* hide buttons on bigger screens (keyboard users) */
@media (min-width:700px){
  #controls{display:none}
}
