// ================= CONFIGURACIÓN BÁSICA =================

// API de Apps Script (LECTURA de preregistro)
const API_URL =
  "https://script.google.com/macros/s/AKfycbwiNjZaa3tver1rM1VTD4pOp8z8148-J1uTnHbZz9LgvlTMDqL2_3inJvNJ9yhbgd_hXA/exec";

// API para GUARDAR asistencia en vivo (cuando la tengas lista)
const API_ASISTENCIA_POST = ""; // TODO: pon aquí la URL de tu WebApp de asistencia

// Claves por rol
const PASSWORDS = {
  admin: "voces",
  asistencia: "carbon",
  // dashboard sin clave
};

// Fecha del evento (para separar pre-registro vs día del evento)
const EVENT_DATE = new Date("2025-12-05T00:00:00-05:00");

// Mapa de departamentos y municipios
const DEPARTAMENTOS_MUNICIPIOS = {
  Cesar: [
    "Valledupar",
    "La Jagua de Ibirico",
    "El Paso",
    "Chiriguaná",
    "El Copey",
    "Becerril",
    "Agustín Codazzi",
    "Curumaní",
    "Pailitas",
    "Otro (corregimiento / vereda)",
  ],
  "La Guajira": [
    "Riohacha",
    "Albania",
    "Hatonuevo",
    "Barrancas",
    "Fonseca",
    "San Juan del Cesar",
    "Otro (corregimiento / vereda)",
  ],
  Magdalena: ["Santa Marta", "Ciénaga", "Fundación", "Otro (corregimiento / vereda)"],
  Atlántico: ["Barranquilla", "Soledad", "Otro (corregimiento / vereda)"],
  Bolívar: ["Cartagena de Indias", "Otro (corregimiento / vereda)"],
  Otros: ["Otro municipio", "Otro (corregimiento / vereda)"],
};

// Coordenadas aproximadas por municipio para el mapa
const MUNICIPIOS_COORDS = {
  Valledupar: { lat: 10.4631, lng: -73.2532 },
  "La Jagua de Ibirico": { lat: 9.562, lng: -73.333 },
  "El Paso": { lat: 9.658, lng: -73.746 },
  Chiriguaná: { lat: 9.362, lng: -73.602 },
  "El Copey": { lat: 10.151, lng: -73.961 },
  Barrancas: { lat: 10.956, lng: -72.795 },
  Hatonuevo: { lat: 11.071, lng: -72.764 },
  Albania: { lat: 11.159, lng: -72.593 },
  Riohacha: { lat: 11.544, lng: -72.907 },
};

// ================= ESTADO GLOBAL =================

let registrosRaw = [];
let registrosLimpios = [];
let registrosDuplicados = [];
let registrosPreguntas = [];

let ingresosAsistencia = []; // {fechaIngreso, nombreCompleto, municipio, relacionMinero, origen, esCorregimiento, nombreCorregimiento}

let chartRelacionInstance = null;
let chartPorDiaInstance = null;
let chartPreVsEventoInstance = null;
let chartMunicipiosInstance = null;

let mapaAsistencia = null;
let capaAsistencia = null;

let currentRole = "dashboard";
let loginPendingRole = null;

// selects globales para departamento/municipio
let deptoSelectGlobal = null;
let muniSelectGlobal = null;

// Registrar plugin de datalabels + defaults de Chart
if (window.Chart) {
  Chart.defaults.font.family =
    "Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = "#12232f";
}
if (window.Chart && window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// ================= UTILIDADES =================

function formatearFechaHora(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return (
    d.toLocaleDateString("es-CO") +
    " " +
    d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  );
}

function escapeHtml(str) {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function playBeep(ok = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.12;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, ok ? 150 : 400);
  } catch (_) {
    // silencio
  }
}

// ================= NAVEGACIÓN / ROLES / LOGIN =================

function activarSeccion(id) {
  document
    .querySelectorAll(".section")
    .forEach((sec) => sec.classList.remove("active"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));

  const sec = document.getElementById(`section-${id}`);
  const btn = document.querySelector(`.nav-btn[data-section="${id}"]`);
  if (sec) sec.classList.add("active");
  if (btn) btn.classList.add("active");

  if (id === "asistencia") {
    setTimeout(() => {
      if (!mapaAsistencia) initMapaAsistencia();
      renderAsistencia();
    }, 50);
  }
}

function actualizarCabeceraMainTable() {
  const theadRow = document.getElementById("theadMainRow");
  if (!theadRow) return;

  if (currentRole === "admin") {
    theadRow.innerHTML = `
      <th>Fecha</th>
      <th>Nombre</th>
      <th>Teléfono</th>
      <th>Correo</th>
      <th>Relación</th>
      <th>Municipio / corregimiento (evento)</th>
    `;
  } else {
    // dashboard y asistencia: vista resumida
    theadRow.innerHTML = `
      <th>Fecha</th>
      <th>Nombre</th>
    `;
  }
}

function actualizarUIporRol() {
  const navDashboard = document.getElementById("navDashboard");
  const navPreguntas = document.getElementById("navPreguntas");
  const navDuplicados = document.getElementById("navDuplicados");
  const navDescargas = document.getElementById("navDescargas");
  const navAsistencia = document.getElementById("navAsistencia");

  if (currentRole === "dashboard") {
    navDashboard.style.display = "";
    navPreguntas.style.display = "";
    navDuplicados.style.display = "none";
    navDescargas.style.display = "none";
    navAsistencia.style.display = "none";
    activarSeccion("dashboard");
  } else if (currentRole === "asistencia") {
    navDashboard.style.display = "";
    navPreguntas.style.display = "none";
    navDuplicados.style.display = "none";
    navDescargas.style.display = "none";
    navAsistencia.style.display = "";
    activarSeccion("asistencia");
  } else {
    // admin
    navDashboard.style.display = "";
    navPreguntas.style.display = "";
    navDuplicados.style.display = "";
    navDescargas.style.display = "";
    navAsistencia.style.display = "";
    activarSeccion("dashboard");
  }

  const badge = document.getElementById("currentPath");
  badge.textContent = `Rol: ${currentRole}`;

  actualizarCabeceraMainTable();
  renderTablaPrincipal(document.getElementById("searchMain")?.value || "");
}

function abrirLoginOverlay(rol) {
  loginPendingRole = rol;
  const overlay = document.getElementById("loginOverlay");
  const title = document.getElementById("loginTitle");
  const subtitle = document.getElementById("loginSubtitle");
  const error = document.getElementById("loginError");
  const input = document.getElementById("loginPassword");

  if (rol === "admin") {
    title.textContent = "Acceso a Admin";
    subtitle.textContent = "Ingresa la clave para ver toda la información.";
  } else if (rol === "asistencia") {
    title.textContent = "Acceso a Asistencia en vivo";
    subtitle.textContent =
      "Ingresa la clave para registrar ingresos durante el evento.";
  } else {
    title.textContent = "Acceso restringido";
    subtitle.textContent = "Ingresa la clave para continuar.";
  }

  error.textContent = "";
  input.value = "";

  overlay.classList.remove("hidden");
  setTimeout(() => input.focus(), 50);
}

function cerrarLoginOverlay() {
  const overlay = document.getElementById("loginOverlay");
  const input = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  overlay.classList.add("hidden");
  input.value = "";
  error.textContent = "";
  loginPendingRole = null;

  // devolver el selector al rol actual
  const selector = document.getElementById("roleSelector");
  if (selector) selector.value = currentRole;
}

function intentarLogin() {
  if (!loginPendingRole) return;

  const passEsperada = PASSWORDS[loginPendingRole];
  const input = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  const clave = input.value.trim();

  if (clave === passEsperada) {
    sessionStorage.setItem(`vdc_auth_${loginPendingRole}`, "ok");
    currentRole = loginPendingRole;
    loginPendingRole = null;
    cerrarLoginOverlay();
    actualizarUIporRol();
    playBeep(true);
  } else {
    error.textContent = "Clave incorrecta. Inténtalo de nuevo.";
    playBeep(false);
    input.focus();
  }
}

function cambiarRol(nuevoRol) {
  if (nuevoRol === currentRole) return;

  if (nuevoRol === "dashboard") {
    currentRole = "dashboard";
    actualizarUIporRol();
    return;
  }

  const key = `vdc_auth_${nuevoRol}`;
  if (sessionStorage.getItem(key) === "ok") {
    currentRole = nuevoRol;
    actualizarUIporRol();
    return;
  }

  abrirLoginOverlay(nuevoRol);
}

// ================= PROCESAMIENTO PREREGISTRO =================

function procesarDatos(raw) {
  registrosRaw = raw || [];

  const mapa = new Map(); // clave => { principal, duplicados[] }

  registrosRaw.forEach((r) => {
    const tel = (r.telefono || "").trim();
    const correo = (r.correo || "").trim().toLowerCase();
    const clave = `${tel}__${correo}`;

    const fecha = new Date(r.marcaTemporal || "");
    const registroConFecha = { ...r, _fechaObj: fecha };

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        principal: registroConFecha,
        duplicados: [],
      });
    } else {
      const grupo = mapa.get(clave);
      // Opción B: conservar el más reciente
      if (registroConFecha._fechaObj > grupo.principal._fechaObj) {
        grupo.duplicados.push(grupo.principal);
        grupo.principal = registroConFecha;
      } else {
        grupo.duplicados.push(registroConFecha);
      }
    }
  });

  registrosLimpios = [];
  registrosDuplicados = [];

  mapa.forEach((grupo) => {
    registrosLimpios.push(grupo.principal);
    if (grupo.duplicados.length > 0) {
      registrosDuplicados.push({
        principal: grupo.principal,
        duplicados: grupo.duplicados,
      });
    }
  });

  registrosLimpios.sort(
    (a, b) => new Date(b.marcaTemporal) - new Date(a.marcaTemporal)
  );

  registrosPreguntas = registrosLimpios.filter((r) => {
    const p = (r.pregunta || "").trim();
    if (!p) return false;
    const lower = p.toLowerCase();
    if (["n/a", "na", "ninguna", "ninguno", "no"].includes(lower)) return false;
    return true;
  });
}

// ================= KPIs =================

function actualizarKPIs() {
  const total = registrosLimpios.length;
  const cuposMax = 300;
  const disponibles = Math.max(0, cuposMax - total);

  let directos = 0;
  let indirectos = 0;
  let noMineros = 0;

  registrosLimpios.forEach((r) => {
    const rel = (r.relacionMinero || "").toLowerCase();
    if (rel.includes("directamente")) directos++;
    else if (rel.includes("indirecta")) indirectos++;
    else if (rel === "no") noMineros++;
  });

  const conVinculo = directos + indirectos;
  const preguntas = registrosPreguntas.length;

  document.getElementById("kpiTotal").textContent = `${total} / ${cuposMax}`;
  document.getElementById("kpiDisponibles").textContent = disponibles;
  document.getElementById(
    "kpiVinculo"
  ).textContent = `${conVinculo} (${total ? Math.round(
    (conVinculo / total) * 100
  ) : 0}%)`;
  document.getElementById("kpiPreguntas").textContent = preguntas;

  if (registrosLimpios.length > 0) {
    const ultimo = registrosLimpios[0];
    const d = new Date(ultimo.marcaTemporal);
    document.getElementById("lastUpdate").textContent =
      "Último registro: " +
      d.toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      });
  } else {
    document.getElementById("lastUpdate").textContent = "Sin registros.";
  }
}

// ================= TABLAS PREREGISTRO =================

function renderTablaPrincipal(filtroTexto = "") {
  const tbody = document.getElementById("tbodyMain");
  if (!tbody) return;
  tbody.innerHTML = "";
  const term = filtroTexto.toLowerCase();

  registrosLimpios.forEach((r) => {
    const compuesto = `${r.nombreCompleto || ""}`.toLowerCase();
    if (term && !compuesto.includes(term)) return;

    const fecha = escapeHtml(formatearFechaHora(r.marcaTemporal));
    const nombre = escapeHtml(r.nombreCompleto || "");
    const tel = escapeHtml(r.telefono || "");
    const correo = escapeHtml(r.correo || "");
    const rel = escapeHtml(r.relacionMinero || "");
    const muni = escapeHtml(r.municipioEvento || "");

    const tr = document.createElement("tr");

    if (currentRole === "admin") {
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${nombre}</td>
        <td>${tel}</td>
        <td>${correo}</td>
        <td>${rel}</td>
        <td>${muni}</td>
      `;
    } else {
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${nombre}</td>
      `;
    }

    tbody.appendChild(tr);
  });
}

function renderTablaPreguntas(filtroTexto = "") {
  const tbody = document.getElementById("tbodyPreguntas");
  tbody.innerHTML = "";
  const term = filtroTexto.toLowerCase();

  registrosPreguntas.forEach((r) => {
    const textoBusqueda =
      `${r.nombreCompleto || ""} ${r.relacionMinero || ""} ${
        r.pregunta || ""
      } ${r.resumenPregunta || ""}`.toLowerCase();
    if (term && !textoBusqueda.includes(term)) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatearFechaHora(r.marcaTemporal))}</td>
      <td>${escapeHtml(r.nombreCompleto || "")}</td>
      <td>${escapeHtml(r.relacionMinero || "")}</td>
      <td>${escapeHtml(r.resumenPregunta || "")}</td>
      <td>${escapeHtml(r.pregunta || "")}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTablaDuplicados() {
  const tbody = document.getElementById("tbodyDuplicados");
  tbody.innerHTML = "";

  if (registrosDuplicados.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td colspan='5'>No se encontraron registros duplicados.</td>";
    tbody.appendChild(tr);
    return;
  }

  registrosDuplicados.forEach((grupo) => {
    const principal = grupo.principal;
    const fechas = [principal, ...grupo.duplicados]
      .map((r) => formatearFechaHora(r.marcaTemporal))
      .join(" · ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(principal.nombreCompleto || "")}</td>
      <td>${escapeHtml(principal.telefono || "")}</td>
      <td>${escapeHtml(principal.correo || "")}</td>
      <td>${grupo.duplicados.length + 1}</td>
      <td>${escapeHtml(fechas)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= GRÁFICOS PREREGISTRO =================

function renderGraficos() {
  // --- Torta relación con el sector (usando registrosLimpios) ---
  let directos = 0;
  let indirectos = 0;
  let noMineros = 0;

  registrosLimpios.forEach((r) => {
    const rel = (r.relacionMinero || "").toLowerCase();
    if (rel.includes("directamente")) directos++;
    else if (rel.includes("indirecta")) indirectos++;
    else if (rel === "no") noMineros++;
  });

  const ctxRel = document.getElementById("chartRelacion").getContext("2d");
  if (chartRelacionInstance) chartRelacionInstance.destroy();
  chartRelacionInstance = new Chart(ctxRel, {
    type: "doughnut",
    data: {
      labels: [
        "Sí, trabajo directamente en el sector",
        "De manera indirecta",
        "No trabajan en minería",
      ],
      datasets: [
        {
          data: [directos, indirectos, noMineros],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "right" },
        datalabels: {
          formatter: (value, ctx) => {
            const dataArr = ctx.chart.data.datasets[0].data;
            const sum = dataArr.reduce((a, b) => a + b, 0);
            if (!value || !sum) return "";
            const perc = ((value / sum) * 100).toFixed(1);
            return `${value} (${perc}%)`;
          },
          color: "#12232f",
          font: { size: 11, weight: "600" },
          anchor: "center",
          align: "center",
        },
      },
    },
  });

  // --- Registros por día (usando TODOS los registros del Excel y fecha local) ---
  const conteoPorDia = {};

  // fuente: datos crudos para coincidir con la hoja; si por alguna razón
  // viene vacío, usamos registrosLimpios como respaldo
  const fuente =
    registrosRaw && registrosRaw.length ? registrosRaw : registrosLimpios;

  fuente.forEach((r) => {
    if (!r.marcaTemporal) return;
    const d = new Date(r.marcaTemporal);
    if (isNaN(d.getTime())) return;

    // clave de fecha en horario LOCAL (evitamos toISOString/UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const clave = `${year}-${month}-${day}`;

    conteoPorDia[clave] = (conteoPorDia[clave] || 0) + 1;
  });

  const diasOrdenados = Object.keys(conteoPorDia).sort();
  const labels = diasOrdenados.map((k) => {
    const [y, m, d] = k.split("-");
    return `${d}/${m}/${y}`; // dd/mm/aaaa
  });
  const valores = diasOrdenados.map((k) => conteoPorDia[k]);

  const ctxDia = document.getElementById("chartPorDia").getContext("2d");
  if (chartPorDiaInstance) chartPorDiaInstance.destroy();
  chartPorDiaInstance = new Chart(ctxDia, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Registros por día",
          data: valores,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (v) => (v ? v : ""),
          align: "top",
          anchor: "end",
          font: { size: 9, weight: "600" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });

  // --- Pre-registro vs día del evento ---
  const preEvento = registrosLimpios.filter((r) => {
    const d = new Date(r.marcaTemporal);
    return d < EVENT_DATE;
  }).length;

  const diaEvento = ingresosAsistencia.length;

  const ctxPre = document.getElementById("chartPreVsEvento").getContext("2d");
  if (chartPreVsEventoInstance) chartPreVsEventoInstance.destroy();
  chartPreVsEventoInstance = new Chart(ctxPre, {
    type: "bar",
    data: {
      labels: ["Pre-registro online", "Registro día del evento"],
      datasets: [
        {
          data: [preEvento, diaEvento],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (v) => v || "",
          anchor: "end",
          align: "top",
          font: { size: 10, weight: "600" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

// ================= DESCARGAS =================

function descargarCSV(nombreArchivo, encabezados, filas) {
  const cab = encabezados.join(";");
  const cuerpo = filas
    .map((row) =>
      row
        .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
        .join(";")
    )
    .join("\n");
  const csv = cab + "\n" + cuerpo;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExcelListado() {
  const encabezados = [
    "Fecha",
    "Nombre",
    "Teléfono",
    "Correo",
    "Municipio / corregimiento (evento)",
    "Relación con el sector",
    "Pregunta",
  ];
  const filas = registrosLimpios.map((r) => [
    formatearFechaHora(r.marcaTemporal),
    r.nombreCompleto || "",
    r.telefono || "",
    r.correo || "",
    r.municipioEvento || "",
    r.relacionMinero || "",
    r.pregunta || "",
  ]);
  descargarCSV("listado_asistentes_voces_del_carbon.csv", encabezados, filas);
}

function handlePdfLista() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Voces del Carbón", 14, 16);
  doc.setFontSize(11);
  doc.text("Conversatorio – 5 de diciembre de 2025", 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Listado general de asistencia (para impresión)", 14, 28);

  const encabezados = [
    "N°",
    "Nombre",
    "Teléfono",
    "Correo",
    "Municipio / corregimiento (evento)",
    "Relación",
    "Observaciones",
  ];

  const filas = registrosLimpios.map((r, idx) => [
    idx + 1,
    r.nombreCompleto || "",
    r.telefono || "",
    r.correo || "",
    r.municipioEvento || "",
    r.relacionMinero || "",
    "",
  ]);

  doc.autoTable({
    startY: 32,
    head: [encabezados],
    body: filas,
    theme: "grid",
    styles: { fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 138, 58], textColor: 255 },
  });

  doc.save("lista_asistencia_voces_del_carbon.pdf");
}

function handlePdfAsistentes() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Voces del Carbón", 14, 16);
  doc.setFontSize(11);
  doc.text("Conversatorio – Asistentes presentes", 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Solo personas con ingreso registrado en el evento.", 14, 28);

  const encabezados = [
    "N°",
    "Nombre",
    "Municipio",
    "Relación",
    "Origen",
    "Hora ingreso",
  ];

  const filas = ingresosAsistencia.map((a, idx) => [
    idx + 1,
    a.nombreCompleto || "",
    a.municipio || "",
    a.relacionMinero || "",
    a.origen || "",
    formatearFechaHora(a.fechaIngreso),
  ]);

  doc.autoTable({
    startY: 32,
    head: [encabezados],
    body: filas,
    theme: "grid",
    styles: { fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 138, 58], textColor: 255 },
  });

  doc.save("lista_solo_asistentes_voces_del_carbon.pdf");
}

function handlePdfPreguntas() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Voces del Carbón", 14, 16);
  doc.setFontSize(11);
  doc.text("Conversatorio – Preguntas para panelistas", 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Incluye el resumen (diligenciado en la hoja) y la pregunta original.",
    14,
    28
  );

  const encabezados = ["N°", "Nombre", "Relación", "Resumen", "Pregunta"];

  const filas = registrosPreguntas.map((r, idx) => [
    idx + 1,
    r.nombreCompleto || "",
    r.relacionMinero || "",
    r.resumenPregunta || "",
    r.pregunta || "",
  ]);

  doc.autoTable({
    startY: 32,
    head: [encabezados],
    body: filas,
    theme: "grid",
    styles: { fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 138, 58], textColor: 255 },
    columnStyles: {
      3: { cellWidth: 60 },
      4: { cellWidth: 80 },
    },
  });

  doc.save("preguntas_panelistas_voces_del_carbon.pdf");
}

// Planilla vacía en PDF (20 filas, más margen a la derecha)
function handlePdfPlanillaVacia() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // Encabezado tipo membrete
  doc.setFillColor(0, 138, 58);
  doc.rect(0, 0, 210, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Voces del Carbón", 14, 11);
  doc.setFontSize(10);
  doc.text("Conversatorio – 5 de diciembre de 2025", 14, 16);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Planilla vacía de asistencia – diligenciamiento manual",
    14,
    26
  );

  const encabezados = [
    "N°",
    "Nombre completo",
    "Documento",
    "Teléfono / WhatsApp",
    "Correo",
    "Municipio / corregimiento",
    "Relación con el sector",
    "Firma",
    "Observaciones",
  ];

  const filas = [];
  for (let i = 1; i <= 20; i++) {
    filas.push([i, "", "", "", "", "", "", "", ""]);
  }

  doc.autoTable({
    startY: 30,
    head: [encabezados],
    body: filas,
    theme: "grid",
    styles: { fontSize: 7, lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [0, 138, 58], textColor: 255 },
    // sin columnStyles para que jsPDF maneje el ancho y deje margen
  });

  doc.save("planilla_vacia_asistencia_voces_del_carbon.pdf");
}

// ================= ASISTENCIA EN VIVO =================

function initMapaAsistencia() {
  mapaAsistencia = L.map("mapAsistencia").setView([9.7, -73.3], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mapaAsistencia);

  capaAsistencia = L.layerGroup().addTo(mapaAsistencia);
}

function buscarEnPreregistro(ident) {
  const idLower = ident.trim().toLowerCase();
  if (!idLower) return null;

  // 1) teléfono exacto o correo exacto
  let encontrado =
    registrosLimpios.find((r) => {
      const tel = (r.telefono || "").trim();
      const correo = (r.correo || "").trim().toLowerCase();
      return (
        tel === idLower ||
        correo === idLower ||
        tel === ident.trim() ||
        correo === ident.trim().toLowerCase()
      );
    }) || null;

  if (encontrado) return encontrado;

  // 2) por nombre que contenga el texto
  encontrado =
    registrosLimpios.find((r) =>
      (r.nombreCompleto || "").toLowerCase().includes(idLower)
    ) || null;

  return encontrado;
}

function rellenarDesdePreregistro(registro) {
  if (!registro) return;

  const nombreInput = document.getElementById("asistNombre");
  const telInput = document.getElementById("asistTelefono");
  const correoInput = document.getElementById("asistCorreo");
  const relSelect = document.getElementById("asistRelacion");
  const mensaje = document.getElementById("asistMensaje");

  if (nombreInput) nombreInput.value = registro.nombreCompleto || "";
  if (telInput) telInput.value = registro.telefono || "";
  if (correoInput) correoInput.value = registro.correo || "";
  if (relSelect) relSelect.value = registro.relacionMinero || "";

  if (deptoSelectGlobal && muniSelectGlobal) {
    const dep = registro.departamentoEvento || deptoSelectGlobal.value;
    updateMunicipiosForDep(dep, registro.municipioEvento || "");
  }

  mensaje.textContent =
    "Pre-registro encontrado. Verifica los datos y registra el ingreso.";
}

function autoRellenarPorIdentificador() {
  const ident = document.getElementById("asistIdentificador").value.trim();
  const mensaje = document.getElementById("asistMensaje");
  if (!ident) {
    mensaje.textContent = "";
    return;
  }

  const encontrado = buscarEnPreregistro(ident);
  if (encontrado) {
    rellenarDesdePreregistro(encontrado);
    playBeep(true);
  } else {
    mensaje.textContent =
      "No se encontró preregistro con ese dato. Puedes completar los campos y registrar como nuevo.";
    playBeep(false);
  }
}

function limpiarFormularioAsistencia() {
  const campos = [
    "asistIdentificador",
    "asistNombre",
    "asistTelefono",
    "asistCorreo",
  ];
  campos.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const rel = document.getElementById("asistRelacion");
  if (rel) rel.value = "";
  const msg = document.getElementById("asistMensaje");
  if (msg) msg.textContent = "";

  const corrChk = document.getElementById("asistCorregimiento");
  const corrNom = document.getElementById("asistCorregNombre");
  const corrLabel = document.getElementById("labelCorregNombre");
  if (corrChk) corrChk.checked = false;
  if (corrNom) corrNom.value = "";
  if (corrLabel) corrLabel.style.display = "none";
}

function registrarIngreso(e) {
  e.preventDefault();

  const ident = document.getElementById("asistIdentificador").value.trim();
  const nombreInput = document.getElementById("asistNombre");
  const deptoSelect = deptoSelectGlobal;
  const muniSelect = muniSelectGlobal;
  const corrCheckbox = document.getElementById("asistCorregimiento");
  const corrNombreInput = document.getElementById("asistCorregNombre");
  const relSelect = document.getElementById("asistRelacion");
  const telInput = document.getElementById("asistTelefono");
  const correoInput = document.getElementById("asistCorreo");
  const mensaje = document.getElementById("asistMensaje");

  if (!ident) {
    mensaje.textContent = "Por favor ingrese teléfono, correo o nombre.";
    playBeep(false);
    return;
  }

  let prereg = buscarEnPreregistro(ident);

  let nombre = nombreInput.value.trim();
  let telefono = telInput.value.trim();
  let correo = correoInput.value.trim();
  let municipio = muniSelect ? muniSelect.value : "";
  let relacion = relSelect.value;

  let origen = "Nuevo sin preregistro";

  if (prereg) {
    if (!nombre) nombre = prereg.nombreCompleto || "";
    if (!telefono) telefono = prereg.telefono || "";
    if (!correo) correo = prereg.correo || "";
    if (!relacion) relacion = prereg.relacionMinero || "";
    if (!municipio) municipio = prereg.municipioEvento || "";
    origen = "Desde preregistro";
  }

  if (!deptoSelect || !deptoSelect.value || !municipio) {
    mensaje.textContent =
      "Por favor selecciona el departamento y el municipio/corregimiento antes de registrar.";
    playBeep(false);
    return;
  }

  const esCorregimiento = corrCheckbox && corrCheckbox.checked;
  const nombreCorregimiento = (corrNombreInput?.value || "").trim();

  if (esCorregimiento && !nombreCorregimiento) {
    mensaje.textContent =
      "Si marcas que viene de corregimiento/vereda, debes escribir el nombre.";
    playBeep(false);
    return;
  }

  if (!nombre || !relacion) {
    mensaje.textContent =
      "Completa al menos el nombre y la relación con el sector para registrar el ingreso.";
    playBeep(false);
    return;
  }

  const ahora = new Date();

  const ingreso = {
    fechaIngreso: ahora.toISOString(),
    nombreCompleto: nombre,
    municipio,
    relacionMinero: relacion,
    origen,
    esCorregimiento,
    nombreCorregimiento,
  };

  ingresosAsistencia.unshift(ingreso);
  actualizarKPIsAsistencia();
  renderAsistencia();

  mensaje.textContent =
    origen === "Desde preregistro"
      ? "Ingreso registrado (preinscrito encontrado)."
      : "Ingreso registrado como nuevo asistente.";
  playBeep(true);

  document.getElementById("asistIdentificador").value = "";

  if (API_ASISTENCIA_POST) {
    fetch(API_ASISTENCIA_POST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ingreso,
        identificador: ident,
        telefono,
        correo,
        departamento: deptoSelect.value,
      }),
    }).catch(() => {});
  }

  renderGraficos();
}

function actualizarKPIsAsistencia() {
  const total = ingresosAsistencia.length;
  const desdePrereg = ingresosAsistencia.filter(
    (i) => i.origen === "Desde preregistro"
  ).length;
  const nuevos = total - desdePrereg;

  document.getElementById("kpiPresentes").textContent = total;
  document.getElementById("kpiPresentesPrereg").textContent = desdePrereg;
  document.getElementById("kpiPresentesNuevos").textContent = nuevos;

  if (ingresosAsistencia.length > 0) {
    const ult = ingresosAsistencia[0];
    document.getElementById("kpiUltimoIngreso").textContent =
      formatearFechaHora(ult.fechaIngreso);
  } else {
    document.getElementById("kpiUltimoIngreso").textContent = "–";
  }
}

function renderAsistencia(filtroTexto = "") {
  const tbody = document.getElementById("tbodyAsistencia");
  if (!tbody) return;
  tbody.innerHTML = "";
  const term = (filtroTexto || "").toLowerCase();

  ingresosAsistencia.forEach((i) => {
    const textoBusqueda =
      `${i.nombreCompleto || ""} ${i.municipio || ""} ${
        i.relacionMinero || ""
      }`.toLowerCase();
    if (term && !textoBusqueda.includes(term)) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatearFechaHora(i.fechaIngreso))}</td>
      <td>${escapeHtml(i.nombreCompleto || "")}</td>
      <td>${escapeHtml(i.municipio || "")}</td>
      <td>${escapeHtml(i.relacionMinero || "")}</td>
      <td>${escapeHtml(i.origen || "")}</td>
    `;
    tbody.appendChild(tr);
  });

  renderMapaAsistencia();
  renderGraficoMunicipios();
}

function renderMapaAsistencia() {
  if (!mapaAsistencia || !capaAsistencia) return;
  capaAsistencia.clearLayers();

  ingresosAsistencia.forEach((i) => {
    const muni = (i.municipio || "").trim();
    if (!muni) return;
    const coord = MUNICIPIOS_COORDS[muni];
    if (!coord) return;

    const detalleCorreg =
      i.esCorregimiento && i.nombreCorregimiento
        ? `<br><em>Corregimiento / vereda: ${escapeHtml(
            i.nombreCorregimiento
          )}</em>`
        : i.esCorregimiento
        ? "<br><em>Corregimiento / vereda</em>"
        : "";

    L.marker([coord.lat, coord.lng])
      .addTo(capaAsistencia)
      .bindPopup(
        `<strong>${escapeHtml(i.nombreCompleto || "")}</strong><br>${escapeHtml(
          muni
        )}${detalleCorreg}<br><small>${escapeHtml(i.origen || "")}</small>`
      );
  });
}

function renderGraficoMunicipios() {
  const conteo = {};
  ingresosAsistencia.forEach((i) => {
    const muni = (i.municipio || "").trim();
    if (!muni) return;
    conteo[muni] = (conteo[muni] || 0) + 1;
  });

  const entries = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const labels = entries.map((e) => e[0]);
  const valores = entries.map((e) => e[1]);

  const ctx = document.getElementById("chartMunicipios").getContext("2d");
  if (chartMunicipiosInstance) chartMunicipiosInstance.destroy();

  if (labels.length === 0) {
    chartMunicipiosInstance = new Chart(ctx, {
      type: "bar",
      data: { labels: ["Sin datos"], datasets: [{ data: [0] }] },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    return;
  }

  chartMunicipiosInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: valores,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (v) => v || "",
          anchor: "end",
          align: "top",
          font: { size: 9, weight: "600" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

// ================= CARGA INICIAL =================

async function cargarDatos() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const registros = data.registros || [];
    procesarDatos(registros);

    actualizarKPIs();
    actualizarCabeceraMainTable();
    renderTablaPrincipal();
    renderTablaPreguntas();
    renderTablaDuplicados();
    renderGraficos();
  } catch (err) {
    console.error("Error al cargar datos:", err);
    document.getElementById("lastUpdate").textContent =
      "Error al cargar datos.";
  }
}

function updateMunicipiosForDep(dep, municipioSeleccionado) {
  if (!deptoSelectGlobal || !muniSelectGlobal) return;
  deptoSelectGlobal.value = dep || deptoSelectGlobal.value;

  const lista = DEPARTAMENTOS_MUNICIPIOS[deptoSelectGlobal.value] || [];
  muniSelectGlobal.innerHTML = "";
  lista.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    muniSelectGlobal.appendChild(opt);
  });

  if (municipioSeleccionado) {
    muniSelectGlobal.value = municipioSeleccionado;
  }
}

function poblarDepartamentosMunicipios() {
  const deptoSelect = document.getElementById("asistDepto");
  const muniSelect = document.getElementById("asistMunicipio");
  if (!deptoSelect || !muniSelect) return;

  deptoSelectGlobal = deptoSelect;
  muniSelectGlobal = muniSelect;

  deptoSelect.innerHTML = "";
  Object.keys(DEPARTAMENTOS_MUNICIPIOS).forEach((dep) => {
    const opt = document.createElement("option");
    opt.value = dep;
    opt.textContent = dep;
    deptoSelect.appendChild(opt);
  });

  deptoSelect.addEventListener("change", () =>
    updateMunicipiosForDep(deptoSelect.value, "")
  );

  updateMunicipiosForDep(deptoSelect.value, "");
}

// ================= EVENTOS =================

document.addEventListener("DOMContentLoaded", () => {
  // Rol inicial: dashboard
  currentRole = "dashboard";
  document.getElementById("roleSelector").value = currentRole;
  actualizarUIporRol();

  document
    .getElementById("roleSelector")
    .addEventListener("change", (e) => cambiarRol(e.target.value));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.getAttribute("data-section");
      activarSeccion(sec);
    });
  });

  document
    .getElementById("searchMain")
    .addEventListener("input", (e) =>
      renderTablaPrincipal(e.target.value || "")
    );
  document
    .getElementById("searchPreguntas")
    .addEventListener("input", (e) =>
      renderTablaPreguntas(e.target.value || "")
    );
  const searchAsistencia = document.getElementById("searchAsistencia");
  if (searchAsistencia) {
    searchAsistencia.addEventListener("input", (e) =>
      renderAsistencia(e.target.value || "")
    );
  }

  document
    .getElementById("btnExcelListado")
    .addEventListener("click", handleExcelListado);
  document
    .getElementById("btnPdfLista")
    .addEventListener("click", handlePdfLista);
  document
    .getElementById("btnPdfAsistentes")
    .addEventListener("click", handlePdfAsistentes);
  document
    .getElementById("btnPdfPreguntas")
    .addEventListener("click", handlePdfPreguntas);
  document
    .getElementById("btnPdfPlanillaVacia")
    .addEventListener("click", handlePdfPlanillaVacia);

  document.getElementById("homeLink").addEventListener("click", (e) => {
    e.preventDefault();
    activarSeccion("dashboard");
  });

  const formAsistencia = document.getElementById("formAsistencia");
  if (formAsistencia) {
    formAsistencia.addEventListener("submit", registrarIngreso);
  }

  const identInput = document.getElementById("asistIdentificador");
  if (identInput) {
    identInput.addEventListener("change", autoRellenarPorIdentificador);
    identInput.addEventListener("blur", autoRellenarPorIdentificador);
    identInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        autoRellenarPorIdentificador();
      }
    });
  }

  const corrCheckbox = document.getElementById("asistCorregimiento");
  const corrLabel = document.getElementById("labelCorregNombre");
  if (corrCheckbox && corrLabel) {
    corrCheckbox.addEventListener("change", () => {
      if (corrCheckbox.checked) {
        corrLabel.style.display = "";
      } else {
        corrLabel.style.display = "none";
        const corrNom = document.getElementById("asistCorregNombre");
        if (corrNom) corrNom.value = "";
      }
    });
  }

  const btnLimpiar = document.getElementById("btnAsistLimpiar");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarFormularioAsistencia);
  }

  // Login overlay eventos
  const overlay = document.getElementById("loginOverlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      cerrarLoginOverlay();
    }
  });

  document
    .getElementById("loginCancel")
    .addEventListener("click", cerrarLoginOverlay);
  document
    .getElementById("loginSubmit")
    .addEventListener("click", intentarLogin);
  document
    .getElementById("loginPassword")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") intentarLogin();
    });

  poblarDepartamentosMunicipios();
  cargarDatos();
});
window.addEventListener("load", () => {
  initMapaAsistencia();
});