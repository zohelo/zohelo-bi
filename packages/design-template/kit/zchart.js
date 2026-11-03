/* zohelo design template — chart kit (zchart.js)
 * Every chart type of the dashboard chart library, drawn as plain SVG from sample data.
 * window.ZChart.groups      : [{title, desc, charts:[chart]}]
 * window.ZChart.byKind(kind): one chart object
 * window.ZChart.svg(chart)  : SVG markup (viewBox 0 0 400 230, text >= 10px, tokens via CSS vars with fallbacks)
 * window.ZChart.card(chart, opts): the full chart card (kind tag, title, subtitle, chart, legend, when/avoid)
 * Sample data only. Production charts are built from packages/visuals; this kit is the visual reference.
 */
(function () {
  function build() {
    var INK = '#111827', INK2 = '#374151', INK3 = '#6B7280', GRID = '#E5E7EB', S1 = '#2a78d6', S2 = '#eb6834', S3 = '#1baf7a', CTX = '#848D9A', NEG = '#d0484a';
    var SEQ = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];
    var X0 = 40, X1 = 384, Y0 = 12, Y1 = 196;
    function fmt(v, d) { return (d === undefined ? String(v) : v.toFixed(d)).replace('.', ','); }
    function chart(o) { return { kind: o.kind, title: o.title, sub: o.sub, aria: o.title, use: o.use, avoid: o.avoid, grid: [], rects: [], paths: [], circles: [], texts: [], legend: o.legend || [] }; }
    function T(c, x, y, t, o) { o = o || {}; c.texts.push({ x: (+x).toFixed(1), y: (+y).toFixed(1), t: t, size: o.size || 11, f: o.f || INK3, a: o.a || 'start', wt: o.wt || '400' }); }
    function R(c, x, y, w, h, f, o) { o = o || {}; c.rects.push({ x: (+x).toFixed(1), y: (+y).toFixed(1), w: Math.max(0, w).toFixed(1), h: Math.max(0, h).toFixed(1), f: f, rx: o.rx === undefined ? 2 : o.rx, s: o.s || 'none', sw: o.sw || 0 }); }
    function P(c, d, s, w, o) { o = o || {}; c.paths.push({ d: d, s: s, w: w, fill: o.fill || 'none', dash: o.dash || 'none', op: o.op || 1 }); }
    function G(c, d, s, w, o) { o = o || {}; c.grid.push({ d: d, s: s, w: w, dash: o.dash || 'none' }); }
    function C(c, x, y, r, f) { c.circles.push({ x: (+x).toFixed(1), y: (+y).toFixed(1), r: r, f: f }); }
    function sy(v, min, max) { return Y1 - (v - min) / (max - min) * (Y1 - Y0); }
    function sxN(i, n) { return X0 + (X1 - X0) * i / (n - 1); }
    function yAxis(c, min, max, ticks, d, suffix, xEnd) {
      ticks.forEach(function (t) { var y = sy(t, min, max); G(c, 'M' + X0 + ' ' + y.toFixed(1) + 'H' + (xEnd || X1), t === 0 ? '#9CA3AF' : GRID, 1); T(c, X0 - 6, y + 4, fmt(t, d) + (suffix || ''), { a: 'end' }); });
    }
    function line(vals, min, max, xs) { var d = ''; vals.forEach(function (v, i) { var x = xs ? xs[i] : sxN(i, vals.length); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + sy(v, min, max).toFixed(1); }); return d; }
    function interp(keys, n) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var a = keys[0], b = keys[keys.length - 1];
        for (var k = 0; k < keys.length - 1; k++) { if (i >= keys[k][0] && i <= keys[k + 1][0]) { a = keys[k]; b = keys[k + 1]; break; } }
        var t = b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]);
        out.push(a[1] + (b[1] - a[1]) * t);
      }
      return out;
    }
    var N = 129;
    var plI = interp([[0,-0.2],[24,1.6],[48,3.8],[60,3.6],[72,8.7],[78,14.2],[85,18.0],[96,4.5],[102,2.8],[108,4.9],[114,4.1],[120,3.2],[128,2.9]], N);
    var czI = interp([[0,0.6],[24,2.2],[48,3.8],[60,2.2],[72,8.8],[81,17.3],[84,15.7],[96,2.0],[108,2.8],[120,2.4],[128,2.5]], N);
    var huI = interp([[0,1.0],[24,2.4],[48,4.7],[60,3.0],[72,7.9],[84,26.2],[96,3.8],[108,5.7],[120,4.6],[128,4.3]], N);
    var deI = interp([[0,0.4],[24,1.4],[48,1.6],[60,1.6],[72,5.1],[81,10.9],[84,9.2],[96,3.1],[108,2.8],[120,2.1],[128,2.1]], N);
    function yearTicks(c, years, first, last) { years.forEach(function (yr) { var x = X0 + (X1 - X0) * (yr - first) / (last - first); T(c, x, 214, String(yr), { a: 'middle' }); }); }

    // ---------- 1. line with band
    var c1 = chart({ kind: 'Linia + pasmo', title: 'Inflacja w paśmie celu NBP', sub: 'HICP r/r, %, miesięcznie, 2016–2026', use: 'Jedna seria w czasie z punktem odniesienia (cel, średnia).', avoid: 'Więcej niż 5 linii; oś przerwana bez oznaczenia.', legend: [{ c: S1, t: 'Polska', h: 3 }, { c: '#E8EFF8', t: 'cel NBP 1,5–3,5% (przerywane krawędzie)', h: 10 }, { c: '#9CA3AF', t: 'dymek po najechaniu', h: 2 }] });
    yAxis(c1, -2, 20, [0, 5, 10, 15, 20], undefined);
    R(c1, X0, sy(3.5, -2, 20), X1 - X0, sy(1.5, -2, 20) - sy(3.5, -2, 20), '#E8EFF8', { rx: 0 }); G(c1, 'M' + X0 + ' ' + sy(3.5, -2, 20).toFixed(1) + 'H' + X1 + 'M' + X0 + ' ' + sy(1.5, -2, 20).toFixed(1) + 'H' + X1, '#5F84B5', 1, { dash: '3 3' });
    P(c1, line(plI, -2, 20), S1, 2.25);
    C(c1, X1, sy(2.9, -2, 20), 3.5, S1); T(c1, X1 - 4, sy(2.9, -2, 20) - 8, '2,9%', { a: 'end', f: INK, wt: '600' });
    var tx = sxN(85, N); G(c1, 'M' + tx.toFixed(1) + ' ' + Y0 + 'V' + Y1, '#9CA3AF', 1); C(c1, tx, sy(18, -2, 20), 4.5, S1);
    R(c1, tx + 10, 14, 118, 44, '#FFFFFF', { rx: 6, s: '#D5D9DF', sw: 1 }); T(c1, tx + 20, 31, 'luty 2023', { size: 11, f: INK2 }); T(c1, tx + 20, 49, 'Polska  18,0%', { size: 12, f: INK, wt: '600' });
    yearTicks(c1, [2016, 2018, 2020, 2022, 2024, 2026], 2016, 2026.67);

    // ---------- 2. highlight line
    var c2 = chart({ kind: 'Linia z wyróżnieniem', title: 'Polska na tle sąsiadów', sub: 'HICP r/r, %, Polska i 3 kraje', use: 'Jedna seria jest bohaterem, reszta to kontekst.', avoid: 'Kilka równie jaskrawych kolorów; legenda daleko od linii.', legend: [{ c: S1, t: 'Polska', h: 3 }, { c: CTX, t: 'Czechy, Węgry, Niemcy', h: 3 }] });
    yAxis(c2, -2, 28, [0, 10, 20], undefined, '', X1 - 52);
    [huI, czI, deI].forEach(function (s) { P(c2, line(s, -2, 28, plI.map(function (v, i) { return X0 + (X1 - 50 - X0) * i / (N - 1); })), CTX, 1.25); });
    P(c2, line(plI, -2, 28, plI.map(function (v, i) { return X0 + (X1 - 50 - X0) * i / (N - 1); })), S1, 2.5);
    T(c2, X1 - 46, sy(4.3, -2, 28) - 3, 'Węgry 4,3', { size: 10, f: INK2 }); T(c2, X1 - 46, sy(2.9, -2, 28) + 4, 'Polska 2,9', { size: 10, f: INK, wt: '600' }); T(c2, X1 - 46, sy(2.1, -2, 28) + 15, 'Niemcy 2,1', { size: 10, f: INK2 });
    yearTicks(c2, [2016, 2021, 2026], 2016, 2026.67 + 1.6);

    // ---------- 3. columns
    var c3 = chart({ kind: 'Kolumny', title: 'PKB rośnie z wyjątkiem 2020', sub: 'PKB, wzrost realny, %, rocznie, 2015–2024', use: 'Wartości roczne lub kwartalne, kilkanaście okresów, z zerem.', avoid: 'Oś nie od zera; kolumny dla setek okresów (użyj linii).', legend: [{ c: S1, t: 'wzrost', h: 10 }, { c: NEG, t: 'spadek', h: 10 }] });
    var gdp = [3.8, 3.1, 5.1, 5.9, 4.4, -2.0, 6.9, 5.3, 0.2, 2.9];
    yAxis(c3, -4, 8, [-4, 0, 4, 8], undefined);
    gdp.forEach(function (v, i) { var w = 24, x = X0 + 8 + i * 34; var y0 = sy(0, -4, 8), y = sy(v, -4, 8); R(c3, x, Math.min(y, y0), w, Math.abs(y0 - y), v < 0 ? NEG : S1); T(c3, x + w / 2, 214, String(2015 + i).slice(2), { a: 'middle' }); });
    T(c3, X0 + 8 + 5 * 34 + 12, sy(-2, -4, 8) + 14, '−2,0', { a: 'middle', f: INK, size: 10, wt: '600' }); T(c3, X0 + 8 + 9 * 34 + 12, sy(2.9, -4, 8) - 5, '2,9', { a: 'middle', f: INK, size: 10, wt: '600' });
    // ---------- 22. contributions to growth (signed stacked columns, total as a dot)
    var c22 = chart({ kind: 'Wkłady do wzrostu', title: 'Wzrost PKB niosą konsumpcja i inwestycje', sub: 'Wkład do wzrostu realnego PKB r/r, pp, kwartalnie, 3 kw. 2021–2 kw. 2026', use: 'Składniki, które sumują się do wskaźnika głównego (PKB, CPI), w kolejnych okresach; wkłady w pp.', avoid: 'Więcej niż ~7 składników; składniki, które się nie sumują; jeden okres (użyj kaskady).', legend: [{ c: S1, t: 'konsumpcja prywatna', h: 10 }, { c: S2, t: 'konsumpcja publiczna', h: 10 }, { c: S3, t: 'inwestycje', h: 10 }, { c: '#eda100', t: 'zapasy', h: 10 }, { c: '#e87ba4', t: 'eksport netto', h: 10 }, { c: INK, t: 'PKB, r/r', h: 10 }] });
    var r22 = [[6.0, 2.6, 0.9, 1.0, 2.4, -0.9], [8.0, 4.1, 0.6, 1.1, 3.6, -1.4], [8.8, 6.4, 0.2, 0.6, 3.5, -1.9], [6.0, 3.8, 0.1, 1.0, 2.4, -1.3], [3.9, 0.6, 0.3, 0.8, 1.2, 1.0], [2.3, -0.6, 0.1, 0.4, 0.2, 2.2], [-0.3, -0.6, 0.2, 0.5, -2.4, 2.0], [-0.6, -1.4, 0.4, 0.4, -2.0, 2.0], [0.5, 0.3, 0.6, 1.4, -3.7, 1.9], [1.0, 0.4, 0.7, 1.5, -2.9, 1.3], [1.9, 2.8, 0.9, -0.4, 0.0, -1.4], [3.2, 2.6, 1.1, -0.3, 1.0, -1.2], [2.7, 0.2, 0.9, -0.2, 2.6, -0.8], [3.4, 1.9, 0.9, -1.5, 3.4, -1.3], [3.2, 1.4, 0.7, 0.4, 2.0, -1.3], [3.4, 2.5, 0.8, 0.3, 0.5, -0.7], [3.7, 1.9, 0.6, 1.4, 0.6, -0.8], [3.6, 1.8, 0.5, 1.8, 0.4, -0.9], [3.5, 1.7, 0.5, 1.9, 0.3, -0.9], [3.3, 1.6, 0.5, 2.0, 0.1, -0.9]];
    var col22 = [S1, S2, S3, '#eda100', '#e87ba4'], st22 = (X1 - X0) / r22.length;
    yAxis(c22, -4, 12, [-4, 0, 4, 8, 12], undefined);
    r22.forEach(function (r, i) {
      var x = X0 + i * st22 + st22 * 0.15, w = st22 * 0.7, pos = 0, neg = 0;
      r.slice(1).forEach(function (v, k) { if (!v) return; var a = v > 0 ? pos : neg, b = a + v; if (v > 0) pos = b; else neg = b; R(c22, x, sy(Math.max(a, b), -4, 12) + 0.5, w, Math.max(0.5, Math.abs(sy(a, -4, 12) - sy(b, -4, 12)) - 1), col22[k], { rx: 0 }); });
      C(c22, x + w / 2, sy(r[0], -4, 12), 3.5, INK);
      if (i % 4 === 2) T(c22, x + w / 2 + st22 * (i === 18 ? 0.5 : 1.5), 214, String(2022 + (i - 2) / 4), { a: 'middle' });
    });
    P(c22, 'M' + X0 + ' ' + sy(0, -4, 12).toFixed(1) + 'H' + X1, '#4B5563', 1.25);
    T(c22, X0 + 19.5 * st22, sy(3.3, -4, 12) - 22, '3,3', { a: 'middle', f: INK, size: 10, wt: '600' });

    // ---------- 4. small multiples
    var c4 = chart({ kind: 'Małe wielokrotności', title: 'Bezrobocie spada w każdym regionie', sub: 'Stopa bezrobocia rejestrowanego, %, 2015–2025, wspólna skala', use: 'Ten sam wskaźnik dla 4–12 obszarów; porównanie kształtów.', avoid: 'Różne skale osi w panelach; więcej niż 12 paneli.' });
    var reg = [['Mazowieckie', 8.5, 3.6], ['Śląskie', 9.6, 3.9], ['Wielkopolskie', 6.4, 2.9], ['Małopolskie', 8.9, 4.0], ['Lubelskie', 11.7, 6.5], ['Warmińsko-maz.', 16.3, 7.6]];
    reg.forEach(function (r, i) {
      var col = i % 3, row = Math.floor(i / 3), px = 8 + col * 130, py = 4 + row * 108, w = 118, h = 74;
      R(c4, px, py + 18, w, h, '#F8FAFC', { rx: 4 });
      T(c4, px + 4, py + 12, r[0], { f: INK, size: 10, wt: '600' });
      var vals = []; for (var k = 0; k <= 10; k++) vals.push(r[1] + (r[2] - r[1]) * Math.pow(k / 10, 0.8));
      var d = ''; vals.forEach(function (v, k) { var x = px + 6 + (w - 12) * k / 10, y = py + 18 + h - 6 - (v - 0) / 18 * (h - 12); d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); });
      P(c4, d, S1, 1.75);
      T(c4, px + w - 4, py + 18 + h + 14, fmt(r[2], 1) + '%', { a: 'end', size: 10, f: INK2 });
    });

    // ---------- 5. stacked area 100%
    var c5 = chart({ kind: 'Obszar 100%', title: 'Węgiel traci udział w produkcji prądu', sub: 'Struktura produkcji energii elektrycznej, %, 2015–2025', use: 'Zmiana struktury w czasie, 2–4 składniki.', avoid: 'Więcej niż 4 warstwy; porównywanie górnych warstw (użyj linii).', legend: [{ c: CTX, t: 'węgiel', h: 10 }, { c: S2, t: 'gaz', h: 10 }, { c: S3, t: 'OZE', h: 10 }] });
    var coal = [81, 79, 78, 77, 74, 70, 72, 70, 61, 57, 53], gas = [5, 6, 7, 8, 9, 10, 9, 7, 9, 11, 12];
    var n5 = coal.length; var xs5 = coal.map(function (v, i) { return X0 + (X1 - X0) * i / (n5 - 1); });
    function area(lo, hi) { var d = 'M' + xs5[0].toFixed(1) + ' ' + sy(hi[0], 0, 100).toFixed(1); for (var i = 1; i < n5; i++) d += 'L' + xs5[i].toFixed(1) + ' ' + sy(hi[i], 0, 100).toFixed(1); for (var j = n5 - 1; j >= 0; j--) d += 'L' + xs5[j].toFixed(1) + ' ' + sy(lo[j], 0, 100).toFixed(1); return d + 'Z'; }
    var zero = coal.map(function () { return 0; }), cg = coal.map(function (v, i) { return v + gas[i]; }), all = coal.map(function () { return 100; });
    P(c5, area(zero, coal), '#FFFFFF', 1.5, { fill: CTX }); P(c5, area(coal, cg), '#FFFFFF', 1.5, { fill: S2 }); P(c5, area(cg, all), '#FFFFFF', 1.5, { fill: S3 });
    [0, 50, 100].forEach(function (t) { T(c5, X0 - 6, sy(t, 0, 100) + 4, t + '%', { a: 'end' }); });
    T(c5, X1 - 6, sy(25, 0, 100), 'węgiel 53%', { a: 'end', f: INK, wt: '600' }); T(c5, X1 - 6, sy(85, 0, 100), 'OZE 35%', { a: 'end', f: INK, wt: '600' });
    yearTicks(c5, [2015, 2020, 2025], 2015, 2025);

    // ---------- 6. ranked bars
    var c6 = chart({ kind: 'Słupki rankingowe', title: 'Mazowieckie daleko przed resztą', sub: 'PKB na mieszkańca, Polska = 100, 2023, 8 z 16 województw', use: 'Porządek i wielkość dla wielu kategorii o długich nazwach.', avoid: 'Kolejność alfabetyczna; kolor każdego słupka inny.', legend: [{ c: S1, t: 'wybrane województwo', h: 10 }, { c: '#9CA3AF', t: 'Polska = 100', h: 2 }] });
    var r6 = [['Mazowieckie', 160], ['Dolnośląskie', 110], ['Wielkopolskie', 108], ['Śląskie', 101], ['Pomorskie', 97], ['Łódzkie', 94], ['Małopolskie', 93], ['Zachodniopom.', 85]];
    r6.forEach(function (r, i) { var y = 6 + i * 25, x0 = 108, w = (r[1] / 170) * 240; T(c6, x0 - 6, y + 13, r[0], { a: 'end', f: INK, size: 11 }); R(c6, x0, y, w, 17, i === 0 ? S1 : CTX); T(c6, 396, y + 13, String(r[1]), { a: 'end', f: INK, size: 11, wt: i === 0 ? '600' : '400' }); });
    G(c6, 'M' + (108 + 100 / 170 * 240).toFixed(1) + ' 2V208', '#4B5563', 1, { dash: '3 3' }); T(c6, 108 + 100 / 170 * 240, 222, 'Polska = 100', { a: 'middle', size: 10, f: INK2 });

    // ---------- 7. grouped bars
    var c7 = chart({ kind: 'Słupki grupowane', title: 'Bezrobocie: 2015 i 2025', sub: 'Stopa bezrobocia (BAEL), %, 5 krajów', use: '2–3 serie dla kilku kategorii, porównanie w grupie.', avoid: 'Więcej niż 3 serie w grupie (użyj małych wielokrotności).', legend: [{ c: CTX, t: '2015', h: 10 }, { c: S1, t: '2025', h: 10 }] });
    var r7 = [['Polska', 7.5, 3.2], ['Czechy', 5.1, 2.8], ['Niemcy', 4.6, 3.6], ['Słowacja', 11.5, 5.4], ['Litwa', 9.1, 6.9]];
    yAxis(c7, 0, 12, [0, 4, 8, 12], undefined);
    r7.forEach(function (r, i) { var gx = X0 + 14 + i * 68; R(c7, gx, sy(r[1], 0, 12), 22, sy(0, 0, 12) - sy(r[1], 0, 12), CTX); R(c7, gx + 24, sy(r[2], 0, 12), 22, sy(0, 0, 12) - sy(r[2], 0, 12), S1); T(c7, gx + 23, 214, r[0], { a: 'middle', f: INK2, size: 10 }); });

    // ---------- 8. dumbbell
    var c8 = chart({ kind: 'Wykres hantlowy', title: 'Największy spadek: Słowacja', sub: 'Stopa bezrobocia (BAEL), %, 2015 → 2025', use: 'Zmiana między dwoma punktami dla wielu kategorii.', avoid: 'Więcej niż 2 punkty na wiersz; brak oznaczenia kierunku.', legend: [{ c: CTX, t: '2015', h: 10 }, { c: S1, t: '2025', h: 10 }] });
    var s8 = r7.slice().sort(function (a, b) { return (b[1] - b[2]) - (a[1] - a[2]); });
    [0, 4, 8, 12].forEach(function (t) { var x = 108 + t / 12 * 260; P(c8, 'M' + x.toFixed(1) + ' 4V182', GRID, 1); T(c8, x, 198, t + '%', { a: 'middle' }); });
    s8.forEach(function (r, i) { var y = 22 + i * 36, xa = 108 + r[1] / 12 * 260, xb = 108 + r[2] / 12 * 260; T(c8, 100, y + 4, r[0], { a: 'end', f: INK, size: 11 }); P(c8, 'M' + xb.toFixed(1) + ' ' + y + 'H' + xa.toFixed(1), '#9CA3AF', 2); C(c8, xa, y, 6, CTX); C(c8, xb, y, 6, S1); T(c8, xa + 10, y + 4, '−' + fmt(r[1] - r[2], 1) + ' pp', { size: 10, f: INK2 }); });

    // ---------- 9. slope
    var c9 = chart({ kind: 'Wykres nachylenia', title: 'Polska dogania średnią UE', sub: 'PKB na mieszkańca w PPS, UE-27 = 100, 2004 i 2024', use: 'Dwa okresy, kilka kategorii; widać kierunek i tempo.', avoid: 'Wiele krzyżujących się linii bez wyróżnienia.', legend: [{ c: S1, t: 'Polska', h: 3 }, { c: CTX, t: 'pozostałe', h: 3 }] });
    var r9 = [['Czechy', 78, 91, -5, 0], ['Litwa', 50, 89, 6, 6], ['Polska', 51, 80, 0, -5], ['Węgry', 61, 76, -2, 0], ['Słowacja', 57, 73, 6, 0]];
    var xa9 = 120, xb9 = 280; P(c9, 'M' + xa9 + ' 8V196', GRID, 1); P(c9, 'M' + xb9 + ' 8V196', GRID, 1); T(c9, xa9, 214, '2004', { a: 'middle', f: INK2, wt: '600' }); T(c9, xb9, 214, '2024', { a: 'middle', f: INK2, wt: '600' });
    function s9(v) { return 196 - (v - 45) / (95 - 45) * 186; }
    r9.forEach(function (r) { var pl = r[0] === 'Polska'; P(c9, 'M' + xa9 + ' ' + s9(r[1]).toFixed(1) + 'L' + xb9 + ' ' + s9(r[2]).toFixed(1), pl ? S1 : CTX, pl ? 2.5 : 1.25); C(c9, xa9, s9(r[1]), pl ? 4 : 3, pl ? S1 : CTX); C(c9, xb9, s9(r[2]), pl ? 4 : 3, pl ? S1 : CTX); T(c9, xb9 + 8, s9(r[2]) + 4 + r[3], r[0] + ' ' + r[2], { f: pl ? INK : INK2, wt: pl ? '600' : '400', size: 10 }); T(c9, xa9 - 8, s9(r[1]) + 4 + r[4], String(r[1]), { a: 'end', f: pl ? INK : INK2, size: 10, wt: pl ? '600' : '400' }); });

    // ---------- 10. diverging bars
    var c10 = chart({ kind: 'Słupki rozbieżne', title: 'Ludność rośnie tylko wokół metropolii', sub: 'Zmiana liczby ludności 2014–2024, %, 8 z 16 województw', use: 'Wartości dodatnie i ujemne względem zera lub średniej.', avoid: 'Kolory oceniające (zielony/czerwony) bez legendy; brak linii zera.', legend: [{ c: S1, t: 'wzrost', h: 10 }, { c: NEG, t: 'spadek', h: 10 }] });
    var r10 = [['Pomorskie', 2.6], ['Małopolskie', 2.5], ['Mazowieckie', 2.2], ['Wielkopolskie', 0.3], ['Lubelskie', -4.6], ['Opolskie', -5.2], ['Łódzkie', -5.4], ['Świętokrzyskie', -6.1]];
    var zx = 230; P(c10, 'M' + zx + ' 2V206', '#4B5563', 1);
    r10.forEach(function (r, i) { var y = 6 + i * 25, w = Math.abs(r[1]) / 7 * 140; if (r[1] >= 0) { R(c10, zx, y, w, 17, S1); T(c10, zx + w + 5, y + 13, '+' + fmt(r[1], 1), { f: INK, size: 10 }); T(c10, zx - 6, y + 13, r[0], { a: 'end', f: INK, size: 11 }); } else { R(c10, zx - w, y, w, 17, NEG); T(c10, zx - w - 5, y + 13, '−' + fmt(-r[1], 1), { a: 'end', f: INK, size: 10 }); T(c10, zx + 6, y + 13, r[0], { f: INK, size: 11 }); } });

    // ---------- 11. bullet
    var c11 = chart({ kind: 'Wykres pociskowy', title: 'Wszystkie miary inflacji blisko celu', sub: 'Wartość wobec pasma celu NBP, %, wrzesień 2026', use: 'Wartość wobec celu lub progu, kilka miar obok siebie.', avoid: 'Okrągłe wskaźniki „zegarowe”: zajmują miejsce, trudno je porównać.', legend: [{ c: '#E8EFF8', t: 'pasmo celu', h: 10 }, { c: S1, t: 'wartość', h: 10 }, { c: INK, t: 'cel 2,5%', h: 2 }] });
    var r11 = [['CPI (GUS)', 3.1], ['HICP (Eurostat)', 2.9], ['Inflacja bazowa', 3.4], ['Ceny żywności', 2.2]];
    var bx0 = 120, bw = 230; function bxs(v) { return bx0 + v / 6 * bw; }
    [0, 2, 4, 6].forEach(function (t) { T(c11, bxs(t), 214, t + '%', { a: 'middle' }); });
    r11.forEach(function (r, i) { var y = 14 + i * 46; T(c11, bx0 - 8, y + 16, r[0], { a: 'end', f: INK, size: 11 }); R(c11, bx0, y, bw, 24, '#F3F4F6', { rx: 3 }); R(c11, bxs(1.5), y, bxs(3.5) - bxs(1.5), 24, '#E8EFF8', { rx: 0 }); R(c11, bx0, y + 8, bxs(r[1]) - bx0, 8, S1, { rx: 2 }); P(c11, 'M' + bxs(2.5).toFixed(1) + ' ' + (y + 2) + 'V' + (y + 22), INK, 2); T(c11, 396, y + 16, fmt(r[1], 1) + '%', { a: 'end', f: INK, size: 11, wt: '600' }); });

    // ---------- 12. waterfall
    var c12 = chart({ kind: 'Wykres kaskadowy', title: 'Wzrost PKB napędza konsumpcja', sub: 'Wkład do wzrostu PKB w 2024, punkty procentowe', use: 'Jak składniki dodają się do sumy (wkłady, bilans).', avoid: 'Więcej niż ~7 kroków; brak słupka sumy.', legend: [{ c: S1, t: 'wkład dodatni', h: 10 }, { c: NEG, t: 'wkład ujemny', h: 10 }, { c: '#4B5563', t: 'suma', h: 10 }] });
    var r12 = [['Konsump.', 2.0], ['Państwo', 0.8], ['Zapasy', 0.5], ['Inwest.', 0.2], ['Eksport', -0.6]];
    yAxis(c12, -1, 4, [0, 1, 2, 3, 4], undefined);
    var acc = 0; r12.forEach(function (r, i) { var x = X0 + 10 + i * 54, a = acc, b = acc + r[1]; R(c12, x, sy(Math.max(a, b), -1, 4), 38, Math.abs(sy(a, -1, 4) - sy(b, -1, 4)), r[1] >= 0 ? S1 : NEG); T(c12, x + 19, 214, r[0], { a: 'middle', size: 10, f: INK2 }); G(c12, 'M' + (x + 38) + ' ' + sy(b, -1, 4).toFixed(1) + 'H' + (x + 54), '#9CA3AF', 1, { dash: '2 2' }); T(c12, x + 19, sy(Math.max(a, b), -1, 4) - 4, (r[1] > 0 ? '+' : '−') + fmt(Math.abs(r[1]), 1), { a: 'middle', size: 10, f: INK, wt: '600' }); acc = b; });
    var xs12 = X0 + 10 + 5 * 54; R(c12, xs12, sy(2.9, -1, 4), 38, sy(0, -1, 4) - sy(2.9, -1, 4), '#4B5563'); T(c12, xs12 + 19, 214, 'PKB', { a: 'middle', size: 10, f: INK, wt: '600' }); T(c12, xs12 + 19, sy(2.9, -1, 4) - 4, '2,9', { a: 'middle', size: 10, f: INK, wt: '600' });

    // ---------- 13. 100% stacked bars
    var c13 = chart({ kind: 'Słupki skumulowane 100%', title: 'Usługi to już 3/5 pracujących', sub: 'Pracujący według sektora, %, 2004, 2014, 2024', use: 'Struktura dla kilku okresów lub grup, 2–5 części.', avoid: 'Wykres kołowy; więcej niż 5 części (zsumuj w „inne”).', legend: [{ c: S1, t: 'usługi', h: 10 }, { c: S2, t: 'przemysł i budownictwo', h: 10 }, { c: S3, t: 'rolnictwo', h: 10 }] });
    var r13 = [['2004', 52, 29, 19], ['2014', 57, 31, 12], ['2024', 60, 32, 8]];
    r13.forEach(function (r, i) { var y = 22 + i * 58, x = 60, W = 320; T(c13, x - 8, y + 19, r[0], { a: 'end', f: INK, size: 11, wt: '600' }); var cx = x; [[r[1], S1], [r[2], S2], [r[3], S3]].forEach(function (s, k) { var w = s[0] / 100 * W; R(c13, cx, y, w - 2, 28, s[1], { rx: 2 }); T(c13, cx + 1, y + 42, s[0] + '%', { f: INK, size: 11, wt: '600' }); cx += w; }); });

    // ---------- 14. tall segmented bar
    var c14 = chart({ kind: 'Słupek segmentowany', title: 'Na co idą wydatki budżetu', sub: 'Struktura wydatków budżetu państwa, %, 2025', use: 'Jedna całość podzielona na 3–6 części z etykietami.', avoid: 'Wykres kołowy lub pierścieniowy; segmenty bez etykiet.' });
    var r14 = [['Zabezpieczenie społeczne', 35, S1], ['Obrona narodowa', 12, S2], ['Edukacja i nauka', 10, S3], ['Obsługa długu', 9, '#eda100'], ['Ochrona zdrowia', 8, '#e87ba4'], ['Pozostałe', 26, CTX]];
    var ty = 8; r14.forEach(function (r) { var h = r[1] / 100 * 200; R(c14, 70, ty, 70, h - 2, r[2], { rx: 2 }); T(c14, 152, ty + h / 2 + 4, r[0], { f: INK, size: 11 }); T(c14, 370, ty + h / 2 + 4, r[1] + '%', { a: 'end', f: INK, size: 11, wt: '600' }); P(c14, 'M142 ' + (ty + h / 2).toFixed(1) + 'H148', '#9CA3AF', 1); ty += h; });

    // ---------- 15. pyramid
    var c15 = chart({ kind: 'Piramida ludności', title: 'Społeczeństwo się starzeje', sub: 'Ludność według wieku i płci, tys., 2024', use: 'Rozkład wieku dwóch grup (płeć) w jednym momencie.', avoid: 'Różne skale stron; więcej niż ~20 grup wieku.', legend: [{ c: S1, t: 'mężczyźni', h: 10 }, { c: S2, t: 'kobiety', h: 10 }] });
    var men = [960, 1010, 1050, 940, 920, 1120, 1380, 1560, 1520, 1290, 1120, 1080, 1220, 1180, 900, 560, 300, 230], wom = [910, 960, 1000, 900, 890, 1090, 1340, 1520, 1500, 1300, 1160, 1150, 1370, 1420, 1200, 860, 560, 600];
    var mid = 200; men.forEach(function (m, i) { var y = 196 - (i + 1) * 10.4, wm = m / 1700 * 150, ww = wom[i] / 1700 * 150; R(c15, mid - 18 - wm, y, wm, 9, S1, { rx: 1 }); R(c15, mid + 18, y, ww, 9, S2, { rx: 1 }); if (i % 3 === 0) T(c15, mid, y + 8, (i * 5) + '', { a: 'middle', size: 10 }); });
    T(c15, mid, 196 - 18 * 10.4 - 2, '85+', { a: 'middle', size: 10 }); T(c15, mid - 18 - 150, 214, '1,7 mln', { size: 10 }); T(c15, mid + 18 + 150, 214, '1,7 mln', { a: 'end', size: 10 }); T(c15, mid, 214, 'wiek', { a: 'middle', size: 10 });

    // ---------- 16. histogram
    var c16 = chart({ kind: 'Histogram', title: 'Większość gmin ma niskie bezrobocie', sub: 'Liczba gmin według stopy bezrobocia, przedziały co 2 pp, 2025', use: 'Rozkład jednej miary dla wielu jednostek (gminy, powiaty).', avoid: 'Odstępy między słupkami jak w wykresie kategorii; nierówne przedziały.' });
    var bins = [180, 520, 610, 430, 290, 180, 110, 65, 40, 22];
    yAxis(c16, 0, 700, [0, 200, 400, 600], undefined);
    bins.forEach(function (b, i) { var w = (X1 - X0) / bins.length; R(c16, X0 + i * w + 1, sy(b, 0, 700), w - 2, sy(0, 0, 700) - sy(b, 0, 700), S1, { rx: 1 }); T(c16, X0 + i * w, 214, (i * 2) + '', { a: 'middle' }); });
    T(c16, X1, 214, '20%', { a: 'end' }); var mx = X0 + 4.9 / 20 * (X1 - X0); P(c16, 'M' + mx.toFixed(1) + ' ' + (sy(660, 0, 700)).toFixed(1) + 'V' + Y1, INK, 1.5, { dash: '4 3' }); T(c16, mx + 5, sy(660, 0, 700) + 4, 'mediana 4,9%', { f: INK, size: 11, wt: '600' });

    // ---------- 17. scatter
    var c17 = chart({ kind: 'Wykres rozrzutu', title: 'Bogatsze regiony mają niższe bezrobocie', sub: 'PKB na mieszkańca (PL=100) i stopa bezrobocia, %, 16 województw', use: 'Zależność dwóch miar; jedna kropka = jedna jednostka.', avoid: 'Dwie osie Y na jednym wykresie; sugerowanie przyczyny bez dowodu.', legend: [{ c: S1, t: 'województwo', h: 10 }] });
    var pts = [[160, 3.6, 'Mazowieckie'], [110, 3.4], [108, 2.9], [101, 3.9], [97, 4.2], [94, 4.6], [93, 4.0], [85, 6.1], [80, 5.4], [78, 5.0], [76, 7.6, 'Warm.-maz.'], [72, 6.5], [70, 8.2, 'Podkarpackie'], [69, 6.9], [68, 8.9, 'Świętokrz.'], [66, 6.0]];
    function px(v) { return X0 + (v - 60) / (170 - 60) * (X1 - X0); } function py(v) { return sy(v, 2, 10); }
    yAxis(c17, 2, 10, [2, 4, 6, 8, 10], undefined, '%');
    [60, 100, 140].forEach(function (t) { T(c17, px(t), 214, String(t), { a: 'middle' }); });
    P(c17, 'M' + px(65).toFixed(1) + ' ' + py(8.3).toFixed(1) + 'L' + px(160).toFixed(1) + ' ' + py(3.1).toFixed(1), '#9CA3AF', 1, { dash: '4 4' });
    pts.forEach(function (p) { C(c17, px(p[0]), py(p[1]), 5, S1); if (p[2]) T(c17, px(p[0]) + (p[0] > 150 ? -8 : 8), py(p[1]) + 4, p[2], { size: 10, f: INK, a: p[0] > 150 ? 'end' : 'start' }); });

    // ---------- 18. tile map
    var c18 = chart({ kind: 'Kartogram kafelkowy', title: 'Najwyższe bezrobocie na wschodzie', sub: 'Stopa bezrobocia rejestrowanego, %, 2025, 16 województw', use: 'Wartości dla regionów, gdy kształt mapy nie jest ważny; każdy region równie widoczny.', avoid: 'Mapa choropletyczna z liczbami bezwzględnymi (użyj wartości na mieszkańca).', legend: [{ c: SEQ[0], t: '< 4%', h: 10 }, { c: SEQ[1], t: '4–6%', h: 10 }, { c: SEQ[3], t: '6–8%', h: 10 }, { c: SEQ[4], t: '> 8%', h: 10 }] });
    var tiles = [['PM', 1, 0, 4.2], ['WM', 2, 0, 7.6], ['PD', 3, 0, 6.2], ['ZP', 0, 1, 6.1], ['KP', 1, 1, 6.8], ['MZ', 2, 1, 3.6], ['LB', 0, 2, 4.5], ['WP', 1, 2, 2.9], ['ŁD', 2, 2, 5.0], ['LU', 3, 2, 6.5], ['DS', 0, 3, 4.0], ['OP', 1, 3, 5.1], ['ŚK', 2, 3, 8.9], ['ŚL', 1, 4, 3.9], ['MP', 2, 4, 4.0], ['PK', 3, 4, 8.2]];
    function seqFor(v) { return v < 4 ? SEQ[0] : v < 6 ? SEQ[1] : v < 8 ? SEQ[3] : SEQ[4]; }
    tiles.forEach(function (t) { var x = 92 + t[1] * 56, y = 4 + t[2] * 42; var f = seqFor(t[3]); var dark = t[3] >= 6; R(c18, x, y, 52, 38, f, { rx: 4 }); T(c18, x + 26, y + 16, t[0], { a: 'middle', f: dark ? '#FFFFFF' : INK, size: 11, wt: '600' }); T(c18, x + 26, y + 30, fmt(t[3], 1), { a: 'middle', f: dark ? '#FFFFFF' : INK, size: 10 }); });

    // ---------- 19. heatmap
    var c19 = chart({ kind: 'Mapa ciepła', title: 'Szczyt inflacji: przełom 2022 i 2023', sub: 'HICP r/r, %, miesięcznie, 2019–2026', use: 'Wzory w czasie (miesiąc × rok) lub kategoria × kategoria.', avoid: 'Tęczowa skala barw; komórki bez możliwości odczytu wartości.', legend: [{ c: SEQ[0], t: '< 3', h: 10 }, { c: SEQ[1], t: '3–6', h: 10 }, { c: SEQ[2], t: '6–10', h: 10 }, { c: SEQ[3], t: '10–15', h: 10 }, { c: SEQ[4], t: '> 15', h: 10 }] });
    var mons = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
    function heat(v) { return v < 3 ? SEQ[0] : v < 6 ? SEQ[1] : v < 10 ? SEQ[2] : v < 15 ? SEQ[3] : SEQ[4]; }
    for (var yr = 0; yr < 8; yr++) { T(c19, 38, 18 + yr * 23 + 10, String(2019 + yr), { a: 'end', size: 10, f: INK2 }); for (var m = 0; m < 12; m++) { var idx = 36 + yr * 12 + m; if (idx > 128) continue; R(c19, 44 + m * 28, 14 + yr * 23, 26, 21, heat(plI[idx]), { rx: 2 }); } }
    mons.forEach(function (mm, m) { T(c19, 44 + m * 28 + 13, 210, mm, { a: 'middle', size: 10 }); });

    // ---------- 20. KPI tiles
    var c20 = chart({ kind: 'Kafelek KPI', title: 'Najważniejsza liczba na górze', sub: 'Wartość, okres, zmiana, kontekst, źródło', use: 'Jedna wartość, którą czytelnik ma zapamiętać; nad wykresami.', avoid: 'Wykres z jednym słupkiem lub 2 wycinkami koła; liczba bez okresu.' });
    [[0, 'Inflacja HICP', 'wrz 2026', '2,9%', '▼ 0,1 pp m/m', 'W paśmie celu NBP'], [1, 'Bezrobocie (BAEL)', '2025', '3,2%', '▲ 0,3 pp r/r', 'UE-27: 5,9%']].forEach(function (k) { var x = 4 + k[0] * 198; R(c20, x, 10, 190, 196, '#FFFFFF', { rx: 8, s: '#E3E6EA', sw: 1 }); T(c20, x + 14, 34, k[1], { f: INK2, size: 12, wt: '600' }); T(c20, x + 14, 52, k[2], { size: 11 }); T(c20, x + 14, 104, k[3], { f: INK, size: 40, wt: '600' }); T(c20, x + 14, 132, k[4], { f: INK2, size: 12, wt: '500' }); T(c20, x + 14, 154, k[5], { size: 11, f: INK2 }); P(c20, 'M' + (x + 14) + ' 172H' + (x + 176), '#EEF0F3', 1); T(c20, x + 14, 192, 'Eurostat · ' + (k[0] ? 'rocznie' : 'miesięcznie'), { size: 10 }); });

    // ---------- 21. sparkline table
    var c21 = chart({ kind: 'Tabela z liniami trendu', title: 'Wiele wskaźników na jednym ekranie', sub: 'Ostatnia wartość, zmiana i trend 5 lat', use: 'Przegląd 5–15 wskaźników o różnych jednostkach.', avoid: 'Różne skale linii trendu sugerujące porównanie; brak jednostek.' });
    var rows21 = [['Inflacja HICP', '2,9%', '▼ 0,1 pp', [4.5, 2.8, 4.9, 4.1, 3.2, 2.9]], ['Bezrobocie', '3,2%', '▲ 0,3 pp', [3.4, 3.0, 2.8, 2.9, 2.9, 3.2]], ['PKB realnie', '2,9%', '▲ 2,7 pp', [-2.0, 6.9, 5.3, 0.2, 2.9, 3.1]], ['EUR/PLN', '4,26 zł', '▼ 0,02', [4.44, 4.56, 4.69, 4.54, 4.31, 4.26]], ['Ludność', '37,49 mln', '▼ 0,4%', [38.0, 37.9, 37.8, 37.7, 37.6, 37.5]]];
    T(c21, 4, 18, 'Wskaźnik', { size: 10, wt: '500' }); T(c21, 170, 18, 'Trend', { size: 10, wt: '500' }); T(c21, 316, 18, 'Wartość', { a: 'end', size: 10, wt: '500' }); T(c21, 396, 18, 'Zmiana', { a: 'end', size: 10, wt: '500' });
    rows21.forEach(function (r, i) { var y = 30 + i * 36; P(c21, 'M0 ' + (y - 6) + 'H400', '#EEF0F3', 1); T(c21, 4, y + 18, r[0], { f: INK, size: 12 }); var v = r[3], lo = Math.min.apply(null, v), hi = Math.max.apply(null, v); var d = ''; v.forEach(function (q, k) { d += (k ? 'L' : 'M') + (130 + k * 18).toFixed(1) + ' ' + (y + 24 - (q - lo) / (hi - lo || 1) * 20).toFixed(1); }); P(c21, d, S1, 1.5); T(c21, 316, y + 18, r[1], { a: 'end', f: INK, size: 12, wt: '600' }); T(c21, 396, y + 18, r[2], { a: 'end', f: INK2, size: 11 }); });

    var groups = [
      { title: 'Zmiana w czasie', desc: 'Trendy i dynamika: najczęstsze zadanie pulpitu.', charts: [c1, c2, c3, c22, c4, c5] },
      { title: 'Wielkość i ranking', desc: 'Porównanie wartości i kolejność kategorii.', charts: [c6, c7, c8, c9] },
      { title: 'Odchylenie', desc: 'Różnice od zera, celu lub średniej.', charts: [c10, c11, c12] },
      { title: 'Część całości', desc: 'Struktura. Wykresów kołowych nie używamy.', charts: [c13, c14] },
      { title: 'Rozkład', desc: 'Jak wartości rozkładają się w populacji.', charts: [c15, c16] },
      { title: 'Zależność i przestrzeń', desc: 'Związek dwóch miar i wzory geograficzne.', charts: [c17, c18, c19] },
      { title: 'Pojedyncze wartości i przegląd', desc: 'Liczby do zapamiętania i zestawienia wielu wskaźników.', charts: [c20, c21] }
    ];
        return groups;
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function svg(c) {
    var o = '<svg viewBox="0 0 400 230" role="img" aria-label="' + esc(c.aria) + '" style="width:100%;height:auto;display:block">';
    c.grid.forEach(function (p) { o += '<path d="' + p.d + '" style="fill:none;stroke:' + p.s + ';stroke-width:' + p.w + ';stroke-dasharray:' + p.dash + '"></path>'; });
    c.rects.forEach(function (r) { o += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" style="fill:' + r.f + ';stroke:' + r.s + ';stroke-width:' + r.sw + '"></rect>'; });
    c.paths.forEach(function (p) { o += '<path d="' + p.d + '" style="fill:' + p.fill + ';stroke:' + p.s + ';stroke-width:' + p.w + ';stroke-dasharray:' + p.dash + ';stroke-linejoin:round;stroke-linecap:round;opacity:' + p.op + '"></path>'; });
    c.circles.forEach(function (k) { o += '<circle cx="' + k.x + '" cy="' + k.y + '" r="' + k.r + '" style="fill:' + k.f + ';stroke:#FFFFFF;stroke-width:1.5"></circle>'; });
    c.texts.forEach(function (t) { o += '<text x="' + t.x + '" y="' + t.y + '" style="font-family:Inter,system-ui,sans-serif;font-size:' + t.size + 'px;fill:' + t.f + ';text-anchor:' + t.a + ';font-weight:' + t.wt + '">' + esc(t.t) + '</text>'; });
    return o + '</svg>';
  }
  function legend(c) {
    return '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:var(--ink-2,#374151)">' + c.legend.map(function (l) {
      return '<span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;width:12px;height:' + l.h + 'px;border-radius:2px;background:' + l.c + '"></span>' + esc(l.t) + '</span>';
    }).join('') + '</div>';
  }
  function card(c, opts) {
    opts = opts || {};
    return '<article style="background:var(--surface,#fff);border:1px solid var(--line,#E3E6EA);border-radius:var(--radius-xl,10px);padding:18px 20px 14px;display:flex;flex-direction:column;gap:10px;max-width:' + (opts.maxWidth || 440) + 'px;font-family:Inter,system-ui,sans-serif">' +
      '<span style="align-self:flex-start;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--accent,#1E4E8C);background:var(--accent-tint,#EEF3FA);border-radius:4px;padding:1px 6px">' + esc(c.kind) + '</span>' +
      '<div><h3 style="margin:0;font-size:15px;line-height:22px;font-weight:600;color:var(--ink,#111827)">' + esc(c.title) + '</h3><p style="margin:2px 0 0;font-size:12px;line-height:18px;color:var(--ink-3,#4B5563)">' + esc(c.sub) + '</p></div>' +
      svg(c) + legend(c) +
      (opts.rules === false ? '' : '<div style="display:grid;grid-template-columns:64px 1fr;gap:4px 8px;font-size:12px;line-height:17px;border-top:1px solid var(--line-subtle,#EEF0F3);padding-top:10px"><span style="color:#1B5E3F;font-weight:600">Kiedy</span><span style="color:var(--ink-2,#374151)">' + esc(c.use) + '</span><span style="color:#8C2F0E;font-weight:600">Unikaj</span><span style="color:var(--ink-2,#374151)">' + esc(c.avoid) + '</span></div>') +
      '</article>';
  }
  var groups = build();
  var all = [];
  groups.forEach(function (g) { g.charts.forEach(function (c) { c.group = g.title; all.push(c); }); });
  window.ZChart = { groups: groups, all: all, byKind: function (k) { return all.filter(function (c) { return c.kind === k; })[0]; }, svg: svg, legend: legend, card: card };
})();
