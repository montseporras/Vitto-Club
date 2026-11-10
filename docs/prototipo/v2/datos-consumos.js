(function () {
  if (window.VCStore) return;
  const H = 3600000, now = Date.now();
  const at = (d, m, hh, mm) => new Date(2026, m - 1, d, hh, mm).getTime();
  const A = 'Ana Pereyra', J = 'Jorge Molina', V = 'Valeria Vitto';
  const T = { AC: 'Acreditación por consumo', RE: 'Reversión por anulación', CA: 'Canje', AJ: 'Ajuste manual', VE: 'Vencimiento' };
  const clientes = [
    { id: 1, nombre: 'Carolina Fernández', dni: '38.456.123', email: 'carolina.fernandez@gmail.com', tel: '351 555-1234', alta: '12/08/2026', venc: [{ pts: 200, f: '30/11/2026' }] },
    { id: 2, nombre: 'Martín Gómez', dni: '41.987.654', email: 'martin.gomez@hotmail.com', tel: '351 555-9876', alta: '03/09/2026' },
    { id: 3, nombre: 'Sofía Ríos', dni: '35.222.880', email: 'sofia.rios@gmail.com', tel: '3543 44-1122', alta: '20/09/2026' }
  ];
  const EQ = '$1.000 = 10 pts';
  const raw = [
    [124, at(21, 9, 11, 5), 1, 90000, A], [125, at(23, 9, 13, 40), 3, 40000, J], [126, at(25, 9, 20, 15), 1, 57000, V],
    [127, at(27, 9, 12, 30), 3, 8500, A], [128, at(29, 9, 21, 5), 1, 31200, J], [129, at(1, 10, 10, 50), 2, 25000, A],
    [130, at(3, 10, 12, 10), 1, 150000, A], [131, at(5, 10, 19, 45), 2, 50000, J], [132, at(6, 10, 13, 20), 1, 22500, V],
    [133, at(8, 10, 14, 0), 2, 64000, J], [134, at(9, 10, 18, 30), 3, 12000, A], [135, at(10, 10, 12, 45), 1, 18700, J],
    [136, at(12, 10, 11, 0), 2, 45000, V], [137, at(13, 10, 20, 10), 1, 9800, A], [138, now - 30 * H, 3, 12000, J],
    [139, now - 3 * H, 1, 73000, J], [140, now - (5 * H + 28 * 60000), 3, 30000, A]
  ];
  const consumos = raw.map(([n, ts, cid, monto, por]) => ({ codigo: 'C-' + String(n).padStart(6, '0'), ts, cid, monto, pts: Math.floor(monto / 100), por, eq: EQ, estado: 'Registrado' }));
  const anul = (code, ts, por, motivo) => Object.assign(consumos.find((c) => c.codigo === code), { estado: 'Anulado', anulTs: ts, anulPor: por, motivo });
  anul('C-000130', at(3, 10, 12, 25), A, 'Monto mal cargado: el consumo era de $15.000 y se registraron $150.000.');
  anul('C-000131', at(13, 10, 10, 5), V, 'Consumo registrado al cliente equivocado.');
  anul('C-000127', at(27, 9, 12, 50), A, 'Consumo duplicado.');
  let mid = 1; const movs = [];
  const add = (cid, ts, tipo, detalle, pts, por) => { const m = { id: mid++, cid, ts, tipo, detalle, pts, por }; movs.push(m); return m; };
  consumos.forEach((c) => { add(c.cid, c.ts, T.AC, 'Consumo ' + c.codigo, c.pts, c.por); if (c.estado === 'Anulado') add(c.cid, c.anulTs, T.RE, 'Anulación de ' + c.codigo, -c.pts, c.anulPor); });
  add(1, at(1, 10, 0, 5), T.VE, 'Vencimiento de lote del 16/08/2026', -157, 'Sistema');
  add(1, at(4, 10, 21, 0), T.CA, 'Canje: Cena para dos', -1200, A);
  add(1, at(7, 10, 13, 30), T.CA, 'Canje: Café con medialunas', -425, J);
  add(2, at(6, 10, 20, 30), T.CA, 'Canje: Tabla de picadas', -600, J);
  add(2, at(9, 10, 21, 15), T.CA, 'Canje: Brunch para dos', -640, A);
  add(2, at(12, 10, 20, 0), T.CA, 'Canje: Postre del día y café', -450, V);
  add(3, at(11, 10, 13, 0), T.CA, 'Canje: Almuerzo ejecutivo', -520, J);
  add(3, now - 20 * H, T.CA, 'Canje: Café con medialunas', -120, A);
  add(3, now - 1 * H, T.CA, 'Canje: Postre del día', -300, A);
  const defSaldo = (c) => Object.defineProperty(c, 'saldo', { get: () => (c.base || 0) + movs.filter((m) => m.cid === c.id).reduce((a, m) => a + m.pts, 0), enumerable: true });
  clientes.forEach((c) => { c.tipo = c.tipo || 'DNI'; defSaldo(c); });
  const subs = new Set();
  const S = {
    T, clientes, consumos, movs, nextCode: 142,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    emit() { subs.forEach((f) => { try { f(); } catch (e) {} }); },
    cliente(id) { return clientes.find((c) => c.id === id); },
    porDoc(tipo, d) { const x = String(d || '').replace(/\D/g, ''); return x ? clientes.find((c) => (c.tipo || 'DNI') === tipo && c.dni.replace(/\D/g, '') === x) : undefined; },
    agregar(o) { const c = { id: 100 + clientes.length + 1, nombre: o.nombre, tipo: o.tipo || 'DNI', dni: o.dni, email: o.email || '', tel: o.tel || '', alta: o.alta || '', base: Number(o.base) || 0, histBase: Number(o.histBase) || 0 }; c.yaConsumio = c.base > 0 || c.histBase > 0; defSaldo(c); clientes.push(c); S.emit(); return c; },
    historicos(id) { const c = S.cliente(id); if (!c) return 0; return (c.histBase || 0) + movs.filter((m) => m.cid === id && (m.tipo === T.AC || m.tipo === T.RE)).reduce((a, m) => a + m.pts, 0); },
    porDni(d) { const x = String(d || '').replace(/\D/g, ''); return x ? clientes.find((c) => c.dni.replace(/\D/g, '') === x) : undefined; },
    movsConSaldo() {
      const run = {};
      return movs.slice().sort((a, b) => a.ts - b.ts || a.id - b.id).map((m) => { run[m.cid] = (run[m.cid] || 0) + m.pts; return { ...m, saldo: run[m.cid] }; });
    },
    primeraCompra(cid) { const c = S.cliente(cid); if (c && c.yaConsumio) return false; return !consumos.some((k) => k.cid === cid && k.estado === 'Registrado'); },
    registrar({ cid, monto, pts, por, eq, obs, bono }) {
      const codigo = 'C-' + String(S.nextCode++).padStart(6, '0');
      const c = S.cliente(cid); const antes = c.saldo; const ts = Date.now();
      const cons = { codigo, ts, cid, monto, pts, por, eq, estado: 'Registrado', obs: obs || '', bono: bono || 0 };
      consumos.push(cons); add(cid, ts, T.AC, 'Consumo ' + codigo, pts, por); S.emit(); return { ...cons, antes, despues: c.saldo };
    },
    anular(codigo, por, motivo) {
      const k = consumos.find((c) => c.codigo === codigo); if (!k || k.estado !== 'Registrado') return null;
      const ts = Date.now(); Object.assign(k, { estado: 'Anulado', anulTs: ts, anulPor: por, motivo });
      add(k.cid, ts, T.RE, 'Anulación de ' + k.codigo, -k.pts, por); S.emit(); return k;
    },
    ajustar(cid, pts, motivo, por) { const m = add(cid, Date.now(), T.AJ, 'Ajuste: ' + motivo, pts, por); S.emit(); return m; }
  };
  window.VCStore = S;
})();
