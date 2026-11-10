/* Vitto Club · Sprint 4 — datos de prototipo para Recompensas y Canjes (US-34 a US-45).
   Reglas (decisiones de la PO, 25/10/2026):
   - El canje nace Confirmado y NO descuenta nada. Dura 15 minutos.
   - Puntos y stock se descuentan cuando el Cajero/Administrador registra el uso.
   - Cancelar, rechazar y vencer no reintegran nada.
   - Al confirmar, la pantalla solo valida con el saldo que ya tiene (saldo >= puntos y no negativo).
   - Stock y vencimiento de la recompensa son opcionales (null = sin límite / no vence).
   - Desactivar o eliminar una recompensa rechaza sus canjes Confirmados (Sistema). */
(function () {
  if (window.VCCanjes) return;
  const MIN = 60000, DIA = 864e5, PLAZO = 15 * MIN;
  const T0 = Date.now();
  const z = (x) => String(x).padStart(2, '0');
  const iso = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const dmy = (isoS) => isoS ? isoS.slice(8, 10) + '/' + isoS.slice(5, 7) + '/' + isoS.slice(0, 4) : '';
  const enDias = (n) => iso(T0 + n * DIA);
  const at = (d, m, hh, mm) => new Date(2026, m - 1, d, hh, mm).getTime();
  const num = (n) => { const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-' : '') + s; };
  const dig = (x) => String(x || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const subs = new Set();
  const VC = () => window.VCStore;
  const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // ---------- Recompensas ----------
  let rid = 1;
  const R = (o) => Object.assign({ id: rid++, descripcion: '', foto: null, motivo: '', usadas: 0, modTs: T0 - rid * 3600000 }, o);
  const recompensas = [
    R({ nombre: 'Café + medialuna', descripcion: 'Café chico con una medialuna de manteca.', puntos: 150, stock: 20, vence: enDias(36), estado: 'Activa', usadas: 140 }),
    R({ nombre: 'Merienda gratis', descripcion: 'Infusión a elección con dos porciones de torta.', puntos: 400, stock: null, vence: null, estado: 'Activa', usadas: 58 }),
    R({ nombre: 'Pizza libre viernes', descripcion: 'Una entrada a la pizza libre del viernes.', puntos: 900, stock: 0, vence: enDias(67), estado: 'Deshabilitada', motivo: 'Agotada', usadas: 5 }),
    R({ nombre: 'Torta del día', descripcion: 'Porción de la torta del día.', puntos: 250, stock: 8, vence: enDias(-5), estado: 'Deshabilitada', motivo: 'Vencida', usadas: 22 }),
    R({ nombre: 'Licuado de estación', descripcion: 'Licuado de frutas de estación.', puntos: 200, stock: 15, vence: null, estado: 'Inactiva', usadas: 9 }),
    R({ nombre: 'Medialunas x3', descripcion: 'Tres medialunas de manteca para llevar.', puntos: 100, stock: 30, vence: enDias(3), estado: 'Activa', usadas: 31 }),
    R({ nombre: 'Brunch para dos', descripcion: 'Brunch completo para dos personas.', puntos: 1000, stock: 4, vence: null, estado: 'Dada de baja', usadas: 12 })
  ];

  // ---------- Clientes (cuentas que no están en VCStore, por ejemplo el cliente logueado) ----------
  const externos = {};
  const clave = (tipo, n) => (tipo || 'DNI') + '|' + dig(n);
  externos[clave('DNI', '30111222')] = { tipo: 'DNI', num: '30111222', nombre: 'Marcos Peralta', saldo: 480 };

  // ---------- Canjes ----------
  let cid = 1;
  const C = (o) => Object.assign({ id: cid++, venceTs: o.creadoTs + PLAZO, resueltoTs: null, resueltoPor: '', motivo: '', confirmadoPor: 'Cliente (app)', saldoAntes: null, saldoDespues: null }, o);
  const rec = (n) => recompensas.find((r) => r.nombre === n);
  const cli = (nombre, num) => ({ nombre, tipo: 'DNI', num });
  const canjes = [
    C({ codigo: 'Q9FW3T', ...cli('Marcos Peralta', '30111222'), rid: rec('Café + medialuna').id, recompensa: 'Café + medialuna', puntos: 150, estado: 'Confirmado', creadoTs: T0 - 2 * MIN }),
    C({ codigo: 'K7MP2X', ...cli('Carolina Fernández', '38456123'), rid: rec('Café + medialuna').id, recompensa: 'Café + medialuna', puntos: 150, estado: 'Confirmado', creadoTs: T0 - 4 * MIN }),
    C({ codigo: 'R4TQ8W', ...cli('Sofía Ríos', '35222880'), rid: rec('Merienda gratis').id, recompensa: 'Merienda gratis', puntos: 400, estado: 'Confirmado', creadoTs: T0 - 12 * MIN, confirmadoPor: 'Ana Pereyra' }),
    C({ codigo: 'D5HN8K', ...cli('Marcos Peralta', '30111222'), rid: rec('Medialunas x3').id, recompensa: 'Medialunas x3', puntos: 100, estado: 'Utilizado', creadoTs: at(19, 10, 9, 2), resueltoTs: at(19, 10, 9, 10), resueltoPor: 'Lucía Fernández', saldoAntes: 580, saldoDespues: 480 }),
    C({ codigo: 'M8BN3V', ...cli('Carolina Fernández', '38456123'), rid: rec('Torta del día').id, recompensa: 'Torta del día', puntos: 250, estado: 'Vencido', creadoTs: at(18, 10, 17, 5), resueltoTs: at(18, 10, 17, 20), resueltoPor: 'Sistema' }),
    C({ codigo: 'P6XK4R', ...cli('Sofía Ríos', '35222880'), rid: rec('Pizza libre viernes').id, recompensa: 'Pizza libre viernes', puntos: 900, estado: 'Rechazado', creadoTs: at(22, 10, 20, 50), resueltoTs: at(22, 10, 20, 58), resueltoPor: 'Ana Pereyra', motivo: 'Sin insumo' }),
    C({ codigo: 'W3JF7L', ...cli('Carolina Fernández', '38456123'), rid: rec('Merienda gratis').id, recompensa: 'Merienda gratis', puntos: 400, estado: 'Cancelado', creadoTs: at(20, 10, 16, 0), resueltoTs: at(20, 10, 16, 6), resueltoPor: 'Cliente' }),
    C({ codigo: 'B7TC2M', ...cli('Marcos Peralta', '30111222'), rid: rec('Licuado de estación').id, recompensa: 'Licuado de estación', puntos: 200, estado: 'Rechazado', creadoTs: at(12, 10, 11, 40), resueltoTs: at(14, 10, 0, 0), resueltoPor: 'Sistema', motivo: 'Recompensa desactivada' })
  ];

  // ---------- Auditoría (misma forma que usa Auditoria.dc.html) ----------
  const audit = [];
  const aud = (o) => { audit.push(Object.assign({ cliente: null, codigo: '', filas: [] }, o)); };
  const cliAud = (c) => ({ nombre: c.nombre, tipo: c.tipo || 'DNI', num: dig(c.num) });
  const stockTxt = (s) => (s === null || s === undefined || s === '') ? 'Sin límite' : num(s);
  const venceTxt = (v) => v ? dmy(v) : 'No vence';
  aud({ ts: at(10, 10, 12, 30), usuario: 'Valeria Vitto', modulo: 'Recompensas', accion: 'Eliminó recompensa', texto: 'Eliminó la recompensa "Brunch para dos"', filas: [['Estado', 'Activa → Dada de baja']] });
  aud({ ts: at(14, 10, 0, 0), usuario: 'Valeria Vitto', modulo: 'Recompensas', accion: 'Desactivó recompensa', texto: 'Desactivó la recompensa "Licuado de estación"', filas: [['Estado', 'Activa → Inactiva'], ['Canjes rechazados', '1']] });
  aud({ ts: at(14, 10, 0, 0) + 1, usuario: 'Sistema', modulo: 'Canjes', accion: 'Rechazó canje', texto: 'Rechazó el canje de Marcos Peralta', cliente: cliAud(cli('Marcos Peralta', '30111222')), codigo: 'B7TC2M', filas: [['Código del canje', 'B7TC2M'], ['Recompensa', 'Licuado de estación'], ['Motivo', 'Recompensa desactivada']] });
  aud({ ts: at(18, 10, 17, 20), usuario: 'Sistema', modulo: 'Canjes', accion: 'Venció canje', texto: 'Venció el canje de Carolina Fernández', cliente: cliAud(cli('Carolina Fernández', '38456123')), codigo: 'M8BN3V', filas: [['Código del canje', 'M8BN3V'], ['Recompensa', 'Torta del día']] });
  aud({ ts: at(19, 10, 9, 10), usuario: 'Lucía Fernández', modulo: 'Canjes', accion: 'Registró uso de canje', texto: 'Registró el uso del canje de Marcos Peralta', cliente: cliAud(cli('Marcos Peralta', '30111222')), codigo: 'D5HN8K', filas: [['Código del canje', 'D5HN8K'], ['Recompensa', 'Medialunas x3'], ['Puntos descontados', '−100 pts'], ['Saldo resultante', '480 pts']] });
  aud({ ts: T0 - 5 * DIA, usuario: 'Sistema', modulo: 'Recompensas', accion: 'Deshabilitó recompensa', texto: 'Deshabilitó la recompensa "Torta del día"', filas: [['Motivo', 'Vencida']] });
  aud({ ts: at(22, 10, 20, 58), usuario: 'Ana Pereyra', modulo: 'Canjes', accion: 'Rechazó canje', texto: 'Rechazó el canje de Sofía Ríos', cliente: cliAud(cli('Sofía Ríos', '35222880')), codigo: 'P6XK4R', filas: [['Código del canje', 'P6XK4R'], ['Recompensa', 'Pizza libre viernes'], ['Motivo', 'Sin insumo']] });
  aud({ ts: at(23, 10, 21, 10), usuario: 'Sistema', modulo: 'Recompensas', accion: 'Deshabilitó recompensa', texto: 'Deshabilitó la recompensa "Pizza libre viernes"', filas: [['Motivo', 'Sin stock']] });
  aud({ ts: T0 - 12 * MIN, usuario: 'Ana Pereyra', modulo: 'Canjes', accion: 'Confirmó canje', texto: 'Confirmó el canje de Sofía Ríos', cliente: cliAud(cli('Sofía Ríos', '35222880')), codigo: 'R4TQ8W', filas: [['Código del canje', 'R4TQ8W'], ['Recompensa', 'Merienda gratis'], ['Puntos', '400 pts']] });
  aud({ ts: at(15, 10, 18, 45), usuario: 'Valeria Vitto', modulo: 'Recompensas', accion: 'Editó recompensa', texto: 'Editó la recompensa "Café + medialuna"', filas: [['Stock', '0 → 20']] });
  aud({ ts: at(15, 10, 18, 45) + 1, usuario: 'Sistema', modulo: 'Recompensas', accion: 'Habilitó recompensa', texto: 'Habilitó la recompensa "Café + medialuna"', filas: [['Motivo', 'Stock repuesto']] });
  aud({ ts: at(5, 10, 10, 0), usuario: 'Valeria Vitto', modulo: 'Recompensas', accion: 'Creó recompensa', texto: 'Creó la recompensa "Medialunas x3"', filas: [['Puntos', '100'], ['Stock', '30'], ['Vencimiento', dmy(enDias(3))]] });

  // ---------- Canjes ya utilizados que figuran en los movimientos de puntos (consumos-store) ----------
  (function importarHistoricos() {
    const S = VC(); if (!S) return;
    const conSaldo = S.movsConSaldo();
    S.movs.filter((m) => m.tipo === S.T.CA && !m.codigoCanje).forEach((m) => {
      const cl = S.cliente(m.cid); if (!cl) return;
      const cod = (dig(cl.dni) === '35222880' && /Café con medialunas/.test(m.detalle) && !canjes.some((c) => c.codigo === 'H2ZD9C')) ? 'H2ZD9C' : nuevoCodigo(); const ms = conSaldo.find((x) => x.id === m.id); const desp = ms ? ms.saldo : null; const pts = -m.pts;
      const nombreR = String(m.detalle || '').replace(/^Canje:\s*/, ''); const r = rec(nombreR);
      canjes.push(C({ codigo: cod, nombre: cl.nombre, tipo: cl.tipo || 'DNI', num: dig(cl.dni), rid: r ? r.id : null, recompensa: nombreR, puntos: pts, estado: 'Utilizado', creadoTs: m.ts - 6 * MIN, resueltoTs: m.ts, resueltoPor: m.por, saldoAntes: desp === null ? null : desp + pts, saldoDespues: desp }));
      m.codigoCanje = cod;
      aud({ ts: m.ts, usuario: m.por, modulo: 'Canjes', accion: 'Registró uso de canje', texto: 'Registró el uso del canje de ' + cl.nombre, cliente: cliAud({ nombre: cl.nombre, tipo: cl.tipo, num: cl.dni }), codigo: cod, filas: [['Código del canje', cod], ['Recompensa', nombreR], ['Puntos descontados', '−' + num(pts) + ' pts'], ['Saldo resultante', desp === null ? '—' : num(desp) + ' pts']] });
    });
  })();

  // ---------- Utilidades ----------
  const hoy = () => iso(Date.now());
  const vencida = (r) => !!r.vence && r.vence < hoy();
  const sinStock = (r) => r.stock !== null && r.stock !== undefined && r.stock <= 0;
  const disponible = (r) => !sinStock(r) && !vencida(r);
  const diasHasta = (isoS) => { if (!isoS) return null; const a = new Date(isoS + 'T00:00:00').getTime(); const b = new Date(hoy() + 'T00:00:00').getTime(); return Math.round((a - b) / DIA); };
  const vigente = (c) => c.estado === 'Confirmado' && c.venceTs > Date.now();
  const confirmadosDe = (r) => canjes.filter((c) => c.rid === r.id && vigente(c)).length;
  const storeCli = (tipo, n) => { const s = VC(); return s ? s.porDoc(tipo || 'DNI', n) : null; };
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { /* */ } });

  function reevaluar(r, por) {
    if (r.estado === 'Activa' && !disponible(r)) {
      r.estado = 'Deshabilitada'; r.motivo = vencida(r) ? 'Vencida' : 'Agotada';
      aud({ ts: Date.now(), usuario: 'Sistema', modulo: 'Recompensas', accion: 'Deshabilitó recompensa', texto: 'Deshabilitó la recompensa "' + r.nombre + '"', filas: [['Motivo', r.motivo === 'Vencida' ? 'Vencida' : 'Sin stock']] });
      return 'deshabilitada';
    }
    if (r.estado === 'Deshabilitada' && disponible(r)) {
      const antes = r.motivo; r.estado = 'Activa'; r.motivo = '';
      aud({ ts: Date.now() + 1, usuario: 'Sistema', modulo: 'Recompensas', accion: 'Habilitó recompensa', texto: 'Habilitó la recompensa "' + r.nombre + '"', filas: [['Motivo', antes === 'Vencida' ? 'Fecha de vencimiento actualizada' : 'Stock repuesto']] });
      return 'habilitada';
    }
    if (r.estado === 'Deshabilitada') r.motivo = vencida(r) ? 'Vencida' : 'Agotada';
    return '';
  }

  function vencerCanjes() {
    let n = 0; const ahora = Date.now();
    canjes.forEach((c) => {
      if (c.estado === 'Confirmado' && c.venceTs <= ahora) {
        c.estado = 'Vencido'; c.resueltoTs = c.venceTs; c.resueltoPor = 'Sistema'; n++;
        aud({ ts: c.venceTs, usuario: 'Sistema', modulo: 'Canjes', accion: 'Venció canje', texto: 'Venció el canje de ' + c.nombre, cliente: cliAud(c), codigo: c.codigo, filas: [['Código del canje', c.codigo], ['Recompensa', c.recompensa]] });
      }
    });
    return n;
  }

  function rechazarConfirmadosDe(r, motivo) {
    let n = 0;
    canjes.forEach((c) => {
      if (c.rid === r.id && vigente(c)) {
        c.estado = 'Rechazado'; c.resueltoTs = Date.now(); c.resueltoPor = 'Sistema'; c.motivo = motivo; n++;
        aud({ ts: Date.now() + 2, usuario: 'Sistema', modulo: 'Canjes', accion: 'Rechazó canje', texto: 'Rechazó el canje de ' + c.nombre, cliente: cliAud(c), codigo: c.codigo, filas: [['Código del canje', c.codigo], ['Recompensa', c.recompensa], ['Motivo', motivo]] });
      }
    });
    return n;
  }

  function nuevoCodigo() {
    for (;;) {
      let s = ''; for (let i = 0; i < 6; i++) s += ALF[Math.floor(Math.random() * ALF.length)];
      if (!canjes.some((c) => c.codigo === s)) return s;
    }
  }

  const API = {
    PLAZO_MIN: 15,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    emit,
    num, dmy, iso, dig,
    hoy,
    audit,
    // ----- recompensas -----
    recompensas(incluirBaja) { return recompensas.filter((r) => incluirBaja || r.estado !== 'Dada de baja'); },
    recompensa(id) { return recompensas.find((r) => r.id === id); },
    disponible, vencida, sinStock, diasHasta, confirmadosDe,
    nombreUsado(nombre, exceptoId) { const n = String(nombre || '').trim().toLowerCase(); return recompensas.some((r) => r.id !== exceptoId && r.estado !== 'Dada de baja' && r.nombre.trim().toLowerCase() === n); },
    etiqueta(r) {
      if (r.estado === 'Deshabilitada') return { txt: r.motivo || (vencida(r) ? 'Vencida' : 'Agotada'), cls: 'tag tag-outline', alerta: false };
      if (!r.vence) return { txt: 'No vence', cls: 'tag tag-neutral', alerta: false };
      const d = diasHasta(r.vence);
      if (d === 0) return { txt: 'Vence hoy', cls: 'tag tag-accent', alerta: true };
      return { txt: 'Vence en ' + d + ' d', cls: d <= 5 ? 'tag tag-accent' : 'tag tag-neutral', alerta: d <= 5 };
    },
    usadas(r) { return r.usadas; },
    crear(d, por) {
      const r = R({ nombre: d.nombre.trim(), descripcion: (d.descripcion || '').trim(), puntos: d.puntos, stock: d.stock, vence: d.vence || null, foto: d.foto || null, estado: 'Activa', usadas: 0, modTs: Date.now() });
      recompensas.push(r);
      aud({ ts: Date.now(), usuario: por, modulo: 'Recompensas', accion: 'Creó recompensa', texto: 'Creó la recompensa "' + r.nombre + '"', filas: [['Puntos', num(r.puntos)], ['Stock', stockTxt(r.stock)], ['Vencimiento', venceTxt(r.vence)]] });
      const ev = reevaluar(r); emit(); return { r, ev };
    },
    editar(id, d, por) {
      const r = API.recompensa(id); if (!r) return null;
      const filas = [];
      const cmp = (k, label, fmt) => { if (String(r[k] ?? '') !== String(d[k] ?? '')) filas.push([label, fmt(r[k]) + ' → ' + fmt(d[k])]); };
      cmp('nombre', 'Nombre', (x) => x || '—'); cmp('descripcion', 'Descripción', (x) => x || '—'); cmp('puntos', 'Puntos', (x) => num(x));
      cmp('stock', 'Stock', stockTxt); cmp('vence', 'Vencimiento', venceTxt);
      if ((r.foto || '') !== (d.foto || '')) filas.push(['Foto', d.foto ? 'Actualizada' : 'Quitada']);
      Object.assign(r, { nombre: d.nombre.trim(), descripcion: (d.descripcion || '').trim(), puntos: d.puntos, stock: d.stock, vence: d.vence || null, foto: d.foto || null, modTs: Date.now() });
      if (filas.length) aud({ ts: Date.now(), usuario: por, modulo: 'Recompensas', accion: 'Editó recompensa', texto: 'Editó la recompensa "' + r.nombre + '"', filas });
      const ev = reevaluar(r); emit(); return { r, ev, cambios: filas.length };
    },
    activar(id, por) {
      const r = API.recompensa(id); if (!r || r.estado !== 'Inactiva') return null;
      if (disponible(r)) { r.estado = 'Activa'; r.motivo = ''; } else { r.estado = 'Deshabilitada'; r.motivo = vencida(r) ? 'Vencida' : 'Agotada'; }
      r.modTs = Date.now();
      aud({ ts: Date.now(), usuario: por, modulo: 'Recompensas', accion: 'Activó recompensa', texto: 'Activó la recompensa "' + r.nombre + '"', filas: [['Estado', 'Inactiva → ' + r.estado]] });
      emit(); return { r, disponible: r.estado === 'Activa' };
    },
    desactivar(id, por) {
      const r = API.recompensa(id); if (!r || (r.estado !== 'Activa' && r.estado !== 'Deshabilitada')) return null;
      const antes = r.estado; r.estado = 'Inactiva'; r.motivo = ''; r.modTs = Date.now();
      const n = rechazarConfirmadosDe(r, 'Recompensa desactivada');
      aud({ ts: Date.now(), usuario: por, modulo: 'Recompensas', accion: 'Desactivó recompensa', texto: 'Desactivó la recompensa "' + r.nombre + '"', filas: [['Estado', antes + ' → Inactiva']].concat(n ? [['Canjes rechazados', String(n)]] : []) });
      emit(); return { r, rechazados: n };
    },
    eliminar(id, por) {
      const r = API.recompensa(id); if (!r || r.estado === 'Dada de baja') return null;
      const antes = r.estado; r.estado = 'Dada de baja'; r.motivo = ''; r.modTs = Date.now();
      const n = rechazarConfirmadosDe(r, 'Recompensa eliminada');
      aud({ ts: Date.now(), usuario: por, modulo: 'Recompensas', accion: 'Eliminó recompensa', texto: 'Eliminó la recompensa "' + r.nombre + '"', filas: [['Estado', antes + ' → Dada de baja']].concat(n ? [['Canjes rechazados', String(n)]] : []) });
      emit(); return { r, rechazados: n };
    },
    // ----- clientes -----
    registrarCliente(o) { const k = clave(o.tipo, o.num); if (!externos[k]) externos[k] = { tipo: o.tipo || 'DNI', num: dig(o.num), nombre: o.nombre, saldo: Number(o.saldo) || 0 }; },
    saldo(tipo, n) { const sc = storeCli(tipo, n); if (sc) return sc.saldo; const e = externos[clave(tipo, n)]; return e ? e.saldo : 0; },
    // ----- canjes -----
    canjes() { if (vencerCanjes()) setTimeout(emit, 0); return canjes; },
    canje(codigo) { API.canjes(); const k = dig(codigo); return canjes.find((c) => c.codigo === k); },
    canjesDe(tipo, n) { API.canjes(); const k = dig(n); return canjes.filter((c) => (c.tipo || 'DNI') === (tipo || 'DNI') && dig(c.num) === k); },
    vigente,
    puedeCanjear(r, saldo) {
      if (!r || r.estado !== 'Activa' || !disponible(r)) return { ok: false, motivo: 'no_disponible' };
      if (saldo < 0) return { ok: false, motivo: 'negativo' };
      if (saldo < r.puntos) return { ok: false, motivo: 'saldo', faltan: r.puntos - saldo };
      return { ok: true };
    },
    confirmar({ rid: id, tipo, num: n, nombre, por }) {
      const r = API.recompensa(id); const saldo = API.saldo(tipo, n);
      const chk = API.puedeCanjear(r, saldo); if (!chk.ok) return { ok: false, error: chk.motivo };
      const c = C({ codigo: nuevoCodigo(), nombre, tipo: tipo || 'DNI', num: dig(n), rid: r.id, recompensa: r.nombre, puntos: r.puntos, estado: 'Confirmado', creadoTs: Date.now(), confirmadoPor: por || 'Cliente (app)' });
      canjes.unshift(c);
      if (por) aud({ ts: Date.now(), usuario: por, modulo: 'Canjes', accion: 'Confirmó canje', texto: 'Confirmó el canje de ' + c.nombre, cliente: cliAud(c), codigo: c.codigo, filas: [['Código del canje', c.codigo], ['Recompensa', c.recompensa], ['Puntos', num(c.puntos) + ' pts']] });
      emit(); return { ok: true, canje: c };
    },
    usar(codigo, por) {
      const c = API.canje(codigo);
      if (!c) return { ok: false, error: 'no_existe' };
      if (c.estado === 'Vencido') { emit(); return { ok: false, error: 'vencido', canje: c }; }
      if (c.estado !== 'Confirmado') return { ok: false, error: 'estado', canje: c };
      const r = API.recompensa(c.rid);
      if (!r || r.estado !== 'Activa' || !disponible(r)) return { ok: false, error: 'no_disponible', canje: c };
      const st = VC(); let sc = storeCli(c.tipo, c.num);
      const ext = externos[clave(c.tipo, c.num)];
      if (!sc && st && ext) sc = st.agregar({ nombre: ext.nombre, tipo: ext.tipo, dni: ext.num, base: ext.saldo });
      const antes = sc ? sc.saldo : (ext ? ext.saldo : 0);
      if (antes < 0 || antes < c.puntos) return { ok: false, error: 'saldo', canje: c, saldo: antes };
      if (sc && st) {
        const mid = st.movs.reduce((a, m) => Math.max(a, m.id), 0) + 1;
        st.movs.push({ id: mid, cid: sc.id, ts: Date.now(), tipo: st.T.CA, detalle: 'Canje: ' + c.recompensa, pts: -c.puntos, por, codigoCanje: c.codigo });
      } else if (ext) ext.saldo -= c.puntos;
      const despues = sc ? sc.saldo : ext.saldo;
      if (r.stock !== null && r.stock !== undefined) r.stock -= 1;
      r.usadas += 1;
      Object.assign(c, { estado: 'Utilizado', resueltoTs: Date.now(), resueltoPor: por, saldoAntes: antes, saldoDespues: despues });
      aud({ ts: Date.now(), usuario: por, modulo: 'Canjes', accion: 'Registró uso de canje', texto: 'Registró el uso del canje de ' + c.nombre, cliente: cliAud(c), codigo: c.codigo, filas: [['Código del canje', c.codigo], ['Recompensa', c.recompensa], ['Puntos descontados', '−' + num(c.puntos) + ' pts'], ['Saldo resultante', num(despues) + ' pts']] });
      reevaluar(r);
      emit(); if (st) st.emit();
      return { ok: true, canje: c, antes, despues };
    },
    rechazar(codigo, motivo, por) {
      const c = API.canje(codigo);
      if (!c) return { ok: false, error: 'no_existe' };
      if (c.estado !== 'Confirmado') return { ok: false, error: c.estado === 'Vencido' ? 'vencido' : 'estado', canje: c };
      Object.assign(c, { estado: 'Rechazado', resueltoTs: Date.now(), resueltoPor: por, motivo });
      aud({ ts: Date.now(), usuario: por, modulo: 'Canjes', accion: 'Rechazó canje', texto: 'Rechazó el canje de ' + c.nombre, cliente: cliAud(c), codigo: c.codigo, filas: [['Código del canje', c.codigo], ['Recompensa', c.recompensa], ['Motivo', motivo]] });
      emit(); return { ok: true, canje: c };
    },
    cancelar(codigo) {
      const c = API.canje(codigo);
      if (!c || c.estado !== 'Confirmado') return { ok: false, error: c && c.estado === 'Vencido' ? 'vencido' : 'estado' };
      Object.assign(c, { estado: 'Cancelado', resueltoTs: Date.now(), resueltoPor: 'Cliente' });
      emit(); return { ok: true, canje: c }; // la cancelación del cliente no se audita
    },
    minutosRestantes(c) { return Math.max(0, Math.ceil((c.venceTs - Date.now()) / MIN)); },
    venceTxt(c) { const ms = c.venceTs - Date.now(); if (ms <= 0) return 'Vencido'; if (ms < MIN) return 'Vence en menos de 1 min'; return 'Vence en ' + Math.ceil(ms / MIN) + ' min'; },
    cuentaRegresiva(c) { const ms = Math.max(0, c.venceTs - Date.now()); const s = Math.floor(ms / 1000); return z(Math.floor(s / 60)) + ':' + z(s % 60); },
    badge(estado) { return 'vc-b ' + (estado === 'Utilizado' ? 'vc-b-ok' : estado === 'Confirmado' ? 'vc-b-neu' : 'vc-b-off'); }
  };
  // vencimiento automático (US-44) y recompensas vencidas (US-37)
  setInterval(() => { let ch = vencerCanjes(); recompensas.forEach((r) => { if (reevaluar(r)) ch++; }); if (ch) emit(); }, 5000);
  window.VCCanjes = API;
})();
