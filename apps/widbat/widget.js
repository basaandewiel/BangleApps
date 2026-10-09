WIDGETS["bat"]={area:"tr",width:40,draw() {
  var x = this.x, y = this.y;
  g.reset("widget").setColor(g.theme.fg).fillRect(x,y+2,x+35,y+21).clearRect(x+2,y+4,x+33,y+19).fillRect(x+36,y+10,x+39,y+14);
// Resets graphics state specifically for widget context (g.reset("widget")).
// fillRect(...): Draws a filled rectangle for the main body outer boundary.
// clearRect(...): Hollows out the center to create a 2-pixel wide outline/border.
// fillRect(...): Adds a small rectangle on the far right (x+36 to x+39) representing the positive battery nub/terminal.

  var battery = E.getBattery();
  if(battery < 20) g.setBgColor("#f00"); 
  else if (battery < 40) g.setBgColor(g.theme.dark ? "#ff0" : "#f80");
  else g.setBgColor("#0f0");
// battery * 27 / 100 maps the 0–100% value to a pixel width inside the inner battery shell (maximum inner width is 27 pixels).
  g.clearRect(x+4,y+6,x+4+battery*27/100,y+17);
  if (Bangle.isCharging())
    g.reset("widget").drawImage(atob("FAqBAAHAAA8AAPwAB/D4f8P+Hw/gAD8AAPAAA4A="),x+8,y+7);
}, remove() {
  Bangle.removeListener('charging', WIDGETS["bat"].onCharging);
  clearInterval(WIDGETS["bat"].interval);
  delete WIDGETS["bat"];
}, onCharging(charging) {
// When plugged in or unplugged, onCharging triggers an immediate draw() and calls g.flip() to force the display buffer to flush instantly to the screen without waiting for the next 1-minute timer pass.
  WIDGETS["bat"].draw();
  g.flip();
}, interval : setInterval(()=>WIDGETS["bat"].draw(), 60000)};
Bangle.on('charging', WIDGETS["bat"].onCharging);
