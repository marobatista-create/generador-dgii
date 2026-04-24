// ============================================================
//  BACKEND DGII v3 — Auth JWT + Multi-Empresa + Importación CSV
//  Fixes: tipo_id en compras, paginación, validaciones, búsqueda
// ============================================================

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

const DB_CONFIG = {
  host: process.env.DB_HOST || "shinkansen.proxy.rlwy.net",
  port: parseInt(process.env.DB_PORT) || 58964,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "tAMFVMuDrJdNaTjMPwzbywOjjWDTLojz",
  database: process.env.DB_NAME || "dgii",
};

const JWT_SECRET = process.env.JWT_SECRET || "dgii_secret_key_2025_cambia_esto_en_produccion";
const pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10 });

async function verificarConexion() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conectado a MySQL correctamente");
    conn.release();
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    process.exit(1);
  }
}

// ── MIDDLEWARE DE AUTENTICACIÓN ───────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

async function checkEmpresaAccess(req, res, next) {
  const empresaId = req.query.empresa_id || req.body?.empresaId || req.body?.empresa_id;
  if (!empresaId || req.usuario.rol === "superadmin") return next();
  try {
    const [rows] = await pool.query(
      "SELECT id FROM usuario_empresa WHERE usuario_id=? AND empresa_id=?",
      [req.usuario.id, empresaId]
    );
    if (!rows.length) return res.status(403).json({ error: "Sin acceso a esta empresa" });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// ── STATUS ────────────────────────────────────────────────────
app.get("/api/status", (_, res) => res.json({ ok: true, version: "3.0" }));

// ── AUTENTICACIÓN ─────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });
  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuario WHERE email=? AND activo=1", [email]
    );
    if (!rows.length) return res.status(401).json({ error: "Credenciales incorrectas" });
    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });
    await pool.query("UPDATE usuario SET ultimo_acceso=NOW() WHERE id=?", [usuario.id]);
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      JWT_SECRET, { expiresIn: "8h" }
    );
    res.json({ ok: true, token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/cambiar-password", authMiddleware, async (req, res) => {
  const { passwordActual, passwordNuevo } = req.body;
  if (!passwordNuevo || passwordNuevo.length < 6)
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  try {
    const [rows] = await pool.query("SELECT * FROM usuario WHERE id=?", [req.usuario.id]);
    const ok = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });
    const hash = await bcrypt.hash(passwordNuevo, 10);
    await pool.query("UPDATE usuario SET password_hash=? WHERE id=?", [hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── USUARIOS ─────────────────────────────────────────────────

app.get("/api/usuarios", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at FROM usuario ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/usuarios", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: "Nombre, email y contraseña requeridos" });
  if (password.length < 6) return res.status(400).json({ error: "Contraseña mínimo 6 caracteres" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO usuario (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)",
      [nombre, email, hash, rol || "contador"]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "El email ya está registrado" });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/usuarios/:id", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  const { nombre, email, rol, activo, password } = req.body;
  try {
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: "Contraseña mínimo 6 caracteres" });
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuario SET nombre=?, email=?, rol=?, activo=?, password_hash=? WHERE id=?",
        [nombre, email, rol, activo ?? 1, hash, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE usuario SET nombre=?, email=?, rol=?, activo=? WHERE id=?",
        [nombre, email, rol, activo ?? 1, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/usuarios/:id/empresas", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  const { empresa_id, puede_editar } = req.body;
  try {
    await pool.query(
      "INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, puede_editar) VALUES (?, ?, ?)",
      [req.params.id, empresa_id, puede_editar ?? 1]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/usuarios/:id/empresas/:empresa_id", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  try {
    await pool.query(
      "DELETE FROM usuario_empresa WHERE usuario_id=? AND empresa_id=?",
      [req.params.id, req.params.empresa_id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── EMPRESAS ──────────────────────────────────────────────────

app.get("/api/empresas", authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.usuario.rol === "superadmin") {
      [rows] = await pool.query("SELECT * FROM empresa WHERE activo=1 ORDER BY razon_social");
    } else {
      [rows] = await pool.query(
        `SELECT e.*, ue.puede_editar FROM empresa e
         JOIN usuario_empresa ue ON ue.empresa_id=e.id
         WHERE ue.usuario_id=? AND e.activo=1
         ORDER BY e.razon_social`,
        [req.usuario.id]
      );
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/empresas", authMiddleware, async (req, res) => {
  const { rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo } = req.body;
  if (!rnc || !razon_social) return res.status(400).json({ error: "RNC y razón social requeridos" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT id FROM empresa WHERE rnc=?", [rnc]);
    let empresaId;
    if (existing.length) {
      empresaId = existing[0].id;
      await conn.query(
        "UPDATE empresa SET razon_social=?, nombre_comercial=?, tipo_contribuyente=?, regimen_impositivo=? WHERE id=?",
        [razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, empresaId]
      );
    } else {
      const [r] = await conn.query(
        `INSERT INTO empresa (rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, creado_por)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, req.usuario.id]
      );
      empresaId = r.insertId;
    }
    await conn.query(
      "INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, puede_editar) VALUES (?, ?, 1)",
      [req.usuario.id, empresaId]
    );
    await conn.commit();
    res.json({ ok: true, id: empresaId });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.put("/api/empresas/:id", authMiddleware, async (req, res) => {
  const { rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo } = req.body;
  try {
    await pool.query(
      "UPDATE empresa SET rnc=?, razon_social=?, nombre_comercial=?, tipo_contribuyente=?, regimen_impositivo=? WHERE id=?",
      [rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/empresas/:id", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  try {
    await pool.query("UPDATE empresa SET activo=0 WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── HELPERS ───────────────────────────────────────────────────
async function upsertProveedor(conn, rnc, razonSocial, tipoId) {
  if (!rnc) return null;
  const [ex] = await conn.query("SELECT id FROM proveedor WHERE rnc_cedula=? LIMIT 1", [rnc]);
  if (ex.length) return ex[0].id;
  const [r] = await conn.query(
    "INSERT INTO proveedor (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
    [rnc, razonSocial || rnc, tipoId || "1"]
  );
  return r.insertId;
}

async function upsertCliente(conn, rnc, razonSocial, tipoId) {
  if (!rnc || tipoId === "4") return null;
  const [ex] = await conn.query("SELECT id FROM cliente WHERE rnc_cedula=? LIMIT 1", [rnc]);
  if (ex.length) return ex[0].id;
  const [r] = await conn.query(
    "INSERT INTO cliente (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
    [rnc, razonSocial || rnc, tipoId || "1"]
  );
  return r.insertId;
}

// ── COMPRAS (606) ─────────────────────────────────────────────

app.get("/api/compras", authMiddleware, checkEmpresaAccess, async (req, res) => {
  const { periodo, empresa_id, buscar, page = 1, limit = 100 } = req.query;
  try {
    let where = "c.estado='A'";
    const params = [];
    if (empresa_id) { where += " AND c.empresa_id=?"; params.push(empresa_id); }
    if (periodo) { where += " AND c.periodo_fiscal=?"; params.push(periodo); }
    if (buscar) {
      where += " AND (c.ncf LIKE ? OR p.rnc_cedula LIKE ? OR p.razon_social LIKE ?)";
      const b = `%${buscar}%`;
      params.push(b, b, b);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM compra c LEFT JOIN proveedor p ON p.id=c.proveedor_id WHERE ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT c.*, p.rnc_cedula, p.razon_social AS nombre_proveedor, p.tipo_id
       FROM compra c LEFT JOIN proveedor p ON p.id=c.proveedor_id
       WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/compras", authMiddleware, async (req, res) => {
  const compras = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const c of compras) {
      const provId = await upsertProveedor(conn, c.rnc, c.razon_social, c.tipoId);
      const [r] = await conn.query(
        `INSERT INTO compra (empresa_id, proveedor_id, tipo_id, ncf, ncf_modificado,
          tipo_bienes_servicios, fecha_comprobante, fecha_pago,
          monto_facturado, itbis_facturado, itbis_retenido_terceros, itbis_percibido,
          tipo_retencion_isr, retencion_renta, isr_percibido,
          impuesto_selectivo, otros_impuestos, propina_legal, forma_pago, periodo_fiscal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.empresaId||c.empresa_id, provId, c.tipoId||"1",
          c.ncf, c.ncfMod||null, c.tipoBienes,
          c.fechaNcf||null, c.fechaPago||null,
          parseFloat(c.montoFact)||0, parseFloat(c.itbisFact)||0,
          parseFloat(c.itbisRetTerceros)||0, parseFloat(c.itbisPercibido)||0,
          c.tipoRetIsr||null, parseFloat(c.retRenta)||0, parseFloat(c.isrPercibido)||0,
          parseFloat(c.impSelConsumo)||0, parseFloat(c.otrosImp)||0,
          parseFloat(c.propina)||0, c.formaPago, c.periodoFiscal]
      );
      insertados.push(r.insertId);
    }
    await conn.commit();
    res.json({ ok: true, insertados });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.put("/api/compras/:id", authMiddleware, async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `UPDATE compra SET ncf=?, ncf_modificado=?, tipo_bienes_servicios=?,
        fecha_comprobante=?, fecha_pago=?, monto_facturado=?, itbis_facturado=?,
        itbis_retenido_terceros=?, itbis_percibido=?, tipo_retencion_isr=?,
        retencion_renta=?, isr_percibido=?, impuesto_selectivo=?, otros_impuestos=?,
        propina_legal=?, forma_pago=? WHERE id=?`,
      [c.ncf, c.ncfMod||null, c.tipoBienes, c.fechaNcf||null, c.fechaPago||null,
        parseFloat(c.montoFact)||0, parseFloat(c.itbisFact)||0,
        parseFloat(c.itbisRetTerceros)||0, parseFloat(c.itbisPercibido)||0,
        c.tipoRetIsr||null, parseFloat(c.retRenta)||0, parseFloat(c.isrPercibido)||0,
        parseFloat(c.impSelConsumo)||0, parseFloat(c.otrosImp)||0,
        parseFloat(c.propina)||0, c.formaPago, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/compras/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE compra SET estado='V' WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── VENTAS (607) ──────────────────────────────────────────────

app.get("/api/ventas", authMiddleware, checkEmpresaAccess, async (req, res) => {
  const { periodo, empresa_id, buscar, page = 1, limit = 100 } = req.query;
  try {
    let where = "v.estado='A'";
    const params = [];
    if (empresa_id) { where += " AND v.empresa_id=?"; params.push(empresa_id); }
    if (periodo) { where += " AND v.periodo_fiscal=?"; params.push(periodo); }
    if (buscar) {
      where += " AND (v.ncf LIKE ? OR c.rnc_cedula LIKE ? OR c.razon_social LIKE ?)";
      const b = `%${buscar}%`;
      params.push(b, b, b);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM venta v LEFT JOIN cliente c ON c.id=v.cliente_id WHERE ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT v.*, c.rnc_cedula, c.razon_social AS nombre_cliente, c.tipo_id
       FROM venta v LEFT JOIN cliente c ON c.id=v.cliente_id
       WHERE ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/ventas", authMiddleware, async (req, res) => {
  const ventas = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const v of ventas) {
      const cliId = await upsertCliente(conn, v.rnc, v.razon_social, v.tipoId);
      const [r] = await conn.query(
        `INSERT INTO venta (empresa_id, cliente_id, tipo_id, ncf, ncf_modificado, tipo_ingreso,
          fecha_comprobante, fecha_retencion_pago, monto_facturado, itbis_facturado,
          itbis_retenido, itbis_percibido, retencion_renta, isr_percibido,
          impuesto_selectivo, otros_impuestos, propina_legal,
          efectivo, cheque_transferencia, tarjeta_debito_credito,
          credito, bonos_certificados, permuta, otras_formas, periodo_fiscal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.empresaId||v.empresa_id, cliId, v.tipoId||"1",
          v.ncf, v.ncfMod||null, v.tipoIngreso,
          v.fechaNcf||null, v.fechaRetPago||null,
          parseFloat(v.montoFact)||0, parseFloat(v.itbisFact)||0,
          parseFloat(v.itbisRetenido)||0, parseFloat(v.itbisPercibido)||0,
          parseFloat(v.retRenta)||0, parseFloat(v.isrPercibido)||0,
          parseFloat(v.impSelConsumo)||0, parseFloat(v.otrosImp)||0,
          parseFloat(v.propina)||0, parseFloat(v.efectivo)||0,
          parseFloat(v.cheque)||0, parseFloat(v.tarjeta)||0,
          parseFloat(v.credito)||0, parseFloat(v.bonos)||0,
          parseFloat(v.permuta)||0, parseFloat(v.otras)||0, v.periodoFiscal]
      );
      insertados.push(r.insertId);
    }
    await conn.commit();
    res.json({ ok: true, insertados });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.put("/api/ventas/:id", authMiddleware, async (req, res) => {
  const v = req.body;
  try {
    await pool.query(
      `UPDATE venta SET ncf=?, ncf_modificado=?, tipo_ingreso=?,
        fecha_comprobante=?, fecha_retencion_pago=?, monto_facturado=?, itbis_facturado=?,
        itbis_retenido=?, itbis_percibido=?, retencion_renta=?, isr_percibido=?,
        impuesto_selectivo=?, otros_impuestos=?, propina_legal=?,
        efectivo=?, cheque_transferencia=?, tarjeta_debito_credito=?,
        credito=?, bonos_certificados=?, permuta=?, otras_formas=? WHERE id=?`,
      [v.ncf, v.ncfMod||null, v.tipoIngreso, v.fechaNcf||null, v.fechaRetPago||null,
        parseFloat(v.montoFact)||0, parseFloat(v.itbisFact)||0,
        parseFloat(v.itbisRetenido)||0, parseFloat(v.itbisPercibido)||0,
        parseFloat(v.retRenta)||0, parseFloat(v.isrPercibido)||0,
        parseFloat(v.impSelConsumo)||0, parseFloat(v.otrosImp)||0,
        parseFloat(v.propina)||0, parseFloat(v.efectivo)||0,
        parseFloat(v.cheque)||0, parseFloat(v.tarjeta)||0,
        parseFloat(v.credito)||0, parseFloat(v.bonos)||0,
        parseFloat(v.permuta)||0, parseFloat(v.otras)||0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/ventas/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE venta SET estado='V' WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── IMPORTACIÓN MASIVA CSV ────────────────────────────────────
app.post("/api/importar/:tipo", authMiddleware, async (req, res) => {
  const { tipo } = req.params;
  const { empresa_id, periodo, filas } = req.body;
  if (!["606","607"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido (606|607)" });
  if (!Array.isArray(filas) || !filas.length) return res.status(400).json({ error: "Sin filas para importar" });
  if (!empresa_id || !periodo) return res.status(400).json({ error: "empresa_id y periodo requeridos" });
  const conn = await pool.getConnection();
  const errores = [];
  const insertados = [];
  try {
    await conn.beginTransaction();
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      try {
        if (tipo === "606") {
          const provId = await upsertProveedor(conn, f.rnc, f.razon_social, f.tipoId);
          const [r] = await conn.query(
            `INSERT INTO compra (empresa_id, proveedor_id, tipo_id, ncf, ncf_modificado,
              tipo_bienes_servicios, fecha_comprobante, fecha_pago,
              monto_facturado, itbis_facturado, itbis_retenido_terceros, itbis_percibido,
              tipo_retencion_isr, retencion_renta, isr_percibido,
              impuesto_selectivo, otros_impuestos, propina_legal, forma_pago, periodo_fiscal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [empresa_id, provId, f.tipoId||"1", f.ncf, f.ncfMod||null, f.tipoBienes||"15",
              f.fechaNcf||null, f.fechaPago||null,
              parseFloat(f.montoFact)||0, parseFloat(f.itbisFact)||0,
              parseFloat(f.itbisRetTerceros)||0, parseFloat(f.itbisPercibido)||0,
              f.tipoRetIsr||null, parseFloat(f.retRenta)||0, parseFloat(f.isrPercibido)||0,
              parseFloat(f.impSelConsumo)||0, parseFloat(f.otrosImp)||0,
              parseFloat(f.propina)||0, f.formaPago||"01", periodo]
          );
          insertados.push(r.insertId);
        } else {
          const cliId = await upsertCliente(conn, f.rnc, f.razon_social, f.tipoId);
          const [r] = await conn.query(
            `INSERT INTO venta (empresa_id, cliente_id, tipo_id, ncf, ncf_modificado, tipo_ingreso,
              fecha_comprobante, fecha_retencion_pago, monto_facturado, itbis_facturado,
              itbis_retenido, itbis_percibido, retencion_renta, isr_percibido,
              impuesto_selectivo, otros_impuestos, propina_legal,
              efectivo, cheque_transferencia, tarjeta_debito_credito,
              credito, bonos_certificados, permuta, otras_formas, periodo_fiscal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [empresa_id, cliId, f.tipoId||"1", f.ncf, f.ncfMod||null, f.tipoIngreso||"01",
              f.fechaNcf||null, f.fechaRetPago||null,
              parseFloat(f.montoFact)||0, parseFloat(f.itbisFact)||0,
              parseFloat(f.itbisRetenido)||0, parseFloat(f.itbisPercibido)||0,
              parseFloat(f.retRenta)||0, parseFloat(f.isrPercibido)||0,
              parseFloat(f.impSelConsumo)||0, parseFloat(f.otrosImp)||0,
              parseFloat(f.propina)||0, parseFloat(f.efectivo)||0,
              parseFloat(f.cheque)||0, parseFloat(f.tarjeta)||0,
              parseFloat(f.credito)||0, parseFloat(f.bonos)||0,
              parseFloat(f.permuta)||0, parseFloat(f.otras)||0, periodo]
          );
          insertados.push(r.insertId);
        }
      } catch (e) { errores.push({ fila: i + 2, ncf: f.ncf || "?", error: e.message }); }
    }
    await conn.commit();
    res.json({ ok: true, insertados: insertados.length, errores });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

// ── REPORTES ──────────────────────────────────────────────────

app.get("/api/reportes/resumen-mensual", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [[compras]] = await pool.query(`
      SELECT COUNT(*) AS total_facturas,
        COALESCE(SUM(monto_facturado),0) AS total_monto,
        COALESCE(SUM(itbis_facturado),0) AS total_itbis,
        COALESCE(SUM(itbis_retenido_terceros),0) AS total_itbis_retenido,
        COALESCE(SUM(retencion_renta),0) AS total_ret_renta,
        COALESCE(SUM(isr_percibido),0) AS total_isr,
        COALESCE(SUM(propina_legal),0) AS total_propina,
        COALESCE(SUM(impuesto_selectivo),0) AS total_isc
      FROM compra WHERE empresa_id=? AND periodo_fiscal=? AND estado='A'
    `, [empresa_id, periodo]);
    const [[ventas]] = await pool.query(`
      SELECT COUNT(*) AS total_facturas,
        COALESCE(SUM(monto_facturado),0) AS total_monto,
        COALESCE(SUM(itbis_facturado),0) AS total_itbis,
        COALESCE(SUM(itbis_retenido),0) AS total_itbis_retenido,
        COALESCE(SUM(retencion_renta),0) AS total_ret_renta,
        COALESCE(SUM(isr_percibido),0) AS total_isr,
        COALESCE(SUM(propina_legal),0) AS total_propina,
        COALESCE(SUM(efectivo),0) AS total_efectivo,
        COALESCE(SUM(cheque_transferencia),0) AS total_cheque,
        COALESCE(SUM(tarjeta_debito_credito),0) AS total_tarjeta,
        COALESCE(SUM(credito),0) AS total_credito
      FROM venta WHERE empresa_id=? AND periodo_fiscal=? AND estado='A'
    `, [empresa_id, periodo]);
    res.json({ compras, ventas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/por-tipo-bien", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT tipo_bienes_servicios AS tipo,
        COUNT(*) AS cantidad,
        COALESCE(SUM(monto_facturado),0) AS total_monto,
        COALESCE(SUM(itbis_facturado),0) AS total_itbis,
        COALESCE(SUM(retencion_renta),0) AS total_ret_renta
      FROM compra WHERE empresa_id=? AND periodo_fiscal=? AND estado='A'
      GROUP BY tipo_bienes_servicios ORDER BY total_monto DESC
    `, [empresa_id, periodo]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/comparativo", authMiddleware, async (req, res) => {
  const { empresa_id, periodos } = req.query;
  const lista = periodos ? periodos.split(",").filter(Boolean) : [];
  if (!lista.length) return res.json({ compras: [], ventas: [] });
  const ph = lista.map(() => "?").join(",");
  try {
    const [compras] = await pool.query(`
      SELECT periodo_fiscal, COUNT(*) AS facturas,
        COALESCE(SUM(monto_facturado),0) AS monto,
        COALESCE(SUM(itbis_facturado),0) AS itbis,
        COALESCE(SUM(retencion_renta),0) AS ret_renta
      FROM compra WHERE empresa_id=? AND periodo_fiscal IN (${ph}) AND estado='A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, ...lista]);
    const [ventas] = await pool.query(`
      SELECT periodo_fiscal, COUNT(*) AS facturas,
        COALESCE(SUM(monto_facturado),0) AS monto,
        COALESCE(SUM(itbis_facturado),0) AS itbis,
        COALESCE(SUM(retencion_renta),0) AS ret_renta
      FROM venta WHERE empresa_id=? AND periodo_fiscal IN (${ph}) AND estado='A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, ...lista]);
    res.json({ compras, ventas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/itbis-retenido", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [[compras]] = await pool.query(`
      SELECT COALESCE(SUM(itbis_retenido_terceros),0) AS itbis_ret_compras,
        COALESCE(SUM(itbis_percibido),0) AS itbis_percibido_compras,
        COALESCE(SUM(retencion_renta),0) AS ret_renta_compras,
        COALESCE(SUM(isr_percibido),0) AS isr_percibido_compras
      FROM compra WHERE empresa_id=? AND periodo_fiscal=? AND estado='A'
    `, [empresa_id, periodo]);
    const [[ventas]] = await pool.query(`
      SELECT COALESCE(SUM(itbis_retenido),0) AS itbis_ret_ventas,
        COALESCE(SUM(itbis_percibido),0) AS itbis_percibido_ventas,
        COALESCE(SUM(retencion_renta),0) AS ret_renta_ventas,
        COALESCE(SUM(isr_percibido),0) AS isr_percibido_ventas
      FROM venta WHERE empresa_id=? AND periodo_fiscal=? AND estado='A'
    `, [empresa_id, periodo]);
    res.json({ compras, ventas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/dashboard", authMiddleware, async (req, res) => {
  const { empresa_id, anio } = req.query;
  if (!empresa_id || !anio) return res.status(400).json({ error: "empresa_id y anio requeridos" });
  try {
    const [comprasMes] = await pool.query(`
      SELECT periodo_fiscal AS periodo, COUNT(*) AS facturas,
        COALESCE(SUM(monto_facturado),0) AS monto,
        COALESCE(SUM(itbis_facturado),0) AS itbis
      FROM compra WHERE empresa_id=? AND LEFT(periodo_fiscal,4)=? AND estado='A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, anio]);
    const [ventasMes] = await pool.query(`
      SELECT periodo_fiscal AS periodo, COUNT(*) AS facturas,
        COALESCE(SUM(monto_facturado),0) AS monto,
        COALESCE(SUM(itbis_facturado),0) AS itbis
      FROM venta WHERE empresa_id=? AND LEFT(periodo_fiscal,4)=? AND estado='A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, anio]);
    res.json({ compras: comprasMes, ventas: ventasMes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── INICIAR SERVIDOR ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
await verificarConexion();
app.listen(PORT, () => {
  console.log(`🚀 Servidor DGII v3 corriendo en http://localhost:${PORT}`);
});
