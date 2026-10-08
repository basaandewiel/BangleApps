(() => {
  // Variabele om de stappen in op te slaan (beschikbaar binnen deze module)
  let currentSteps = 0;

  WIDGETS["widbaspb"] = {
    area: "tl",
    sortorder: -1,
    width: 49,
    draw: function() {
      // Gebruik direct de reeds opgeslagen stappen en breedte
      g.reset();
      g.setColor(g.theme.bg);
      g.fillRect(this.x, this.y, this.x + this.width, this.y + 23); // achtergrond wissen
      g.setColor(g.theme.fg);
      
      const scale = 1;
      g.setFontCustom(atob("AAAAABwAAOAAAgAAHAADwAD4AB8AB8AA+AAeAADAAAAOAAP+AH/8B4DwMAGBgAwMAGBgAwOAOA//gD/4AD4AAAAAAAABgAAcAwDAGAwAwP/+B//wAAGAAAwAAGAAAAAAAAIAwHgOA4DwMA+BgOwMDmBg4wOeGA/gwDwGAAAAAAAAAGAHA8A4DwMAGBhAwMMGBjgwOcOA+/gDj4AAAAABgAAcAAHgADsAA5gAOMAHBgBwMAP/+B//wABgAAMAAAAAAAgD4OB/AwOYGBjAwMYGBjBwMe8Bh/AIHwAAAAAAAAAfAAP8AHxwB8GAdgwPMGBxgwMOOAB/gAH4AAAAAAABgAAMAABgAwMAeBgPgMHwBj4AN8AB+AAPAABAAAAAAAMfAH38B/xwMcGBhgwMMGBjgwP+OA+/gDj4AAAAAAAAOAAH4AA/gQMMGBgzwME8BhvAOPgA/4AD8AAEAAAAAAGAwA4OAHBwAAA="), 46, atob("BAgMDAwMDAwMDAwMBQ=="), 21+(scale<<8)+(1<<16));
      g.setFontAlign(-1, 0);
      g.drawString(currentSteps, this.x, this.y + 12);
    },
    update: function() {
      // Vraag de gezondheidsdata SLECHTS ÉÉN KEER op
      currentSteps = Bangle.getHealthStatus("day").steps;
      var nieuweBreedte = (currentSteps > 1000) ? 61 : 49;
      
      if (nieuweBreedte !== this.width) {
        this.width = nieuweBreedte;
        Bangle.drawWidgets(); // Herteken alle widgets (dit roept indirect ook draw() aan)
      } else {
        this.draw(); // Breedte is gelijk? Teken direct alleen deze widget
      }
    }
  };

  // Meteen de eerste keer updaten bij het laden van de widget
  WIDGETS["widbaspb"].update();

  // Elke 60 seconden de update-functie aanroepen
  WIDGETS["widbaspb"].interval = setInterval(() => {
    if (global.WIDGETS && WIDGETS["widbaspb"]) {
      WIDGETS["widbaspb"].update();
    }
  }, 60000);
})();
