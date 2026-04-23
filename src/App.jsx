import { useState, useRef, useEffect } from "react";

const API = "https://generador-dgii-production.up.railway.app";

// ─── AUTH HELPERS ─────────────────────────────────────────────
const getToken = () => localStorage.getItem("dgii_token");
const getUser  = () => { try { return JSON.parse(localStorage.getItem("dgii_user")); } catch { return null; } };
const setAuth  = (token, user) => { localStorage.setItem("dgii_token", token); localStorage.setItem("dgii_user", JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem("dgii_token"); localStorage.removeItem("dgii_user"); };

const authFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...options.headers },
  });
  if (res.status === 401) { clearAuth(); window.location.reload(); }
  return res;
};

// ─── CATÁLOGOS ───────────────────────────────────────────────
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
  { v: "", l: "— Ninguna —" }, { v: "01", l: "01 - Alquileres" }, { v: "02", l: "02 - Honorarios" },
  { v: "03", l: "03 - Otras rentas" }, { v: "04", l: "04 - Rentas presuntas" },
  { v: "05", l: "05 - Intereses PN" }, { v: "06", l: "06 - Intereses PJ" },
  { v: "07", l: "07 - Juegos de azar" }, { v: "08", l: "08 - Alquileres PN" },
  { v: "09", l: "09 - Facturas gubernamentales" }, { v: "10", l: "10 - Compras" },
  { v: "11", l: "11 - Compras exterior" }, { v: "12", l: "12 - Pagos exterior" },
];

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

const fmt = (v) => (parseFloat(v) || 0).toFixed(2);
const fmtDate = (d) => d ? d.replace(/-/g, "") : "";
const fmtMoney = (v) => parseFloat(v || 0).toLocaleString("es-DO", { minimumFractionDigits: 2 });

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

function mapBD606(r) {
  return { id: r.id, _bdId: r.id, rnc: r.rnc_cedula||"", tipoId: r.tipo_id||"1", ncf: r.ncf||"",
    ncfMod: r.ncf_modificado||"", tipoBienes: r.tipo_bienes_servicios||"01",
    fechaNcf: r.fecha_comprobante||"", fechaPago: r.fecha_pago||"",
    montoFact: r.monto_facturado, itbisFact: r.itbis_facturado,
    itbisRetTerceros: r.itbis_retenido_terceros, itbisPercibido: r.itbis_percibido,
    tipoRetIsr: r.tipo_retencion_isr||"", retRenta: r.retencion_renta,
    isrPercibido: r.isr_percibido, impSelConsumo: r.impuesto_selectivo,
    otrosImp: r.otros_impuestos, propina: r.propina_legal, formaPago: r.forma_pago };
}
function mapBD607(r) {
  return { id: r.id, _bdId: r.id, rnc: r.rnc_cedula||"", tipoId: r.tipo_id||"1", ncf: r.ncf||"",
    ncfMod: r.ncf_modificado||"", tipoIngreso: r.tipo_ingreso||"01",
    fechaNcf: r.fecha_comprobante||"", fechaRetPago: r.fecha_retencion_pago||"",
    montoFact: r.monto_facturado, itbisFact: r.itbis_facturado,
    itbisRetenido: r.itbis_retenido, itbisPercibido: r.itbis_percibido,
    retRenta: r.retencion_renta, isrPercibido: r.isr_percibido,
    impSelConsumo: r.impuesto_selectivo, otrosImp: r.otros_impuestos,
    propina: r.propina_legal, efectivo: r.efectivo, cheque: r.cheque_transferencia,
    tarjeta: r.tarjeta_debito_credito, credito: r.credito,
    bonos: r.bonos_certificados, permuta: r.permuta, otras: r.otras_formas };
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── UI ATOMS ─────────────────────────────────────────────────
const inp = { background:"#0d1524",border:"1px solid #1e3a5f",borderRadius:6,color:"#e2e8f0",padding:"6px 10px",fontSize:12,width:"100%",fontFamily:"'JetBrains Mono','Courier New',monospace",outline:"none" };
const lbl = { color:"#64748b",fontSize:10,letterSpacing:1,marginBottom:3,display:"block" };

function Field({ label, children }) {
  return <div style={{display:"flex",flexDirection:"column"}}><span style={lbl}>{label}</span>{children}</div>;
}
function Inp({ value, onChange, placeholder, style, type }) {
  return <input type={type||"text"} style={{...inp,...style}} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} />;
}
function Sel({ value, onChange, options }) {
  return <select style={inp} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;
}

// ─── PANTALLA DE LOGIN ────────────────────────────────────────
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuth(data.token, data.usuario);
        onLogin(data.usuario);
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch { setError("No se pudo conectar con el servidor"); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#030712",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
      <div style={{background:"#080f1c",border:"1px solid #1e3a5f",borderRadius:16,padding:40,width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🇩🇴</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:20,letterSpacing:1}}>SISTEMA DGII</div>
          <div style={{color:"#334155",fontSize:11,marginTop:4}}>606 · 607 · Multi-Empresa</div>
        </div>

        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:16}}>
          <Field label="CORREO ELECTRÓNICO">
            <Inp value={email} onChange={setEmail} placeholder="usuario@empresa.com" type="email" />
          </Field>
          <Field label="CONTRASEÑA">
            <Inp value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          </Field>

          {error && (
            <div style={{background:"#450a0a",border:"1px solid #7f1d1d",color:"#f87171",borderRadius:8,padding:"10px 14px",fontSize:12}}>
              ❌ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background:loading?"#1e293b":"linear-gradient(135deg,#0ea5e9,#0369a1)",
            border:"none",color:"#fff",borderRadius:8,padding:"12px",cursor:loading?"not-allowed":"pointer",
            fontSize:13,fontWeight:700,fontFamily:"inherit",letterSpacing:1,marginTop:8,
            opacity:loading?0.7:1
          }}>
            {loading ? "⏳ Verificando..." : "🔐 Iniciar Sesión"}
          </button>
        </form>

        <div style={{marginTop:24,padding:14,background:"#060d1a",borderRadius:8,border:"1px solid #0f2040"}}>
          <div style={{color:"#334155",fontSize:10,letterSpacing:1,marginBottom:6}}>ACCESO INICIAL</div>
          <div style={{color:"#475569",fontSize:11}}>Email: <span style={{color:"#0ea5e9"}}>admin@dgii.local</span></div>
          <div style={{color:"#475569",fontSize:11}}>Contraseña: <span style={{color:"#0ea5e9"}}>Admin123!</span></div>
          <div style={{color:"#334155",fontSize:10,marginTop:6}}>⚠ Cámbiala después de entrar</div>
        </div>
      </div>
    </div>
  );
}

// ─── SELECTOR DE EMPRESA ──────────────────────────────────────
function EmpresaSelector({ empresas, empresaActual, onChange }) {
  return (
    <select
      style={{...inp,width:"auto",minWidth:200,fontSize:12}}
      value={empresaActual?.id || ""}
      onChange={e => {
        const emp = empresas.find(x => String(x.id) === e.target.value);
        onChange(emp);
      }}
    >
      <option value="">— Seleccionar empresa —</option>
      {empresas.map(e => (
        <option key={e.id} value={e.id}>{e.razon_social} ({e.rnc})</option>
      ))}
    </select>
  );
}

// ─── MODAL GESTIÓN USUARIOS ───────────────────────────────────
function UsuariosModal({ onClose, showToast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre:"", email:"", password:"", rol:"contador" });
  const [editando, setEditando] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const res = await authFetch(`${API}/api/usuarios`);
    const data = await res.json();
    setUsuarios(Array.isArray(data) ? data : []);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.email) { showToast("⚠ Nombre y email son requeridos","warn"); return; }
    try {
      const url = editando ? `${API}/api/usuarios/${editando}` : `${API}/api/usuarios`;
      const method = editando ? "PUT" : "POST";
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.ok) {
        showToast(editando ? "✅ Usuario actualizado" : "✅ Usuario creado");
        setForm({ nombre:"", email:"", password:"", rol:"contador" });
setEditando(null);
        setForm({ nombre:"", email:"", password:"", rol:"contador" });
        setEditando(null);
        cargar();
      } else { showToast(`❌ ${data.error}`,"error"); }
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
          {/* Formulario */}
          <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{color:"#475569",fontSize:10,letterSpacing:1,marginBottom:12}}>{editando?"EDITAR USUARIO":"NUEVO USUARIO"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              <Field label="NOMBRE"><Inp value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Juan Pérez" /></Field>
              <Field label="EMAIL"><Inp value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="juan@empresa.com" type="email" /></Field>
              <Field label="CONTRASEÑA"><Inp value={form.password} onChange={v=>setForm(f=>({...f,password:v}))} placeholder={editando?"(sin cambios)":"Mínimo 6 caracteres"} type="password" /></Field>
              <Field label="ROL">
                <Sel value={form.rol} onChange={v=>setForm(f=>({...f,rol:v}))} options={[
                  {v:"superadmin",l:"Super Admin"},{v:"contador",l:"Contador"},{v:"asistente",l:"Asistente"}
                ]} />
              </Field>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={handleSave} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {editando?"💾 Actualizar":"➕ Crear Usuario"}
              </button>
              {editando && <button onClick={()=>{ setEditando(null); setForm({nombre:"",email:"",password:"",rol:"contador"}); }}
                style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
                Cancelar
              </button>}
            </div>
          </div>

          {/* Lista */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1e2d40"}}>
                {["Nombre","Email","Rol","Estado","Acciones"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10,letterSpacing:1}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u,i)=>(
                <tr key={u.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                  <td style={{padding:"8px 10px",color:"#e2e8f0"}}>{u.nombre}</td>
                  <td style={{padding:"8px 10px",color:"#94a3b8"}}>{u.email}</td>
                  <td style={{padding:"8px 10px"}}>
                    <span style={{background:u.rol==="superadmin"?"#1e3a5f":u.rol==="contador"?"#1a3a1a":"#2a1a3a",color:u.rol==="superadmin"?"#0ea5e9":u.rol==="contador"?"#10b981":"#a78bfa",borderRadius:4,padding:"2px 8px",fontSize:10}}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={{padding:"8px 10px",color:u.activo?"#10b981":"#ef4444"}}>{u.activo?"● Activo":"● Inactivo"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <button onClick={()=>{ setEditando(u.id); setForm({nombre:u.nombre,email:u.email,password:"",rol:u.rol,activo:u.activo}); }}
                      style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL GESTIÓN EMPRESAS ───────────────────────────────────
function EmpresasModal({ onClose, showToast, onRefresh }) {
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({ rnc:"", razon_social:"", nombre_comercial:"", tipo_contribuyente:"J", regimen_impositivo:"Ordinario" });
  const [editando, setEditando] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const res = await authFetch(`${API}/api/empresas`);
    const data = await res.json();
    setEmpresas(Array.isArray(data) ? data : []);
  };

  const handleSave = async () => {
    if (!form.rnc || !form.razon_social) { showToast("⚠ RNC y razón social son requeridos","warn"); return; }
    try {
      const url = editando ? `${API}/api/empresas/${editando}` : `${API}/api/empresas`;
      const method = editando ? "PUT" : "POST";
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.ok) {
        showToast(editando ? "✅ Empresa actualizada" : "✅ Empresa creada");
        setForm({ rnc:"", razon_social:"", nombre_comercial:"", tipo_contribuyente:"J", regimen_impositivo:"Ordinario" });
setEditando(null);
        setForm({ rnc:"", razon_social:"", nombre_comercial:"", tipo_contribuyente:"J", regimen_impositivo:"Ordinario" });
        setEditando(null);
        cargar(); onRefresh();
      } else { showToast(`❌ ${data.error}`,"error"); }
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
              <Field label="TIPO">
                <Sel value={form.tipo_contribuyente} onChange={v=>setForm(f=>({...f,tipo_contribuyente:v}))} options={[{v:"J",l:"J - Jurídica"},{v:"F",l:"F - Física"},{v:"E",l:"E - Estatal"}]} />
              </Field>
              <Field label="RÉGIMEN"><Inp value={form.regimen_impositivo} onChange={v=>setForm(f=>({...f,regimen_impositivo:v}))} placeholder="Ordinario" /></Field>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={handleSave} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {editando?"💾 Actualizar":"➕ Crear Empresa"}
              </button>
              {editando && <button onClick={()=>{ setEditando(null); setForm({rnc:"",razon_social:"",nombre_comercial:"",tipo_contribuyente:"J",regimen_impositivo:"Ordinario"}); }}
                style={{background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>}
            </div>
          </div>

          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1e2d40"}}>
                {["RNC","Razón Social","Tipo","Régimen","Acciones"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10,letterSpacing:1}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((e,i)=>(
                <tr key={e.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
                  <td style={{padding:"8px 10px",color:"#0ea5e9",fontFamily:"monospace"}}>{e.rnc}</td>
                  <td style={{padding:"8px 10px",color:"#e2e8f0"}}>{e.razon_social}</td>
                  <td style={{padding:"8px 10px",color:"#94a3b8"}}>{e.tipo_contribuyente}</td>
                  <td style={{padding:"8px 10px",color:"#94a3b8"}}>{e.regimen_impositivo}</td>
                  <td style={{padding:"8px 10px"}}>
                    <button onClick={()=>{ setEditando(e.id); setForm({rnc:e.rnc,razon_social:e.razon_social,nombre_comercial:e.nombre_comercial||"",tipo_contribuyente:e.tipo_contribuyente||"J",regimen_impositivo:e.regimen_impositivo||""}); }}
                      style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── FORMULARIOS 606 / 607 ────────────────────────────────────
function Form606({ row, onChange, onSave, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#f59e0b",fontSize:12,fontWeight:700}}>{row._bdId?"✏️ EDITANDO COMPRA #"+row._bdId:"➕ NUEVA COMPRA"}</span>
        <button onClick={onSave} disabled={saving} style={{background:saving?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"4px 16px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving?0.6:1}}>
          {saving?"⏳ Guardando...":row._bdId?"💾 Actualizar":"💾 Guardar"}
        </button>
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

function Form607({ row, onChange, onSave, saving }) {
  const ch = k => v => onChange({...row,[k]:v});
  return (
    <div style={{background:"#080f1c",border:"1px solid #1e2d40",borderRadius:10,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#10b981",fontSize:12,fontWeight:700}}>{row._bdId?"✏️ EDITANDO VENTA #"+row._bdId:"➕ NUEVA VENTA"}</span>
        <button onClick={onSave} disabled={saving} style={{background:saving?"#1e293b":"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",borderRadius:6,padding:"4px 16px",cursor:saving?"not-allowed":"pointer",fontSize:11,opacity:saving?0.6:1}}>
          {saving?"⏳ Guardando...":row._bdId?"💾 Actualizar":"💾 Guardar"}
        </button>
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

// ─── TABLA REGISTROS ──────────────────────────────────────────
function TablaRegistros({ registros, onEditar, onAnular, cargando }) {
  if (cargando) return <div style={{color:"#475569",fontSize:12,padding:"20px 0",textAlign:"center"}}>⏳ Cargando...</div>;
  if (!registros.length) return <div style={{color:"#334155",fontSize:12,padding:"20px 0",textAlign:"center"}}>No hay registros para este período.</div>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{borderBottom:"1px solid #1e2d40"}}>
            {["#","NCF","RNC","Monto","ITBIS","Fecha","Acciones"].map(h=>(
              <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:10,letterSpacing:1}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #0f2040",background:i%2===0?"#080f1c":"transparent"}}>
              <td style={{padding:"8px 10px",color:"#334155"}}>{r.id}</td>
              <td style={{padding:"8px 10px",color:"#0ea5e9",fontFamily:"monospace"}}>{r.ncf}</td>
              <td style={{padding:"8px 10px",color:"#e2e8f0"}}>{r.rnc_cedula||"—"}</td>
              <td style={{padding:"8px 10px",color:"#10b981"}}>RD$ {fmtMoney(r.monto_facturado)}</td>
              <td style={{padding:"8px 10px",color:"#f59e0b"}}>RD$ {fmtMoney(r.itbis_facturado)}</td>
              <td style={{padding:"8px 10px",color:"#64748b"}}>{r.fecha_comprobante||"—"}</td>
              <td style={{padding:"8px 10px"}}>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>onEditar(r)} style={{background:"#1e3a5f",border:"none",color:"#0ea5e9",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>✏️</button>
                  <button onClick={()=>onAnular(r.id)} style={{background:"#450a0a",border:"none",color:"#f87171",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontSize:11}}>🗑</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(getUser());
  const [empresas, setEmpresas] = useState([]);
  const [empresaActual, setEmpresaActual] = useState(null);
  const [tab, setTab] = useState("606");
  const [subTab, setSubTab] = useState("nuevo");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0,7));
  const [form606, setForm606] = useState(emptyRow606());
  const [form607, setForm607] = useState(emptyRow607());
  const [registros, setRegistros] = useState([]);
  const [cargandoReg, setCargandoReg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState({ msg:"", tipo:"ok" });
  const [showUsuarios, setShowUsuarios] = useState(false);
  const [showEmpresas, setShowEmpresas] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const showToast = (msg, tipo="ok") => { setToast({msg,tipo}); setTimeout(()=>setToast({msg:"",tipo:"ok"}),3000); };

  useEffect(() => {
    if (usuario) cargarEmpresas();
  }, [usuario]);

  const cargarEmpresas = async () => {
    try {
      const res = await authFetch(`${API}/api/empresas`);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaActual) setEmpresaActual(lista[0]);
    } catch {}
  };

  const cargarRegistros = async () => {
    if (!empresaActual) return;
    setCargandoReg(true);
    try {
      const p = periodo.replace("-","");
      const endpoint = tab==="606" ? "compras" : "ventas";
      const res = await authFetch(`${API}/api/${endpoint}?periodo=${p}&empresa_id=${empresaActual.id}`);
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } catch { showToast("❌ Error al cargar registros","error"); }
    setCargandoReg(false);
  };

  const handleSave = async () => {
    if (!empresaActual) { showToast("⚠ Selecciona una empresa","warn"); return; }
    const form = tab==="606" ? form606 : form607;
    if (!form.ncf) { showToast("⚠ El NCF es obligatorio","warn"); return; }
    if (!form.montoFact) { showToast("⚠ El monto es obligatorio","warn"); return; }
    setSaving(true);
    try {
      const p = periodo.replace("-","");
      const endpoint = tab==="606" ? "compras" : "ventas";
      const isEdit = !!form._bdId;
      const url = isEdit ? `${API}/api/${endpoint}/${form._bdId}` : `${API}/api/${endpoint}`;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { ...form, periodoFiscal: p } : [{ ...form, periodoFiscal: p, empresaId: empresaActual.id }];
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.ok) {
        showToast(isEdit ? "✅ Factura actualizada" : "✅ Factura guardada en MySQL");
        if (tab==="606") setForm606(emptyRow606()); else setForm607(emptyRow607());
        if (subTab==="registros") cargarRegistros();
      } else { showToast(`❌ ${data.error}`,"error"); }
    } catch { showToast("❌ Error de conexión","error"); }
    setSaving(false);
  };

  const handleEditar = (r) => {
    const mapped = tab==="606" ? mapBD606(r) : mapBD607(r);
    if (tab==="606") setForm606(mapped); else setForm607(mapped);
    setSubTab("nuevo");
    showToast("✏️ Cargado para editar");
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleAnular = async (id) => {
    if (!window.confirm("¿Anular esta factura?")) return;
    const endpoint = tab==="606" ? "compras" : "ventas";
    const res = await authFetch(`${API}/api/${endpoint}/${id}`, { method:"DELETE" });
    const data = await res.json();
    if (data.ok) { showToast("✅ Factura anulada"); cargarRegistros(); }
    else showToast(`❌ ${data.error}`,"error");
  };

  const handleGenerate = async () => {
    if (!empresaActual) { showToast("⚠ Selecciona una empresa","warn"); return; }
    const p = periodo.replace("-","");
    const endpoint = tab==="606" ? "compras" : "ventas";
    const res = await authFetch(`${API}/api/${endpoint}?periodo=${p}&empresa_id=${empresaActual.id}`);
    const data = await res.json();
    if (!data.length) { showToast("⚠ No hay facturas para este período","warn"); return; }
    const rows = tab==="606" ? data.map(mapBD606) : data.map(mapBD607);
    const header = { rnc: empresaActual.rnc, periodo };
    const content = tab==="606" ? build606(header,rows) : build607(header,rows);
    setPreview({ content, filename:`${tab}_${empresaActual.rnc}_${p}.txt` });
  };

  if (!usuario) return <LoginScreen onLogin={u=>setUsuario(u)} />;

  const TABS = [
    { id:"606", label:"📥 COMPRAS (606)", color:"#f59e0b" },
    { id:"607", label:"📤 VENTAS (607)", color:"#10b981" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#030712",fontFamily:"'JetBrains Mono','Courier New',monospace",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus{border-color:#0ea5e9!important;box-shadow:0 0 0 2px #0ea5e920}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0f1e}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#060d1a",borderBottom:"1px solid #0f2040",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#0369a1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🇩🇴</div>
          <div>
            <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,letterSpacing:1}}>SISTEMA DGII</div>
            <div style={{color:"#334155",fontSize:9}}>Multi-Empresa · v5</div>
          </div>
        </div>

        {/* Selector de empresa */}
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,flexWrap:"wrap"}}>
          <span style={{color:"#475569",fontSize:10}}>EMPRESA:</span>
          <EmpresaSelector empresas={empresas} empresaActual={empresaActual} onChange={setEmpresaActual} />
          <input type="month" style={{...inp,width:150}} value={periodo} onChange={e=>setPeriodo(e.target.value)} />
        </div>

        {/* Menú usuario */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setMenuAbierto(m=>!m)} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#e2e8f0",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            👤 {usuario.nombre} <span style={{color:"#475569"}}>▾</span>
          </button>
          {menuAbierto && (
            <div style={{position:"absolute",right:0,top:"100%",marginTop:4,background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:10,minWidth:180,zIndex:50,overflow:"hidden"}}>
              {usuario.rol==="superadmin" && <>
                <button onClick={()=>{ setShowEmpresas(true); setMenuAbierto(false); }}
                  style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>
                  🏢 Gestionar Empresas
                </button>
                <button onClick={()=>{ setShowUsuarios(true); setMenuAbierto(false); }}
                  style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>
                  👥 Gestionar Usuarios
                </button>
                <div style={{height:1,background:"#1e293b"}} />
              </>}
              <button onClick={()=>{ clearAuth(); setUsuario(null); setMenuAbierto(false); }}
                style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"left"}}>
                🚪 Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ALERTA SIN EMPRESA */}
      {!empresaActual && (
        <div style={{background:"#1c1408",border:"1px solid #78350f",color:"#fbbf24",padding:"12px 20px",fontSize:12,textAlign:"center"}}>
          ⚠ No tienes empresas asignadas. {usuario.rol==="superadmin" && <span>Ve al menú → <strong>Gestionar Empresas</strong> para crear una.</span>}
        </div>
      )}

      {/* TABS */}
      <div style={{display:"flex",borderBottom:"1px solid #0f2040",background:"#060d1a",padding:"0 20px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{ setTab(t.id); setSubTab("nuevo"); }} style={{
            padding:"10px 20px",background:"none",border:"none",cursor:"pointer",fontSize:12,
            fontFamily:"inherit",fontWeight:700,letterSpacing:1,
            color:tab===t.id?t.color:"#334155",
            borderBottom:tab===t.id?`2px solid ${t.color}`:"2px solid transparent",
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px"}}>
        {/* SUB-TABS */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <button onClick={()=>setSubTab("nuevo")} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,background:subTab==="nuevo"?"#1e3a5f":"#080f1c",color:subTab==="nuevo"?"#e2e8f0":"#475569"}}>
            ➕ Nueva factura
          </button>
          <button onClick={()=>{ setSubTab("registros"); cargarRegistros(); }} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,background:subTab==="registros"?"#1e3a5f":"#080f1c",color:subTab==="registros"?"#e2e8f0":"#475569"}}>
            📋 Ver registros
          </button>
          <button onClick={handleGenerate} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",color:"#fff",borderRadius:8,padding:"7px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",marginLeft:"auto"}}>
            ⚡ Generar .TXT para DGII
          </button>
        </div>

        {/* NUEVA FACTURA */}
        {subTab==="nuevo" && (
          <>
            {tab==="606"
              ? <Form606 row={form606} onChange={setForm606} onSave={handleSave} saving={saving} />
              : <Form607 row={form607} onChange={setForm607} onSave={handleSave} saving={saving} />
            }
            {(form606._bdId || form607._bdId) && (
              <button onClick={()=>{ if(tab==="606") setForm606(emptyRow606()); else setForm607(emptyRow607()); }}
                style={{background:"#0f2040",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginTop:8}}>
                ✕ Cancelar edición
              </button>
            )}
          </>
        )}

        {/* REGISTROS */}
        {subTab==="registros" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{color:"#475569",fontSize:11}}>
                {empresaActual?.razon_social} · Período {periodo} · {registros.length} registro(s)
              </span>
              <button onClick={cargarRegistros} style={{background:"#0f2040",border:"1px solid #1e3a5f",color:"#0ea5e9",borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>
                🔄 Recargar
              </button>
            </div>
            <TablaRegistros registros={registros} onEditar={handleEditar} onAnular={handleAnular} cargando={cargandoReg} />
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {preview && (
        <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0a0f1e",border:"1px solid #1e3a5f",borderRadius:14,width:"100%",maxWidth:820,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #1e2d40",gap:12}}>
              <span style={{color:"#0ea5e9",fontSize:13,flex:1,fontFamily:"monospace"}}>📄 {preview.filename}</span>
              <button onClick={()=>{ downloadFile(preview.content,preview.filename,"text/plain;charset=utf-8"); showToast("✓ Descargado"); }}
                style={{background:"#0ea5e9",border:"none",color:"#fff",borderRadius:8,padding:"6px 18px",cursor:"pointer",fontWeight:700,fontSize:12}}>⬇ Descargar</button>
              <button onClick={()=>setPreview(null)} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <pre style={{flex:1,overflowY:"auto",padding:20,margin:0,fontFamily:"monospace",fontSize:11,color:"#94a3b8",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
              {preview.content.split("\n").map((line,i)=>(
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
      )}

      {showUsuarios && <UsuariosModal onClose={()=>setShowUsuarios(false)} showToast={showToast} />}
      {showEmpresas && <EmpresasModal onClose={()=>setShowEmpresas(false)} showToast={showToast} onRefresh={cargarEmpresas} />}

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
