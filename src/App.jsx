import { useState, useRef } from "react";

const API = "http://localhost:3001";

// ─── CATÁLOGOS ───────────────────────────────────────────────────────────────
const TIPOS_BIENES_606 = [
  { v: "01", l: "01 - Gastos de personal" }, { v: "02", l: "02 - Trabajo, suministros y servicios" },
  { v: "03", l: "03 - Arrendamientos" }, { v: "04", l: "04 - Activos fijos" },
  { v: "05", l: "05 - Gastos de representación" }, { v: "06", l: "06 - Financieros" },
  { v: "07", l: "07 - Seguros" }, { v: "08", l: "08 - Gastos de propiedad" },
  { v: "09", l: "09 - Impuestos y tasas" }, { v: "10", l: "10 - Comisiones y honorarios" },
  { v: "11", l: "11 - Reparaciones y conservación" }, { v: "12", l: "12 - Investigación y desarrollo" },
  { v: "13", l: "13 - Regalías" }, { v: "14", l: "14 - Empresas relacionadas" },
  { v: "15", l: "15 - Otros gastos deducibles" }, { v: "16", l: "16 - Gastos no deducibles" },
  { v: "17", l: "17 - Importaciones" }, { v: "18", l: "18 - Educación, arte y deporte" },
];
const TIPOS_INGRESOS_607 = [
  { v: "01", l: "01 - Ingresos por operaciones" }, { v: "02", l: "02 - Ingresos financieros" },
  { v: "03", l: "03 - Ingresos extraordinarios" }, { v: "04", l: "04 - Arrendamientos" },
  { v: "05", l: "05 - Venta de activos depreciables" }, { v: "06", l: "06 - Otros ingresos" },
];
const FORMAS_PAGO_606 = [
  { v: "01", l: "01 - Efectivo" }, { v: "02", l: "02 - Cheque / Transferencia" },
  { v: "03", l: "03 - Tarjeta crédito/débito" }, { v: "04", l: "04 - Crédito" },
  { v: "05", l: "05 - Permuta" }, { v: "06", l: "06 - Nota de crédito" }, { v: "07", l: "07 - Mixto" },
];
const TIPO_RET_ISR = [
  { v: "", l: "— Ninguna —" }, { v: "01", l: "01 - Alquileres" },
  { v: "02", l: "02 - Honorarios" }, { v: "03", l: "03 - Otras rentas" },
  { v: "04", l: "04 - Rentas presuntas" }, { v: "05", l: "05 - Intereses PN" },
  { v: "06", l: "06 - Intereses PJ" }, { v: "07", l: "07 - Juegos de azar" },
  { v: "08", l: "08 - Alquileres PN" }, { v: "09", l: "09 - Facturas gubernamentales" },
  { v: "10", l: "10 - Compras" }, { v: "11", l: "11 - Compras exterior" }, { v: "12", l: "12 - Pagos exterior" },
];

const CSV_HEADERS_606 = ["rnc","tipoId","ncf","ncfMod","tipoBienes","fechaNcf","fechaPago","montoFact","itbisFact","itbisRetTerceros","itbisPercibido","tipoRetIsr","retRenta","isrPercibido","impSelConsumo","otrosImp","propina","formaPago"];
const CSV_HEADERS_607 = ["rnc","tipoId","ncf","ncfMod","tipoIngreso","fechaNcf","fechaRetPago","montoFact","itbisFact","itbisRetenido","itbisPercibido","retRenta","isrPercibido","impSelConsumo","otrosImp","propina","efectivo","cheque","tarjeta","credito","bonos","permuta","otras"];

const emptyRow606 = () => ({
  id: crypto.randomUUID(), rnc: "", tipoId: "1", ncf: "", ncfMod: "", tipoBienes: "01",
  fechaNcf: "", fechaPago: "", montoFact: "", itbisFact: "", itbisRetTerceros: "",
  itbisPercibido: "", tipoRetIsr: "", retRenta: "", isrPercibido: "",
  impSelConsumo: "", otrosImp: "", propina: "", formaPago: "01",
});
const emptyRow607 = () => ({
  id: crypto.randomUUID(), rnc: "", tipoId: "1", ncf: "", ncfMod: "", tipoIngreso: "01",
  fechaNcf: "", fechaRetPago: "", montoFact: "", itbisFact: "", itbisRetenido: "",
  itbisPercibido: "", retRenta: "", isrPercibido: "", impSelConsumo: "", otrosImp: "",
  propina: "", efectivo: "", cheque: "", tarjeta: "", credito: "", bonos: "", permuta: "", otras: "",
});

const fmt = (v) => { const n = parseFloat(v) || 0; return n.toFixed(2); };
const fmtDate = (d) => d ? d.replace(/-/g, "") : "";

function build606(header, rows) {
  const periodo = header.periodo.replace("-", "");
  const lines = [`606|${header.rnc}|${periodo}|${rows.length}`];
  for (const r of rows)
    lines.push([r.rnc,r.tipoId,r.ncf,r.ncfMod,r.tipoBienes,fmtDate(r.fechaNcf),fmtDate(r.fechaPago),fmt(r.montoFact),fmt(r.itbisFact),fmt(r.itbisRetTerceros),fmt(r.itbisPercibido),r.tipoRetIsr,fmt(r.retRenta),fmt(r.isrPercibido),fmt(r.impSelConsumo),fmt(r.otrosImp),fmt(r.propina),r.formaPago].join("|"));
  return lines.join("\r\n");
}
function build607(header, rows) {
  const periodo = header.periodo.replace("-", "");
  const lines = [`607|${header.rnc}|${periodo}|${rows.length}`];
  for (const r of rows)
    lines.push([r.rnc,r.tipoId,r.ncf,r.ncfMod,r.tipoIngreso,fmtDate(r.fechaNcf),fmtDate(r.fechaRetPago),fmt(r.montoFact),fmt(r.itbisFact),fmt(r.itbisRetenido),fmt(r.itbisPercibido),fmt(r.retRenta),fmt(r.isrPercibido),fmt(r.impSelConsumo),fmt(r.otrosImp),fmt(r.propina),fmt(r.efectivo),fmt(r.cheque),fmt(r.tarjeta),fmt(r.credito),fmt(r.bonos),fmt(r.permuta),fmt(r.otras)].join("|"));
  return lines.join("\r\n");
}

function parseCSV(text, type) {
  const lines = text.trim().split(/\r?\n/);
  const headers = type === "606" ? CSV_HEADERS_606 : CSV_HEADERS_607;
  const emptyFn = type === "606" ? emptyRow606 : emptyRow607;
  const rows = [];
  const start = lines[0].toLowerCase().includes("rnc") || lines[0].toLowerCase().includes("ncf") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(/[,;|\t]/);
    if (cols.length < 3) continue;
    const row = emptyFn();
    headers.forEach((h, idx) => { if (cols[idx] !== undefined) row[h] = cols[idx].trim(); });
    ["fechaNcf","fechaPago","fechaRetPago"].forEach(k => {
      if (row[k] && /^\d{8}$/.test(row[k]))
        row[k] = `${row[k].slice(0,4)}-${row[k].slice(4,6)}-${row[k].slice(6,8)}`;
    });
    rows.push(row);
  }
  return rows;
}

function buildCSVTemplate(type) {
  const headers = type === "606" ? CSV_HEADERS_606 : CSV_HEADERS_607;
  const ex606 = "101234567,1,E310000000001,,02,2025-01-15,2025-01-20,50000.00,9000.00,0.00,0.00,,0.00,0.00,0.00,0.00,0.00,02";
  const ex607 = "40212345678,1,E310000000001,,01,2025-01-15,,118000.00,18000.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,100000.00,0.00,18000.00,0.00,0.00,0.00,0.00";
  return headers.join(",") + "\n" + (type === "606" ? ex606 : ex607);
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const inp = { background:"#0d1524",border:"1px solid #1e3a5f",borderRadius:6,color:"#e2e8f0",padding:"6px 10px",fontSize:12,width:"100%",fontFamily:"'JetBrains Mono','Courier New',monospace",outline:"none" };
const lbl = { color:"#64748b",fontSize:10,letterSpacing:1,marginBottom:3,display:"block" };

function Field({ label, children }) {
  return <div style={{display:"flex",flexDirection:"column"}}><span style={lbl}>{label}</span>{children}</div>;
}
function Inp({ value, onChange, placeholder, style }) {
  return <input style={{...inp,...style}} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} />;
}
function Sel({ value, onChange, options }) {
  return <select style={inp} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;
}

// ─── FILA 606 ─────────────────────────────────────────────────────────────────
function Row606({ row, onChange, onDelete, onSave, idx, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#f59e0b",fontSize:11}}>COMPRA #{idx+1} {row.ncf && <span style={{color:"#475569"}}>· {row.ncf}</span>}</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onSave} disabled={saving}
            style={{background:saving?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"3px 12px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving?0.6:1}}>
            {saving?"⏳":"💾"} {saving?"Guardando...":"Guardar"}
          </button>
          <button onClick={onDelete} style={{background:"#450a0a",border:"1px solid #7f1d1d",color:"#f87171",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:8}}>
        <Field label="RNC/CÉDULA"><Inp value={row.rnc} onChange={ch("rnc")} placeholder="101234567" /></Field>
        <Field label="TIPO ID"><Sel value={row.tipoId} onChange={ch("tipoId")} options={[{v:"1",l:"1-RNC"},{v:"2",l:"2-Cédula"},{v:"3",l:"3-Pasaporte"}]} /></Field>
        <Field label="NCF"><Inp value={row.ncf} onChange={ch("ncf")} placeholder="E310000000001" /></Field>
        <Field label="NCF MOD."><Inp value={row.ncfMod} onChange={ch("ncfMod")} placeholder="Opcional" /></Field>
        <Field label="TIPO BIENES"><Sel value={row.tipoBienes} onChange={ch("tipoBienes")} options={TIPOS_BIENES_606} /></Field>
        <Field label="FECHA NCF"><input type="date" style={inp} value={row.fechaNcf} onChange={e=>ch("fechaNcf")(e.target.value)} /></Field>
        <Field label="FECHA PAGO"><input type="date" style={inp} value={row.fechaPago} onChange={e=>ch("fechaPago")(e.target.value)} /></Field>
        <Field label="MONTO FACT."><Inp value={row.montoFact} onChange={ch("montoFact")} placeholder="0.00" /></Field>
        <Field label="ITBIS FACT."><Inp value={row.itbisFact} onChange={ch("itbisFact")} placeholder="0.00" /></Field>
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

// ─── FILA 607 ─────────────────────────────────────────────────────────────────
function Row607({ row, onChange, onDelete, onSave, idx, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#10b981",fontSize:11}}>VENTA #{idx+1} {row.ncf && <span style={{color:"#475569"}}>· {row.ncf}</span>}</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onSave} disabled={saving}
            style={{background:saving?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"3px 12px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving?0.6:1}}>
            {saving?"⏳":"💾"} {saving?"Guardando...":"Guardar"}
          </button>
          <button onClick={onDelete} style={{background:"#450a0a",border:"1px solid #7f1d1d",color:"#f87171",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:8}}>
        <Field label="RNC/CÉDULA"><Inp value={row.rnc} onChange={ch("rnc")} placeholder="40212345678" /></Field>
        <Field label="TIPO ID"><Sel value={row.tipoId} onChange={ch("tipoId")} options={[{v:"1",l:"1-RNC"},{v:"2",l:"2-Cédula"},{v:"3",l:"3-Pasaporte"},{v:"4",l:"4-S/D"}]} /></Field>
        <Field label="NCF"><Inp value={row.ncf} onChange={ch("ncf")} placeholder="E310000000001" /></Field>
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

// ─── PREVIEW MODAL ───────────────────────────────────────────────────────────
function PreviewModal({ content, filename, onClose, onDownload }) {
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:820,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40",gap:12}}>
          <span style={{color:"#0ea5e9",fontSize:13,flex:1,fontFamily:"monospace"}}>📄 {filename}</span>
          <button onClick={onDownload} style={{background:"#0ea5e9",border:"none",color:"#fff",borderRadius:8,padding:"6px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>⬇ Descargar</button>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <pre style={{flex:1,overflowY:"auto",padding:20,margin:0,fontFamily:"monospace",fontSize:11,color:"#94a3b8",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
          {content.split("\n").map((line,i)=>(
            <span key={i}>
              <span style={{color:"#1e3a5f",userSelect:"none",marginRight:10}}>{String(i+1).padStart(3,"0")}</span>
              {i===0?<span style={{color:"#f59e0b"}}>{line}</span>
                :line.split("|").map((p,j,arr)=>(
                  <span key={j}><span style={{color:"#e2e8f0"}}>{p}</span>{j<arr.length-1&&<span style={{color:"#3b82f6"}}>|</span>}</span>
                ))}
              {"\n"}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ─── CSV PANEL ───────────────────────────────────────────────────────────────
function CSVPanel({ type, onImport, onClose, showToast }) {
  const [text, setText] = useState("");
  const fileRef = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setText(ev.target.result);
    reader.readAsText(file, "UTF-8");
  };
  const handleImport = () => {
    if (!text.trim()) { showToast("⚠ Pega o carga un CSV primero","warn"); return; }
    const rows = parseCSV(text, type);
    if (!rows.length) { showToast("⚠ No se encontraron filas válidas","warn"); return; }
    onImport(rows); showToast(`✓ ${rows.length} registro(s) importado(s)`); onClose();
  };
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:700,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40",gap:12}}>
          <span style={{color:"#10b981",fontSize:13,flex:1,fontFamily:"monospace"}}>📂 Importar CSV — {type==="606"?"Compras":"Ventas"}</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#060d1a",border:"1px dashed #1e3a5f",borderRadius:10,padding:14}}>
            <div style={{color:"#475569",fontSize:10,letterSpacing:1,marginBottom:8}}>COLUMNAS ESPERADAS</div>
            <div style={{color:"#334155",fontSize:10,fontFamily:"monospace",lineHeight:2,wordBreak:"break-all"}}>
              {(type==="606"?CSV_HEADERS_606:CSV_HEADERS_607).join(" · ")}
            </div>
            <button onClick={()=>downloadFile(buildCSVTemplate(type),`plantilla_${type}.csv`,"text/csv")}
              style={{marginTop:10,background:"#0f2040",border:"1px solid #1e3a5f",color:"#0ea5e9",borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>
              ⬇ Descargar plantilla CSV
            </button>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}} />
            <button onClick={()=>fileRef.current.click()} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"monospace"}}>📁 Cargar archivo</button>
            <span style={{color:"#334155",fontSize:11}}>o pega el contenido abajo</span>
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="rnc,tipoId,ncf,..." style={{...inp,height:140,resize:"vertical",lineHeight:1.6}} />
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontFamily:"monospace"}}>Cancelar</button>
            <button onClick={handleImport} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"8px 24px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"monospace"}}>✓ Importar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("606");
  const [header, setHeader] = useState({ rnc:"", periodo:new Date().toISOString().slice(0,7) });
  const [rows606, setRows606] = useState([emptyRow606()]);
  const [rows607, setRows607] = useState([emptyRow607()]);
  const [savingId, setSavingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showCSV, setShowCSV] = useState(false);
  const [toast, setToast] = useState({ msg:"", tipo:"ok" });
  const [bdStatus, setBdStatus] = useState("verificando");
  const [totalGuardados, setTotalGuardados] = useState({ "606": 0, "607": 0 });

  // Verificar conexión al servidor
  useState(() => {
    fetch(`${API}/api/status`)
      .then(r => r.json())
      .then(() => setBdStatus("conectado"))
      .catch(() => setBdStatus("desconectado"));
  }, []);

  const showToast = (msg, tipo="ok") => {
    setToast({msg,tipo});
    setTimeout(()=>setToast({msg:"",tipo:"ok"}), 3000);
  };

  // Guardar UNA factura individual y limpiar su fila
  const handleSaveRow = async (rowId) => {
    if (!header.rnc) { showToast("⚠ Ingresa el RNC de tu empresa primero","warn"); return; }
    if (!header.periodo) { showToast("⚠ Selecciona el período fiscal","warn"); return; }

    const rows = tab==="606" ? rows606 : rows607;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    if (!row.ncf) { showToast("⚠ El NCF es obligatorio","warn"); return; }
    if (!row.montoFact) { showToast("⚠ El monto facturado es obligatorio","warn"); return; }

    setSavingId(rowId);
    try {
      const periodo = header.periodo.replace("-","");
      const endpoint = tab==="606" ? "compras" : "ventas";
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ ...row, periodoFiscal: periodo }]),
      });
      const data = await res.json();
      if (data.ok) {
        // Limpiar la fila guardada y agregar una nueva vacía
        const emptyFn = tab==="606" ? emptyRow606 : emptyRow607;
        if (tab==="606") {
          setRows606(prev => prev.map(r => r.id===rowId ? emptyRow606() : r));
        } else {
          setRows607(prev => prev.map(r => r.id===rowId ? emptyRow607() : r));
        }
        setTotalGuardados(prev => ({ ...prev, [tab]: prev[tab] + 1 }));
        showToast(`✅ Factura guardada en MySQL · ${totalGuardados[tab]+1} guardada(s) este período`,"ok");
      } else {
        showToast(`❌ Error: ${data.error}`,"error");
      }
    } catch {
      showToast("❌ No se pudo conectar. ¿Está corriendo node server.js?","error");
    }
    setSavingId(null);
  };

  const handleGenerate = async () => {
    if (!header.rnc) { showToast("⚠ Ingresa el RNC","warn"); return; }
    const periodo = header.periodo.replace("-","");
    try {
      // Traer facturas guardadas en BD para ese período
      const endpoint = tab==="606" ? "compras" : "ventas";
      const res = await fetch(`${API}/api/${endpoint}?periodo=${periodo}`);
      const data = await res.json();
      if (!data.length) { showToast("⚠ No hay facturas guardadas en MySQL para este período","warn"); return; }
      // Mapear campos BD → formato app
      const rows = tab==="606"
        ? data.map(r=>({ ...emptyRow606(),
            rnc: r.rnc_cedula||"", tipoId: r.tipo_id||"1", ncf: r.ncf||"",
            ncfMod: r.ncf_modificado||"", tipoBienes: r.tipo_bienes_servicios||"01",
            fechaNcf: r.fecha_comprobante||"", fechaPago: r.fecha_pago||"",
            montoFact: r.monto_facturado, itbisFact: r.itbis_facturado,
            itbisRetTerceros: r.itbis_retenido_terceros, itbisPercibido: r.itbis_percibido,
            tipoRetIsr: r.tipo_retencion_isr||"", retRenta: r.retencion_renta,
            isrPercibido: r.isr_percibido, impSelConsumo: r.impuesto_selectivo,
            otrosImp: r.otros_impuestos, propina: r.propina_legal, formaPago: r.forma_pago,
          }))
        : data.map(r=>({ ...emptyRow607(),
            rnc: r.rnc_cedula||"", tipoId: r.tipo_id||"1", ncf: r.ncf||"",
            ncfMod: r.ncf_modificado||"", tipoIngreso: r.tipo_ingreso||"01",
            fechaNcf: r.fecha_comprobante||"", fechaRetPago: r.fecha_retencion_pago||"",
            montoFact: r.monto_facturado, itbisFact: r.itbis_facturado,
            itbisRetenido: r.itbis_retenido, itbisPercibido: r.itbis_percibido,
            retRenta: r.retencion_renta, isrPercibido: r.isr_percibido,
            impSelConsumo: r.impuesto_selectivo, otrosImp: r.otros_impuestos,
            propina: r.propina_legal, efectivo: r.efectivo,
            cheque: r.cheque_transferencia, tarjeta: r.tarjeta_debito_credito,
            credito: r.credito, bonos: r.bonos_certificados,
            permuta: r.permuta, otras: r.otras_formas,
          }));
      const content = tab==="606" ? build606(header,rows) : build607(header,rows);
      setPreview({ content, filename:`${tab}_${header.rnc}_${periodo}.txt` });
    } catch {
      showToast("❌ No se pudo conectar con el servidor","error");
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    downloadFile(preview.content, preview.filename, "text/plain;charset=utf-8");
    showToast("✓ Archivo .txt descargado");
  };

  const rows = tab==="606" ? rows606 : rows607;
  const setRows = tab==="606" ? setRows606 : setRows607;

  const bdColor = bdStatus==="conectado" ? "#10b981" : bdStatus==="desconectado" ? "#ef4444" : "#f59e0b";
  const bdLabel = bdStatus==="conectado" ? "● MySQL conectado" : bdStatus==="desconectado" ? "● MySQL desconectado" : "● Verificando...";

  const TABS = [
    { id:"606", label:"📥 COMPRAS (606)", color:"#f59e0b" },
    { id:"607", label:"📤 VENTAS (607)",  color:"#10b981" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#030712",fontFamily:"'JetBrains Mono','Courier New',monospace",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:#0ea5e9!important;box-shadow:0 0 0 2px #0ea5e920}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0f1e}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
        .row-enter{animation:fadeIn .18s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#060d1a",borderBottom:"1px solid #0f2040",padding:"14px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0ea5e9,#0369a1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🇩🇴</div>
          <div>
            <div style={{color:"#f1f5f9",fontWeight:700,fontSize:14,letterSpacing:1}}>GENERADOR DGII v3</div>
            <div style={{color:"#334155",fontSize:10}}>606 · 607 · MySQL · CSV</div>
          </div>
        </div>
        <div style={{background:"#080f1c",border:`1px solid ${bdColor}33`,borderRadius:8,padding:"6px 14px"}}>
          <span style={{color:bdColor,fontSize:11}}>{bdLabel}</span>
        </div>
        <div style={{display:"flex",gap:10,marginLeft:"auto",flexWrap:"wrap",alignItems:"flex-end"}}>
          <Field label="RNC EMPRESA">
            <Inp value={header.rnc} onChange={v=>setHeader(h=>({...h,rnc:v}))} placeholder="101234567" style={{width:155}} />
          </Field>
          <Field label="PERÍODO FISCAL">
            <input type="month" style={{...inp,width:155}} value={header.periodo} onChange={e=>setHeader(h=>({...h,periodo:e.target.value}))} />
          </Field>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:"1px solid #0f2040",background:"#060d1a",padding:"0 24px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"11px 22px",background:"none",border:"none",cursor:"pointer",fontSize:12,
            fontFamily:"inherit",fontWeight:700,letterSpacing:1,
            color:tab===t.id?t.color:"#334155",
            borderBottom:tab===t.id?`2px solid ${t.color}`:"2px solid transparent",
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
        {/* Contador de guardados */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:16,paddingRight:8}}>
          <span style={{color:"#334155",fontSize:11}}>
            Guardadas este período: <span style={{color:"#10b981",fontWeight:700}}>{totalGuardados[tab]}</span>
          </span>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>

        {/* FILAS */}
        <div>
          {tab==="606"
            ? rows606.map((r,i)=>(
              <div key={r.id} className="row-enter">
                <Row606 row={r} idx={i} saving={savingId===r.id}
                  onChange={nr=>setRows606(p=>p.map(x=>x.id===r.id?nr:x))}
                  onDelete={()=>setRows606(p=>p.length>1?p.filter(x=>x.id!==r.id):[emptyRow606()])}
                  onSave={()=>handleSaveRow(r.id)}
                />
              </div>
            ))
            : rows607.map((r,i)=>(
              <div key={r.id} className="row-enter">
                <Row607 row={r} idx={i} saving={savingId===r.id}
                  onChange={nr=>setRows607(p=>p.map(x=>x.id===r.id?nr:x))}
                  onDelete={()=>setRows607(p=>p.length>1?p.filter(x=>x.id!==r.id):[emptyRow607()])}
                  onSave={()=>handleSaveRow(r.id)}
                />
              </div>
            ))}
        </div>

        {/* ACCIONES */}
        <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
                   
          <button onClick={()=>setShowCSV(true)}
            style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#10b981",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
            📂 Importar CSV
          </button>
          <button onClick={()=>downloadFile(buildCSVTemplate(tab),`plantilla_${tab}.csv`,"text/csv")}
            style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#94a3b8",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
            ⬇ Plantilla CSV
          </button>
          <button onClick={handleGenerate}
            style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",letterSpacing:1,marginLeft:"auto"}}>
            ⚡ Generar .TXT para DGII
          </button>
        </div>

        {/* GUÍA */}
        <div style={{marginTop:24,background:"#060d1a",border:"1px solid #0f2040",borderRadius:12,padding:16}}>
          <div style={{color:"#334155",fontSize:10,letterSpacing:2,marginBottom:10}}>FLUJO DE TRABAJO</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
            {[
              ["1️⃣ Llenar","Completa los campos de la factura."],
              ["2️⃣ Guardar","Clic en 💾 Guardar — se guarda en MySQL y los campos se limpian."],
              ["3️⃣ Repetir","Ingresa la siguiente factura en los campos limpios."],
              ["4️⃣ Generar TXT","Al cerrar el período, clic en ⚡ Generar .TXT — toma los datos de MySQL."],
            ].map(([t,d])=>(
              <div key={t} style={{padding:"10px 12px",background:"#080f1c",borderRadius:8,borderLeft:"3px solid #1e3a5f"}}>
                <div style={{color:"#94a3b8",fontSize:11,marginBottom:3}}>{t}</div>
                <div style={{color:"#475569",fontSize:10,lineHeight:1.6}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {preview && <PreviewModal content={preview.content} filename={preview.filename} onClose={()=>setPreview(null)} onDownload={handleDownload} />}
      {showCSV && (
        <CSVPanel type={tab} showToast={showToast}
          onImport={newRows=>setRows(prev=>[...prev.filter(r=>r.rnc||r.ncf),...newRows])}
          onClose={()=>setShowCSV(false)}
        />
      )}

      {toast.msg && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
          background:toast.tipo==="error"?"#450a0a":toast.tipo==="warn"?"#1c1408":"#0a1628",
          border:`1px solid ${toast.tipo==="error"?"#7f1d1d":toast.tipo==="warn"?"#78350f":"#1e3a5f"}`,
          color:"#e2e8f0",padding:"10px 24px",borderRadius:10,fontSize:13,zIndex:200,whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
