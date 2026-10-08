WIDGETS["bat"] = {
  area: "tr",
  width: 40,
  _lastBat: -1,
  _lastChg: false,

  draw() {
    if (!Bangle.isLCDOn() || this.x === undefined) return;

    var battery = E.getBattery();
    var charging = Bangle.isCharging();

    // Skip redraw if values haven't changed
    if (battery === this._lastBat && charging === this._lastChg) return;
    this._lastBat = battery;
    this._lastChg = charging;

    var x = this.x, y = this.y;

    // Draw frame
    g.reset("widget")
     .setColor(g.theme.fg)
     .fillRect(x, y + 2, x + 35, y + 21)
     .clearRect(x + 2, y + 4, x + 33, y + 19)
     .fillRect(x + 36, y + 10, x + 39, y + 14);

    // Fill level and dynamic color
    if (battery < 20) g.setBgColor("#f00");
    else if (battery < 40) g.setBgColor(g.theme.dark ? "#ff0" : "#f80");
    else g.setBgColor("#0f0");

    g.clearRect(x + 4, y + 6, x + 4 + Math.round(battery * 0.27), y + 17);

    // Charging indicator
    if (charging) {
      g.reset("widget").drawImage(atob("FAqBAAHAAA8AAPwAB/D4f8P+Hw/gAD8AAPAAA4A="), x + 8, y + 7);
    }
  },

  remove() {
    Bangle.removeListener('charging', this._onChg);
    Bangle.removeListener('lcdPower', this._onPwr);
    delete WIDGETS["bat"];
  }
};

// Event bindings without timer loops
WIDGETS["bat"]._onChg = () => {
  if (WIDGETS["bat"]) {
    WIDGETS["bat"]._lastChg = !Bangle.isCharging(); // Force update on plug/unplug
    WIDGETS["bat"].draw();
  }
};

WIDGETS["bat"]._onPwr = (on) => {
  if (on && WIDGETS["bat"]) {
    WIDGETS["bat"]._lastBat = -1; // Force clean redraw when turning screen back on
    WIDGETS["bat"].draw();
  }
};

Bangle.on('charging', WIDGETS["bat"]._onChg);
Bangle.on('lcdPower', WIDGETS["bat"]._onPwr);
