/* Vitto Club · Sprint 5 — datos de prototipo para Misiones, Notificaciones, Promociones, Estadísticas,
   fotos y cuentas (US-14, US-15, US-28 a US-34, US-47 a US-55, FOTO-PERFIL, NIV-BEN, CTA-CLI).
   Reglas (contrato del Sprint 5 v1, decisiones S5-1 a S5-33):
   - Misión mensual. Estados del cliente: En progreso, Completada, Reclamada, Vencida.
     Completada es final si la misión no tiene recompensa (S5-4).
   - A fin de mes: En progreso → Vencida; Completada con recompensa → Reclamada (Sistema). Nunca se pierde
     una recompensa ganada (S5-5).
   - Editar objetivo, condición o recompensa con clientes este mes: rige desde el mes siguiente (S5-20).
   - Eliminar: En progreso → Vencida; Completadas con recompensa → Reclamadas (Sistema).
   - Puntos de misión y de cumpleaños: no suman al nivel (S5-9).
   - Promociones y beneficios: solo informativos (S5-16, S5-26). Las promociones se escriben y se envían en el
     momento desde Notificaciones: no se guardan (pedido de Denise, 11/11/2026).
   - Notificaciones por correo; se registran todas; sin auditoría (S5-28). Las que fallaron se pueden reenviar
     a mano con «Reenviar» (pedido de Denise, 11/11/2026; el contrato S5-28 todavía dice sin reintento).
   - Los datos son de demostración: no son fuente de verdad. */
(function () {
  if (window.VCS5) return;
  const DIA = 864e5, T0 = Date.now();
  const z = (x) => String(x).padStart(2, '0');
  const iso = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const dmy = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const fdt = (ts) => { const d = new Date(ts); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
  const num = (n) => { const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-' : '') + s; };
  const dig = (x) => String(x || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const hoy = () => iso(Date.now());
  const subs = new Set();
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { /* */ } });

  // ---------- Meses ----------
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesDe = (ts) => iso(ts).slice(0, 7);
  const M0 = mesDe(T0);
  const sumarMes = (m, k) => { const y = Number(m.slice(0, 4)), mm = Number(m.slice(5, 7)) - 1 + k; const d = new Date(y, mm, 1); return d.getFullYear() + '-' + z(d.getMonth() + 1); };
  const mesTxt = (m) => m ? MESES[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4) : '';
  const mesTxtMin = (m) => m ? MESES[Number(m.slice(5, 7)) - 1].toLowerCase() + ' ' + m.slice(0, 4) : '';
  const finDeMes = (m) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0); return iso(d.getTime()); };
  const mesActual = () => mesDe(Date.now());

  // ---------- Días (contrato: 1 = lunes ... 7 = domingo) ----------
  const DIA_PL = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábados', 7: 'domingos' };
  const DIA_CORTO = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };
  const diaSemana = (ts) => { const g = new Date(ts).getDay(); return g === 0 ? 7 : g; };
  const lista = (xs) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
  const condTxt = (o) => {
    const p = [];
    if (o.dias && o.dias.length) p.push('los ' + lista(o.dias.slice().sort((a, b) => a - b).map((d) => DIA_PL[d])));
    if (o.desde && o.hasta) p.push('de ' + o.desde + ' a ' + o.hasta);
    return p.join(' ');
  };

  // ---------- Misiones (catálogo) ----------
  let mid = 1;
  const Mi = (o) => Object.assign({ id: mid++, descripcion: '', dias: null, desde: '', hasta: '', recompensa: null, fin: null, estado: 'Activa', pendiente: null, modTs: T0 - mid * 3600000 }, o);
  const misiones = [
    Mi({ nombre: 'Vení 3 veces este mes', descripcion: 'Sumá 3 consumos en el mes y ganá 50 puntos.', tipo: 'COUNT', objetivo: 3, recompensa: 50, inicio: sumarMes(M0, -2), fin: null }),
    Mi({ nombre: 'Probá el brunch de domingo', descripcion: 'Vení a desayunar o almorzar un domingo a la mañana.', tipo: 'COUNT', objetivo: 1, dias: [7], desde: '09:00', hasta: '13:00', recompensa: 100, inicio: sumarMes(M0, -1), fin: sumarMes(M0, 1) }),
    Mi({ nombre: 'Sumá $ 20.000', descripcion: 'Sumá $ 20.000 en consumos durante el mes.', tipo: 'AMOUNT', objetivo: 20000, recompensa: null, inicio: M0, fin: M0 }),
    Mi({ nombre: 'Merienda de los jueves', descripcion: 'Vení dos jueves a la tarde a merendar.', tipo: 'COUNT', objetivo: 2, dias: [4], desde: '16:00', hasta: '19:00', recompensa: 80, inicio: sumarMes(M0, -3), fin: sumarMes(M0, -1) }),
    Mi({ nombre: 'Navidad en La Vitto', descripcion: 'Vení dos veces en diciembre y sumá puntos de regalo.', tipo: 'COUNT', objetivo: 2, recompensa: 150, inicio: sumarMes(M0, 1), fin: sumarMes(M0, 1) })
  ];
  const fase = (m) => (m.inicio > mesActual() ? 'Próxima' : (m.fin && m.fin < mesActual()) ? 'Finalizada' : 'En curso');
  const enCurso = (m, mes) => m.estado === 'Activa' && m.inicio <= mes && (!m.fin || m.fin >= mes);
  const objetivoTxt = (o) => o.tipo === 'AMOUNT' ? '$ ' + num(o.objetivo) + ' en consumos' : o.objetivo + (Number(o.objetivo) === 1 ? ' consumo' : ' consumos');
  const recompensaTxt = (o) => o.recompensa ? num(o.recompensa) + ' pts' : 'Sin recompensa';
  const vigenciaTxt = (m) => !m.fin ? 'Desde ' + mesTxtMin(m.inicio) : m.inicio === m.fin ? mesTxt(m.inicio) : mesTxt(m.inicio) + ' – ' + mesTxt(m.fin);
  const snap = (m) => ({ nombre: m.nombre, descripcion: m.descripcion, tipo: m.tipo, objetivo: m.objetivo, dias: m.dias, desde: m.desde, hasta: m.hasta, recompensa: m.recompensa });

  // ---------- Asignaciones (misión de un cliente en un mes) ----------
  let aid = 1;
  const asignaciones = [];
  const cliK = (tipo, n) => (tipo || 'DNI') + '|' + dig(n);
  const nombres = {};
  const A = (tipo, n, nombre, m, periodo, o) => { nombres[cliK(tipo, n)] = nombre; const a = Object.assign({ id: aid++, mid: m.id, k: cliK(tipo, n), nombre, periodo, s: snap(m), progreso: 0, estado: 'En progreso', completadaTs: null, reclamadaTs: null, reclamadaPor: '', vencidaTs: null, motivo: '' }, o); asignaciones.push(a); return a; };
  const mis = (n) => misiones.find((m) => m.nombre === n);
  const M1 = sumarMes(M0, -1), ini = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).getTime();
  // Marcos Peralta (cliente de la vista Cliente)
  A('DNI', '30111222', 'Marcos Peralta', mis('Vení 3 veces este mes'), M0, { progreso: 2 });
  A('DNI', '30111222', 'Marcos Peralta', mis('Probá el brunch de domingo'), M0, { progreso: 1, estado: 'Completada', completadaTs: T0 - 2 * DIA });
  A('DNI', '30111222', 'Marcos Peralta', mis('Sumá $ 20.000'), M0, { progreso: 20000, estado: 'Completada', completadaTs: T0 - DIA });
  A('DNI', '30111222', 'Marcos Peralta', mis('Vení 3 veces este mes'), M1, { progreso: 1, estado: 'Vencida', vencidaTs: ini(M0) + 600000, motivo: 'Fin de mes' });
  A('DNI', '30111222', 'Marcos Peralta', mis('Probá el brunch de domingo'), M1, { progreso: 1, estado: 'Reclamada', completadaTs: ini(M1) + 9 * DIA, reclamadaTs: ini(M1) + 9 * DIA + 3600000, reclamadaPor: 'Cliente' });
  A('DNI', '30111222', 'Marcos Peralta', mis('Merienda de los jueves'), M1, { progreso: 2, estado: 'Reclamada', completadaTs: ini(M1) + 20 * DIA, reclamadaTs: ini(M0) + 600000, reclamadaPor: 'Sistema' });
  // Carolina Fernández
  A('DNI', '38456123', 'Carolina Fernández', mis('Vení 3 veces este mes'), M0, { progreso: 3, estado: 'Reclamada', completadaTs: T0 - 3 * DIA, reclamadaTs: T0 - 3 * DIA + 7200000, reclamadaPor: 'Cliente' });
  A('DNI', '38456123', 'Carolina Fernández', mis('Probá el brunch de domingo'), M0, { progreso: 0 });
  A('DNI', '38456123', 'Carolina Fernández', mis('Sumá $ 20.000'), M0, { progreso: 12000 });
  A('DNI', '38456123', 'Carolina Fernández', mis('Vení 3 veces este mes'), M1, { progreso: 3, estado: 'Reclamada', completadaTs: ini(M1) + 12 * DIA, reclamadaTs: ini(M1) + 12 * DIA + 600000, reclamadaPor: 'Cliente' });
  // Sofía Ríos y Martín Gómez
  A('DNI', '35222880', 'Sofía Ríos', mis('Vení 3 veces este mes'), M0, { progreso: 1 });
  A('DNI', '41987654', 'Martín Gómez', mis('Vení 3 veces este mes'), M0, { progreso: 3, estado: 'Completada', completadaTs: T0 - 5 * DIA });
  A('DNI', '41987654', 'Martín Gómez', mis('Sumá $ 20.000'), M0, { progreso: 20000, estado: 'Completada', completadaTs: T0 - 4 * DIA });

  const ORDEN = { 'En progreso': 0, 'Completada': 1, 'Reclamada': 2, 'Vencida': 3 };
  const progresoTxt = (a) => a.s.tipo === 'AMOUNT' ? '$ ' + num(a.progreso) + ' / $ ' + num(a.s.objetivo) : a.progreso + ' / ' + a.s.objetivo + (Number(a.s.objetivo) === 1 ? ' consumo' : ' consumos');
  const badgeMision = (e) => 'vc-b ' + (e === 'Reclamada' || e === 'Completada' ? 'vc-b-ok' : e === 'En progreso' ? 'vc-b-neu' : 'vc-b-off');

  // Asigna las misiones en curso que el cliente todavía no tiene este mes (S5-19: primer consumo o consulta).
  function asignarMes(tipo, n, nombre) {
    const k = cliK(tipo, n); const mes = mesActual();
    misiones.filter((m) => enCurso(m, mes)).forEach((m) => { if (!asignaciones.some((a) => a.k === k && a.mid === m.id && a.periodo === mes)) A(tipo, n, nombre || nombres[k] || '', m, mes, {}); });
  }

  // ---------- Auditoría (misma forma que Auditoria.dc.html) ----------
  const audit = [];
  const aud = (o) => { audit.push(Object.assign({ cliente: null, codigo: '', filas: [] }, o)); };
  const cliAud = (a) => { const [tipo, n] = a.k.split('|'); return { nombre: a.nombre, tipo, num: n }; };
  aud({ ts: ini(M0) - 5 * DIA, usuario: 'Valeria Vitto', modulo: 'Misiones', accion: 'Creó misión', texto: 'Creó la misión "Sumá $ 20.000"', filas: [['Objetivo', '$ 20.000 en consumos'], ['Condición', 'Todos los días'], ['Recompensa', 'Sin recompensa'], ['Vigencia', mesTxt(M0)]] });
  aud({ ts: ini(M0) + 600000, usuario: 'Sistema', modulo: 'Misiones', accion: 'Reclamó recompensa de misión', texto: 'Reclamó la recompensa de la misión "Merienda de los jueves" de Marcos Peralta', cliente: { nombre: 'Marcos Peralta', tipo: 'DNI', num: '30111222' }, filas: [['Misión', 'Merienda de los jueves'], ['Puntos otorgados', '80'], ['Saldo resultante', '480 pts'], ['Reclamada por', 'Automático']] });
  aud({ ts: ini(M0) + 600001, usuario: 'Sistema', modulo: 'Misiones', accion: 'Venció misiones del mes', texto: 'Venció las misiones del mes', filas: [['Período', mesTxt(M1)], ['Misiones vencidas', '34'], ['Recompensas reclamadas automáticamente', '6']] });
  aud({ ts: T0 - 2 * DIA, usuario: 'Sistema', modulo: 'Misiones', accion: 'Completó misión', texto: 'Completó la misión "Probá el brunch de domingo" de Marcos Peralta', cliente: { nombre: 'Marcos Peralta', tipo: 'DNI', num: '30111222' }, filas: [['Misión', 'Probá el brunch de domingo'], ['Objetivo', '1 consumo, los domingos de 09:00 a 13:00'], ['Período', mesTxt(M0)]] });
  aud({ ts: T0 - 3 * DIA + 7200000, usuario: 'Sistema', modulo: 'Misiones', accion: 'Reclamó recompensa de misión', texto: 'Reclamó la recompensa de la misión "Vení 3 veces este mes" de Carolina Fernández', cliente: { nombre: 'Carolina Fernández', tipo: 'DNI', num: '38456123' }, filas: [['Misión', 'Vení 3 veces este mes'], ['Puntos otorgados', '50'], ['Saldo resultante', '1.240 pts'], ['Reclamada por', 'Cliente']] });
  aud({ ts: T0 - 6 * DIA, usuario: 'Sistema', modulo: 'Puntos', accion: 'Regaló puntos de cumpleaños', texto: 'Regaló puntos de cumpleaños a Sofía Ríos', cliente: { nombre: 'Sofía Ríos', tipo: 'DNI', num: '35222880' }, filas: [['Puntos otorgados', '100'], ['Saldo resultante', '100 pts']] });
  aud({ ts: T0 - 8 * DIA, usuario: 'Denise Nagel', modulo: 'Configuración', accion: 'Modificó logo y mensajes', texto: 'Modificó el logo y los mensajes automáticos', filas: [['Puntos de cumpleaños', '50 → 100'], ['Mensaje de cumpleaños', 'Modificado']] });
  aud({ ts: T0 - 10 * DIA, usuario: 'Valeria Vitto', modulo: 'Configuración', accion: 'Modificó cliente frecuente', texto: 'Modificó el mínimo de cliente frecuente', filas: [['Mínimo de consumos', '4 → 3']] });

  // ---------- Notificaciones ----------
  const TIPOS = {
    POINTS_EXPIRING: { label: 'Vencimiento de puntos', vars: ['{nombre}', '{puntos}', '{fecha}'], hist: 'US-47' },
    BIRTHDAY: { label: 'Cumpleaños', vars: ['{nombre}', '{puntos}'], hist: 'US-48' },
    PROMOTION: { label: 'Promociones', vars: ['{nombre}', '{promocion}', '{descripcion}'], hist: 'US-49' },
    MISSION: { label: 'Misiones', vars: ['{nombre}', '{mision}'], hist: 'US-50' }
  };
  const ajustes = {
    logo: null, cumplePuntos: 100,
    mensajes: {
      POINTS_EXPIRING: { activa: true, asunto: 'Tus puntos están por vencer', cuerpo: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!' },
      BIRTHDAY: { activa: true, asunto: '¡Feliz cumpleaños!', cuerpo: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.' },
      PROMOTION: { activa: true, asunto: '{promocion}', cuerpo: '{descripcion}' },
      MISSION: { activa: true, asunto: '¡Completaste una misión!', cuerpo: '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.' }
    }
  };
  const EJ = { '{nombre}': 'Marcos', '{puntos}': '200', '{fecha}': dmy(iso(T0 + 7 * DIA)), '{promocion}': 'Pizza libre de los viernes', '{descripcion}': 'Todos los viernes de 20:00 a 23:30, pizza libre para toda la mesa.', '{mision}': 'Vení 3 veces este mes' };
  const reemplazar = (t, vars) => String(t || '').replace(/\{[a-z]+\}/g, (v) => (vars && v in vars) ? vars[v] : v);
  let nid = 1;
  const notifs = [];
  const N = (o) => { const n = Object.assign({ id: nid++, canal: 'Correo', error: '' }, o); notifs.push(n); return n; };
  const ESTADO_N = { SENT: 'Enviada', FAILED: 'Falló', SKIPPED: 'No enviada' };
  const cliN = (nombre, n, email) => ({ nombre, tipo: 'DNI', num: n, email });
  const MARCOS = cliN('Marcos Peralta', '30111222', 'marcos.peralta@mail.com'), CARO = cliN('Carolina Fernández', '38456123', 'carolina.fernandez@gmail.com'), SOFI = cliN('Sofía Ríos', '35222880', 'sofia.rios@gmail.com'), MARTIN = cliN('Martín Gómez', '41987654', 'martin.gomez@hotmail.com');
  N({ ts: T0 - 2 * DIA + 3600000, tipo: 'MISSION', cliente: MARCOS, asunto: '¡Completaste una misión!', estado: 'SENT' });
  N({ ts: T0 - 3 * DIA + 9 * 3600000, tipo: 'POINTS_EXPIRING', cliente: CARO, asunto: 'Tus puntos están por vencer', estado: 'SENT' });
  N({ ts: T0 - 4 * DIA + 9 * 3600000, tipo: 'MISSION', cliente: MARTIN, asunto: '¡Completaste una misión!', estado: 'FAILED', error: 'El servidor de correo rechazó la dirección del destinatario.' });
  N({ ts: T0 - 5 * DIA, tipo: 'PROMOTION', cliente: SOFI, asunto: 'Pizza libre de los viernes', estado: 'SENT' });
  N({ ts: T0 - 5 * DIA, tipo: 'PROMOTION', cliente: MARCOS, asunto: 'Pizza libre de los viernes', estado: 'SENT' });
  N({ ts: T0 - 6 * DIA + 9 * 3600000, tipo: 'BIRTHDAY', cliente: SOFI, asunto: '¡Feliz cumpleaños!', estado: 'SENT' });
  N({ ts: T0 - 7 * DIA + 9 * 3600000, tipo: 'POINTS_EXPIRING', cliente: MARTIN, asunto: 'Tus puntos están por vencer', estado: 'SKIPPED', error: 'El tipo de notificación estaba desactivado.' });
  N({ ts: T0 - 12 * DIA + 9 * 3600000, tipo: 'BIRTHDAY', cliente: CARO, asunto: '¡Feliz cumpleaños!', estado: 'FAILED', error: 'No se pudo conectar con el servicio de correo.' });

  // ---------- Promociones ----------
  let pid = 1;
  const P = (o) => Object.assign({ id: pid++, dias: null, desde: '', hasta: '', hastaFecha: null, ultimoEnvio: null, estado: 'Activa', modTs: T0 - pid * 3600000 }, o);
  const promociones = [
    P({ titulo: 'Pizza libre de los viernes', descripcion: 'Todos los viernes de 20:00 a 23:30, pizza libre para toda la mesa.', dias: [5], desde: '20:00', hasta: '23:30', desdeFecha: iso(ini(M1)), ultimoEnvio: T0 - 5 * DIA }),
    P({ titulo: 'Merienda buffet de los domingos', descripcion: 'Los domingos de 16:00 a 19:00, merienda buffet libre con tortas caseras.', dias: [7], desde: '16:00', hasta: '19:00', desdeFecha: iso(T0 - 9 * DIA) }),
    P({ titulo: 'Semana del café', descripcion: 'Café de especialidad con 2 x 1 en la segunda taza.', desdeFecha: iso(ini(M1) + 2 * DIA), hastaFecha: iso(ini(M1) + 8 * DIA), ultimoEnvio: ini(M1) + DIA }),
    P({ titulo: 'Noche de pastas', descripcion: 'Los miércoles, pastas caseras con salsa a elección.', dias: [3], desde: '20:00', hasta: '23:00', desdeFecha: iso(T0 + 4 * DIA) })
  ];
  const fasePromo = (p) => p.desdeFecha > hoy() ? 'Próxima' : (p.hastaFecha && p.hastaFecha < hoy()) ? 'Terminada' : 'Vigente';
  const diasHorarioTxt = (p) => { const c = condTxt(p); return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Todos los días'; };
  const vigPromoTxt = (p) => p.hastaFecha ? dmy(p.desdeFecha) + ' – ' + dmy(p.hastaFecha) : 'Desde el ' + dmy(p.desdeFecha);
  const CLIENTES_ACTIVOS = 184;

  // ---------- Clientes frecuentes ----------
  let frecMin = 3;

  // ---------- Fotos de perfil (FOTO-PERFIL) ----------
  const fotos = {};
  const fotoValida = (f) => !!f && /^image\/(png|jpeg|webp)$/.test(f.type) && f.size <= 2 * 1024 * 1024;
  const ERROR_FOTO = 'Usá una imagen JPG, PNG o WebP de hasta 2 MB.';
  const iniciales = (nombre) => String(nombre || '').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

  // ---------- Estadísticas (datos sintéticos, pero estables para el mismo período) ----------
  const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967295; };
  const FRANJAS = [['00:00', '08:00', 0.02], ['08:00', '12:00', 0.24], ['12:00', '16:00', 0.31], ['16:00', '20:00', 0.22], ['20:00', '24:00', 0.21]];
  function stats(desde, hasta, agrupar) {
    const out = { dias: 0, count: 0, amount: 0, porDia: [], porSemana: {}, porMes: {}, wd: { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0], 5: [0, 0], 6: [0, 0], 7: [0, 0] } };
    const a = new Date(desde + 'T00:00:00').getTime(), b = new Date(hasta + 'T00:00:00').getTime();
    for (let t = a; t <= b; t += DIA) {
      const d = iso(t); const w = diaSemana(t); const f = (w >= 5 ? 1.45 : 1) * (0.7 + h(d) * 0.6);
      const c = Math.round(18 * f); const am = Math.round(c * (14000 + h(d + 'm') * 6000) / 100) * 100;
      out.dias++; out.count += c; out.amount += am; out.porDia.push({ k: d, c, am }); out.wd[w][0] += c; out.wd[w][1] += am;
      const mk = d.slice(0, 7); out.porMes[mk] = out.porMes[mk] || { c: 0, am: 0 }; out.porMes[mk].c += c; out.porMes[mk].am += am;
      const lunes = iso(t - (w - 1) * DIA); out.porSemana[lunes] = out.porSemana[lunes] || { c: 0, am: 0 }; out.porSemana[lunes].c += c; out.porSemana[lunes].am += am;
    }
    const porPeriodo = agrupar === 'dia' ? out.porDia.map((x) => ({ label: dmy(x.k), c: x.c, am: x.am }))
      : agrupar === 'semana' ? Object.keys(out.porSemana).map((k) => ({ label: 'Semana del ' + dmy(k), c: out.porSemana[k].c, am: out.porSemana[k].am }))
      : Object.keys(out.porMes).map((k) => ({ label: mesTxt(k), c: out.porMes[k].c, am: out.porMes[k].am }));
    const nuevos = Math.max(1, Math.round(out.dias * 0.75));
    const frecuentes = Math.max(0, Math.round(CLIENTES_ACTIVOS * Math.min(0.9, out.dias / 30) * (5 / (frecMin + 2)) * 0.42));
    const otorgados = Math.floor(out.amount / 100);
    const mesesClientes = Object.keys(out.porMes).map((k) => ({ label: mesTxt(k), nuevos: Math.round(out.porMes[k].c / 24), conConsumos: Math.min(CLIENTES_ACTIVOS, Math.round(out.porMes[k].c / 4.2)) }));
    const misionesP = misiones.filter((m) => m.inicio <= hasta.slice(0, 7) && (!m.fin || m.fin >= desde.slice(0, 7))).map((m) => {
      const asig = Math.round(40 + h(m.nombre + desde) * 70) * Math.max(1, Object.keys(out.porMes).length);
      const comp = Math.round(asig * (0.25 + h(m.nombre) * 0.3)); const recl = m.recompensa ? Math.round(comp * 0.9) : 0;
      return { nombre: m.nombre, asignadas: asig, completadas: comp, reclamadas: recl, vencidas: asig - comp };
    });
    const K = window.VCCanjes;
    const top = (K ? K.recompensas(true) : []).map((r) => ({ nombre: r.nombre, usados: Math.max(1, Math.round(r.usadas * Math.min(1, out.dias / 60) + h(r.nombre + desde) * 3)) })).sort((x, y) => y.usados - x.usados).slice(0, 10);
    return {
      dias: out.dias,
      clientes: { activos: CLIENTES_ACTIVOS, nuevos, frecuentes, min: frecMin, porMes: mesesClientes },
      consumos: { count: out.count, amount: out.amount, porPeriodo, porDiaSemana: [1, 2, 3, 4, 5, 6, 7].map((w) => ({ label: DIA_PL[w].charAt(0).toUpperCase() + DIA_PL[w].slice(1).replace(/s$/, (w === 6 || w === 7) ? '' : 's'), c: out.wd[w][0], am: out.wd[w][1] })), porFranja: FRANJAS.map(([f, t, p]) => ({ label: f + '–' + t, c: Math.round(out.count * p), am: Math.round(out.amount * p) })) },
      puntos: { otorgados, bonificacion: nuevos * 30, misiones: misionesP.reduce((s2, m) => s2 + m.reclamadas, 0) * 60, cumpleanos: Math.round(out.dias / 6) * ajustes.cumplePuntos, canjeados: Math.round(otorgados * 0.38), vencidos: Math.round(otorgados * 0.06), ajustesSuma: Math.round(otorgados * 0.01), ajustesResta: 0, anulados: Math.round(otorgados * 0.02),
        porMes: Object.keys(out.porMes).map((k) => { const o2 = Math.floor(out.porMes[k].am / 100); return { label: mesTxt(k), otorgados: o2, canjeados: Math.round(o2 * 0.38), vencidos: Math.round(o2 * 0.06) }; }) },
      programa: { niveles: [{ label: 'Bronce', n: 120 }, { label: 'Plata', n: 50 }, { label: 'Oro', n: 14 }], misiones: misionesP, top }
    };
  }

  // ---------- API ----------
  const API = {
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }, emit,
    num, dmy, iso, fdt, hoy, dig, audit, MESES, mesTxt, mesTxtMin, mesActual, sumarMes, finDeMes, DIA_PL, DIA_CORTO, condTxt, lista, iniciales,
    ERROR_FOTO, fotoValida,
    // ----- misiones (catálogo) -----
    misiones(incluirEliminadas) { return misiones.filter((m) => incluirEliminadas || m.estado !== 'Eliminada'); },
    mision(id) { return misiones.find((m) => m.id === id); },
    fase, objetivoTxt, recompensaTxt, vigenciaTxt,
    badgeFase(f) { return 'vc-b ' + (f === 'En curso' ? 'vc-b-ok' : f === 'Próxima' ? 'vc-b-neu' : 'vc-b-off'); },
    completadasMes(m) { return asignaciones.filter((a) => a.mid === m.id && a.periodo === mesActual() && (a.estado === 'Completada' || a.estado === 'Reclamada')).length; },
    // Clientes que completaron la misión en un mes (Completada + Reclamada), para el detalle de la misión.
    completaronMes(m, periodo) { const p = periodo || mesActual(); return asignaciones.filter((a) => a.mid === m.id && a.periodo === p && (a.estado === 'Completada' || a.estado === 'Reclamada')).slice().sort((x, y) => (y.completadaTs || 0) - (x.completadaTs || 0)).map((a) => { const [tipo, n] = a.k.split('|'); return { nombre: a.nombre, tipo, num: n, estado: a.estado, completadaTs: a.completadaTs, reclamadaTs: a.reclamadaTs, reclamadaPor: a.reclamadaPor }; }); },
    tieneAsignacionesMes(m) { return asignaciones.some((a) => a.mid === m.id && a.periodo === mesActual()); },
    nombreUsado(nombre, exceptoId) { const n = String(nombre || '').trim().toLowerCase(); return misiones.some((m) => m.id !== exceptoId && m.estado !== 'Eliminada' && m.nombre.trim().toLowerCase() === n); },
    crearMision(d, por) {
      const m = Mi(Object.assign({}, d, { modTs: Date.now() })); misiones.push(m);
      aud({ ts: Date.now(), usuario: por, modulo: 'Misiones', accion: 'Creó misión', texto: 'Creó la misión "' + m.nombre + '"', filas: [['Objetivo', objetivoTxt(m)], ['Condición', condTxt(m) || 'Todos los días'], ['Recompensa', recompensaTxt(m)], ['Vigencia', vigenciaTxt(m)]] });
      emit(); return m;
    },
    editarMision(id, d, por) {
      const m = API.mision(id); if (!m) return null;
      const filas = []; const cmp = (label, a, b) => { if (a !== b) filas.push([label, (a || '—') + ' → ' + (b || '—')]); };
      cmp('Nombre', m.nombre, d.nombre); cmp('Descripción', m.descripcion, d.descripcion);
      const nuevoObj = { tipo: d.tipo, objetivo: d.objetivo, dias: d.dias, desde: d.desde, hasta: d.hasta, recompensa: d.recompensa };
      const cambiaObj = objetivoTxt(m) !== objetivoTxt(nuevoObj) || condTxt(m) !== condTxt(nuevoObj) || recompensaTxt(m) !== recompensaTxt(nuevoObj);
      if (objetivoTxt(m) !== objetivoTxt(nuevoObj)) cmp('Objetivo', objetivoTxt(m), objetivoTxt(nuevoObj));
      if (condTxt(m) !== condTxt(nuevoObj)) cmp('Condición', condTxt(m) || 'Todos los días', condTxt(nuevoObj) || 'Todos los días');
      if (recompensaTxt(m) !== recompensaTxt(nuevoObj)) cmp('Recompensa', recompensaTxt(m), recompensaTxt(nuevoObj));
      cmp('Mes de inicio', mesTxt(m.inicio), mesTxt(d.inicio)); cmp('Mes de fin', m.fin ? mesTxt(m.fin) : 'Se repite todos los meses', d.fin ? mesTxt(d.fin) : 'Se repite todos los meses');
      let rige = null;
      m.nombre = d.nombre; m.descripcion = d.descripcion; m.inicio = d.inicio; m.fin = d.fin; m.modTs = Date.now();
      if (cambiaObj) {
        if (API.tieneAsignacionesMes(m)) { rige = sumarMes(mesActual(), 1); m.pendiente = Object.assign({ rige }, nuevoObj); filas.push(['Rige desde', mesTxt(rige)]); }
        else { Object.assign(m, nuevoObj); m.pendiente = null; }
      }
      if (filas.length) aud({ ts: Date.now(), usuario: por, modulo: 'Misiones', accion: 'Editó misión', texto: 'Editó la misión "' + m.nombre + '"', filas });
      emit(); return { m, rige };
    },
    eliminarMision(id, por) {
      const m = API.mision(id); if (!m || m.estado === 'Eliminada') return null;
      m.estado = 'Eliminada'; m.modTs = Date.now();
      let vencidas = 0, reclamadas = 0;
      asignaciones.filter((a) => a.mid === m.id && a.periodo === mesActual()).forEach((a) => {
        if (a.estado === 'En progreso') { a.estado = 'Vencida'; a.vencidaTs = Date.now(); a.motivo = 'Misión dada de baja'; vencidas++; }
        else if (a.estado === 'Completada' && a.s.recompensa) { API._reclamar(a, 'Sistema'); reclamadas++; }
      });
      const filas = []; if (vencidas) filas.push(['Vencidas', String(vencidas)]); if (reclamadas) filas.push(['Reclamadas automáticamente', String(reclamadas)]);
      aud({ ts: Date.now() + 5, usuario: por, modulo: 'Misiones', accion: 'Dio de baja misión', texto: 'Dio de baja la misión "' + m.nombre + '"', filas });
      emit(); return { vencidas, reclamadas };
    },
    // ----- misiones del cliente -----
    asignarMes,
    asignacionesDe(tipo, n, periodo) {
      const k = cliK(tipo, n); const p = periodo || mesActual();
      return asignaciones.filter((a) => a.k === k && a.periodo === p).slice().sort((x, y) => ORDEN[x.estado] - ORDEN[y.estado] || x.s.nombre.localeCompare(y.s.nombre, 'es'));
    },
    periodosAnteriores(tipo, n) { const k = cliK(tipo, n); return [...new Set(asignaciones.filter((a) => a.k === k && a.periodo < mesActual()).map((a) => a.periodo))].sort().reverse(); },
    enProgreso(tipo, n) { const k = cliK(tipo, n); const mes = mesActual(); const asig = asignaciones.filter((a) => a.k === k && a.periodo === mes); const sinAsignar = misiones.filter((m) => enCurso(m, mes) && !asig.some((a) => a.mid === m.id)).length; return asig.filter((a) => a.estado === 'En progreso').length + sinAsignar; },
    progresoTxt, badgeMision,
    pct(a) { return Math.max(0, Math.min(100, Math.round((a.progreso / a.s.objetivo) * 100))); },
    puedeReclamar(a) { return a.estado === 'Completada' && !!a.s.recompensa; },
    _reclamar(a, por) {
      a.estado = 'Reclamada'; a.reclamadaTs = Date.now(); a.reclamadaPor = por;
      const [tipo, n] = a.k.split('|'); const S = window.VCStore; let saldo = null;
      const sc = S ? S.porDoc(tipo, n) : null;
      if (sc) { const id = S.movs.reduce((x, m) => Math.max(x, m.id), 0) + 1; S.movs.push({ id, cid: sc.id, ts: Date.now(), tipo: 'Recompensa de misión', detalle: 'Recompensa de misión: ' + a.s.nombre, pts: a.s.recompensa, por: 'Sistema' }); saldo = sc.saldo; S.emit(); }
      else if (window.VCCanjes) { const K = window.VCCanjes; K.registrarCliente({ tipo, num: n, nombre: a.nombre, saldo: 0 }); }
      API.movsExtra.push({ k: a.k, ts: Date.now(), tipo: 'MISSION_REWARD', pts: a.s.recompensa, detalle: a.s.nombre });
      aud({ ts: Date.now(), usuario: 'Sistema', modulo: 'Misiones', accion: 'Reclamó recompensa de misión', texto: 'Reclamó la recompensa de la misión "' + a.s.nombre + '" de ' + a.nombre, cliente: cliAud(a), filas: [['Misión', a.s.nombre], ['Puntos otorgados', num(a.s.recompensa)]].concat(saldo !== null ? [['Saldo resultante', num(saldo) + ' pts']] : []).concat([['Reclamada por', por === 'Cliente' ? 'Cliente' : 'Automático']]) });
      return a.s.recompensa;
    },
    movsExtra: [],
    // Movimientos de puntos del Sprint 5 de un cliente (para el historial del Cliente): misiones reclamadas y regalos de cumpleaños.
    movimientosDe(tipo, n) {
      const k = cliK(tipo, n);
      const out = asignaciones.filter((a) => a.k === k && a.estado === 'Reclamada').map((a) => ({ ts: a.reclamadaTs, pts: a.s.recompensa, tipo: 'MISSION_REWARD', texto: 'Ganaste ' + num(a.s.recompensa) + ' pts por la misión ' + a.s.nombre }));
      (API.regalos[k] || []).forEach((r) => out.push(r));
      return out.sort((a, b) => b.ts - a.ts);
    },
    regalos: { 'DNI|30111222': [{ ts: T0 - 40 * DIA, pts: 100, tipo: 'BIRTHDAY_BONUS', texto: 'Te regalamos 100 pts por tu cumpleaños' }] },
    // Puntos sumados durante la sesión del prototipo a un cliente que no está en VCStore.
    saldoExtra(tipo, n) { const k = cliK(tipo, n); return API.movsExtra.filter((m) => m.k === k).reduce((x, m) => x + m.pts, 0); },
    reclamar(id) {
      const a = asignaciones.find((x) => x.id === id);
      if (!a) return { ok: false, msg: 'No existe la misión.' };
      if (a.estado === 'En progreso') return { ok: false, msg: 'La misión todavía no está completada.' };
      if (a.estado === 'Reclamada') return { ok: false, msg: 'La recompensa de esta misión ya se reclamó.' };
      if (a.estado === 'Vencida') return { ok: false, msg: 'La misión venció.' };
      if (!a.s.recompensa) return { ok: false, msg: 'Esta misión no tiene recompensa.' };
      const pts = API._reclamar(a, 'Cliente'); emit(); return { ok: true, puntos: pts };
    },
    // Avance por un consumo (US-30). Devuelve las misiones que completó.
    registrarConsumo({ tipo, num: n, nombre, monto, ts }) {
      asignarMes(tipo, n, nombre); const k = cliK(tipo, n); const t = ts || Date.now(); const w = diaSemana(t); const d = new Date(t); const hh = z(d.getHours()) + ':' + z(d.getMinutes());
      const completadas = [];
      asignaciones.filter((a) => a.k === k && a.periodo === mesDe(t) && a.estado === 'En progreso').forEach((a) => {
        if (a.s.dias && a.s.dias.length && !a.s.dias.includes(w)) return;
        if (a.s.desde && a.s.hasta && (hh < a.s.desde || hh >= a.s.hasta)) return;
        a.progreso = Math.min(a.s.objetivo, a.progreso + (a.s.tipo === 'AMOUNT' ? Number(monto) || 0 : 1));
        if (a.progreso >= a.s.objetivo) {
          a.estado = 'Completada'; a.completadaTs = t; completadas.push({ nombre: a.s.nombre, recompensa: a.s.recompensa });
          aud({ ts: t + 1, usuario: 'Sistema', modulo: 'Misiones', accion: 'Completó misión', texto: 'Completó la misión "' + a.s.nombre + '" de ' + a.nombre, cliente: cliAud(a), filas: [['Misión', a.s.nombre], ['Objetivo', objetivoTxt(a.s) + (condTxt(a.s) ? ', ' + condTxt(a.s) : '')], ['Período', mesTxt(a.periodo)]] });
          API.notificar('MISSION', { nombre: a.nombre, tipo, num: n }, { '{nombre}': a.nombre.split(' ')[0], '{mision}': a.s.nombre });
        }
      });
      if (completadas.length) emit();
      return completadas;
    },
    // Fin de mes (US-32), simulado: vence el mes actual como si hubiera terminado.
    simularFinDeMes() {
      const mes = mesActual(); let v = 0, r = 0;
      asignaciones.filter((a) => a.periodo === mes).forEach((a) => {
        if (a.estado === 'En progreso') { a.estado = 'Vencida'; a.vencidaTs = Date.now(); a.motivo = 'Fin de mes'; v++; }
        else if (a.estado === 'Completada' && a.s.recompensa) { API._reclamar(a, 'Sistema'); r++; }
      });
      misiones.forEach((m) => { if (m.pendiente) { Object.assign(m, { tipo: m.pendiente.tipo, objetivo: m.pendiente.objetivo, dias: m.pendiente.dias, desde: m.pendiente.desde, hasta: m.pendiente.hasta, recompensa: m.pendiente.recompensa }); m.pendiente = null; } });
      if (v || r) aud({ ts: Date.now() + 10, usuario: 'Sistema', modulo: 'Misiones', accion: 'Venció misiones del mes', texto: 'Venció las misiones del mes', filas: [['Período', mesTxt(mes)], ['Misiones vencidas', String(v)], ['Recompensas reclamadas automáticamente', String(r)]] });
      emit(); return { vencidas: v, reclamadas: r };
    },
    // ----- notificaciones -----
    TIPOS, ESTADO_N, ajustes, EJ, reemplazar,
    notificaciones() { return notifs.slice().sort((a, b) => b.ts - a.ts); },
    notificar(tipo, cli, vars) {
      const msg = ajustes.mensajes[tipo]; const S = window.VCStore; const sc = S && cli.num ? S.porDoc(cli.tipo || 'DNI', cli.num) : null;
      const email = cli.email || (sc && sc.email) || (cli.nombre || 'cliente').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@mail.com';
      N({ ts: Date.now(), tipo, cliente: { nombre: cli.nombre, tipo: cli.tipo || 'DNI', num: dig(cli.num), email }, asunto: reemplazar(msg.asunto, vars), estado: msg.activa ? 'SENT' : 'SKIPPED', error: msg.activa ? '' : 'El tipo de notificación estaba desactivado.' });
    },
    guardarMensajes(nuevo, por) {
      const filas = [];
      if (Number(nuevo.cumplePuntos) !== Number(ajustes.cumplePuntos)) filas.push(['Puntos de cumpleaños', num(ajustes.cumplePuntos) + ' → ' + num(nuevo.cumplePuntos)]);
      if ((nuevo.logo || '') !== (ajustes.logo || '')) filas.push(['Logo', nuevo.logo ? 'Actualizado' : 'Quitado']);
      Object.keys(TIPOS).forEach((t) => {
        const a = ajustes.mensajes[t], b = nuevo.mensajes[t];
        if (a.activa !== b.activa) filas.push([TIPOS[t].label, (a.activa ? 'Activado' : 'Desactivado') + ' → ' + (b.activa ? 'Activado' : 'Desactivado')]);
        if (a.asunto !== b.asunto || a.cuerpo !== b.cuerpo) filas.push(['Mensaje de ' + TIPOS[t].label.toLowerCase(), 'Modificado']);
      });
      ajustes.cumplePuntos = Number(nuevo.cumplePuntos); ajustes.logo = nuevo.logo || null;
      Object.keys(TIPOS).forEach((t) => { ajustes.mensajes[t] = { ...nuevo.mensajes[t] }; });
      aud({ ts: Date.now(), usuario: por, modulo: 'Configuración', accion: 'Modificó logo y mensajes', texto: 'Modificó el logo y los mensajes automáticos', filas: filas.length ? filas : [['Cambios', 'Se guardó sin modificar valores']] });
      emit();
    },
    // Proceso diario de las 09:00 (US-47, US-48), simulado.
    simularEnvioDiario() {
      let venc = 0, cumple = 0;
      [CARO, MARCOS].forEach((c) => { API.notificar('POINTS_EXPIRING', c, { '{nombre}': c.nombre.split(' ')[0], '{puntos}': '200', '{fecha}': dmy(iso(Date.now() + 7 * DIA)) }); venc++; });
      const c = MARTIN; const pts = ajustes.cumplePuntos;
      if (pts > 0 && ajustes.mensajes.BIRTHDAY.activa) {
        const S = window.VCStore; const sc = S ? S.porDoc('DNI', c.num) : null; let saldo = null;
        if (sc) { const id = S.movs.reduce((x, m) => Math.max(x, m.id), 0) + 1; S.movs.push({ id, cid: sc.id, ts: Date.now(), tipo: 'Regalo de cumpleaños', detalle: 'Regalo de cumpleaños', pts, por: 'Sistema' }); saldo = sc.saldo; S.emit(); }
        aud({ ts: Date.now(), usuario: 'Sistema', modulo: 'Puntos', accion: 'Regaló puntos de cumpleaños', texto: 'Regaló puntos de cumpleaños a ' + c.nombre, cliente: { nombre: c.nombre, tipo: 'DNI', num: c.num }, filas: [['Puntos otorgados', num(pts)]].concat(saldo !== null ? [['Saldo resultante', num(saldo) + ' pts']] : []) });
      }
      API.notificar('BIRTHDAY', c, { '{nombre}': c.nombre.split(' ')[0], '{puntos}': String(pts) }); cumple++;
      emit(); return { venc, cumple };
    },
    // Reenvía un correo que falló (botón "Reenviar" del historial). Crea un registro nuevo; el que falló queda.
    reenviar(id) {
      const n0 = notifs.find((x) => x.id === id); if (!n0 || n0.estado !== 'FAILED') return { ok: false, msg: 'Solo se pueden reenviar los correos que fallaron.' };
      if (n0.reenviada) return { ok: false, msg: 'Este correo ya se reenvió.' };
      if (!ajustes.mensajes[n0.tipo].activa) return { ok: false, msg: 'Las notificaciones de ' + TIPOS[n0.tipo].label.toLowerCase() + ' están desactivadas.' };
      n0.reenviada = true; N({ ts: Date.now(), tipo: n0.tipo, cliente: n0.cliente, asunto: n0.asunto, estado: 'SENT', reenvioDe: n0.id }); emit(); return { ok: true };
    },
    // Promoción enviada en el momento desde Notificaciones: no se guarda (solo quedan los envíos en el historial).
    enviarPromoAhora(d) {
      if (!ajustes.mensajes.PROMOTION.activa) return { ok: false, msg: 'Las notificaciones de promociones están desactivadas.' };
      [MARCOS, CARO, SOFI, MARTIN].forEach((c) => N({ ts: Date.now(), tipo: 'PROMOTION', cliente: c, asunto: reemplazar(ajustes.mensajes.PROMOTION.asunto, { '{nombre}': c.nombre.split(' ')[0], '{promocion}': d.titulo, '{descripcion}': d.descripcion }), estado: 'SENT' }));
      emit(); return { ok: true, n: CLIENTES_ACTIVOS };
    },
    // ----- promociones -----
    promociones(incluirBaja) { return promociones.filter((p) => incluirBaja || p.estado !== 'Dada de baja'); },
    promocion(id) { return promociones.find((p) => p.id === id); },
    fasePromo, diasHorarioTxt, vigPromoTxt, CLIENTES_ACTIVOS,
    badgePromo(f) { return 'vc-b ' + (f === 'Vigente' ? 'vc-b-ok' : f === 'Próxima' ? 'vc-b-neu' : 'vc-b-off'); },
    promosCliente() { const lim = iso(Date.now() + 7 * DIA); return promociones.filter((p) => p.estado === 'Activa' && (fasePromo(p) === 'Vigente' || (fasePromo(p) === 'Próxima' && p.desdeFecha <= lim))).sort((a, b) => a.desdeFecha.localeCompare(b.desdeFecha)); },
    guardarPromo(id, d, por) {
      if (!id) { const p = P(Object.assign({}, d, { modTs: Date.now() })); promociones.push(p); aud({ ts: Date.now(), usuario: por, modulo: 'Configuración', accion: 'Modificó promociones', texto: 'Creó la promoción "' + p.titulo + '"', filas: [['Días y horario', diasHorarioTxt(p)], ['Vigencia', vigPromoTxt(p)]] }); emit(); return p; }
      const p = API.promocion(id); const filas = []; const cmp = (l, a, b) => { if (a !== b) filas.push([l, (a || '—') + ' → ' + (b || '—')]); };
      const n = Object.assign({}, p, d); cmp('Título', p.titulo, n.titulo); cmp('Descripción', p.descripcion, n.descripcion); cmp('Días y horario', diasHorarioTxt(p), diasHorarioTxt(n)); cmp('Vigencia', vigPromoTxt(p), vigPromoTxt(n));
      Object.assign(p, d, { modTs: Date.now() });
      aud({ ts: Date.now(), usuario: por, modulo: 'Configuración', accion: 'Modificó promociones', texto: 'Editó la promoción "' + p.titulo + '"', filas: filas.length ? filas : [['Cambios', 'Se guardó sin modificar valores']] });
      emit(); return p;
    },
    eliminarPromo(id, por) { const p = API.promocion(id); if (!p) return; p.estado = 'Dada de baja'; aud({ ts: Date.now(), usuario: por, modulo: 'Configuración', accion: 'Modificó promociones', texto: 'Dio de baja la promoción "' + p.titulo + '"', filas: [] }); emit(); },
    enviarPromo(id) {
      const p = API.promocion(id);
      if (!ajustes.mensajes.PROMOTION.activa) return { ok: false, msg: 'Las notificaciones de promociones están desactivadas.' };
      if (fasePromo(p) === 'Terminada') return { ok: false, msg: 'La promoción ya terminó.' };
      p.ultimoEnvio = Date.now();
      [MARCOS, CARO, SOFI, MARTIN].forEach((c) => N({ ts: Date.now(), tipo: 'PROMOTION', cliente: c, asunto: reemplazar(ajustes.mensajes.PROMOTION.asunto, { '{promocion}': p.titulo, '{descripcion}': p.descripcion }), estado: 'SENT' }));
      emit(); return { ok: true, n: CLIENTES_ACTIVOS };
    },
    // ----- clientes frecuentes -----
    frecMin() { return frecMin; },
    setFrecMin(n, por) { const antes = frecMin; frecMin = Number(n); aud({ ts: Date.now(), usuario: por, modulo: 'Configuración', accion: 'Modificó cliente frecuente', texto: 'Modificó el mínimo de cliente frecuente', filas: [['Mínimo de consumos', antes + ' → ' + frecMin]] }); emit(); },
    // ----- fotos de perfil -----
    foto(tipo, n) { return fotos[cliK(tipo, n)] || null; },
    setFoto(tipo, n, dataUrl) { if (dataUrl) fotos[cliK(tipo, n)] = dataUrl; else delete fotos[cliK(tipo, n)]; emit(); },
    // ----- estadísticas -----
    stats
  };
  window.VCS5 = API;
})();
