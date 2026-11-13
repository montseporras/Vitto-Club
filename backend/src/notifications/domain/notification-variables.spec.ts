import { firstInvalidVariable, NOTIFICATION_VARIABLES, replaceVariables, variablesIn } from './notification-variables.js';

describe('Variables de los mensajes (contrato S5 §3.6.1)', () => {
  it('cada tipo admite exactamente sus variables', () => {
    expect(NOTIFICATION_VARIABLES.POINTS_EXPIRING).toEqual(['nombre', 'puntos', 'fecha']);
    expect(NOTIFICATION_VARIABLES.BIRTHDAY).toEqual(['nombre', 'puntos']);
    expect(NOTIFICATION_VARIABLES.MISSION).toEqual(['nombre', 'mision']);
    expect(NOTIFICATION_VARIABLES.PROMOTION).toEqual(['nombre']);
  });

  describe('variablesIn', () => {
    it('devuelve las variables en el orden en que aparecen, repetidas incluidas', () => {
      expect(variablesIn('Hola {nombre}: {puntos} pts, {fecha}. Chau {nombre}')).toEqual([
        'nombre',
        'puntos',
        'fecha',
        'nombre',
      ]);
    });

    it('un texto sin llaves no tiene variables, y una llave suelta no es una variable', () => {
      expect(variablesIn('Hola, bienvenida')).toEqual([]);
      expect(variablesIn('Un { suelto y otro } suelto')).toEqual([' suelto y otro ']);
      expect(variablesIn('Solo abre {')).toEqual([]);
    });

    it('unas llaves vacías cuentan como una variable sin nombre', () => {
      expect(variablesIn('Mirá {} esto')).toEqual(['']);
    });
  });

  describe('firstInvalidVariable', () => {
    it('devuelve la primera variable que ese tipo no admite', () => {
      expect(firstInvalidVariable('BIRTHDAY', 'Hola {nombre}, vencen el {fecha}')).toBe('fecha');
      expect(firstInvalidVariable('MISSION', '{mision} y {puntos}')).toBe('puntos');
      expect(firstInvalidVariable('PROMOTION', 'Hola {nombre}, tenés {puntos}')).toBe('puntos');
    });

    it('distingue mayúsculas: {Nombre} no es {nombre}', () => {
      expect(firstInvalidVariable('BIRTHDAY', 'Hola {Nombre}')).toBe('Nombre');
    });

    it('devuelve undefined si todas sirven o no hay ninguna', () => {
      expect(firstInvalidVariable('POINTS_EXPIRING', 'Hola {nombre}: {puntos} pts el {fecha}')).toBeUndefined();
      expect(firstInvalidVariable('MISSION', 'Sin variables')).toBeUndefined();
    });
  });

  describe('replaceVariables', () => {
    it('reemplaza cada variable, también las repetidas', () => {
      expect(replaceVariables('Hola {nombre} y {nombre}: {puntos} pts', { nombre: 'Carolina', puntos: '100' })).toBe(
        'Hola Carolina y Carolina: 100 pts',
      );
    });

    it('no toca el texto que no es una variable', () => {
      expect(replaceVariables('¡Bien! Sin variables.', { nombre: 'Carolina' })).toBe('¡Bien! Sin variables.');
    });

    it('un valor sobrante no molesta', () => {
      expect(replaceVariables('Hola {nombre}', { nombre: 'Carolina', puntos: '5' })).toBe('Hola Carolina');
    });

    it('si falta el valor de una variable del texto, lanza un error en vez de mandar la llave', () => {
      expect(() => replaceVariables('Tenés {puntos} pts', { nombre: 'Carolina' })).toThrow(
        'Falta el valor de la variable {puntos}',
      );
    });

    it('un valor que parece una variable no se vuelve a reemplazar', () => {
      expect(replaceVariables('Hola {nombre}', { nombre: '{puntos}' })).toBe('Hola {puntos}');
    });

    it('no confunde propiedades heredadas con valores: {toString} falta', () => {
      expect(() => replaceVariables('{toString}', {})).toThrow('Falta el valor de la variable {toString}');
    });
  });
});
