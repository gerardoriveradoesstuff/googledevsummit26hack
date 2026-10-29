export function copiasLabel(cantidad: number): number {
  if (cantidad <= 0) return 0;
  return Math.ceil(cantidad - 1e-9);
}

export function fechaLocal(iso: string): string {
  const [y, m, d] = iso.split('-').map((parte) => Number(parte));
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function esHoy(iso: string): boolean {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return iso === `${y}-${m}-${d}`;
}

export function horaCorta(sql: string): string {
  const hora = sql.slice(11, 16);
  return hora || sql;
}

export function fechaMarca(sql: string): string {
  const [fecha, hora = ''] = sql.split(' ');
  const dia = fechaLocal(fecha);
  const hm = hora.slice(0, 5);
  return hm ? `${dia}, ${hm}` : dia;
}

export function codigoCaja(pedido: number, linea: number, caja: number): string {
  return `${pedido}-${linea}-${caja}`;
}

const CODE128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export function svgCodigo128(datos: string): string {
  const valores = [104];
  for (const caracter of datos) {
    const valor = caracter.charCodeAt(0) - 32;
    if (valor >= 0 && valor <= 95) valores.push(valor);
  }
  let suma = valores[0];
  for (let i = 1; i < valores.length; i += 1) suma += valores[i] * i;
  valores.push(suma % 103);
  const modulo = 2;
  const alto = 48;
  let x = 0;
  const barras: string[] = [];
  for (const valor of [...valores, 106]) {
    const patron = CODE128[valor] ?? '';
    let esBarra = true;
    for (const digito of patron) {
      const ancho = Number(digito) * modulo;
      if (esBarra) barras.push(`<rect x="${x}" y="0" width="${ancho}" height="${alto}"/>`);
      x += ancho;
      esBarra = !esBarra;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${alto}" viewBox="0 0 ${x} ${alto}" fill="#14241A">${barras.join('')}</svg>`;
}
