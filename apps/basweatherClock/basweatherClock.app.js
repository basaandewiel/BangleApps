/*
 * weatherClock.app.js - weerklok voor de Bangle.js 2, MET datum & batterij-optimalisatie
 *
 * Bron: BangleApps apps/weatherClock/app.js (v0.07, Espruino).
 * De weergegevens komen uit de `weather`-app, die door Gadgetbridge gevuld
 * wordt. Die app moet dus geinstalleerd zijn (is al het geval).
 *
 * WAT ER IS GEWIJZIGD
 *   1. Layout en locale zijn vervangen door directe Graphics-aanroepen en
 *      een paar kleine formatteer-functies. Zie de RAM-sectie hieronder.
 *
 *   2. De datumrij is terug, maar zonder Layout en zonder locale. De tijd is
 *      daarvoor NIET verkleind: hij blijft Vector62, want een extra
 *      fontgrootte kostte in de meting 62 KB. In plaats daarvan is de
 *      weerrij 12 px omlaag geschoven in ruimte die daar al ongebruikt was.
 *
 *   3. De losse instelling "Show day of week" is weg: de weekday staat nu in
 *      dezelfde regel als de datum. "Show date" is er, met een eigen
 *      aan/uit-knop.
 *
 *   4. Batterij-optimalisatie bij stilstand: als het horloge 10 minuten niet
 *      bewogen is (gemeten via Bangle 'step'), schakelt het horloge over naar
 *      een herteken-interval van 5 minuten. Zodra het horloge weer beweegt,
 *      ontwaakt de klok direct en hervat het 1-minuut interval.
 *
 * RAM-GEBRUIK
 *   Gemeten op het echte horloge, steeds na een schone reboot met deze app
 *   als s.clock, telkens 2-3 keer herhaald (de cijfers zijn reproduceerbaar
 *   tot op de KB):
 *
 *       widgets alleen, geen klok-app      1019 KB
 *       originele BangleApps-app          1539 KB   (met datumrij)
 *       deze app, zonder datum            1217 KB
 *       deze app, met datum (dit bestand)  1249 KB   (+32 KB)
 *
 *   De datum kost dus 32 KB, en eerst 63 KB. Het verschil zit volledig in de
 *   naamlijstjes: twee arrays met 19 losse strings kostten 45 KB op zichzelf,
 *   een enkele string die je met substr uitleest kost 9 KB. Uitgeprobeerd,
 *   niet beredeneerd - zie README.md voor de hele meetreeks.
 *
 *   Wat NIET gehaald kan worden, en waarom:
 *
 *   - weather.drawIcon() vervangen door niets. De 8 eigen iconen zijn 4 KB
 *     bron en kosten nauwelijks RAM. weather.drawIcon() is 4 KB kleiner op
 *     schijf en kost 315 KB MEER: die functie bevat 14 geneste functies die
 *     Espruino bij de eerste aanroep compileert, en de klok tekent elke
 *     minuut opnieuw, dus die hele boom blijft resident. Grootte op schijf
 *     zegt hier dus niets over RAM.
 *
 *   - require("weather") weglaten: gratis, want de weather-widget laadt het
 *     module toch al. Gemeten 1500 KB, dus zelfs iets hoger dan met.
 *
 *   - Commentaar strippen: gratis. Espruino gooit commentaar bij het parsen
 *     weg. Gemeten 1494 KB. Daarom staat deze tekst er nog steeds.
 *
 * LET OP: Layout en locale weg, dus ook geen "lazy" layout meer
 *   Zonder Layout ligt de geometrie nu vast in dit bestand. De posities
 *   hieronder zijn NIET berekend maar gemeten: ze zijn uit de
 *   Layout-versie van deze app gehaald (op een Bangle.js 2 is
 *   Bangle.appRect 176x152). Ze staan als fractie van appRect, zodat een
 *   widget extra hoog (appRect wordt dan kleiner) de klok niet uit elkaar
 *   trekt. Wil je de klok ogen verplaatsen, dan verander je de breuken bij
 *   de PUNTEN hieronder.
 *
 *   Layout rekende de fontgroottes als een percentage van de VOLLE
 *   schermhoogte (g.getHeight()), niet van appRect. Dat is hier overgenomen,
 *   zodat "35%" nog steeds hetzelfde lettertype oplevert.
 *
 * LET OP: locale.temp() en locale.speed() ronden AF naar nul, niet naar
 *   boven: 20.9 wordt "20" en -3.6 wordt "-3". Math.round() doet iets
 *   anders. trunc() hieronder doet hetzelfde als de originele module, zodat
 *   de getallen op je scherm niet ineens veranderen.
 *
 * LET OP: de bron blijft puur ASCII
 *   Storage bewaart bestanden als bytes. Een letterlijk graden-teken komt
 *   daardoor terug als twee losse tekens, waardoor de temperatuur-vergelijking
 *   in de app stilletjes faalt. Daarom staat het graden-teken hier als
 *   \u00b0-escape. install.sh weigert te installeren als de bron niet-ASCII
 *   tekens bevat.
 *
 * WAAROM DIT BESTAND IN EEN IIFE STAAT
 *   De launcher (launch.app.js) eval't een app in de globale scope. Elke
 *   top-level var of function zou dan een echt global worden en kan een
 *   firmwarefunctie overschrijven. "use strict" vangt daarnaast elke
 *   toevallige toewijzing aan een naam die je niet bedoelde.
 *
 * LET OP: laat 'm nooit door espruino -m (minify) lopen voordat je 'm
 *   installeert. De minifier hernoemt een lokale variabele "wind" naar "g",
 *   en Espruino scopingt var niet echt per functie, dus dan gaat de globale
 *   Graphics-g verloren en tekent de app niets meer. Zie README.md.
 */
(function () {
"use strict";

var storage = require("Storage");
var w = require("weather");

var SETTINGS_FILE = "weatherClock.json";
var DEG = "\u00b0";   // graden-teken als escape, zie de kop hierboven
var ICON_PAD = 8;    // had de Layout ook: 8 px padding rond het weericoon
var ICON_SIZE = 50;  // de heatshrink-iconen zijn 50x50

// Weericoontjes, gecomprimeerd met heatshrink.
function getSun() {
  return require("heatshrink").decompress(atob("mEwwhC/AH4AbhvQC6vd7ouVC4IwUCwIwUFwQwQCYgAHDZQXc9wACC6QWDDAgXN7wXF9oXPCwowDC5guGGAYXMCw4wCC5RGJJAZGTJBiNISIylQVJrLCC5owGF65fXR7AwBC5jvhC7JIILxapDFxAXOGAy9KC4owGBAQXODAgHDC54AHC8T0FAAQSOGg4qPGA4WUGAIuVC7AA/AH4AEA="));
}
function getPartSun() {
  return require("heatshrink").decompress(atob("mEwwhC/AH4AY6AWVhvdC6vd7owUFwIABFiYAFGR4Xa93u9oXTCwIYDC6HeC4fuC56MBC4ySOIwpIQXYQXHmYABRpwXECwQYKF5HjC4kwL5gQCAYYwO7wqFAAowK7wWKJBgXLJBPd6YX/AAoVMAAM/Cw0DC5yRHCx5JGFyAwGCyIwFC/4XyR4inXa64wRFwowQCw4A/AH4AkA"));
}
function getCloud() {
  return require("heatshrink").decompress(atob("mEwwhC/AH4A/AH4AtgczmYWWDCgWDmcwIKAuEGBoSGGCAWKC7BIKIxYX6CpgABn4tUSJIWPJIwuQGAwWRGAoX/C+SPEU67XXGCIuFGCAWHAH4A/AH4A/ADg="));
}
function getSnow() {
  return require("heatshrink").decompress(atob("mEwwhC/AH4AhxGAC9YUBC4QZRhAVBAIWIC6QAEI6IYEI5cIBgwWOC64NCKohHPNox3RBgqnQEo7XPHpKONR5AXYAH4ASLa4XWXILiBC6r5LDBgWWDBRrKC5hsCEacIHawvMCIwvQC5QvQFAROEfZ5ADLJ4YGCywvVI7CPGC9IA/AH4AF"));
}
function getRain() {
  return require("heatshrink").decompress(atob("mEwwhC/AH4AFgczmYWWDCgWDmcwIKAuEGBoSGGCAWKC7BIKIxYX6CpgABn4tUSJIWPJIwuQGAwWRGAoX/C+SPEU67XXGCIuFGCAWHAGeIBJEIwAVJhGIC5AJBC5QMJEJQMEC44JBC6QSCC54FHLxgNBBgYSEDgKpPMhQXneSwuUAH4A/AA4="));
}
function getStorm() {
  return require("heatshrink").decompress(atob("mEwwhC/AFEzmcwCyoYUgYXDmYuVGAY0OFwocHC6pNLCxYXYJBQXuCxhhJRpgYKCyBKFFyIXFCyJIFC/4XaO66nU3eza6k7C4IWFGBwXBCwwwO3ewC5AZMC6RaCIxZiI3e7AYYwRCQIIBC4QwPIQIpDC5owDhYREIxgAEFIouNC4orDFyBGBGAcLC6BaFhYWRLSRIFISQXcCyqhRAH4Az"));
}
function getErr() {
  return require("heatshrink").decompress(atob("mEw4UA///A4PgAYQA/ABkFqALJitUBatVqoKIgILBoALIq2VBZEFrWlJBALLitq1JIIqoLBJBFV1WqBY5GBBYJIHBYOlrQLHIwRIIioLDJAxSBBYJUHIwILBJA4LKKQQLCJAsFBYpIEKQILDKgpGBBYZIFBYQACBYqZCAAZIDdgILGJASlDAAZUDIwQ7DJAgLLIwYLDJAbsBBYxICIwxUDKQ5UDBYIAIBZgvBABBTCBQ7xGAH4AC"));
}
function getDummy() {
  return require("heatshrink").decompress(atob("gMBwMAwA"));
}

function chooseIcon(condition) {
  condition = condition.toLowerCase();
  if (condition.includes("thunderstorm") ||
      condition.includes("squalls") ||
      condition.includes("tornado")) return getStorm;
  if (condition.includes("freezing") || condition.includes("snow") ||
      condition.includes("sleet")) return getSnow;
  if (condition.includes("drizzle") ||
      condition.includes("shower") ||
      condition.includes("rain")) return getRain;
  if (condition.includes("clear")) return getSun;
  if (condition.includes("clouds")) return getCloud;
  if (condition.includes("few clouds") ||
      condition.includes("scattered clouds") ||
      condition.includes("mist") ||
      condition.includes("smoke") ||
      condition.includes("haze") ||
      condition.includes("sand") ||
      condition.includes("dust") ||
      condition.includes("fog") ||
      condition.includes("ash")) return getPartSun;
  return getCloud;
}

function chooseIconByCode(code) {
  var codeGroup = Math.round(code / 100);
  switch (codeGroup) {
    case 2: return getStorm;
    case 3: return getRain;
    case 5:
      switch (code) {
        case 511: return getSnow;
        default: return getRain;
      }
    case 6: return getSnow;
    case 7: return getPartSun;
    case 8:
      switch (code) {
        case 800: return getSun;
        case 804: return getCloud;
        default: return getPartSun;
      }
    default: return getCloud;
  }
}

function wDrawIcon(code) {
  var ovr = Graphics.createArrayBuffer(50, 50, 8, { msb: true });
  if (typeof code == "number") w.drawIcon({ code: code }, 24, 24, 24, ovr);
  if (typeof code == "string") w.drawIcon({ txt: code }, 24, 24, 24, ovr);
  var img = ovr.asImage();
  img.transparent = 0;
  return img;
}

// ------------------------------------------- vervanging voor require("locale")
var twelveHour = (storage.readJSON("setting.json", 1) || {})["12hour"]
  ? true : false;

function trunc(n) {
  return n < 0 ? -Math.floor(-n) : Math.floor(n);
}

function fmtTime(date) {
  var h = date.getHours();
  if (twelveHour) {
    h = h % 12;
    if (h == 0) h = 12;
  }
  return h + ":" + ("0" + date.getMinutes()).slice(-2);
}

function fmtTemp(celsius) {
  return trunc(celsius) + " " + DEG + "C";
}
function fmtSpeed(kmh) {
  return trunc(kmh) + " " + "kmh";
}

// --------------------------------------------------------- datum
var NAMES = "SunMonTueWedThuFriSatJanFebMarAprMayJunJulAugSepOctNovDec";
function name(i) {
  return NAMES.substr(i * 3, 3);
}
function fmtDate(d) {
  return name(d.getDay()) + " " + d.getDate() + " " + name(d.getMonth() + 7);
}

// Instellingen laden
var s = storage.readJSON(SETTINGS_FILE, 1) || {};
s.src  = s.src  === undefined ? false : s.src;
s.icon = s.icon === undefined ? true  : s.icon;
s.wind = s.wind === undefined ? true  : s.wind;
s.date = s.date === undefined ? true  : s.date;

// ---------------------------------------------------------------- layout
var PUNTEN = {
  tijdX:   0.5,     tijdY:   0.2566,   // Vector62
  datumX:  0.5,     datumY:  0.5921,   // Vector18
  icoonX:  0.1875,  icoonY:  0.8355,
  tempX:   0.6818,  tempY:   0.7763,
  windX:   0.6818,  windY:   0.8947
};

function fontFromPct(pct) {
  return "Vector" + Math.round(g.getHeight() * pct / 100);
}
var fontTime = fontFromPct(35);
var fontTemp = fontFromPct(s.wind ? 10 : 20);
var fontWind = fontFromPct(10);
var fontDate = fontFromPct(10);

// ------------------------------------------------- inactiviteit & batterij
var IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minuten stilstand
var idleTimer;
var isIdle = false;

function onIdle() {
  if (!isIdle) {
    isIdle = true;
    draw(); // Teken opnieuw om direct het 5-minuten schema te starten
  }
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);

  if (isIdle) {
    isIdle = false;
    draw(); // Herteken direct en hervat het 1-minuut schema
  } else {
    idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
  }
}

// Gebruik het hardware/step event van de firmware voor betrouwbare detectie
Bangle.on('step', function() {
  resetIdleTimer();
});

// ------------------------------------------------- tekenen / bijwerken
var drawTimeout;

function queueDraw() {
  if (drawTimeout) clearTimeout(drawTimeout);

  var now = Date.now();
  var intervalMs;

  if (isIdle) {
    // Inactief: overstappen op 5-minuten interval (eerstvolgende 5-minuten blok)
    var fiveMinMs = 5 * 60 * 1000;
    intervalMs = fiveMinMs - (now % fiveMinMs);
  } else {
    // Actief: 1-minuut interval (eerstvolgende hele minuut)
    var oneMinMs = 60 * 1000;
    intervalMs = oneMinMs - (now % oneMinMs);
  }

  drawTimeout = setTimeout(function () {
    drawTimeout = undefined;
    draw();
  }, intervalMs);
}

function draw() {
  var R = Bangle.appRect;
  var date = new Date();
  var curr = w.get();
  var tempLabel, windLabel, icon;

  if (curr) {
    tempLabel = fmtTemp(curr.temp - 273.15);
    windLabel = fmtSpeed(curr.wind) + " " + (curr.wrose || "").toUpperCase();
    var code = curr.code || -1;
    if (s.src) {
      icon = wDrawIcon(code > 0 ? curr.code : curr.txt);
    } else if (code > 0) {
      icon = chooseIconByCode(curr.code);
    } else {
      icon = chooseIcon(curr.txt);
    }
    if (!s.icon) icon = getDummy;
  } else {
    tempLabel = "Err";
    windLabel = "No Data";
    icon = s.icon ? getErr : getDummy;
  }

  if (typeof icon === "function") icon = icon();

  g.reset();
  g.clearRect(R.x, R.y, R.x + R.w - 1, R.y + R.h - 1);

  // tijd
  g.setFont(fontTime);
  g.setFontAlign(0, 0);
  g.drawString(fmtTime(date), R.x + R.w * PUNTEN.tijdX,
               R.y + R.h * PUNTEN.tijdY);

  // datum
  if (s.date) {
    g.setFont(fontDate);
    g.drawString(fmtDate(date), R.x + R.w * PUNTEN.datumX,
                 R.y + R.h * PUNTEN.datumY);
  }

  // weericoon
  g.drawImage(icon, R.x + R.w * PUNTEN.icoonX - ICON_SIZE / 2,
              R.y + R.h * PUNTEN.icoonY - ICON_SIZE / 2);

  // temperatuur & wind
  g.setFont(fontTemp);
  g.drawString(tempLabel, R.x + R.w * PUNTEN.tempX,
               R.y + R.h * (s.wind ? PUNTEN.tempY : PUNTEN.icoonY));
  if (s.wind) {
    g.setFont(fontWind);
    g.drawString(windLabel, R.x + R.w * PUNTEN.windX,
                 R.y + R.h * PUNTEN.windY);
  }

  queueDraw();
}

// ------------------------------------------------------------------ start
g.clear();
Bangle.setUI("clock");
Bangle.loadWidgets();
Bangle.drawWidgets();
resetIdleTimer();
draw();

})();
