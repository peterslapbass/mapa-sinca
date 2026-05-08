document.addEventListener("DOMContentLoaded", function () {

  console.log("🔥 MAPA SINCA - FULL FIXED");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);
  let windLayer = L.layerGroup().addTo(map);

  let sourceLayer = L.layerGroup().addTo(map);
  let SHOW_SOURCES = true;


  let STATIONS = {};
  let CURRENT_FILTER = "ALL";
  let chartInstance = null;
  let SHOW_AIR = true;
  let SHOW_WIND = true;

  // =============================
  // HELPERS
  // =============================

  function normalize(t) {
    if (!t) return "";
    const x = document.createElement("textarea");
    x.innerHTML = t;
    return x.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getValue(r) {
    const raw = r?.tableRow?.value || r?.value || "";
    const cleaned = String(raw).replace(",", ".");
    const m = cleaned.match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  function getPollutant(name) {
    const n = normalize(name);
  
    // MP
    if (n.includes("mp-2") || n.includes("pm25") || n.includes("pm2")) return "MP-2,5";
    if (n.includes("mp-10") || n.includes("pm10")) return "MP-10";
  
    // NO2
    if (n.includes("dioxido de nitrogeno") || n.includes("no2")) return "NO2";
  
    // SO2
    if (n.includes("dioxido de azufre") || n.includes("so2")) return "SO2";
  
    // O3
    if (n.includes("ozono") || n.includes("o3")) return "O3";
  
    // CO
    if (n.includes("monoxido de carbono") || n === "co") return "CO";
  
    return null;
  }

  function getUnit(p) {
    if (p === "MP-2,5" || p === "MP-10") return "µg/m³";
    if (p === "NO2" || p === "O3") return "ppbv";
    if (p === "CO") return "ppmv";
    if (p === "SO2") return "µg/m³";
    return "";
  }

  function color(v) {
    if (v <= 25) return "green";
    if (v <= 50) return "yellow";
    if (v <= 100) return "orange";
    if (v <= 150) return "red";
    return "purple";
  }

  function sourceColor(v) {

  if (v <= 1) return "#66bb6a";
  if (v <= 10) return "#ffa726";
  if (v <= 100) return "#ef5350";

  return "#8e24aa";
  } 

  function parseSeries(rt) {
    const rows = rt?.info?.rows || [];
    return rows.map(r => ({
      ts: r?.c?.[0]?.v,
      val: r?.c?.[1]?.v
    })).filter(r => r.ts && typeof r.val === "number");
  }

  // =============================
  // LOAD DATA
  // =============================

  async function load() {
    const res = await fetch("datos_sinca.json?ts=" + Date.now(), {cache: "no-store"});
    const data = await res.json();

    STATIONS = {};

    data.forEach(station => {
      const { nombre, latitud, longitud, region, comuna, realtime } = station;
      if (!nombre || !latitud) return;

      STATIONS[nombre] = {
        name: nombre,
        lat: latitud,
        lon: longitud,
        region: region || "",
        comuna: comuna || "",
        values: {},
        series: {}
      };

      (realtime || []).forEach(r => {
        const value = getValue(r);
        const pollutant = getPollutant(r.name || r.parameter || "");
        if (!pollutant || value === null) return;

        STATIONS[nombre].values[pollutant] = {
          value,
          time: r.datetime || "",
          status: r.tableRow?.status || "nd",
          unit: getUnit(pollutant)
        };

        const serie = parseSeries(r);
        if (serie.length) {
          STATIONS[nombre].series[pollutant] = serie;
        }
      });
    });

    render();
  }

  // =============================
  // RENDER
  // =============================

function render() {
  layer.clearLayers();

  const stations = Object.values(STATIONS);

  let processed = stations.map(s => {

    let entries = Object.entries(s.values);

    if (CURRENT_FILTER !== "ALL") {
      entries = entries.filter(v => v[0] === CURRENT_FILTER);
    }

    if (!entries.length) return null;

    const worst = Math.max(...entries.map(v => v[1].value));

    return {
      ...s,
      filteredEntries: entries, // 👈 IMPORTANTE
      worst
    };

  }).filter(Boolean);

  // ================= MAP =================
  processed.forEach(s => {

    const marker = L.circleMarker([s.lat, s.lon], {
      radius: 8,
      color: "#000",
      fillColor: color(s.worst),
      fillOpacity: 0.85
    }).addTo(layer);

    const entries = s.filteredEntries.filter(([_, val]) => val && val.value != null);

    marker.bindPopup(
      `<b>${s.name}</b>` +
      `<div style="font-size:10px;color:#888;margin:2px 0 6px">${s.comuna} · ${s.region}</div>` +
      `<hr>` +
      entries.map(([key, val]) =>
        `<div style="display:flex;justify-content:space-between;padding:2px 0">` +
        `<span style="color:#aaa">${key}</span>` +
        `<span>${val.value} <span style="font-size:10px;color:#555">${val.unit}</span></span>` +
        `</div>`
      ).join("") +
      `<div style="font-size:10px;color:#555;margin-top:6px">${entries[0]?.[1]?.time || ""}</div>`
    );

    marker.on("click", () => {
      map.flyTo([s.lat, s.lon], 11);
      openChartPanel(STATIONS[s.name]);
    });

  });

  // ================= RANKING =================
  const ranking = [...processed].sort((a, b) => b.worst - a.worst);

  document.getElementById("ranking").innerHTML =
    ranking.slice(0, 10).map((s, i) => `
      <div class="rank-item" data-key="${s.name}">
        <span class="rank-num">${i + 1}</span>
        <span class="rank-dot" style="background:${color(s.worst)}"></span>
        <span class="rank-name">${s.name}</span>
        <span class="rank-val">${s.worst}</span>
      </div>
    `).join("");

  document.querySelectorAll(".rank-item").forEach(el => {
    el.onclick = () => {
      const s = STATIONS[el.dataset.key];
      map.flyTo([s.lat, s.lon], 11);
      openChartPanel(s);
    };
  });

  // ================= ALERTAS =================
  const alerts = ranking.filter(s => s.worst > 100);

  document.getElementById("alerts").innerHTML =
    alerts.length
      ? alerts.map(a => `
        <div class="alert-item">
          <span class="alert-name">${a.name}</span>
          <span class="alert-val">${a.worst}</span>
        </div>
      `).join("")
      : `<div style="font-size:11px;color:#666">Sin alertas</div>`;
}

  // =============================
  // PANEL SERIES
  // =============================

  function openChartPanel(station) {

    document.getElementById("chart-station-name").textContent = station.name;
    document.getElementById("chart-region").textContent =
      [station.comuna, station.region].filter(Boolean).join(" · ");

    const pollutants = Object.keys(station.series);
    const pills = document.getElementById("chart-pills");
    pills.innerHTML = "";

    pollutants.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.className = "cpill" + (i === 0 ? " active" : "");
      btn.textContent = p;

      btn.onclick = () => {
        document.querySelectorAll(".cpill").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        drawSeries(station, p);
      };

      pills.appendChild(btn);
    });

    if (pollutants.length) drawSeries(station, pollutants[0]);

    document.getElementById("chart-panel").classList.add("open");

    if (window.openChartSheetOverlay) {
      window.openChartSheetOverlay();
    }
  }

  function drawSeries(station, pollutant) {

    const serie = station.series[pollutant] || [];
    const snap = station.values[pollutant] || {};
    const unit = getUnit(pollutant);

    const vals = serie.map(r => r.val).filter(v => v != null);

    const max = vals.length ? Math.max(...vals) : null;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

    const fmt = v => v != null ? v.toFixed(1) : "—";

    document.getElementById("chart-stats").innerHTML = `
      <div class="cstat">
        <div class="cstat-lbl">Actual</div>
        <div class="cstat-val">${fmt(snap.value)} <span class="cstat-unit">${unit}</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Máx</div>
        <div class="cstat-val">${fmt(max)}</div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Prom</div>
        <div class="cstat-val">${fmt(avg)}</div>
      </div>
    `;

    const labels = serie.map(r => r.ts.slice(11, 16));
    const data = serie.map(r => r.val).filter(v => v != null && v > 0);

    const canvas = document.getElementById("seriesChart");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label : pollutant, 
          data,
          borderColor: "#4fc3f7",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // =============================
  // CLOSE PANEL
  // =============================

  document.getElementById("chart-close").addEventListener("click", () => {
    document.getElementById("chart-panel").classList.remove("open");
    if (chartInstance) chartInstance.destroy();
    if (window.closeChartPanel) window.closeChartPanel();
  });

  // =============================
  // FILTER
  // =============================

  document.getElementById("filter").addEventListener("change", e => {
    CURRENT_FILTER = e.target.value;
    render();
  });

  // =============================
  // INIT
  // =============================

  load();
  setInterval(load, 300000);

// =============================
// 🌬️ CAPA DE VIENTO (FLECHAS)
// =============================

function getWindColor(speed) {
  if (speed < 2) return "gray";
  if (speed < 5) return "#4FC3F7";
  return "#EF5350";
}

function createWindIcon(speed, dir) {
  const correctedDir = dir + 180;

  return L.divIcon({
    html: `<div style="
      transform: rotate(${correctedDir}deg);
      color: ${getWindColor(speed)};
      font-size: ${Math.max(12, speed * 4)}px;
    ">➤</div>`,
    className: "",
    iconSize: [20, 20]
  });
}

function openMeteoPanel(station) {

  document.getElementById("chart-station-name").textContent =
    station.name || "Estación meteorológica";

  document.getElementById("chart-region").textContent =
    "Datos meteorológicos";

  document.getElementById("chart-pills").innerHTML =
    `<span class="cpill active">Meteo</span>`;

  document.getElementById("chart-stats").innerHTML = `
    <div class="cstat">
      <div class="cstat-lbl">Viento</div>
      <div class="cstat-val">${station.wind_speed ?? "—"}<span class="cstat-unit"> m/s</span></div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Dirección</div>
      <div class="cstat-val">${station.wind_dir ?? "—"}°</div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Temperatura</div>
      <div class="cstat-val">${station.temp ?? "—"}<span class="cstat-unit"> °C</span></div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Humedad</div>
      <div class="cstat-val">${station.humidity ?? "—"}<span class="cstat-unit"> %</span></div>
    </div>
  `;

  document.getElementById("seriesChart").style.display = "none";

  const empty = document.getElementById("chart-empty");
  empty.style.display = "block";
  empty.textContent = "Datos meteorológicos en tiempo real";

  document.getElementById("chart-panel").classList.add("open");

  if (window.openChartSheetOverlay) {
    window.openChartSheetOverlay();
  }
}

function loadWindData() {
  fetch("datos_meteo.json?" + Date.now())
    .then(r => r.json())
    .then(data => {

      windLayer.clearLayers();

      data.forEach(s => {
        if (!s.lat || !s.lon) return;

        const marker = L.marker([s.lat, s.lon], {
          icon: createWindIcon(s.wind_speed || 0, s.wind_dir || 0)
        });

        marker.bindPopup(`
          <b>${s.name || "Estación"}</b><br>
          Viento: ${s.wind_speed ?? "—"} m/s<br>
          Dir: ${s.wind_dir ?? "—"}°
        `);

        marker.on("click", () => {
          openMeteoPanel(s);
        });

        windLayer.addLayer(marker);
      });

    })
    .catch(err => console.error("❌ viento:", err));
}

loadWindData();
setInterval(loadWindData, 300000);

// =============================
// 🏭 FUENTES EMISORAS
// =============================

async function loadSources() {

  try {

    const res = await fetch("fuentes.json?ts=" + Date.now(), {
      cache: "no-store"
    });

    const data = await res.json();

    sourceLayer.clearLayers();
    
    const coordCount = {};
    
    data.forEach(src => {

      // VALIDACIÓN
      if (
        src.lat == null ||
        src.lon == null ||
        isNaN(src.lat) ||
        isNaN(src.lon)
      ) return;

      // emisiones > 0
      const emissions = Object.entries(src.emissions || {})
        .filter(([_, val]) => val > 0);

      // tamaño marcador
      const totalEmission = emissions.reduce((a, b) => a + b[1], 0);

      const radius =
        totalEmission <= 0 ? 4 :
        Math.min(18, 4 + Math.log10(totalEmission + 1) * 3);
        
      // evitar superposición
      const key = `${src.lat.toFixed(5)},${src.lon.toFixed(5)}`;

      coordCount[key] = (coordCount[key] || 0) + 1;

      const n = coordCount[key];

      const angle = n * 45 * Math.PI / 180;
      const offset = 0.0012;

      const lat = src.lat + Math.cos(angle) * offset;
      const lon = src.lon + Math.sin(angle) * offset;
        
        
      // marcador
      const marker = L.circleMarker([lat, lon], {

        radius,
        color: "#000",
        weight: 1,

        fillColor: "#7b1fa2",
        fillOpacity: 0.75

      });
      
      const top = Object.entries(src.emissions || {})
        .filter(([_, v]) => Number.isFinite(v) && v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // popup
      marker.bindPopup(`
        <b>${src.name}</b><br>

        <div style="font-size:11px;color:#888;margin-top:2px">
          ${src.company}
        </div>

        <div style="font-size:11px;color:#888">
          ${src.comuna} · ${src.region}
        </div>

        <div style="font-size:11px;color:#888;margin-bottom:6px">
          ${src.sector}
        </div>

        <hr>

        <div style="font-size:11px;color:#aaa">
          Combustible:
          ${src.comb1 || "No informado"}
          ${src.comb2 ? " / " + src.comb2 : ""}
        </div>

        <hr>

        ${top.map(([k,v]) => `
          <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            font-size:11px;
            padding:2px 0;
          ">
            <span>${k}</span>
            <span>${v.toExponential(2)}</span>
          </div>
        `).join("")}

        <div style="
          margin-top:8px;
          font-size:10px;
          color:#777;
          line-height:1.3;
        ">
          Emisiones RETC reportadas.<br>
          Las unidades pueden variar según tipo de fuente y combustible.
        </div>
      `);

      sourceLayer.addLayer(marker);

    });

  } catch(err) {

    console.error("❌ fuentes:", err);

  }

}

loadSources();


// =============================
// 🌊 WIND FIELD ANIMADO
// =============================

const canvas = document.createElement("canvas");
  
const ctx = canvas.getContext("2d");

map.getPanes().overlayPane.appendChild(canvas);

canvas.style.position = "absolute";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = 0;

function resizeCanvas() {
  const size = map.getSize();
  canvas.width = size.x;
  canvas.height = size.y;
}

function repositionCanvas() {
  const topLeft = map.containerPointToLayerPoint([0, 0]);
  L.DomUtil.setPosition(canvas, topLeft);
}

map.on("move", () => {
  repositionCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

map.on("resize", resizeCanvas);

resizeCanvas();
repositionCanvas();

let windField = null;
let particles = [];

fetch("wind_field.json")
  .then(r => r.json())
  .then(data => {
    windField = data;
    initParticles();
  });

function getWindAt(lat, lon) {
  if (!windField) return { u: 0, v: 0 };

  const { min_lat, max_lat, min_lon, max_lon } = windField.bounds;
  const size = windField.grid_size;

  const x = (lon - min_lon) / (max_lon - min_lon) * (size - 1);
  const y = (lat - min_lat) / (max_lat - min_lat) * (size - 1);

  const i = Math.floor(x);
  const j = Math.floor(y);

  if (i < 0 || j < 0 || i >= size || j >= size) return { u: 0, v: 0 };

  return {
    u: windField.u[j][i],
    v: windField.v[j][i]
  };
}

function initParticles() {
  const b = windField.bounds;

  particles = [];

  for (let i = 0; i < 400; i++) {
    particles.push({
      lat: b.min_lat + Math.random() * (b.max_lat - b.min_lat),
      lon: b.min_lon + Math.random() * (b.max_lon - b.min_lon),
      age: Math.random() * 100
    });
  }

  animate();
}

function resetParticle(p) {
  const b = windField.bounds;

  p.lat = b.min_lat + Math.random() * (b.max_lat - b.min_lat);
  p.lon = b.min_lon + Math.random() * (b.max_lon - b.min_lon);
  p.age = 0;
}

function animate() {
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  
  particles.forEach(p => {

    const wind = getWindAt(p.lat, p.lon);
    const speed = Math.sqrt(wind.u**2 + wind.v**2);

    if (speed < 0.1 || p.age > 100) {
      resetParticle(p);
      return;
    }

    const prev = map.latLngToContainerPoint([p.lat, p.lon]);

    p.lat += wind.v * 0.01;
    p.lon += wind.u * 0.01;
    p.age++;

    const next = map.latLngToContainerPoint([p.lat, p.lon]);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = "rgba(80,150,255,0.7)";
    ctx.stroke();
  });

  requestAnimationFrame(animate);
}

// =============================
// 🎛️ TOGGLES
// =============================

const btnAir  = document.getElementById("toggle-air");
const btnWind = document.getElementById("toggle-wind");

if (btnAir) {
  btnAir.addEventListener("click", () => {
    SHOW_AIR = !SHOW_AIR;
    btnAir.classList.toggle("active", SHOW_AIR);

    if (SHOW_AIR) map.addLayer(layer);
    else map.removeLayer(layer);
  });
}

if (btnWind) {
  btnWind.addEventListener("click", () => {
    SHOW_WIND = !SHOW_WIND;
    btnWind.classList.toggle("active", SHOW_WIND);

    if (SHOW_WIND) {
      map.addLayer(windLayer);
      canvas.style.display = "block";
    } else {
      map.removeLayer(windLayer);
      canvas.style.display = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

const btnSources = document.getElementById("toggle-sources");

if (btnSources) {

  btnSources.addEventListener("click", () => {

    SHOW_SOURCES = !SHOW_SOURCES;

    btnSources.classList.toggle("active", SHOW_SOURCES);

    if (SHOW_SOURCES) {
      map.addLayer(sourceLayer);
    } else {
      map.removeLayer(sourceLayer);
    }

  });

}


});
