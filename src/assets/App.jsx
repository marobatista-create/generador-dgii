import { useState, useRef, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = "https://generador-dgii-production.up.railway.app";

const getToken = () => localStorage.getItem("dgii_token");
const getUser  = () => { try { return JSON.parse(localStorage.getItem("dgii_user")); } catch { return null; } };
const setAuth  = (t, u) => { localStorage.setItem("dgii_token", t); localStorage.setItem("dgii_user", JSON.stringify(u)); };
const clearAuth = () => { localStorage.removeItem("dgii_token"); localStorage.removeItem("dgii_user"); };

const authFetch = async (url, opts = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...opts.headers },
  });
  if (res.status === 401) { clearAuth(); window.location.reload(); }
  return res;
};

// ─── CATÁLOGOS ────────────────────────────────────────────────
const TIPOS_BIENES_606 = [
  { v:"01", l:"01 - Gastos de personal" }, { v:"02", l:"02 - Trabajo, suministros y servicios" },
  { v:"03", l:"03 - Arrendamientos" }, { v:"04", l:"04 - Activos fijos" },
  { v:"05", l:"05 - Gastos de representación" }, { v:"06", l:"06 - Financieros" },
  { v:"07", l:"07 - Seguros" }, { v:"08", l:"08 - Gastos de propiedad" },
  { v:"09", l:"09 - Impuestos y tasas" }, { v:"10", l:"10 - Comisiones y honorarios" },
  { v:"11", l:"11 - Reparaciones y conservación" }, { v:"12", l:"12 - Investigación y desarrollo" },
  { v:"13", l:"13 - Regalías" }, { v:"14", l:"14 - Empresas relacionadas" },
  { v:"15", l:"15 - Otros gastos deducibles" }, { v:"16", l:"16 - Gastos no deducibles" },
  { v:"17", l:"17 - Importaciones" }, { v:"18", l:"18 - Educación, arte y deporte" },
];
const TIPOS_INGRESOS_607 = [
  { v:"01", l:"01 - Ingresos por operaciones" }, { v:"02", l:"02 - Ingresos financieros" },
  { v:"03", l:"03 - Ingresos extraordinarios" }, { v:"04", l:"04 - Arrendamientos" },
  { v:"05", l:"05 - Venta de activos depreciables" }, { v:"06", l:"06 - Otros ingresos" },
];
const FORMAS_PAGO_606 = [
  { v:"01", l:"01 - Efectivo" }, { v:"02", l:"02 - Cheque / Transferencia" },
  { v:"03", l:"03 - Tarjeta crédito/débito" }, { v:"04", l:"04 - Crédito" },
  { v:"05", l:"05 - Permuta" }, { v:"06", l:"06 - Nota de crédito" }, { v:"07", l:"07 - Mixto" },
];
const TIPO_RET_ISR = [
  { v:"", l:"— Ninguna —" }, { v:"01", l:"01 - Alquileres" }, { v:"02", l:"02 - Honorarios" },
  { v:"03", l:"03 - Otras rentas" }, { v:"04", l:"04 - Rentas presuntas" },
  { v:"05", l:"05 - Intereses PN" }, { v:"06", l:"06 - Intereses PJ" },
  { v:"07", l:"07 - Juegos de azar" }, { v:"08", l:"08 - Alquileres PN" },
  { v:"09", l:"09 - Facturas gubernamentales" }, { v:"10", l:"10 - Compras" },
  { v:"11", l:"11 - Compras exterior" }, { v:"12", l:"12 - Pagos exterior" },
];

// NCF válidos: B01-B16, E31, E32, E33, E34, E41, E43, E44, E45, E46, E47
const NCF_REGEX = /^[BE]\d{2}\d{8}$/;
const validarNCF = (ncf) => {
  if (!ncf) return null;
  if (!NCF_REGEX.test(ncf)) return "NCF inválido (ej: E310000000001 o B010000000001)";
  return null;
};

const emptyRow606 = () => ({
  id: crypto.randomUUID(), rnc:"", tipoId:"1", ncf:"", ncfMod:"", tipoBienes:"01",
  fechaNcf:"", fechaPago:"", montoFact:"", itbisFact:"", itbisRetTerceros:"",
  itbisPercibido:"", tipoRetIsr:"", retRenta:"", isrPercibido:"",
  impSelConsumo:"", otrosImp:"", propina:"", formaPago:"01",
});
const emptyRow607 = () => ({
  id: crypto.randomUUID(), rnc:"", tipoId:"1", ncf:"", ncfMod:"", tipoIngreso:"01",
  fechaNcf:"", fechaRetPago:"", montoFact:"", itbisFact:"", itbisRetenido:"",
  itbisPercibido:"", retRenta:"", isrPercibido:"", impSelConsumo:"", otrosImp:"",
  propina:"", efectivo:"", cheque:"", tarjeta:"", credito:"", bonos:"", permuta:"", otras:"",
});

const fmt = (v) => (parseFloat(v) || 0).toFixed(2);
const fmtDate = (d) => d ? d.replace(/-/g,"") : "";
const fmtMoney = (v) => parseFloat(v||0).toLocaleString("es-DO", { minimumFractionDigits:2 });
const fmtPeriodo = (p) => p ? `${p.slice(0,4)}-${p.slice(4,6)}` : p;

function build606(header, rows) {
  const periodo = header.periodo.replace("-","");
  const lines = [`606|${header.rnc}|${periodo}|${rows.length}`];
  for (const r of rows)
    lines.push([r.rnc,r.tipoId,r.ncf,r.ncfMod,r.tipoBienes,fmtDate(r.fechaNcf),fmtDate(r.fechaPago),fmt(r.montoFact),fmt(r.itbisFact),fmt(r.itbisRetTerceros),fmt(r.itbisPercibido),r.tipoRetIsr,fmt(r.retRenta),fmt(r.isrPercibido),fmt(r.impSelConsumo),fmt(r.otrosImp),fmt(r.propina),r.formaPago].join("|"));
  return lines.join("\r\n");
}
function build607(header, rows) {
  const periodo = header.periodo.replace("-","");
  const lines = [`607|${header.rnc}|${periodo}|${rows.length}`];
  for (const r of rows)
    lines.push([r.rnc,r.tipoId,r.ncf,r.ncfMod,r.tipoIngreso,fmtDate(r.fechaNcf),fmtDate(r.fechaRetPago),fmt(r.montoFact),fmt(r.itbisFact),fmt(r.itbisRetenido),fmt(r.itbisPercibido),fmt(r.retRenta),fmt(r.isrPercibido),fmt(r.impSelConsumo),fmt(r.otrosImp),fmt(r.propina),fmt(r.efectivo),fmt(r.cheque),fmt(r.tarjeta),fmt(r.credito),fmt(r.bonos),fmt(r.permuta),fmt(r.otras)].join("|"));
  return lines.join("\r\n");
}

function mapBD606(r) {
  return { id:r.id, _bdId:r.id, rnc:r.rnc_cedula||"", tipoId:r.tipo_id||"1", ncf:r.ncf||"",
    ncfMod:r.ncf_modificado||"", tipoBienes:r.tipo_bienes_servicios||"01",
    fechaNcf:r.fecha_comprobante||"", fechaPago:r.fecha_pago||"",
    montoFact:r.monto_facturado, itbisFact:r.itbis_facturado,
    itbisRetTerceros:r.itbis_retenido_terceros, itbisPercibido:r.itbis_percibido,
    tipoRetIsr:r.tipo_retencion_isr||"", retRenta:r.retencion_renta,
    isrPercibido:r.isr_percibido, impSelConsumo:r.impuesto_selectivo,
    otrosImp:r.otros_impuestos, propina:r.propina_legal, formaPago:r.forma_pago };
}
function mapBD607(r) {
  return { id:r.id, _bdId:r.id, rnc:r.rnc_cedula||"", tipoId:r.tipo_id||"1", ncf:r.ncf||"",
    ncfMod:r.ncf_modificado||"", tipoIngreso:r.tipo_ingreso||"01",
    fechaNcf:r.fecha_comprobante||"", fechaRetPago:r.fecha_retencion_pago||"",
    montoFact:r.monto_facturado, itbisFact:r.itbis_facturado,
    itbisRetenido:r.itbis_retenido, itbisPercibido:r.itbis_percibido,
    retRenta:r.retencion_renta, isrPercibido:r.isr_percibido,
    impSelConsumo:r.impuesto_selectivo, otrosImp:r.otros_impuestos,
    propina:r.propina_legal, efectivo:r.efectivo, cheque:r.cheque_transferencia,
    tarjeta:r.tarjeta_debito_credito, credito:r.credito,
    bonos:r.bonos_certificados, permuta:r.permuta, otras:r.otras_formas };
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ── EXPORTAR EXCEL PROFESIONAL ────────────────────────────────
async function exportarExcelProfesional({ empresa, compras = [], ventas = [], periodo }) {
  // Cargar ExcelJS dinámicamente
  if (!window.ExcelJS) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const ExcelJS = window.ExcelJS;

  const meses = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const p = periodo.replace("-","");
  const año = p.slice(0,4);
  const mesNom = meses[parseInt(p.slice(4,6))] || "";
  const num = v => parseFloat(v)||0;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema DGII v3";
  wb.created = new Date();

  // ── COLORES ──────────────────────────────────────────────────
  const C = {
    NAVY:"1E3A5F", BLUE:"0EA5E9", GREEN:"10B981", AMBER:"F59E0B",
    RED:"EF4444", WHITE:"FFFFFF", LIGHT:"E0F2FE", GRAY:"F8FAFC",
    BORDER:"CBD5E1", TEXT:"1E293B", MUTED:"64748B", TEAL:"0F766E",
  };

  const fBold  = (color=C.TEXT, sz=10) => ({ name:"Arial", bold:true, color:{argb:"FF"+color}, size:sz });
  const fNorm  = (color=C.TEXT, sz=10) => ({ name:"Arial", color:{argb:"FF"+color}, size:sz });
  const fillSolid = color => ({ type:"pattern", pattern:"solid", fgColor:{argb:"FF"+color} });
  const borderAll = () => {
    const s = { style:"thin", color:{argb:"FF"+C.BORDER} };
    return { top:s, bottom:s, left:s, right:s };
  };
  const alignC = (wrapText=false) => ({ horizontal:"center", vertical:"middle", wrapText });
  const alignR = () => ({ horizontal:"right", vertical:"middle" });
  const alignL = () => ({ horizontal:"left", vertical:"middle" });
  const moneyFmt = "#,##0.00";

  // ── FUNCIÓN CREAR HOJA ───────────────────────────────────────
  const crearHoja = (nombre, filas, cols, moneyCols, titulo, subtitulo, hdrColor) => {
    const ws = wb.addWorksheet(nombre, { views:[{state:"frozen",ySplit:4}] });

    // Anchos
    ws.columns = cols.map(c => ({ width: c.width || 14 }));

    // Fila 1: Título
    ws.addRow([titulo]);
    ws.mergeCells(1, 1, 1, cols.length);
    const tRow = ws.getRow(1);
    tRow.height = 30;
    const tCell = ws.getCell(1,1);
    tCell.fill = fillSolid(hdrColor);
    tCell.font = fBold(C.WHITE, 13);
    tCell.alignment = alignC();

    // Fila 2: Subtítulo
    ws.addRow([subtitulo]);
    ws.mergeCells(2, 1, 2, cols.length);
    const sRow = ws.getRow(2);
    sRow.height = 18;
    const sCell = ws.getCell(2,1);
    sCell.fill = fillSolid(C.NAVY);
    sCell.font = fNorm(C.WHITE, 10);
    sCell.alignment = alignC();

    // Fila 3: vacía
    ws.addRow([]);
    ws.getRow(3).height = 6;

    // Fila 4: Headers
    ws.addRow(cols.map(c => c.label));
    const hRow = ws.getRow(4);
    hRow.height = 26;
    hRow.eachCell((cell, colNum) => {
      // Formas de cobro en 607 usan TEAL
      const isCobro = nombre.includes("607") && colNum >= cols.findIndex(c=>c.key==="efectivo")+1;
      cell.fill = fillSolid(isCobro ? C.TEAL : hdrColor);
      cell.font = fBold(C.WHITE, 9);
      cell.alignment = alignC(true);
      cell.border = borderAll();
    });

    // Datos
    filas.forEach((r, ri) => {
      const isEven = ri % 2 === 0;
      const rowData = cols.map(c => {
        const v = r[c.key] ?? "";
        return moneyCols.includes(c.key) ? (num(v)) : v;
      });
      ws.addRow(rowData);
      const dataRow = ws.getRow(5 + ri);
      dataRow.height = 18;
      dataRow.eachCell((cell, colNum) => {
        const colKey = cols[colNum-1]?.key;
        cell.fill = fillSolid(isEven ? C.GRAY : C.WHITE);
        cell.border = borderAll();
        if (moneyCols.includes(colKey)) {
          cell.numFmt = moneyFmt;
          cell.alignment = alignR();
          cell.font = fNorm(C.TEXT, 10);
        } else {
          cell.alignment = alignC();
          cell.font = fNorm(C.TEXT, 10);
        }
      });
    });

    // Fila de totales
    const totRow = ws.addRow(cols.map((c, i) => {
      if (i === 0) return "TOTALES";
      return moneyCols.includes(c.key) ? filas.reduce((s,r)=>s+num(r[c.key]),0) : "";
    }));
    totRow.height = 22;
    totRow.eachCell((cell, colNum) => {
      const colKey = cols[colNum-1]?.key;
      cell.fill = fillSolid(C.LIGHT);
      cell.border = borderAll();
      cell.font = fBold(C.NAVY, 10);
      if (colNum === 1) {
        cell.alignment = alignC();
      } else if (moneyCols.includes(colKey)) {
        cell.numFmt = moneyFmt;
        cell.alignment = alignR();
      }
    });

    return ws;
  };

  // ── HOJA 606 ─────────────────────────────────────────────────
  const cols606 = [
    {key:"rnc_cedula",label:"RNC / CÉDULA",width:16},
    {key:"tipo_id",label:"TIPO ID",width:9},
    {key:"ncf",label:"NCF",width:16},
    {key:"ncf_modificado",label:"NCF MOD.",width:14},
    {key:"tipo_bienes_servicios",label:"TIPO BIENES",width:12},
    {key:"fecha_comprobante",label:"FECHA NCF",width:13},
    {key:"fecha_pago",label:"FECHA PAGO",width:13},
    {key:"monto_facturado",label:"MONTO FACT.",width:16},
    {key:"itbis_facturado",label:"ITBIS FACT.",width:14},
    {key:"itbis_retenido_terceros",label:"ITBIS RET.TERC.",width:16},
    {key:"itbis_percibido",label:"ITBIS PERCIBIDO",width:16},
    {key:"tipo_retencion_isr",label:"TIPO RET.ISR",width:12},
    {key:"retencion_renta",label:"RET. RENTA",width:14},
    {key:"isr_percibido",label:"ISR PERCIBIDO",width:14},
    {key:"impuesto_selectivo",label:"IMP.SEL.CONSUMO",width:16},
    {key:"otros_impuestos",label:"OTROS IMP.",width:13},
    {key:"propina_legal",label:"PROPINA",width:11},
    {key:"forma_pago",label:"FORMA PAGO",width:12},
  ];
  const money606 = ["monto_facturado","itbis_facturado","itbis_retenido_terceros","itbis_percibido","retencion_renta","isr_percibido","impuesto_selectivo","otros_impuestos","propina_legal"];
  crearHoja("606 - Compras", compras, cols606, money606,
    `FORMULARIO 606 — COMPRAS · ${empresa.razon_social} · ${mesNom} ${año}`,
    `RNC: ${empresa.rnc}  |  Período: ${p}  |  ${compras.length} registro(s)`,
    C.AMBER);

  // ── HOJA 607 ─────────────────────────────────────────────────
  const cols607 = [
    {key:"rnc_cedula",label:"RNC / CÉDULA",width:16},
    {key:"tipo_id",label:"TIPO ID",width:9},
    {key:"ncf",label:"NCF",width:16},
    {key:"ncf_modificado",label:"NCF MOD.",width:14},
    {key:"tipo_ingreso",label:"TIPO INGRESO",width:12},
    {key:"fecha_comprobante",label:"FECHA NCF",width:13},
    {key:"fecha_retencion_pago",label:"FECHA RET./PAGO",width:15},
    {key:"monto_facturado",label:"MONTO FACT.",width:16},
    {key:"itbis_facturado",label:"ITBIS FACT.",width:14},
    {key:"itbis_retenido",label:"ITBIS RETENIDO",width:15},
    {key:"itbis_percibido",label:"ITBIS PERCIBIDO",width:16},
    {key:"retencion_renta",label:"RET. RENTA",width:14},
    {key:"isr_percibido",label:"ISR PERCIBIDO",width:14},
    {key:"impuesto_selectivo",label:"IMP.SEL.CONSUMO",width:16},
    {key:"otros_impuestos",label:"OTROS IMP.",width:13},
    {key:"propina_legal",label:"PROPINA",width:11},
    {key:"efectivo",label:"EFECTIVO",width:13},
    {key:"cheque_transferencia",label:"CHEQUE/TRANSF.",width:15},
    {key:"tarjeta_debito_credito",label:"TARJETA",width:13},
    {key:"credito",label:"CRÉDITO",width:13},
    {key:"bonos_certificados",label:"BONOS/CERT.",width:13},
    {key:"permuta",label:"PERMUTA",width:13},
    {key:"otras_formas",label:"OTRAS",width:13},
  ];
  const money607 = ["monto_facturado","itbis_facturado","itbis_retenido","itbis_percibido","retencion_renta","isr_percibido","impuesto_selectivo","otros_impuestos","propina_legal","efectivo","cheque_transferencia","tarjeta_debito_credito","credito","bonos_certificados","permuta","otras_formas"];
  crearHoja("607 - Ventas", ventas, cols607, money607,
    `FORMULARIO 607 — VENTAS · ${empresa.razon_social} · ${mesNom} ${año}`,
    `RNC: ${empresa.rnc}  |  Período: ${p}  |  ${ventas.length} registro(s)`,
    C.GREEN);

  // ── HOJA RESUMEN ─────────────────────────────────────────────
  const wsR = wb.addWorksheet("Resumen");
  wsR.columns = [{width:38},{width:22},{width:22}];

  const addResumenRow = (ws, label, valC, valV, opts={}) => {
    const row = ws.addRow([label, valC !== "" ? valC : "", valV !== "" ? valV : ""]);
    row.height = opts.height || 20;
    row.eachCell((cell, ci) => {
      if (opts.isTitulo) {
        cell.fill = fillSolid(opts.color || C.NAVY);
        cell.font = fBold(C.WHITE, opts.sz || 11);
        cell.alignment = alignC();
        if (ci===1) ws.mergeCells(row.number,1,row.number,3);
      } else if (opts.isHeader) {
        cell.fill = fillSolid(C.NAVY);
        cell.font = fBold(C.WHITE, 10);
        cell.alignment = alignC();
        cell.border = borderAll();
      } else if (opts.isSeccion) {
        cell.fill = fillSolid(opts.color || C.NAVY);
        cell.font = fBold(C.WHITE, 10);
        cell.alignment = alignC();
        ws.mergeCells(row.number,1,row.number,3);
      } else {
        cell.fill = fillSolid(C.GRAY);
        cell.border = borderAll();
        if (ci === 1) { cell.font = fNorm(C.MUTED,10); cell.alignment = alignL(); }
        else {
          cell.font = fBold(opts.color || C.TEXT, 11);
          cell.alignment = alignR();
          if (typeof valC === "number" || typeof valV === "number") cell.numFmt = moneyFmt;
        }
      }
    });
    return row;
  };

  // Título principal
  const tR = wsR.addRow([`RESUMEN FISCAL — ${mesNom.toUpperCase()} ${año}`]);
  tR.height = 35;
  wsR.mergeCells(1,1,1,3);
  const tCell = wsR.getCell(1,1);
  tCell.fill = fillSolid(C.NAVY);
  tCell.font = fBold(C.WHITE, 16);
  tCell.alignment = alignC();

  wsR.addRow([]);

  // Headers columnas
  addResumenRow(wsR,"CONCEPTO","COMPRAS (606)","VENTAS (607)",{isHeader:true,height:22});

  // Sección montos
  addResumenRow(wsR,"── MONTOS FACTURADOS ──","","",{isSeccion:true,color:C.BLUE,height:22});
  addResumenRow(wsR,"Total Facturado (RD$)", compras.reduce((s,r)=>s+num(r.monto_facturado),0), ventas.reduce((s,r)=>s+num(r.monto_facturado),0), {color:C.TEXT});
  addResumenRow(wsR,"ITBIS Facturado (RD$)", compras.reduce((s,r)=>s+num(r.itbis_facturado),0), ventas.reduce((s,r)=>s+num(r.itbis_facturado),0), {color:C.BLUE});
  addResumenRow(wsR,"Cantidad de Facturas", compras.length, ventas.length, {color:C.NAVY});

  // Sección retenciones
  wsR.addRow([]).height = 6;
  addResumenRow(wsR,"── RETENCIONES ──","","",{isSeccion:true,color:C.AMBER,height:22});
  addResumenRow(wsR,"ITBIS Retenido Terceros (RD$)", compras.reduce((s,r)=>s+num(r.itbis_retenido_terceros),0), ventas.reduce((s,r)=>s+num(r.itbis_retenido),0), {color:C.AMBER});
  addResumenRow(wsR,"ITBIS Percibido (RD$)", compras.reduce((s,r)=>s+num(r.itbis_percibido),0), ventas.reduce((s,r)=>s+num(r.itbis_percibido),0), {color:C.AMBER});
  addResumenRow(wsR,"Retención de Renta ISR (RD$)", compras.reduce((s,r)=>s+num(r.retencion_renta),0), ventas.reduce((s,r)=>s+num(r.retencion_renta),0), {color:C.RED});
  addResumenRow(wsR,"ISR Percibido (RD$)", compras.reduce((s,r)=>s+num(r.isr_percibido),0), ventas.reduce((s,r)=>s+num(r.isr_percibido),0), {color:C.RED});

  // Sección otros
  wsR.addRow([]).height = 6;
  addResumenRow(wsR,"── OTROS IMPUESTOS ──","","",{isSeccion:true,color:C.GREEN,height:22});
  addResumenRow(wsR,"Impuesto Selectivo al Consumo (RD$)", compras.reduce((s,r)=>s+num(r.impuesto_selectivo),0), ventas.reduce((s,r)=>s+num(r.impuesto_selectivo),0), {color:C.GREEN});
  addResumenRow(wsR,"Otros Impuestos (RD$)", compras.reduce((s,r)=>s+num(r.otros_impuestos),0), ventas.reduce((s,r)=>s+num(r.otros_impuestos),0), {color:C.GREEN});
  addResumenRow(wsR,"Propina Legal (RD$)", compras.reduce((s,r)=>s+num(r.propina_legal),0), ventas.reduce((s,r)=>s+num(r.propina_legal),0), {color:C.GREEN});

  // Formas de cobro
  wsR.addRow([]).height = 6;
  addResumenRow(wsR,"── FORMAS DE COBRO (607) ──","","",{isSeccion:true,color:C.TEAL,height:22});
  [["Efectivo","efectivo"],["Cheque / Transferencia","cheque_transferencia"],
   ["Tarjeta Débito/Crédito","tarjeta_debito_credito"],["Crédito","credito"],
   ["Bonos / Certificados","bonos_certificados"],["Permuta","permuta"],
   ["Otras Formas","otras_formas"]
  ].forEach(([label,key]) => {
    addResumenRow(wsR, label+"  (RD$)", "", ventas.reduce((s,r)=>s+num(r[key]),0), {color:C.TEAL});
  });

  // Footer
  wsR.addRow([]).height = 10;
  const fRow = wsR.addRow([`Generado el ${new Date().toLocaleDateString("es-DO")} · Sistema DGII v3 · generador-dgii.vercel.app`]);
  wsR.mergeCells(fRow.number,1,fRow.number,3);
  fRow.getCell(1).font = { name:"Arial", italic:true, color:{argb:"FF"+C.MUTED}, size:9 };
  fRow.getCell(1).alignment = alignC();

  // ── DESCARGAR ─────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nombre = empresa.razon_social.replace(/\s+/g,"_").slice(0,20);
  a.href = url; a.download = `DGII_${nombre}_${p}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}


// ─── UI ATOMS ─────────────────────────────────────────────────
const inp = { background:"#0d1524", border:"1px solid #1e3a5f", borderRadius:6, color:"#e2e8f0", padding:"6px 10px", fontSize:12, width:"100%", fontFamily:"'JetBrains Mono','Courier New',monospace", outline:"none" };
const inpErr = { ...inp, borderColor:"#ef4444" };
const lbl = { color:"#64748b", fontSize:10, letterSpacing:1, marginBottom:3, display:"block" };
const COLORS = ["#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f97316"];

function Field({ label, children, error }) {
  return (
    <div style={{display:"flex",flexDirection:"column"}}>
      <span style={lbl}>{label}</span>
      {children}
      {error && <span style={{color:"#ef4444",fontSize:9,marginTop:2}}>{error}</span>}
    </div>
  );
}
function Inp({ value, onChange, placeholder, style, type, error }) {
  return <input type={type||"text"} style={{...(error?inpErr:inp),...style}} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} />;
}
function Sel({ value, onChange, options }) {
  return <select style={inp} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;
}
function Card({ title, value, sub, color }) {
  return (
    <div style={{background:"#080f1c",border:`1px solid ${color}22`,borderRadius:10,padding:"14px 18px",flex:1,minWidth:160}}>
      <div style={{color:"#475569",fontSize:9,letterSpacing:2,marginBottom:4}}>{title}</div>
      <div style={{color,fontSize:18,fontWeight:700}}>{value}</div>
      {sub && <div style={{color:"#334155",fontSize:10,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── IMPORTADOR CSV ───────────────────────────────────────────
function ImportadorCSV({ tipo, empresaActual, periodo, onClose, showToast }) {
  const [filas, setFilas] = useState([]);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const COLS_606 = ["rnc","tipoId","ncf","ncfMod","tipoBienes","fechaNcf","fechaPago","montoFact","itbisFact","itbisRetTerceros","itbisPercibido","tipoRetIsr","retRenta","isrPercibido","impSelConsumo","otrosImp","propina","formaPago"];
  const COLS_607 = ["rnc","tipoId","ncf","ncfMod","tipoIngreso","fechaNcf","fechaRetPago","montoFact","itbisFact","itbisRetenido","itbisPercibido","retRenta","isrPercibido","impSelConsumo","otrosImp","propina","efectivo","cheque","tarjeta","credito","bonos","permuta","otras"];
  const cols = tipo === "606" ? COLS_606 : COLS_607;

  const parsearCSV = (texto) => {
    const lineas = texto.trim().split(/\r?\n/);
    const encabezado = lineas[0].split(",").map(h => h.trim().replace(/"/g,"").toLowerCase());
    const errores = [];
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
      if (!lineas[i].trim()) continue;
      const vals = lineas[i].split(",").map(v => v.trim().replace(/^"|"$/g,""));
      const fila = {};
      // intentar mapear por nombre o por posición
      cols.forEach((col, idx) => {
        const idxEnc = encabezado.indexOf(col.toLowerCase());
        fila[col] = idxEnc >= 0 ? vals[idxEnc] : (vals[idx] || "");
      });
      const errNCF = validarNCF(fila.ncf);
      if (errNCF) errores.push(`Fila ${i+1}: ${errNCF} (NCF: ${fila.ncf})`);
      if (!fila.montoFact || isNaN(parseFloat(fila.montoFact))) errores.push(`Fila ${i+1}: monto inválido`);
      datos.push(fila);
    }
    setErroresValidacion(errores);
    setFilas(datos);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => parsearCSV(ev.target.result);
    reader.readAsText(f, "utf-8");
  };

  const descargarPlantilla = () => {
    const header = cols.join(",");
    const ejemplo = tipo === "606"
      ? "101234567,1,E310000000001,,15,2025-01-15,2025-01-15,10000.00,1800.00,0,0,,0,0,0,0,0,01"
      : "40212345678,2,B010000000001,,01,2025-01-15,,10000.00,1800.00,0,0,0,0,0,0,0,10000,0,0,0,0,0,0";
    downloadFile(header + "\n" + ejemplo, `plantilla_${tipo}.csv`, "text/csv;charset=utf-8");
  };

  const handleImportar = async () => {
    if (!filas.length) return;
    if (erroresValidacion.length) { showToast("⚠ Corrige los errores antes de importar","warn"); return; }
    setCargando(true);
    try {
      const res = await authFetch(`${API}/api/importar/${tipo}`, {
        method:"POST",
        body: JSON.stringify({ empresa_id: empresaActual.id, periodo: periodo.replace("-",""), filas })
      });
      const data = await res.json();
      setResultado(data);
      if (data.ok) showToast(`✅ ${data.insertados} registros importados`);
      else showToast(`❌ ${data.error}`,"error");
    } catch { showToast("❌ Error de conexión","error"); }
    setCargando(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:700,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40",gap:12}}>
          <span style={{color:"#e2e8f0",fontSize:14,fontWeight:700,flex:1}}>📤 Importar {tipo} desde CSV</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <div style={{padding:20,overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
          {/* Instrucciones */}
          <div style={{background:"#080f1c",border:"1px solid #1e3a5f",borderRadius:10,padding:14,fontSize:11,color:"#64748b",lineHeight:1.7}}>
            <div style={{color:"#0ea5e9",fontWeight:700,marginBottom:6}}>📋 Instrucciones</div>
            El CSV debe tener las columnas en el mismo orden que la plantilla, o con encabezados con los nombres exactos.<br/>
            Empresa: <span style={{color:"#e2e8f0"}}>{empresaActual?.razon_social}</span> · Período: <span style={{color:"#e2e8f0"}}>{periodo}</span>
          </div>

          {/* Botones acción */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={descargarPlantilla} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#0ea5e9",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
              📥 Descargar Plantilla
            </button>
            <label style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
              📂 Seleccionar CSV
              <input type="file" accept=".csv,.txt" style={{display:"none"}} ref={fileRef} onChange={handleFile} />
            </label>
          </div>

          {/* Errores de validación */}
          {erroresValidacion.length > 0 && (
            <div style={{background:"#450a0a",border:"1px solid #7f1d1d",borderRadius:8,padding:12,maxHeight:120,overflowY:"auto"}}>
              <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:6}}>⚠ {erroresValidacion.length} error(es) de validación</div>
              {erroresValidacion.map((e,i)=><div key={i} style={{color:"#fca5a5",fontSize:10,marginBottom:3}}>{e}</div>)}
            </div>
          )}

          {/* Preview tabla */}
          {filas.length > 0 && (
            <div>
              <div style={{color:"#475569",fontSize:11,marginBottom:8}}>{filas.length} fila(s) detectada(s)</div>
              <div style={{overflowX:"auto",maxHeight:200,overflowY:"auto",border:"1px solid #1e2d40",borderRadius:8}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead style={{background:"#060d1a",position:"sticky",top:0}}>
                    <tr>{cols.slice(0,8).map(c=><th key={c} style={{padding:"6px 10px",textAlign:"left",color:"#475569",fontWeight:600,whiteSpace:"nowrap"}}>{c}</th>)}<th style={{padding:"6px 10px",color:"#475569"}}>...</th></tr>
                  </thead>
                  <tbody>
                    {filas.slice(0,5).map((f,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                        {cols.slice(0,8).map(c=><td key={c} style={{padding:"5px 10px",color:"#94a3b8",whiteSpace:"nowrap",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis"}}>{f[c]||"—"}</td>)}
                        <td style={{padding:"5px 10px",color:"#334155"}}>…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{background: resultado.ok?"#0a1a10":"#450a0a",border:`1px solid ${resultado.ok?"#166534":"#7f1d1d"}`,borderRadius:8,padding:12}}>
              <div style={{color: resultado.ok?"#4ade80":"#f87171",fontSize:12,fontWeight:700,marginBottom:4}}>
                {resultado.ok ? `✅ ${resultado.insertados} registros importados correctamente` : `❌ ${resultado.error}`}
              </div>
              {resultado.errores?.length > 0 && (
                <div style={{marginTop:6}}>
                  <div style={{color:"#f59e0b",fontSize:10,marginBottom:4}}>{resultado.errores.length} fila(s) con error:</div>
                  {resultado.errores.map((e,i)=><div key={i} style={{color:"#fca5a5",fontSize:10}}>Fila {e.fila} (NCF: {e.ncf}): {e.error}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Botón importar */}
          {filas.length > 0 && !resultado && (
            <button onClick={handleImportar} disabled={cargando || erroresValidacion.length > 0} style={{background:cargando||erroresValidacion.length?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"10px",cursor:cargando?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:erroresValidacion.length?0.5:1}}>
              {cargando ? "⏳ Importando..." : `⚡ Importar ${filas.length} registros`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CAMBIAR CONTRASEÑA ─────────────────────────────────
function CambiarPasswordModal({ onClose, showToast }) {
  const [form, setForm] = useState({ actual:"", nueva:"", confirmar:"" });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!form.actual || !form.nueva) { setError("Todos los campos son requeridos"); return; }
    if (form.nueva.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (form.nueva !== form.confirmar) { setError("Las contraseñas no coinciden"); return; }
    setCargando(true);
    try {
      const res = await authFetch(`${API}/api/auth/cambiar-password`, {
        method:"POST", body: JSON.stringify({ passwordActual: form.actual, passwordNuevo: form.nueva })
      });
      const data = await res.json();
      if (data.ok) { showToast("✅ Contraseña actualizada correctamente"); onClose(); }
      else setError(data.error || "Error al cambiar contraseña");
    } catch { setError("Error de conexión"); }
    setCargando(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:400}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40"}}>
          <span style={{color:"#e2e8f0",fontSize:14,fontWeight:700,flex:1}}>🔑 Cambiar Contraseña</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <Field label="CONTRASEÑA ACTUAL"><Inp value={form.actual} onChange={v=>setForm(f=>({...f,actual:v}))} type="password" placeholder="••••••••" /></Field>
          <Field label="NUEVA CONTRASEÑA"><Inp value={form.nueva} onChange={v=>setForm(f=>({...f,nueva:v}))} type="password" placeholder="Mínimo 6 caracteres" /></Field>
          <Field label="CONFIRMAR CONTRASEÑA"><Inp value={form.confirmar} onChange={v=>setForm(f=>({...f,confirmar:v}))} type="password" placeholder="Repetir nueva contraseña" /></Field>
          {error && <div style={{background:"#450a0a",border:"1px solid #7f1d1d",color:"#f87171",borderRadius:8,padding:"10px 14px",fontSize:12}}>❌ {error}</div>}
          <button onClick={handleSave} disabled={cargando} style={{background:cargando?"#1e293b":"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"10px",cursor:cargando?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
            {cargando ? "⏳ Guardando..." : "💾 Cambiar Contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MÓDULO DE REPORTES ───────────────────────────────────────
function Reportes({ empresaActual, empresas }) {
  const [tipoReporte, setTipoReporte] = useState("resumen");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0,7));
  const [periodosComp, setPeriodosComp] = useState([
    new Date(Date.now()-2*30*24*60*60*1000).toISOString().slice(0,7),
    new Date(Date.now()-30*24*60*60*1000).toISOString().slice(0,7),
    new Date().toISOString().slice(0,7),
  ]);
  const [empresaId, setEmpresaId] = useState(empresaActual?.id||"");
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { if (empresaActual) setEmpresaId(empresaActual.id); }, [empresaActual]);

  const cargar = async () => {
    if (!empresaId) return;
    setCargando(true);
    try {
      const p = periodo.replace("-","");
      let url = "";
      if (tipoReporte==="resumen") url=`${API}/api/reportes/resumen-mensual?empresa_id=${empresaId}&periodo=${p}`;
      else if (tipoReporte==="tipo-bien") url=`${API}/api/reportes/por-tipo-bien?empresa_id=${empresaId}&periodo=${p}`;
      else if (tipoReporte==="itbis") url=`${API}/api/reportes/itbis-retenido?empresa_id=${empresaId}&periodo=${p}`;
      else if (tipoReporte==="comparativo") {
        const ps = periodosComp.map(x=>x.replace("-","")).join(",");
        url=`${API}/api/reportes/comparativo?empresa_id=${empresaId}&periodos=${ps}`;
      }
      const res = await authFetch(url);
      setData(await res.json());
    } catch { setData(null); }
    setCargando(false);
  };

  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    if (!empresaId) return;
    const emp = empresas.find(e=>String(e.id)===String(empresaId));
    if (!emp) return;
    setExportando(true);
    try {
      const p = periodo.replace("-","");
      const [resC, resV] = await Promise.all([
        authFetch(`${API}/api/compras?empresa_id=${empresaId}&periodo=${p}&limit=9999`),
        authFetch(`${API}/api/ventas?empresa_id=${empresaId}&periodo=${p}&limit=9999`),
      ]);
      const dc = await resC.json();
      const dv = await resV.json();
      const compras = Array.isArray(dc) ? dc : (dc.rows || []);
      const ventas  = Array.isArray(dv) ? dv : (dv.rows || []);
      await exportarExcelProfesional({
        empresa: { razon_social: emp.razon_social, rnc: emp.rnc, periodo: p, tipo: emp.tipo_contribuyente, regimen: emp.regimen_impositivo },
        compras, ventas, periodo
      });
    } catch (e) { console.error(e); }
    setExportando(false);
  };

  const TABS_REP = [
    {id:"resumen",l:"📊 Resumen Mensual"},{id:"tipo-bien",l:"📦 Por Tipo de Bien"},
    {id:"itbis",l:"💰 ITBIS Retenido"},{id:"comparativo",l:"📈 Comparativo"},
  ];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px"}}>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Field label="EMPRESA">
          <select style={{...inp,minWidth:220}} value={empresaId} onChange={e=>setEmpresaId(e.target.value)}>
            {empresas.map(e=><option key={e.id} value={e.id}>{e.razon_social}</option>)}
          </select>
        </Field>
        {tipoReporte!=="comparativo" && (
          <Field label="PERÍODO"><input type="month" style={{...inp,width:155}} value={periodo} onChange={e=>setPeriodo(e.target.value)} /></Field>
        )}
        <button onClick={cargar} disabled={cargando} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",alignSelf:"flex-end"}}>
          {cargando?"⏳ Cargando...":"🔍 Generar"}
        </button>
        <button onClick={exportar} disabled={exportando} style={{background:exportando?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:exportando?"not-allowed":"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",alignSelf:"flex-end",opacity:exportando?0.7:1}}>{exportando?"⏳ Generando...":"📥 Exportar Excel .xlsx"}</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {TABS_REP.map(t=>(
          <button key={t.id} onClick={()=>{setTipoReporte(t.id);setData(null);}} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,background:tipoReporte===t.id?"#1e3a5f":"#080f1c",color:tipoReporte===t.id?"#e2e8f0":"#475569"}}>{t.l}</button>
        ))}
      </div>
      {tipoReporte==="comparativo" && (
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14}}>
          <div style={{color:"#475569",fontSize:10,letterSpacing:1,width:"100%",marginBottom:4}}>PERÍODOS A COMPARAR</div>
          {periodosComp.map((p,i)=>(
            <Field key={i} label={`PERÍODO ${i+1}`}>
              <input type="month" style={{...inp,width:150}} value={p} onChange={e=>{const arr=[...periodosComp];arr[i]=e.target.value;setPeriodosComp(arr);}} />
            </Field>
          ))}
        </div>
      )}
      {!data && !cargando && <div style={{color:"#334155",fontSize:12,padding:"40px 0",textAlign:"center"}}>Selecciona los parámetros y haz clic en Generar</div>}
      {data && tipoReporte==="resumen" && (
        <div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
            <Card title="FACTURAS COMPRAS" value={data.compras?.total_facturas||0} color="#f59e0b" />
            <Card title="MONTO COMPRAS" value={`RD$ ${fmtMoney(data.compras?.total_monto)}`} color="#f59e0b" />
            <Card title="FACTURAS VENTAS" value={data.ventas?.total_facturas||0} color="#10b981" />
            <Card title="MONTO VENTAS" value={`RD$ ${fmtMoney(data.ventas?.total_monto)}`} color="#10b981" />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:"#080f1c",border:"1px solid #f59e0b22",borderRadius:12,padding:20}}>
              <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,marginBottom:14}}>📥 COMPRAS (606)</div>
              {[["ITBIS Facturado",data.compras?.total_itbis,"#f59e0b"],["ITBIS Ret. Terceros",data.compras?.total_itbis_retenido,"#0ea5e9"],["Retención de Renta",data.compras?.total_ret_renta,"#ef4444"],["ISR Percibido",data.compras?.total_isr,"#8b5cf6"],["Imp. Selectivo",data.compras?.total_isc,"#06b6d4"]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #0f2040"}}>
                  <span style={{color:"#64748b",fontSize:11}}>{l}</span>
                  <span style={{color:c,fontSize:12,fontWeight:700}}>RD$ {fmtMoney(v)}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#080f1c",border:"1px solid #10b98122",borderRadius:12,padding:20}}>
              <div style={{color:"#10b981",fontSize:12,fontWeight:700,marginBottom:14}}>📤 VENTAS (607)</div>
              {[["ITBIS Facturado",data.ventas?.total_itbis,"#10b981"],["ITBIS Retenido",data.ventas?.total_itbis_retenido,"#0ea5e9"],["Retención de Renta",data.ventas?.total_ret_renta,"#ef4444"],["ISR Percibido",data.ventas?.total_isr,"#8b5cf6"],["Efectivo",data.ventas?.total_efectivo,"#06b6d4"]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #0f2040"}}>
                  <span style={{color:"#64748b",fontSize:11}}>{l}</span>
                  <span style={{color:c,fontSize:12,fontWeight:700}}>RD$ {fmtMoney(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {data && tipoReporte==="tipo-bien" && Array.isArray(data) && (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.map(r=>({name:`Tipo ${r.tipo}`,Monto:parseFloat(r.total_monto)||0,ITBIS:parseFloat(r.total_itbis)||0}))}>
              <XAxis dataKey="name" stroke="#334155" tick={{fill:"#64748b",fontSize:11}} />
              <YAxis stroke="#334155" tick={{fill:"#64748b",fontSize:10}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
              <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:8,color:"#e2e8f0",fontSize:11}} formatter={v=>`RD$ ${fmtMoney(v)}`} />
              <Legend wrapperStyle={{color:"#64748b",fontSize:11}} />
              <Bar dataKey="Monto" fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="ITBIS" fill="#0ea5e9" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:12,padding:16,marginTop:12,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid #1e2d40"}}>{["Tipo","Cantidad","Monto","ITBIS","Ret.Renta"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#475569",fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>{data.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#060d1a":"transparent"}}>
                  <td style={{padding:"6px 10px",color:"#0ea5e9"}}>{r.tipo}</td>
                  <td style={{padding:"6px 10px",color:"#e2e8f0"}}>{r.cantidad}</td>
                  <td style={{padding:"6px 10px",color:"#10b981"}}>RD$ {fmtMoney(r.total_monto)}</td>
                  <td style={{padding:"6px 10px",color:"#f59e0b"}}>RD$ {fmtMoney(r.total_itbis)}</td>
                  <td style={{padding:"6px 10px",color:"#ef4444"}}>RD$ {fmtMoney(r.total_ret_renta)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {data && tipoReporte==="itbis" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["COMPRAS (606)",data.compras,[["ITBIS Ret. Terceros","itbis_ret_compras","#f59e0b"],["ITBIS Percibido","itbis_percibido_compras","#0ea5e9"],["Ret. Renta","ret_renta_compras","#ef4444"],["ISR Percibido","isr_percibido_compras","#8b5cf6"]],"#f59e0b22"],
             ["VENTAS (607)",data.ventas,[["ITBIS Retenido","itbis_ret_ventas","#10b981"],["ITBIS Percibido","itbis_percibido_ventas","#0ea5e9"],["Ret. Renta","ret_renta_ventas","#ef4444"],["ISR Percibido","isr_percibido_ventas","#8b5cf6"]],"#10b98122"]
          ].map(([titulo,obj,campos,border])=>(
            <div key={titulo} style={{background:"#080f1c",border:`1px solid ${border}`,borderRadius:12,padding:20}}>
              <div style={{color:"#94a3b8",fontSize:12,fontWeight:700,marginBottom:14}}>{titulo}</div>
              {campos.map(([l,k,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #0f2040"}}>
                  <span style={{color:"#64748b",fontSize:11}}>{l}</span>
                  <span style={{color:c,fontSize:12,fontWeight:700}}>RD$ {fmtMoney(obj?.[k])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {data && tipoReporte==="comparativo" && (
        <div>
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:12,padding:20,marginBottom:16}}>
            <div style={{color:"#94a3b8",fontSize:11,marginBottom:16}}>MONTO FACTURADO POR PERÍODO</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={periodosComp.map(p=>{
                const ps=p.replace("-","");
                const c=data.compras?.find(r=>r.periodo_fiscal===ps);
                const v=data.ventas?.find(r=>r.periodo_fiscal===ps);
                return {name:p,Compras:parseFloat(c?.monto)||0,Ventas:parseFloat(v?.monto)||0};
              })}>
                <XAxis dataKey="name" stroke="#334155" tick={{fill:"#64748b",fontSize:11}} />
                <YAxis stroke="#334155" tick={{fill:"#64748b",fontSize:10}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:8,color:"#e2e8f0",fontSize:11}} formatter={v=>`RD$ ${fmtMoney(v)}`} />
                <Legend wrapperStyle={{color:"#64748b",fontSize:11}} />
                <Bar dataKey="Compras" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Ventas" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:12,padding:16,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid #1e2d40"}}>{["Período","Tipo","Facturas","Monto","ITBIS","Ret.Renta"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#475569",fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>
                {[...(data.compras||[]).map(r=>({...r,tipo:"606"})),...(data.ventas||[]).map(r=>({...r,tipo:"607"}))].sort((a,b)=>a.periodo_fiscal.localeCompare(b.periodo_fiscal)).map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#060d1a":"transparent"}}>
                    <td style={{padding:"6px 10px",color:"#0ea5e9"}}>{fmtPeriodo(r.periodo_fiscal)}</td>
                    <td style={{padding:"6px 10px"}}><span style={{background:r.tipo==="606"?"#1c1408":"#0a1a10",color:r.tipo==="606"?"#f59e0b":"#10b981",borderRadius:4,padding:"2px 8px",fontSize:10}}>{r.tipo==="606"?"Compras":"Ventas"}</span></td>
                    <td style={{padding:"6px 10px",color:"#e2e8f0"}}>{r.facturas}</td>
                    <td style={{padding:"6px 10px",color:"#10b981"}}>RD$ {fmtMoney(r.monto)}</td>
                    <td style={{padding:"6px 10px",color:"#f59e0b"}}>RD$ {fmtMoney(r.itbis)}</td>
                    <td style={{padding:"6px 10px",color:"#ef4444"}}>RD$ {fmtMoney(r.ret_renta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password})
      });
      const data = await res.json();
      if (data.ok) { setAuth(data.token, data.usuario); onLogin(data.usuario); }
      else setError(data.error || "Credenciales incorrectas");
    } catch { setError("No se pudo conectar con el servidor"); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#030712",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
      <div style={{background:"#080f1c",border:"1px solid #1e3a5f",borderRadius:16,padding:40,width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🇩🇴</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:20,letterSpacing:1}}>SISTEMA DGII</div>
          <div style={{color:"#334155",fontSize:11,marginTop:4}}>606 · 607 · Multi-Empresa · v3</div>
        </div>
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:16}}>
          <Field label="CORREO ELECTRÓNICO"><Inp value={email} onChange={setEmail} placeholder="usuario@empresa.com" type="email" /></Field>
          <Field label="CONTRASEÑA"><Inp value={password} onChange={setPassword} placeholder="••••••••" type="password" /></Field>
          {error && <div style={{background:"#450a0a",border:"1px solid #7f1d1d",color:"#f87171",borderRadius:8,padding:"10px 14px",fontSize:12}}>❌ {error}</div>}
          <button type="submit" disabled={loading} style={{background:loading?"#1e293b":"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"12px",cursor:loading?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",letterSpacing:1,marginTop:8,opacity:loading?0.7:1}}>
            {loading?"⏳ Verificando...":"🔐 Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── SELECTOR EMPRESA ─────────────────────────────────────────
function EmpresaSelector({ empresas, empresaActual, onChange }) {
  return (
    <select style={{...inp,width:"auto",minWidth:200,fontSize:12}} value={empresaActual?.id||""} onChange={e=>onChange(empresas.find(x=>String(x.id)===e.target.value))}>
      <option value="">— Seleccionar empresa —</option>
      {empresas.map(e=><option key={e.id} value={e.id}>{e.razon_social} ({e.rnc})</option>)}
    </select>
  );
}

// ─── MODAL USUARIOS ───────────────────────────────────────────
function UsuariosModal({ onClose, showToast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre:"", email:"", password:"", rol:"contador" });
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    setCargando(true);
    const res = await authFetch(`${API}/api/usuarios`);
    const d = await res.json();
    setUsuarios(Array.isArray(d)?d:[]);
    setCargando(false);
  };

  const handleSave = async () => {
    if (!form.nombre||!form.email) { showToast("⚠ Nombre y email requeridos","warn"); return; }
    if (!editando && !form.password) { showToast("⚠ Contraseña requerida para nuevo usuario","warn"); return; }
    try {
      const url = editando?`${API}/api/usuarios/${editando}`:`${API}/api/usuarios`;
      const res = await authFetch(url,{method:editando?"PUT":"POST",body:JSON.stringify(form)});
      const data = await res.json();
      if (data.ok) { showToast(editando?"✅ Usuario actualizado":"✅ Usuario creado"); setForm({nombre:"",email:"",password:"",rol:"contador"}); setEditando(null); cargar(); }
      else showToast(`❌ ${data.error}`,"error");
    } catch { showToast("❌ Error de conexión","error"); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:700,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40"}}>
          <span style={{color:"#e2e8f0",fontSize:14,fontWeight:700,flex:1}}>👥 Gestión de Usuarios</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <div style={{padding:20,overflowY:"auto"}}>
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{color:"#475569",fontSize:10,letterSpacing:1,marginBottom:12}}>{editando?"EDITAR USUARIO":"NUEVO USUARIO"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              <Field label="NOMBRE"><Inp value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Juan Pérez" /></Field>
              <Field label="EMAIL"><Inp value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="juan@empresa.com" type="email" /></Field>
              <Field label="CONTRASEÑA"><Inp value={form.password} onChange={v=>setForm(f=>({...f,password:v}))} placeholder={editando?"(sin cambios)":"Mínimo 6 caracteres"} type="password" /></Field>
              <Field label="ROL"><Sel value={form.rol} onChange={v=>setForm(f=>({...f,rol:v}))} options={[{v:"superadmin",l:"Super Admin"},{v:"contador",l:"Contador"},{v:"asistente",l:"Asistente"}]} /></Field>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={handleSave} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>{editando?"💾 Actualizar":"➕ Crear"}</button>
              {editando && <button onClick={()=>{setEditando(null);setForm({nombre:"",email:"",password:"",rol:"contador"});}} style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>}
            </div>
          </div>
          {cargando ? <div style={{color:"#475569",fontSize:12,textAlign:"center",padding:20}}>⏳ Cargando...</div> : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid #1e2d40"}}>{["Nombre","Email","Rol","Estado","Acciones"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>{usuarios.map((u,i)=>(
                <tr key={u.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                  <td style={{padding:"8px 10px",color:"#e2e8f0"}}>{u.nombre}</td>
                  <td style={{padding:"8px 10px",color:"#94a3b8"}}>{u.email}</td>
                  <td style={{padding:"8px 10px"}}><span style={{background:u.rol==="superadmin"?"#1e3a5f":u.rol==="contador"?"#1a3a1a":"#2a1a3a",color:u.rol==="superadmin"?"#0ea5e9":u.rol==="contador"?"#10b981":"#a78bfa",borderRadius:4,padding:"2px 8px",fontSize:10}}>{u.rol}</span></td>
                  <td style={{padding:"8px 10px"}}><span style={{color:u.activo?"#10b981":"#ef4444",fontSize:11}}>{u.activo?"●  Activo":"● Inactivo"}</span></td>
                  <td style={{padding:"8px 10px"}}><button onClick={()=>{setEditando(u.id);setForm({nombre:u.nombre,email:u.email,password:"",rol:u.rol,activo:u.activo});}} style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✏️ Editar</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL EMPRESAS ───────────────────────────────────────────
function EmpresasModal({ onClose, showToast, onRefresh }) {
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({ rnc:"", razon_social:"", nombre_comercial:"", tipo_contribuyente:"J", regimen_impositivo:"Ordinario" });
  const [editando, setEditando] = useState(null);

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    const res = await authFetch(`${API}/api/empresas`);
    const d = await res.json();
    setEmpresas(Array.isArray(d)?d:[]);
  };

  const handleSave = async () => {
    if (!form.rnc||!form.razon_social) { showToast("⚠ RNC y razón social requeridos","warn"); return; }
    try {
      const url = editando?`${API}/api/empresas/${editando}`:`${API}/api/empresas`;
      const res = await authFetch(url,{method:editando?"PUT":"POST",body:JSON.stringify(form)});
      const data = await res.json();
      if (data.ok) { showToast(editando?"✅ Empresa actualizada":"✅ Empresa creada"); setForm({rnc:"",razon_social:"",nombre_comercial:"",tipo_contribuyente:"J",regimen_impositivo:"Ordinario"}); setEditando(null); cargar(); onRefresh(); }
      else showToast(`❌ ${data.error}`,"error");
    } catch { showToast("❌ Error de conexión","error"); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:700,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40"}}>
          <span style={{color:"#e2e8f0",fontSize:14,fontWeight:700,flex:1}}>🏢 Gestión de Empresas</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <div style={{padding:20,overflowY:"auto"}}>
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{color:"#475569",fontSize:10,letterSpacing:1,marginBottom:12}}>{editando?"EDITAR EMPRESA":"NUEVA EMPRESA"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              <Field label="RNC"><Inp value={form.rnc} onChange={v=>setForm(f=>({...f,rnc:v}))} placeholder="101234567" /></Field>
              <Field label="RAZÓN SOCIAL"><Inp value={form.razon_social} onChange={v=>setForm(f=>({...f,razon_social:v}))} placeholder="MI EMPRESA SRL" /></Field>
              <Field label="NOMBRE COMERCIAL"><Inp value={form.nombre_comercial} onChange={v=>setForm(f=>({...f,nombre_comercial:v}))} placeholder="Mi Empresa" /></Field>
              <Field label="TIPO"><Sel value={form.tipo_contribuyente} onChange={v=>setForm(f=>({...f,tipo_contribuyente:v}))} options={[{v:"J",l:"J - Jurídica"},{v:"F",l:"F - Física"},{v:"E",l:"E - Estatal"}]} /></Field>
              <Field label="RÉGIMEN"><Inp value={form.regimen_impositivo} onChange={v=>setForm(f=>({...f,regimen_impositivo:v}))} placeholder="Ordinario" /></Field>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={handleSave} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>{editando?"💾 Actualizar":"➕ Crear Empresa"}</button>
              {editando && <button onClick={()=>{setEditando(null);setForm({rnc:"",razon_social:"",nombre_comercial:"",tipo_contribuyente:"J",regimen_impositivo:"Ordinario"});}} style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12}}>Cancelar</button>}
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid #1e2d40"}}>{["RNC","Razón Social","Tipo","Régimen","Acciones"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{empresas.map((e,i)=>(
              <tr key={e.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                <td style={{padding:"8px 10px",color:"#0ea5e9",fontFamily:"monospace"}}>{e.rnc}</td>
                <td style={{padding:"8px 10px",color:"#e2e8f0"}}>{e.razon_social}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8"}}>{e.tipo_contribuyente}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8"}}>{e.regimen_impositivo}</td>
                <td style={{padding:"8px 10px"}}><button onClick={()=>{setEditando(e.id);setForm({rnc:e.rnc,razon_social:e.razon_social,nombre_comercial:e.nombre_comercial||"",tipo_contribuyente:e.tipo_contribuyente||"J",regimen_impositivo:e.regimen_impositivo||""});}} style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✏️ Editar</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── FORMULARIOS ──────────────────────────────────────────────
function Form606({ row, onChange, onSave, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  const ncfErr = row.ncf ? validarNCF(row.ncf) : null;

  // Calculadora Total → Subtotal
  const totalFactura   = parseFloat(row._totalFactura || "") || 0;
  const itbisFactNum   = parseFloat(row.itbisFact || "") || 0;
  const subtotalCalc   = totalFactura > 0 ? (totalFactura - itbisFactNum).toFixed(2) : "";
  const hayTotal       = totalFactura > 0;

  const handleTotalChange = (v) => {
    const total = parseFloat(v) || 0;
    const itbis = parseFloat(row.itbisFact) || 0;
    const subtotal = total > 0 ? (total - itbis).toFixed(2) : "";
    onChange({ ...row, _totalFactura: v, montoFact: subtotal });
  };

  const handleItbisChange = (v) => {
    const itbis = parseFloat(v) || 0;
    const total = parseFloat(row._totalFactura) || 0;
    const subtotal = total > 0 ? (total - itbis).toFixed(2) : row.montoFact;
    onChange({ ...row, itbisFact: v, montoFact: total > 0 ? subtotal : row.montoFact });
  };

  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#f59e0b",fontSize:12,fontWeight:700}}>{row._bdId?"✏️ EDITANDO COMPRA #"+row._bdId:"➕ NUEVA COMPRA"}</span>
        <button onClick={onSave} disabled={saving||!!ncfErr} style={{background:saving||ncfErr?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"4px 16px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving||ncfErr?0.6:1}}>
          {saving?"⏳ Guardando...":row._bdId?"💾 Actualizar":"💾 Guardar"}
        </button>
      </div>

      {/* ── CALCULADORA TOTAL ─────────────────────────────────── */}
      <div style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{color:"#0ea5e9",fontSize:9,letterSpacing:2,position:"absolute",marginTop:-18}}></div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:16}}>🧮</span>
          <span style={{color:"#0ea5e9",fontSize:10,fontWeight:700,letterSpacing:1}}>CALCULADORA — FACTURA SIN DESGLOSE</span>
        </div>
        <div style={{width:"100%",height:1,background:"#1e3a5f",marginBottom:4}} />
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",width:"100%"}}>
          <Field label="TOTAL FACTURA (con ITBIS)">
            <Inp
              value={row._totalFactura || ""}
              onChange={handleTotalChange}
              placeholder="Ej: 11800.00"
              style={{border:"1px solid #0ea5e9",background:"#060d1a"}}
            />
          </Field>
          <div style={{display:"flex",alignItems:"center",paddingBottom:6,color:"#334155",fontSize:18}}>−</div>
          <Field label="ITBIS FACTURADO">
            <Inp value={row.itbisFact} onChange={handleItbisChange} placeholder="Ej: 1800.00" />
          </Field>
          <div style={{display:"flex",alignItems:"center",paddingBottom:6,color:"#334155",fontSize:18}}>=</div>
          <Field label="SUBTOTAL (Monto Fact.)">
            <div style={{
              ...inp, display:"flex", alignItems:"center",
              background: hayTotal ? "#051020" : "#080f1c",
              color: hayTotal ? "#10b981" : "#334155",
              fontWeight: hayTotal ? 700 : 400,
              border: hayTotal ? "1px solid #10b981" : "1px solid #1e2d40",
              minWidth:140,
            }}>
              {hayTotal ? subtotalCalc : "—"}
            </div>
          </Field>
          {hayTotal && (
            <button
              onClick={()=>onChange({...row,_totalFactura:"",montoFact:"",itbisFact:""})}
              style={{background:"#1e293b",border:"1px solid #334155",color:"#64748b",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:10,marginBottom:1,whiteSpace:"nowrap"}}
              title="Limpiar calculadora"
            >✕ Limpiar</button>
          )}
        </div>
        <div style={{color:"#334155",fontSize:9,marginTop:2}}>
          💡 Opcional · Usa esto si el suplidor no desglosa el subtotal · Los campos de abajo también son editables directamente
        </div>
      </div>

      {/* ── CAMPOS DEL FORMULARIO ─────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:8}}>
        <Field label="RNC/CÉDULA"><Inp value={row.rnc} onChange={ch("rnc")} placeholder="101234567" /></Field>
        <Field label="TIPO ID"><Sel value={row.tipoId} onChange={ch("tipoId")} options={[{v:"1",l:"1-RNC"},{v:"2",l:"2-Cédula"},{v:"3",l:"3-Pasaporte"}]} /></Field>
        <Field label="NCF" error={ncfErr}><Inp value={row.ncf} onChange={ch("ncf")} placeholder="E310000000001" error={ncfErr} /></Field>
        <Field label="NCF MOD."><Inp value={row.ncfMod} onChange={ch("ncfMod")} placeholder="Opcional" /></Field>
        <Field label="TIPO BIENES"><Sel value={row.tipoBienes} onChange={ch("tipoBienes")} options={TIPOS_BIENES_606} /></Field>
        <Field label="FECHA NCF"><input type="date" style={inp} value={row.fechaNcf} onChange={e=>ch("fechaNcf")(e.target.value)} /></Field>
        <Field label="FECHA PAGO"><input type="date" style={inp} value={row.fechaPago} onChange={e=>ch("fechaPago")(e.target.value)} /></Field>
        <Field label="MONTO FACT.">
          <Inp
            value={row.montoFact}
            onChange={v => onChange({...row, montoFact: v, _totalFactura: ""})}
            placeholder="0.00"
            style={hayTotal ? {border:"1px solid #10b981",color:"#10b981"} : {}}
          />
        </Field>
        <Field label="ITBIS FACT."><Inp value={row.itbisFact} onChange={handleItbisChange} placeholder="0.00" /></Field>
        <Field label="ITBIS RET.TERC."><Inp value={row.itbisRetTerceros} onChange={ch("itbisRetTerceros")} placeholder="0.00" /></Field>
        <Field label="ITBIS PERCIBIDO"><Inp value={row.itbisPercibido} onChange={ch("itbisPercibido")} placeholder="0.00" /></Field>
        <Field label="TIPO RET.ISR"><Sel value={row.tipoRetIsr} onChange={ch("tipoRetIsr")} options={TIPO_RET_ISR} /></Field>
        <Field label="RET. RENTA"><Inp value={row.retRenta} onChange={ch("retRenta")} placeholder="0.00" /></Field>
        <Field label="ISR PERCIBIDO"><Inp value={row.isrPercibido} onChange={ch("isrPercibido")} placeholder="0.00" /></Field>
        <Field label="IMP.SEL.CONSUMO"><Inp value={row.impSelConsumo} onChange={ch("impSelConsumo")} placeholder="0.00" /></Field>
        <Field label="OTROS IMP."><Inp value={row.otrosImp} onChange={ch("otrosImp")} placeholder="0.00" /></Field>
        <Field label="PROPINA"><Inp value={row.propina} onChange={ch("propina")} placeholder="0.00" /></Field>
        <Field label="FORMA PAGO"><Sel value={row.formaPago} onChange={ch("formaPago")} options={FORMAS_PAGO_606} /></Field>
      </div>
    </div>
  );
}

function Form607({ row, onChange, onSave, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  const ncfErr = row.ncf ? validarNCF(row.ncf) : null;
  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#10b981",fontSize:12,fontWeight:700}}>{row._bdId?"✏️ EDITANDO VENTA #"+row._bdId:"➕ NUEVA VENTA"}</span>
        <button onClick={onSave} disabled={saving||!!ncfErr} style={{background:saving||ncfErr?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"4px 16px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving||ncfErr?0.6:1}}>
          {saving?"⏳ Guardando...":row._bdId?"💾 Actualizar":"💾 Guardar"}
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:8}}>
        <Field label="RNC/CÉDULA"><Inp value={row.rnc} onChange={ch("rnc")} placeholder="40212345678" /></Field>
        <Field label="TIPO ID"><Sel value={row.tipoId} onChange={ch("tipoId")} options={[{v:"1",l:"1-RNC"},{v:"2",l:"2-Cédula"},{v:"3",l:"3-Pasaporte"},{v:"4",l:"4-S/D"}]} /></Field>
        <Field label="NCF" error={ncfErr}><Inp value={row.ncf} onChange={ch("ncf")} placeholder="B010000000001" error={ncfErr} /></Field>
        <Field label="NCF MOD."><Inp value={row.ncfMod} onChange={ch("ncfMod")} placeholder="Opcional" /></Field>
        <Field label="TIPO INGRESO"><Sel value={row.tipoIngreso} onChange={ch("tipoIngreso")} options={TIPOS_INGRESOS_607} /></Field>
        <Field label="FECHA NCF"><input type="date" style={inp} value={row.fechaNcf} onChange={e=>ch("fechaNcf")(e.target.value)} /></Field>
        <Field label="FECHA RET./PAGO"><input type="date" style={inp} value={row.fechaRetPago} onChange={e=>ch("fechaRetPago")(e.target.value)} /></Field>
        <Field label="MONTO FACT."><Inp value={row.montoFact} onChange={ch("montoFact")} placeholder="0.00" /></Field>
        <Field label="ITBIS FACT."><Inp value={row.itbisFact} onChange={ch("itbisFact")} placeholder="0.00" /></Field>
        <Field label="ITBIS RETENIDO"><Inp value={row.itbisRetenido} onChange={ch("itbisRetenido")} placeholder="0.00" /></Field>
        <Field label="ITBIS PERCIBIDO"><Inp value={row.itbisPercibido} onChange={ch("itbisPercibido")} placeholder="0.00" /></Field>
        <Field label="RET. RENTA"><Inp value={row.retRenta} onChange={ch("retRenta")} placeholder="0.00" /></Field>
        <Field label="ISR PERCIBIDO"><Inp value={row.isrPercibido} onChange={ch("isrPercibido")} placeholder="0.00" /></Field>
        <Field label="IMP.SEL.CONSUMO"><Inp value={row.impSelConsumo} onChange={ch("impSelConsumo")} placeholder="0.00" /></Field>
        <Field label="OTROS IMP."><Inp value={row.otrosImp} onChange={ch("otrosImp")} placeholder="0.00" /></Field>
        <Field label="PROPINA"><Inp value={row.propina} onChange={ch("propina")} placeholder="0.00" /></Field>
      </div>
      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #0f2040"}}>
        <div style={{color:"#334155",fontSize:9,letterSpacing:2,marginBottom:8}}>FORMAS DE COBRO</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
          <Field label="EFECTIVO"><Inp value={row.efectivo} onChange={ch("efectivo")} placeholder="0.00" /></Field>
          <Field label="CHEQUE/TRANSFER."><Inp value={row.cheque} onChange={ch("cheque")} placeholder="0.00" /></Field>
          <Field label="TARJETA"><Inp value={row.tarjeta} onChange={ch("tarjeta")} placeholder="0.00" /></Field>
          <Field label="CRÉDITO"><Inp value={row.credito} onChange={ch("credito")} placeholder="0.00" /></Field>
          <Field label="BONOS/CERT."><Inp value={row.bonos} onChange={ch("bonos")} placeholder="0.00" /></Field>
          <Field label="PERMUTA"><Inp value={row.permuta} onChange={ch("permuta")} placeholder="0.00" /></Field>
          <Field label="OTRAS"><Inp value={row.otras} onChange={ch("otras")} placeholder="0.00" /></Field>
        </div>
      </div>
    </div>
  );
}

// ─── TABLA REGISTROS ──────────────────────────────────────────
function TablaRegistros({ registros, total, page, limit, onEditar, onAnular, cargando, onPageChange, buscar, onBuscar }) {
  const totalPags = Math.ceil(total / limit);
  if (cargando) return <div style={{color:"#475569",fontSize:12,padding:"40px 0",textAlign:"center"}}>⏳ Cargando registros...</div>;
  return (
    <div>
      {/* Barra búsqueda */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <input
          type="text" value={buscar} onChange={e=>onBuscar(e.target.value)}
          placeholder="🔍 Buscar por NCF, RNC o nombre..."
          style={{...inp,flex:1,maxWidth:340}}
        />
        {buscar && <button onClick={()=>onBuscar("")} style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:11}}>✕</button>}
        <span style={{color:"#475569",fontSize:10,marginLeft:"auto"}}>{total} registro(s) en total</span>
      </div>

      {!registros.length ? (
        <div style={{color:"#334155",fontSize:12,padding:"30px 0",textAlign:"center"}}>No hay registros para este período.</div>
      ) : (
        <>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{borderBottom:"1px solid #1e2d40"}}>
                  {["#","NCF","RNC / Nombre","Monto","ITBIS","Fecha NCF","Acciones"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((r,i)=>(
                  <tr key={r.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                    <td style={{padding:"8px 10px",color:"#334155",fontSize:10}}>{r.id}</td>
                    <td style={{padding:"8px 10px",color:"#0ea5e9",fontFamily:"monospace",whiteSpace:"nowrap"}}>{r.ncf}</td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{color:"#e2e8f0"}}>{r.rnc_cedula||"—"}</div>
                      {(r.nombre_proveedor||r.nombre_cliente) && <div style={{color:"#475569",fontSize:10,marginTop:2}}>{r.nombre_proveedor||r.nombre_cliente}</div>}
                    </td>
                    <td style={{padding:"8px 10px",color:"#10b981",whiteSpace:"nowrap"}}>RD$ {fmtMoney(r.monto_facturado)}</td>
                    <td style={{padding:"8px 10px",color:"#f59e0b",whiteSpace:"nowrap"}}>RD$ {fmtMoney(r.itbis_facturado)}</td>
                    <td style={{padding:"8px 10px",color:"#64748b",whiteSpace:"nowrap"}}>{r.fecha_comprobante||"—"}</td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>onEditar(r)} style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✏️</button>
                        <button onClick={()=>onAnular(r.id)} style={{background:"#450a0a",border:"none",color:"#f87171",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {totalPags > 1 && (
            <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:14,alignItems:"center"}}>
              <button onClick={()=>onPageChange(page-1)} disabled={page<=1} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:page<=1?"#334155":"#0ea5e9",borderRadius:6,padding:"5px 12px",cursor:page<=1?"default":"pointer",fontSize:12}}>←</button>
              {Array.from({length:Math.min(totalPags,7)},(_,i)=>{
                let p;
                if (totalPags<=7) p=i+1;
                else if (page<=4) p=i+1;
                else if (page>=totalPags-3) p=totalPags-6+i;
                else p=page-3+i;
                return (
                  <button key={p} onClick={()=>onPageChange(p)} style={{background:p===page?"#0ea5e9":"#0f2040",border:`1px solid ${p===page?"#0ea5e9":"#1e3a5f"}`,color:p===page?"#fff":"#94a3b8",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,minWidth:34}}>{p}</button>
                );
              })}
              <button onClick={()=>onPageChange(page+1)} disabled={page>=totalPags} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:page>=totalPags?"#334155":"#0ea5e9",borderRadius:6,padding:"5px 12px",cursor:page>=totalPags?"default":"pointer",fontSize:12}}>→</button>
              <span style={{color:"#334155",fontSize:10,marginLeft:6}}>Pág {page}/{totalPags}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(getUser());
  const [empresas, setEmpresas] = useState([]);
  const [empresaActual, setEmpresaActual] = useState(null);
  const [tab, setTab] = useState("606");
  const [mainTab, setMainTab] = useState("facturas");
  const [subTab, setSubTab] = useState("nuevo");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0,7));
  const [form606, setForm606] = useState(emptyRow606());
  const [form607, setForm607] = useState(emptyRow607());
  const [registros, setRegistros] = useState([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [regBuscar, setRegBuscar] = useState("");
  const [cargandoReg, setCargandoReg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState({ msg:"", tipo:"ok" });
  const [showUsuarios, setShowUsuarios] = useState(false);
  const [showEmpresas, setShowEmpresas] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showCambiarPass, setShowCambiarPass] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const REG_LIMIT = 50;

  const showToast = (msg, tipo="ok") => { setToast({msg,tipo}); setTimeout(()=>setToast({msg:"",tipo:"ok"}),3500); };


  const cambiarEmpresa = (empresa) => {
    setEmpresaActual(empresa);
    setForm606(emptyRow606());
    setForm607(emptyRow607());
    setRegistros([]);
    setRegTotal(0);
    setRegPage(1);
    setRegBuscar("");
    setSubTab("nuevo");
  };

  useEffect(() => { if (usuario) cargarEmpresas(); }, [usuario]);

  const cargarEmpresas = async () => {
    try {
      const res = await authFetch(`${API}/api/empresas`);
      const data = await res.json();
      // Compatibilidad: el endpoint siempre devuelve array
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaActual) setEmpresaActual(lista[0]);
    } catch (e) {
      console.error("Error cargando empresas:", e);
    }
  };

  const cargarRegistros = useCallback(async (pagina=1, busqueda="") => {
    if (!empresaActual) return;
    setCargandoReg(true);
    try {
      const p = periodo.replace("-","");
      const endpoint = tab==="606"?"compras":"ventas";
      const params = new URLSearchParams({
        periodo: p,
        empresa_id: empresaActual.id,
        page: pagina,
        limit: REG_LIMIT,
        ...(busqueda ? { buscar: busqueda } : {})
      });
      const res = await authFetch(`${API}/api/${endpoint}?${params}`);
      const data = await res.json();
      // Compatibilidad v2 (array) y v3 ({ rows, total })
      if (Array.isArray(data)) {
        setRegistros(data);
        setRegTotal(data.length);
      } else {
        setRegistros(Array.isArray(data.rows) ? data.rows : []);
        setRegTotal(data.total || 0);
      }
      setRegPage(pagina);
    } catch { showToast("❌ Error al cargar registros","error"); }
    setCargandoReg(false);
  }, [empresaActual, periodo, tab]);

  const handleBuscar = (val) => {
    setRegBuscar(val);
    cargarRegistros(1, val);
  };

  const handleSave = async () => {
    if (!empresaActual) { showToast("⚠ Selecciona una empresa","warn"); return; }
    const form = tab==="606"?form606:form607;
    if (!form.ncf) { showToast("⚠ El NCF es obligatorio","warn"); return; }
    const errNcf = validarNCF(form.ncf);
    if (errNcf) { showToast(`⚠ ${errNcf}`,"warn"); return; }
    if (!form.montoFact) { showToast("⚠ El monto es obligatorio","warn"); return; }
    setSaving(true);
    try {
      const p = periodo.replace("-","");
      const endpoint = tab==="606"?"compras":"ventas";
      const isEdit = !!form._bdId;
      const url = isEdit?`${API}/api/${endpoint}/${form._bdId}`:`${API}/api/${endpoint}`;
      const method = isEdit?"PUT":"POST";
      const { _totalFactura: _tf, ...formClean } = form;
      const body = isEdit?{...formClean,periodoFiscal:p}:[{...formClean,periodoFiscal:p,empresaId:empresaActual.id}];
      const res = await authFetch(url,{method,body:JSON.stringify(body)});
      const data = await res.json();
      if (data.ok) {
        showToast(isEdit?"✅ Factura actualizada":"✅ Factura guardada");
        if (tab==="606") setForm606(emptyRow606()); else setForm607(emptyRow607());
        if (subTab==="registros") cargarRegistros(regPage, regBuscar);
      } else showToast(`❌ ${data.error}`,"error");
    } catch { showToast("❌ Error de conexión","error"); }
    setSaving(false);
  };

  const handleEditar = (r) => {
    const mapped = tab==="606"?mapBD606(r):mapBD607(r);
    if (tab==="606") setForm606(mapped); else setForm607(mapped);
    setSubTab("nuevo");
    showToast("✏️ Cargado para editar");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleAnular = async (id) => {
    if (!window.confirm("¿Anular esta factura? La acción es irreversible.")) return;
    const endpoint = tab==="606"?"compras":"ventas";
    const res = await authFetch(`${API}/api/${endpoint}/${id}`,{method:"DELETE"});
    const data = await res.json();
    if (data.ok) { showToast("✅ Factura anulada"); cargarRegistros(regPage, regBuscar); }
    else showToast(`❌ ${data.error}`,"error");
  };

  const handleGenerate = async () => {
    if (!empresaActual) { showToast("⚠ Selecciona una empresa","warn"); return; }
    const p = periodo.replace("-","");
    const endpoint = tab==="606"?"compras":"ventas";
    // Traer todas las filas sin paginación para el TXT
    const params = new URLSearchParams({ periodo: p, empresa_id: empresaActual.id, limit: 9999 });
    const res = await authFetch(`${API}/api/${endpoint}?${params}`);
    const data = await res.json();
    const filas = Array.isArray(data) ? data : (data.rows || []);
    if (!filas.length) { showToast("⚠ No hay facturas para este período","warn"); return; }
    const rows = tab==="606"?filas.map(mapBD606):filas.map(mapBD607);
    const header = { rnc:empresaActual.rnc, periodo };
    const content = tab==="606"?build606(header,rows):build607(header,rows);
    setPreview({ content, filename:`${tab}_${empresaActual.rnc}_${p}.txt` });
  };

  if (!usuario) return <LoginScreen onLogin={u=>setUsuario(u)} />;

  const TABS_FAC = [
    { id:"606", label:"📥 COMPRAS (606)", color:"#f59e0b" },
    { id:"607", label:"📤 VENTAS (607)", color:"#10b981" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#030712",fontFamily:"'JetBrains Mono','Courier New',monospace",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus{border-color:#0ea5e9!important;box-shadow:0 0 0 2px #0ea5e920}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#0a0f1e}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
        button:hover{opacity:0.88}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#060d1a",borderBottom:"1px solid #0f2040",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#0369a1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🇩🇴</div>
          <div>
            <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,letterSpacing:1}}>SISTEMA DGII</div>
            <div style={{color:"#334155",fontSize:9}}>Multi-Empresa · v3</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,flexWrap:"wrap"}}>
          <span style={{color:"#475569",fontSize:10}}>EMPRESA:</span>
          <EmpresaSelector empresas={empresas} empresaActual={empresaActual} onChange={cambiarEmpresa} />
          {mainTab==="facturas" && <input type="month" style={{...inp,width:150}} value={periodo} onChange={e=>setPeriodo(e.target.value)} />}
        </div>
        <div style={{position:"relative"}}>
          <button onClick={()=>setMenuAbierto(m=>!m)} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            👤 {usuario.nombre} <span style={{color:"#475569"}}>▾</span>
          </button>
          {menuAbierto && (
            <div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:10,minWidth:200,zIndex:50,overflow:"hidden"}}>
              {usuario.rol==="superadmin" && <>
                <button onClick={()=>{setShowEmpresas(true);setMenuAbierto(false);}} style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>🏢 Gestionar Empresas</button>
                <button onClick={()=>{setShowUsuarios(true);setMenuAbierto(false);}} style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>👥 Gestionar Usuarios</button>
                <div style={{height:1,background:"#1e293b"}} />
              </>}
              <button onClick={()=>{setShowCambiarPass(true);setMenuAbierto(false);}} style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>🔑 Cambiar Contraseña</button>
              <div style={{height:1,background:"#1e293b"}} />
              <button onClick={()=>{clearAuth();setUsuario(null);setMenuAbierto(false);}} style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>🚪 Cerrar Sesión</button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN TABS */}
      <div style={{display:"flex",borderBottom:"1px solid #0f2040",background:"#060d1a",padding:"0 20px"}}>
        {[{id:"facturas",l:"🧾 Facturas"},{id:"reportes",l:"📊 Reportes"}].map(t=>(
          <button key={t.id} onClick={()=>setMainTab(t.id)} style={{padding:"10px 22px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,color:mainTab===t.id?"#0ea5e9":"#334155",borderBottom:mainTab===t.id?"2px solid #0ea5e9":"2px solid transparent",transition:"all .15s"}}>
            {t.l}
          </button>
        ))}
      </div>

      {mainTab==="reportes" && <Reportes empresaActual={empresaActual} empresas={empresas} />}

      {mainTab==="facturas" && (
        <>
          <div style={{display:"flex",borderBottom:"1px solid #0f2040",background:"#060d1a",padding:"0 20px"}}>
            {TABS_FAC.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setSubTab("nuevo");setRegistros([]);setRegTotal(0);setRegBuscar("");}} style={{padding:"10px 20px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,letterSpacing:1,color:tab===t.id?t.color:"#334155",borderBottom:tab===t.id?`2px solid ${t.color}`:"2px solid transparent",transition:"all .15s"}}>{t.label}</button>
            ))}
          </div>

          <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px"}}>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              <button onClick={()=>setSubTab("nuevo")} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,background:subTab==="nuevo"?"#1e3a5f":"#080f1c",color:subTab==="nuevo"?"#e2e8f0":"#475569"}}>➕ Nueva factura</button>
              <button onClick={()=>{setSubTab("registros");cargarRegistros(1,"");setRegBuscar("");}} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,background:subTab==="registros"?"#1e3a5f":"#080f1c",color:subTab==="registros"?"#e2e8f0":"#475569"}}>📋 Ver registros</button>
              <button onClick={()=>setShowImportar(true)} style={{padding:"7px 18px",borderRadius:8,border:"1px solid #1e3a5f",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,background:"#080f1c",color:"#475569"}}>📤 Importar CSV</button>
              <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
                <button onClick={async()=>{
                  if(!empresaActual){showToast("⚠ Selecciona una empresa","warn");return;}
                  const p=periodo.replace("-","");
                  const [rc,rv]=await Promise.all([
                    authFetch(`${API}/api/compras?empresa_id=${empresaActual.id}&periodo=${p}&limit=9999`),
                    authFetch(`${API}/api/ventas?empresa_id=${empresaActual.id}&periodo=${p}&limit=9999`),
                  ]);
                  const dc=await rc.json(); const dv=await rv.json();
                  const c=Array.isArray(dc)?dc:(dc.rows||[]);
                  const v=Array.isArray(dv)?dv:(dv.rows||[]);
                  if(!c.length&&!v.length){showToast("⚠ No hay registros para este período","warn");return;}
                  await exportarExcelProfesional({empresa:{razon_social:empresaActual.razon_social,rnc:empresaActual.rnc,periodo:p,tipo:empresaActual.tipo_contribuyente,regimen:empresaActual.regimen_impositivo},compras:c,ventas:v,periodo});
                  showToast("✅ Excel descargado");
                }} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"7px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>📊 Excel .xlsx</button>
                <button onClick={handleGenerate} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"7px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>⚡ Generar .TXT</button>
              </div>
            </div>

            {subTab==="nuevo" && (
              <>
                {tab==="606" ? <Form606 row={form606} onChange={setForm606} onSave={handleSave} saving={saving} /> : <Form607 row={form607} onChange={setForm607} onSave={handleSave} saving={saving} />}
                {(form606._bdId||form607._bdId) && (
                  <button onClick={()=>{if(tab==="606")setForm606(emptyRow606());else setForm607(emptyRow607());}} style={{background:"#0f2040",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginTop:8}}>✕ Cancelar edición</button>
                )}
              </>
            )}

            {subTab==="registros" && (
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{color:"#475569",fontSize:11}}>{empresaActual?.razon_social} · {periodo}</span>
                  <button onClick={()=>cargarRegistros(regPage,regBuscar)} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#0ea5e9",borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>🔄 Recargar</button>
                </div>
                <TablaRegistros
                  registros={registros} total={regTotal} page={regPage} limit={REG_LIMIT}
                  onEditar={handleEditar} onAnular={handleAnular} cargando={cargandoReg}
                  onPageChange={p=>cargarRegistros(p,regBuscar)}
                  buscar={regBuscar} onBuscar={handleBuscar}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* PREVIEW TXT */}
      {preview && (
        <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:820,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40",gap:12}}>
              <span style={{color:"#0ea5e9",fontSize:13,flex:1,fontFamily:"monospace"}}>📄 {preview.filename}</span>
              <button onClick={()=>{downloadFile(preview.content,preview.filename,"text/plain;charset=utf-8");showToast("✓ Descargado");}} style={{background:"#0ea5e9",border:"none",color:"#fff",borderRadius:8,padding:"6px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>⬇ Descargar</button>
              <button onClick={()=>setPreview(null)} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <pre style={{flex:1,overflowY:"auto",padding:20,margin:0,fontFamily:"monospace",fontSize:11,color:"#94a3b8",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
              {preview.content.split("\n").map((line,i)=>(
                <span key={i}>
                  <span style={{color:"#1e3a5f",userSelect:"none",marginRight:10}}>{String(i+1).padStart(3,"0")}</span>
                  {i===0?<span style={{color:"#f59e0b"}}>{line}</span>:line.split("|").map((p,j,arr)=><span key={j}><span style={{color:"#e2e8f0"}}>{p}</span>{j<arr.length-1&&<span style={{color:"#3b82f6"}}>|</span>}</span>)}
                  {"\n"}
                </span>
              ))}
            </pre>
          </div>
        </div>
      )}

      {showUsuarios && <UsuariosModal onClose={()=>setShowUsuarios(false)} showToast={showToast} />}
      {showEmpresas && <EmpresasModal onClose={()=>setShowEmpresas(false)} showToast={showToast} onRefresh={cargarEmpresas} />}
      {showImportar && empresaActual && <ImportadorCSV tipo={tab} empresaActual={empresaActual} periodo={periodo} onClose={()=>{setShowImportar(false);if(subTab==="registros")cargarRegistros(regPage,regBuscar);}} showToast={showToast} />}
      {showCambiarPass && <CambiarPasswordModal onClose={()=>setShowCambiarPass(false)} showToast={showToast} />}

      {toast.msg && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.tipo==="error"?"#450a0a":toast.tipo==="warn"?"#1c1408":"#0a1628",border:`1px solid ${toast.tipo==="error"?"#7f1d1d":toast.tipo==="warn"?"#78350f":"#1e3a5f"}`,color:"#e2e8f0",padding:"10px 24px",borderRadius:10,fontSize:13,zIndex:200,whiteSpace:"nowrap",pointerEvents:"none"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
