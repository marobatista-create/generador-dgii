// ============================================================
//  BACKEND DGII — servidor Node.js + MySQL
//  Archivo: server.js
// ============================================================

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

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

// ── STATUS ────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  res.json({ ok: true });
});

// ── EMPRESA ──────────────────────────────────────────────────
app.get("/api/empresa", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM empresa WHERE activo = 1 LIMIT 1");
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── COMPRAS (606) ─────────────────────────────────────────────

// GET — listar compras por período
app.get("/api/compras", async (req, res) => {
  const { periodo } = req.query;
  try {
    let query = `
      SELECT c.*, p.rnc_cedula, p.razon_social AS nombre_proveedor
      FROM compra c
      LEFT JOIN proveedor p ON p.id = c.proveedor_id
      WHERE c.estado = 'A'
    `;
    const params = [];
    if (periodo) { query += " AND c.periodo_fiscal = ?"; params.push(periodo); }
    query += " ORDER BY c.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST — guardar compras
app.post("/api/compras", async (req, res) => {
  const compras = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const c of compras) {
      let proveedorId = null;
      if (c.rnc) {
        const [existing] = await conn.query("SELECT id FROM proveedor WHERE rnc_cedula = ? LIMIT 1", [c.rnc]);
        if (existing.length > 0) {
          proveedorId = existing[0].id;
        } else {
          const [result] = await conn.query(
            "INSERT INTO proveedor (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
            [c.rnc, c.razon_social || c.rnc, c.tipoId || "1"]
          );
          proveedorId = result.insertId;
        }
      }
      const [result] = await conn.query(
        `INSERT INTO compra (
          empresa_id, proveedor_id, ncf, ncf_modificado, tipo_bienes_servicios,
          fecha_comprobante, fecha_pago, monto_facturado, itbis_facturado,
          itbis_retenido_terceros, itbis_percibido, tipo_retencion_isr,
          retencion_renta, isr_percibido, impuesto_selectivo, otros_impuestos,
          propina_legal, forma_pago, periodo_fiscal
        ) VALUES (
          (SELECT id FROM empresa WHERE activo = 1 LIMIT 1),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`,
        [
          proveedorId, c.ncf, c.ncfMod || null, c.tipoBienes,
          c.fechaNcf || null, c.fechaPago || null,
          parseFloat(c.montoFact) || 0, parseFloat(c.itbisFact) || 0,
          parseFloat(c.itbisRetTerceros) || 0, parseFloat(c.itbisPercibido) || 0,
          c.tipoRetIsr || null, parseFloat(c.retRenta) || 0,
          parseFloat(c.isrPercibido) || 0, parseFloat(c.impSelConsumo) || 0,
          parseFloat(c.otrosImp) || 0, parseFloat(c.propina) || 0,
          c.formaPago, c.periodoFiscal,
        ]
      );
      insertados.push(result.insertId);
    }
    await conn.commit();
    res.json({ ok: true, insertados });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// PUT — editar compra
app.put("/api/compras/:id", async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `UPDATE compra SET
        ncf = ?, ncf_modificado = ?, tipo_bienes_servicios = ?,
        fecha_comprobante = ?, fecha_pago = ?,
        monto_facturado = ?, itbis_facturado = ?,
        itbis_retenido_terceros = ?, itbis_percibido = ?,
        tipo_retencion_isr = ?, retencion_renta = ?, isr_percibido = ?,
        impuesto_selectivo = ?, otros_impuestos = ?, propina_legal = ?,
        forma_pago = ?
      WHERE id = ?`,
      [
        c.ncf, c.ncfMod || null, c.tipoBienes,
        c.fechaNcf || null, c.fechaPago || null,
        parseFloat(c.montoFact) || 0, parseFloat(c.itbisFact) || 0,
        parseFloat(c.itbisRetTerceros) || 0, parseFloat(c.itbisPercibido) || 0,
        c.tipoRetIsr || null, parseFloat(c.retRenta) || 0,
        parseFloat(c.isrPercibido) || 0, parseFloat(c.impSelConsumo) || 0,
        parseFloat(c.otrosImp) || 0, parseFloat(c.propina) || 0,
        c.formaPago, req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE — anular compra
app.delete("/api/compras/:id", async (req, res) => {
  try {
    await pool.query("UPDATE compra SET estado = 'V' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── VENTAS (607) ──────────────────────────────────────────────

// GET — listar ventas por período
app.get("/api/ventas", async (req, res) => {
  const { periodo } = req.query;
  try {
    let query = `
      SELECT v.*, c.rnc_cedula, c.razon_social AS nombre_cliente
      FROM venta v
      LEFT JOIN cliente c ON c.id = v.cliente_id
      WHERE v.estado = 'A'
    `;
    const params = [];
    if (periodo) { query += " AND v.periodo_fiscal = ?"; params.push(periodo); }
    query += " ORDER BY v.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST — guardar ventas
app.post("/api/ventas", async (req, res) => {
  const ventas = Array.isArray(req.body) ? req.body : [req.body];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const insertados = [];
    for (const v of ventas) {
      let clienteId = null;
      if (v.rnc && v.tipoId !== "4") {
        const [existing] = await conn.query("SELECT id FROM cliente WHERE rnc_cedula = ? LIMIT 1", [v.rnc]);
        if (existing.length > 0) {
          clienteId = existing[0].id;
        } else {
          const [result] = await conn.query(
            "INSERT INTO cliente (rnc_cedula, razon_social, tipo_id) VALUES (?, ?, ?)",
            [v.rnc, v.razon_social || v.rnc, v.tipoId || "1"]
          );
          clienteId = result.insertId;
        }
      }
      const [result] = await conn.query(
        `INSERT INTO venta (
          empresa_id, cliente_id, ncf, ncf_modificado, tipo_ingreso,
          fecha_comprobante, fecha_retencion_pago, monto_facturado, itbis_facturado,
          itbis_retenido, itbis_percibido, retencion_renta, isr_percibido,
          impuesto_selectivo, otros_impuestos, propina_legal,
          efectivo, cheque_transferencia, tarjeta_debito_credito,
          credito, bonos_certificados, permuta, otras_formas, periodo_fiscal
        ) VALUES (
          (SELECT id FROM empresa WHERE activo = 1 LIMIT 1),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`,
        [
          clienteId, v.ncf, v.ncfMod || null, v.tipoIngreso,
          v.fechaNcf || null, v.fechaRetPago || null,
          parseFloat(v.montoFact) || 0, parseFloat(v.itbisFact) || 0,
          parseFloat(v.itbisRetenido) || 0, parseFloat(v.itbisPercibido) || 0,
          parseFloat(v.retRenta) || 0, parseFloat(v.isrPercibido) || 0,
          parseFloat(v.impSelConsumo) || 0, parseFloat(v.otrosImp) || 0,
          parseFloat(v.propina) || 0, parseFloat(v.efectivo) || 0,
          parseFloat(v.cheque) || 0, parseFloat(v.tarjeta) || 0,
          parseFloat(v.credito) || 0, parseFloat(v.bonos) || 0,
          parseFloat(v.permuta) || 0, parseFloat(v.otras) || 0,
          v.periodoFiscal,
        ]
      );
      insertados.push(result.insertId);
    }
    await conn.commit();
    res.json({ ok: true, insertados });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// PUT — editar venta
app.put("/api/ventas/:id", async (req, res) => {
  const v = req.body;
  try {
    await pool.query(
      `UPDATE venta SET
        ncf = ?, ncf_modificado = ?, tipo_ingreso = ?,
        fecha_comprobante = ?, fecha_retencion_pago = ?,
        monto_facturado = ?, itbis_facturado = ?,
        itbis_retenido = ?, itbis_percibido = ?,
        retencion_renta = ?, isr_percibido = ?,
        impuesto_selectivo = ?, otros_impuestos = ?, propina_legal = ?,
        efectivo = ?, cheque_transferencia = ?, tarjeta_debito_credito = ?,
        credito = ?, bonos_certificados = ?, permuta = ?, otras_formas = ?
      WHERE id = ?`,
      [
        v.ncf, v.ncfMod || null, v.tipoIngreso,
        v.fechaNcf || null, v.fechaRetPago || null,
        parseFloat(v.montoFact) || 0, parseFloat(v.itbisFact) || 0,
        parseFloat(v.itbisRetenido) || 0, parseFloat(v.itbisPercibido) || 0,
        parseFloat(v.retRenta) || 0, parseFloat(v.isrPercibido) || 0,
        parseFloat(v.impSelConsumo) || 0, parseFloat(v.otrosImp) || 0,
        parseFloat(v.propina) || 0, parseFloat(v.efectivo) || 0,
        parseFloat(v.cheque) || 0, parseFloat(v.tarjeta) || 0,
        parseFloat(v.credito) || 0, parseFloat(v.bonos) || 0,
        parseFloat(v.permuta) || 0, parseFloat(v.otras) || 0,
        req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE — anular venta
app.delete("/api/ventas/:id", async (req, res) => {
  try {
    await pool.query("UPDATE venta SET estado = 'V' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── INICIAR SERVIDOR ──────────────────────────────────────────
const PORT = 3001;
await verificarConexion();
app.listen(PORT, () => {
  console.log(`🚀 Servidor DGII corriendo en http://localhost:${PORT}`);
});
