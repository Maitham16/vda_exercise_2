//  SVG and container elements selection to not repeatedly query them
const fcSvg = d3.select("#focus");
const ctSvg = d3.select("#cont");
const cntr = document.getElementById("container");

// compute chart width and margins
const containerWidth = cntr ? cntr.getBoundingClientRect().width : 960;
const w = Math.min(Math.max(containerWidth - 84 - 72 - 16, 360), 1100);
const dm = {
  // main chart
  fc: {
    width: w,
    height: 380,
    margin: { top: 24, right: 72, bottom: 72, left: 84 },
  },
  // brushable chart
  ct: {
    width: w,
    height: 110,
    margin: { top: 18, right: 72, bottom: 38, left: 84 },
  },
};

// set main chart SVG viewBox for scaling
fcSvg
  .attr(
    "viewBox",
    `0 0 ${dm.fc.width + dm.fc.margin.left + dm.fc.margin.right} ${
      dm.fc.height + dm.fc.margin.top + dm.fc.margin.bottom
    }`
  )
  .attr("preserveAspectRatio", "xMidYMid meet");

// set brushable viewBox
ctSvg
  .attr(
    "viewBox",
    `0 0 ${dm.ct.width + dm.ct.margin.left + dm.ct.margin.right} ${
      dm.ct.height + dm.ct.margin.top + dm.ct.margin.bottom
    }`
  )
  .attr("preserveAspectRatio", "xMidYMid meet");

// select main chart and brushable transitions to avoid repeated queries
const fcG = fcSvg
  .append("g")
  .attr("transform", `translate(${dm.fc.margin.left},${dm.fc.margin.top})`);

// stop the lines from crossing y axis
fcG
  .append("defs")
  .append("clipPath")
  .attr("id", "focus-clip")
  .append("rect")
  .attr("width", dm.fc.width)
  .attr("height", dm.fc.height);

const ctG = ctSvg
  .append("g")
  .attr("transform", `translate(${dm.ct.margin.left},${dm.ct.margin.top})`);

// define data structures for pinned (pn), label (lb), series (sb), brushable line (cb)
const pn = new Set();
const lb = new Map();
const sb = new Map();
const cb = new Map();

// load and parse CSV into per-country (data series)
d3.csv("data.csv", d3.autoType).then((raw) => {
  if (!raw || !raw.length)
    throw new Error("The CSV data could not be loaded or is empty.");

  // extract year columns
  const yrCols = raw.columns.filter((c) => /^\d{4}$/.test(c));
  const yrs = yrCols.map((d) => +d);

  // build per-country series and cache lookup to enable pinning -- (solved by using gpt5 mini)
  const cs = raw
    .map((r) => {
      const vals = yrCols
        .map((y) => ({ year: +y, value: r[y] }))
        .filter((p) => p.value != null && !Number.isNaN(p.value));
      const o = {
        country: r["Country Name"],
        code: r["Country Code"],
        values: vals,
      };
      if (vals.length) sb.set(o.country, o);
      return o;
    })
    .filter((d) => d.values.length);

  // for the main chart y-axis values
  const vals = cs.flatMap((s) => s.values.map((p) => p.value));

  // create scales for main chart & brushable [channel]
  const xF = d3.scaleLinear().domain(d3.extent(yrs)).range([0, dm.fc.width]);
  const yF = d3
    .scaleLinear()
    .domain([d3.min(vals), d3.max(vals)])
    .nice()
    .range([dm.fc.height, 0]);
  const xC = d3.scaleLinear().domain(xF.domain()).range([0, dm.ct.width]);
  const yC = d3.scaleLinear().domain(yF.domain()).range([dm.ct.height, 0]);

  // line for main chart & brushable [channel]
  const lnF = d3
    .line()
    .defined((d) => d.value != null && !Number.isNaN(d.value))
    .x((d) => xF(d.year))
    .y((d) => yF(d.value));
  const lnC = d3
    .line()
    .defined((d) => d.value != null && !Number.isNaN(d.value))
    .x((d) => xC(d.year))
    .y((d) => yC(d.value));

  // grid for main chart [mark]
  const yGrid = d3
    .axisLeft(yF)
    .ticks(6)
    .tickSize(-dm.fc.width)
    .tickFormat(() => "");
  const gridG = fcG.append("g").attr("class", "grid-lines").call(yGrid);
  gridG.select(".domain").remove();

  // draw main chart lines (one per country) [mark]
  const fcLn = fcG
    .append("g")
    .attr("class", "focus-lines")
    .attr("clip-path", "url(#focus-clip)")
    .selectAll("path")
    .data(cs, (d) => d.country)
    .join("path")
    .attr("class", "country-line")
    .attr("d", (d) => lnF(d.values));

  // label layer for country names [mark]
  const lblL = fcG
    .append("g")
    .attr("class", "label-layer")
    .attr("clip-path", "url(#focus-clip)");

  // create axis groups [channel]
  const yAx = d3.axisLeft(yF).ticks(6);
  const xAx = fcG
    .append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0, ${dm.fc.height})`);
  const yG = fcG.append("g").attr("class", "axis axis--y").call(yAx);

  // year tick values [channel] (solved by using gpt5 mini)
  function yrTks(dmX) {
    let s = Math.ceil(dmX[0]),
      e = Math.floor(dmX[1]);
    if (s > e) {
      const m = Math.round((dmX[0] + dmX[1]) / 2);
      s = m;
      e = m;
    }
    const sp = Math.max(1, e - s);
    let st = 10;
    if (sp <= 12) st = 1;
    else if (sp <= 28) st = 2;
    else if (sp <= 60) st = 5;
    const t = [];
    const f = Math.ceil(s / st) * st;
    for (let y = f; y <= e; y += st) t.push(y);
    const ft = t.filter((y) => yrs.includes(y));
    if (!ft.includes(s) && yrs.includes(s)) ft.unshift(s);
    if (!ft.includes(e) && yrs.includes(e)) ft.push(e);
    return Array.from(new Set(ft)).sort((a, b) => a - b);
  }

  // x-axis ticks [channel]
  function rndX() {
    const t = yrTks(xF.domain());
    xAx.call(
      d3
        .axisBottom(xF)
        .tickValues(t)
        .tickFormat((d) => d3.format("d")(d))
    );
  }

  rndX();

  // add a year axis to the brushable chart for orientation
  ctG
    .append("g")
    .attr("class", "axis axis--x axis--context")
    .attr("transform", `translate(0, ${dm.ct.height})`)
    .call(
      d3
        .axisBottom(xC)
        .tickValues(yrTks(xC.domain()))
        .tickFormat((d) => d3.format("d")(d))
    );

  // main chart axis titles [mark]
  fcSvg
    .append("text")
    .attr("class", "axis-title")
    .attr(
      "transform",
      `translate(${dm.fc.margin.left / 3}, ${
        dm.fc.margin.top + dm.fc.height / 2
      }) rotate(-90)`
    )
    .attr("text-anchor", "middle")
    .text("Fertility Rate (Births per Woman)");
  fcSvg
    .append("text")
    .attr("class", "axis-title")
    .attr(
      "transform",
      `translate(${dm.fc.margin.left + dm.fc.width / 2}, ${
        dm.fc.margin.top + dm.fc.height + 52
      })`
    )
    .attr("text-anchor", "middle")
    .text("Years");

  // draw brushable lines and cache elements [mark]
  const ctLn = ctG
    .append("g")
    .attr("class", "context-lines")
    .selectAll("path")
    .data(cs, (d) => d.country)
    .join("path")
    .attr("class", "country-line context-line")
    .attr("d", (d) => lnC(d.values));

  ctLn.each(function (s) {
    cb.set(s.country, d3.select(this));
  });

  // create horizontal brush controlling main chart x-domain (solved by using gpt5 mini)
  const br = d3
    .brushX()
    .extent([
      [0, 0],
      [dm.ct.width, dm.ct.height],
    ])
    .on("brush end", brushed);
  const brG = ctG.append("g").attr("class", "brush").call(br);
  brG.call(br.move, xF.range());
  ctSvg.on("dblclick", () => {
    brG.call(br.move, xC.range());
  });

  // function to update main chart based on brush selection (documentation adapted)
  function brushed(ev) {
    if (ev.selection) {
      const [x0, x1] = ev.selection.map(xC.invert);
      xF.domain([x0, x1]);
    } else {
      xF.domain(xC.domain());
    }
    fcLn.attr("d", (d) => lnF(d.values));
    rndX();
    yG.call(yAx);
    updPins();
  }

  // interactions: hover highlights and click toggles pin
  fcLn
    .on("mouseover", function (_, s) {
      hl(this, s);
    })
    .on("mouseout", function (_, s) {
      uh(this, s);
    })
    .on("click", function (ev, s) {
      ev.preventDefault();
      tg(this, s);
    });

  // mirror highlight to brushable and show label
  function hl(t, s) {
    const c = s.country;
    d3.select(t).raise().classed("highlighted", true);
    const cl = cb.get(c);
    if (cl) cl.classed("highlighted", true).raise();
    shLbl(s);
  }

  // un-highlight unless pinned and remove label
  function uh(t, s) {
    const c = s.country;
    if (pn.has(c)) return;
    d3.select(t).classed("highlighted", false).classed("pinned", false);
    const cl = cb.get(c);
    if (cl) cl.classed("highlighted", false).classed("pinned", false);
    rmLbl(s);
  }

  // pin/unpin country
  function tg(t, s) {
    const c = s.country;
    if (pn.has(c)) {
      pn.delete(c);
      d3.select(t).classed("pinned", false);
      uh(t, s);
    } else {
      pn.add(c);
      d3.select(t).classed("pinned", true);
      hl(t, s);
    }
    updPins();
  }

  // show country label (solved by using gpt5 mini)
  function shLbl(s) {
    const c = s.country;
    let l = lb.get(c);
    if (!l) {
      l = lblL
        .append("text")
        .attr("class", "country-label")
        .attr("data-country", c)
        .text(c);
      lb.set(c, l);
    }
    posLbl(s, l);
    l.classed("pinned", pn.has(c)).style("display", null);
  }

  // remove label if not pinned (solved by using gpt5 mini)
  function rmLbl(s) {
    const c = s.country;
    if (pn.has(c)) return;
    const l = lb.get(c);
    if (l) {
      l.remove();
      lb.delete(c);
    }
  }

  // move the label while moving the brush (solved by using gpt5 mini)
  function posLbl(s, l) {
    const dmX = xF.domain();
    const vis = s.values.filter((p) => p.year >= dmX[0] && p.year <= dmX[1]);
    if (!vis.length) {
      l.style("display", "none");
      return;
    }
    const last = vis[vis.length - 1];
    const x = xF(last.year);
    const y = Math.max(18, yF(last.value) - 12);
    const w = dm.fc.width;
    let a = "middle",
      dx = 0;
    if (x > w - 56) {
      a = "end";
      dx = -10;
    } else if (x < 56) {
      a = "start";
      dx = 10;
    }
    l.style("display", null)
      .attr("text-anchor", a)
      .attr("x", x)
      .attr("dx", dx)
      .attr("y", y);
  }

  // update pinned countries (AI generated gpt5 mini)
  function updPins() {
    pn.forEach((c) => {
      const s = sb.get(c);
      if (!s) return;
      let l = lb.get(c);
      if (!l) {
        shLbl(s);
        l = lb.get(c);
      }
      if (l) {
        l.classed("pinned", true);
        posLbl(s, l);
      }
      fcLn
        .filter((d) => d.country === c)
        .classed("pinned", true)
        .classed("highlighted", true)
        .raise();
      const cl = cb.get(c);
      if (cl) cl.classed("pinned", true).classed("highlighted", true).raise();
    });
  }
});