// ============================================================
//  BACKEND DGII v2 — Autenticación JWT + Multi-Empresa
// ============================================================

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const DB_CONFIG = {
  host: "shinkansen.proxy.rlwy.net",
  port: 58964,
  user: "root",
  password: "tAMFVMuDrJdNaTjMPwzbywOjjWDTLojz",
  database: "dgii",
};

const JWT_SECRET = "dgii_secret_key_2025_cambia_esto_en_produccion";
const pool = mysql.createPool(DB_CONFIG);

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
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// ── STATUS ────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  res.json({ ok: true });
});

// ── AUTENTICACIÓN ─────────────────────────────────────────────

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });
  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuario WHERE email = ? AND activo = 1", [email]
    );
    if (!rows.length) return res.status(401).json({ error: "Credenciales incorrectas" });
    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });
    await pool.query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?", [usuario.id]);
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({
      ok: true, token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/cambiar-password
app.post("/api/auth/cambiar-password", authMiddleware, async (req, res) => {
  const { passwordActual, passwordNuevo } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM usuario WHERE id = ?", [req.usuario.id]);
    const ok = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });
    const hash = await bcrypt.hash(passwordNuevo, 10);
    await pool.query("UPDATE usuario SET password_hash = ? WHERE id = ?", [hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── USUARIOS (solo superadmin) ────────────────────────────────

// GET /api/usuarios
app.get("/api/usuarios", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at FROM usuario ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/usuarios — crear usuario
app.post("/api/usuarios", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  const { nombre, email, password, rol } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO usuario (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)",
      [nombre, email, hash, rol || "contador"]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/usuarios/:id — editar usuario
app.put("/api/usuarios/:id", authMiddleware, async (req, res) => {
  if (req.usuario.rol !== "superadmin") return res.status(403).json({ error: "Sin permiso" });
  const { nombre, email, rol, activo, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuario SET nombre=?, email=?, rol=?, activo=?, password_hash=? WHERE id=?",
        [nombre, email, rol, activo, hash, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE usuario SET nombre=?, email=?, rol=?, activo=? WHERE id=?",
        [nombre, email, rol, activo, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── EMPRESAS ──────────────────────────────────────────────────

// GET /api/empresas — empresas del usuario actual
app.get("/api/empresas", authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.usuario.rol === "superadmin") {
      [rows] = await pool.query("SELECT * FROM empresa WHERE activo = 1 ORDER BY razon_social");
    } else {
      [rows] = await pool.query(
        `SELECT e.* FROM empresa e
         JOIN usuario_empresa ue ON ue.empresa_id = e.id
         WHERE ue.usuario_id = ? AND e.activo = 1
         ORDER BY e.razon_social`,
        [req.usuario.id]
      );
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/empresas — crear empresa
app.post("/api/empresas", authMiddleware, async (req, res) => {
  const { rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO empresa (rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, creado_por)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE razon_social=VALUES(razon_social), nombre_comercial=VALUES(nombre_comercial)`,
      [rnc, razon_social, nombre_comercial, tipo_contribuyente, regimen_impositivo, req.usuario.id]
    );
    // Asignar empresa al usuario que la creó
    await pool.query(
      "INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, puede_editar) VALUES (?, ?, 1)",
      [req.usuario.id, result.insertId || result.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/empresas/:id
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

// ── COMPRAS (606) ─────────────────────────────────────────────

app.get("/api/compras", authMiddleware, async (req, res) => {
  const { periodo, empresa_id } = req.query;
  try {
    let query = `
      SELECT c.*, p.rnc_cedula, p.razon_social AS nombre_proveedor
      FROM compra c
      LEFT JOIN proveedor p ON p.id = c.proveedor_id
      WHERE c.estado = 'A'
    `;
    const params = [];
    if (empresa_id) { query += " AND c.empresa_id = ?"; params.push(empresa_id); }
    if (periodo) { query += " AND c.periodo_fiscal = ?"; params.push(periodo); }
    query += " ORDER BY c.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/compras", authMiddleware, async (req, res) => {
  const compras = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const c of compras) {
      let proveedorId = null;
      if (c.rnc) {
        const [existing] = await conn.query("SELECT id FROM proveedor WHERE rnc_cedula = ? LIMIT 1", [c.rnc]);
        if (existing.length > 0) { proveedorId = existing[0].id; }
        else {
          const [result] = await conn.query(
            "INSERT INTO proveedor (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
            [c.rnc, c.razon_social || c.rnc, c.tipoId || "1"]
          );
          proveedorId = result.insertId;
        }
      }
      const empresaId = c.empresaId || c.empresa_id;
      const [result] = await conn.query(
        `INSERT INTO compra (empresa_id, proveedor_id, ncf, ncf_modificado, tipo_bienes_servicios,
          fecha_comprobante, fecha_pago, monto_facturado, itbis_facturado,
          itbis_retenido_terceros, itbis_percibido, tipo_retencion_isr,
          retencion_renta, isr_percibido, impuesto_selectivo, otros_impuestos,
          propina_legal, forma_pago, periodo_fiscal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [empresaId, proveedorId, c.ncf, c.ncfMod||null, c.tipoBienes,
          c.fechaNcf||null, c.fechaPago||null,
          parseFloat(c.montoFact)||0, parseFloat(c.itbisFact)||0,
          parseFloat(c.itbisRetTerceros)||0, parseFloat(c.itbisPercibido)||0,
          c.tipoRetIsr||null, parseFloat(c.retRenta)||0, parseFloat(c.isrPercibido)||0,
          parseFloat(c.impSelConsumo)||0, parseFloat(c.otrosImp)||0,
          parseFloat(c.propina)||0, c.formaPago, c.periodoFiscal]
      );
      insertados.push(result.insertId);
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
    await pool.query("UPDATE compra SET estado = 'V' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── VENTAS (607) ──────────────────────────────────────────────

app.get("/api/ventas", authMiddleware, async (req, res) => {
  const { periodo, empresa_id } = req.query;
  try {
    let query = `
      SELECT v.*, c.rnc_cedula, c.razon_social AS nombre_cliente
      FROM venta v
      LEFT JOIN cliente c ON c.id = v.cliente_id
      WHERE v.estado = 'A'
    `;
    const params = [];
    if (empresa_id) { query += " AND v.empresa_id = ?"; params.push(empresa_id); }
    if (periodo) { query += " AND v.periodo_fiscal = ?"; params.push(periodo); }
    query += " ORDER BY v.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/ventas", authMiddleware, async (req, res) => {
  const ventas = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const v of ventas) {
      let clienteId = null;
      if (v.rnc && v.tipoId !== "4") {
        const [existing] = await conn.query("SELECT id FROM cliente WHERE rnc_cedula = ? LIMIT 1", [v.rnc]);
        if (existing.length > 0) { clienteId = existing[0].id; }
        else {
          const [result] = await conn.query(
            "INSERT INTO cliente (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
            [v.rnc, v.razon_social || v.rnc, v.tipoId || "1"]
          );
          clienteId = result.insertId;
        }
      }
      const empresaId = v.empresaId || v.empresa_id;
      const [result] = await conn.query(
        `INSERT INTO venta (empresa_id, cliente_id, ncf, ncf_modificado, tipo_ingreso,
          fecha_comprobante, fecha_retencion_pago, monto_facturado, itbis_facturado,
          itbis_retenido, itbis_percibido, retencion_renta, isr_percibido,
          impuesto_selectivo, otros_impuestos, propina_legal,
          efectivo, cheque_transferencia, tarjeta_debito_credito,
          credito, bonos_certificados, permuta, otras_formas, periodo_fiscal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [empresaId, clienteId, v.ncf, v.ncfMod||null, v.tipoIngreso,
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
      insertados.push(result.insertId);
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
    await pool.query("UPDATE venta SET estado = 'V' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── REPORTES ──────────────────────────────────────────────────

// GET /api/reportes/resumen-mensual?empresa_id=1&periodo=202501
app.get("/api/reportes/resumen-mensual", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [compras] = await pool.query(`
      SELECT
        COUNT(*) AS total_facturas,
        SUM(monto_facturado) AS total_monto,
        SUM(itbis_facturado) AS total_itbis,
        SUM(itbis_retenido_terceros) AS total_itbis_retenido,
        SUM(retencion_renta) AS total_ret_renta,
        SUM(isr_percibido) AS total_isr,
        SUM(propina_legal) AS total_propina,
        SUM(impuesto_selectivo) AS total_isc
      FROM compra
      WHERE empresa_id = ? AND periodo_fiscal = ? AND estado = 'A'
    `, [empresa_id, periodo]);

    const [ventas] = await pool.query(`
      SELECT
        COUNT(*) AS total_facturas,
        SUM(monto_facturado) AS total_monto,
        SUM(itbis_facturado) AS total_itbis,
        SUM(itbis_retenido) AS total_itbis_retenido,
        SUM(retencion_renta) AS total_ret_renta,
        SUM(isr_percibido) AS total_isr,
        SUM(propina_legal) AS total_propina,
        SUM(efectivo) AS total_efectivo,
        SUM(cheque_transferencia) AS total_cheque,
        SUM(tarjeta_debito_credito) AS total_tarjeta,
        SUM(credito) AS total_credito
      FROM venta
      WHERE empresa_id = ? AND periodo_fiscal = ? AND estado = 'A'
    `, [empresa_id, periodo]);

    res.json({ compras: compras[0], ventas: ventas[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reportes/por-tipo-bien?empresa_id=1&periodo=202501
app.get("/api/reportes/por-tipo-bien", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT
        tipo_bienes_servicios AS tipo,
        COUNT(*) AS cantidad,
        SUM(monto_facturado) AS total_monto,
        SUM(itbis_facturado) AS total_itbis,
        SUM(retencion_renta) AS total_ret_renta
      FROM compra
      WHERE empresa_id = ? AND periodo_fiscal = ? AND estado = 'A'
      GROUP BY tipo_bienes_servicios
      ORDER BY total_monto DESC
    `, [empresa_id, periodo]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reportes/comparativo?empresa_id=1&periodos=202501,202502,202503
app.get("/api/reportes/comparativo", authMiddleware, async (req, res) => {
  const { empresa_id, periodos } = req.query;
  const lista = periodos ? periodos.split(",") : [];
  if (!lista.length) return res.json([]);
  try {
    const placeholders = lista.map(() => "?").join(",");
    const [compras] = await pool.query(`
      SELECT periodo_fiscal,
        COUNT(*) AS facturas,
        SUM(monto_facturado) AS monto,
        SUM(itbis_facturado) AS itbis,
        SUM(retencion_renta) AS ret_renta
      FROM compra
      WHERE empresa_id = ? AND periodo_fiscal IN (${placeholders}) AND estado = 'A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, ...lista]);

    const [ventas] = await pool.query(`
      SELECT periodo_fiscal,
        COUNT(*) AS facturas,
        SUM(monto_facturado) AS monto,
        SUM(itbis_facturado) AS itbis
      FROM venta
      WHERE empresa_id = ? AND periodo_fiscal IN (${placeholders}) AND estado = 'A'
      GROUP BY periodo_fiscal ORDER BY periodo_fiscal
    `, [empresa_id, ...lista]);

    res.json({ compras, ventas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reportes/itbis-retenido?empresa_id=1&periodo=202501
app.get("/api/reportes/itbis-retenido", authMiddleware, async (req, res) => {
  const { empresa_id, periodo } = req.query;
  try {
    const [compras] = await pool.query(`
      SELECT
        SUM(itbis_retenido_terceros) AS itbis_ret_compras,
        SUM(itbis_percibido) AS itbis_percibido_compras,
        SUM(retencion_renta) AS ret_renta_compras,
        SUM(isr_percibido) AS isr_percibido_compras
      FROM compra WHERE empresa_id = ? AND periodo_fiscal = ? AND estado = 'A'
    `, [empresa_id, periodo]);

    const [ventas] = await pool.query(`
      SELECT
        SUM(itbis_retenido) AS itbis_ret_ventas,
        SUM(itbis_percibido) AS itbis_percibido_ventas,
        SUM(retencion_renta) AS ret_renta_ventas,
        SUM(isr_percibido) AS isr_percibido_ventas
      FROM venta WHERE empresa_id = ? AND periodo_fiscal = ? AND estado = 'A'
    `, [empresa_id, periodo]);

    res.json({ compras: compras[0], ventas: ventas[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── INICIAR SERVIDOR ──────────────────────────────────────────
const PORT = 3001;
await verificarConexion();
app.listen(PORT, () => {
  console.log(`🚀 Servidor DGII v2 corriendo en http://localhost:${PORT}`);
});
