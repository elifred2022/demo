import { google } from 'googleapis';

// Interfaces para los datos de Google Sheets
export interface Articulo {
  codbarra: string;
  idarticulo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoria?: string;
}

export interface Venta {
  fecha: string;
  articuloId: string;
  articuloNombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  cliente?: string;
}

/** Venta tal como se muestra en la lista (columnas: idventa, fecha, idarticulo, nombre, cantidad, precioUnitario, total) */
export interface VentaList {
  idventa: string;
  fecha: string;
  idarticulo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID ?? '';
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : id;
}

export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Obtiene todos los datos de la pestaña 'articulos'.
 * La primera fila debe contener los encabezados.
 */
export async function getArticulos(): Promise<Articulo[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'articulos'!A:Z",
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0] as string[];
  const headerIndex = (keys: string[]) => {
    for (const key of keys) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === key.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idx = {
    codbarra: headerIndex(['codbarra', 'cod barra']),
    id: headerIndex(['id', 'idarticulo', 'id artículo']),
    nombre: headerIndex(['nombre']),
    descripcion: headerIndex(['descripcion', 'descripción']),
    precio: headerIndex(['precio']),
    stock: headerIndex(['stock', 'existencia', 'inventario']),
    categoria: headerIndex(['categoria', 'categoría']),
  };

  return rows.slice(1).map((row) => {
    const get = (i: number) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '');
    const getNum = (i: number) => {
      const val = get(i);
      const n = parseFloat(val);
      return Number.isNaN(n) ? 0 : n;
    };

    return {
      codbarra: idx.codbarra >= 0 ? get(idx.codbarra) : '',
      idarticulo: get(idx.id),
      nombre: get(idx.nombre),
      descripcion: idx.descripcion >= 0 ? get(idx.descripcion) : undefined,
      precio: getNum(idx.precio),
      stock: getNum(idx.stock),
      categoria: idx.categoria >= 0 ? get(idx.categoria) : undefined,
    } satisfies Articulo;
  });
}

export interface ArticuloNuevo {
  codbarra: string;
  idarticulo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
}

/**
 * Verifica si ya existe un artículo con el ID dado.
 */
export async function articuloExiste(id: string): Promise<boolean> {
  const articulos = await getArticulos();
  const buscado = id.trim().toLowerCase();
  return articulos.some((a) => a.idarticulo.trim().toLowerCase() === buscado);
}

/**
 * Verifica si ya existe un artículo con el código de barras dado.
 * @param excluirId - ID del artículo a excluir (modo edición)
 */
export async function articuloExistePorCodbarra(
  codbarra: string,
  excluirId?: string
): Promise<boolean> {
  const c = codbarra.trim();
  if (!c) return false;
  const articulos = await getArticulos();
  const buscado = c.toLowerCase();
  return articulos.some(
    (a) =>
      a.codbarra.trim().toLowerCase() === buscado &&
      (!excluirId || a.idarticulo.trim().toLowerCase() !== excluirId.trim().toLowerCase())
  );
}

/**
 * Inserta una nueva fila en la pestaña 'articulos'.
 */
export async function insertarArticulo(articulo: ArticuloNuevo): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = [
    [
      articulo.codbarra,
      articulo.idarticulo,
      articulo.nombre,
      articulo.descripcion ?? '',
      articulo.precio,
      articulo.stock,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'articulos'!A:F",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
}

/**
 * Actualiza un artículo existente por su ID.
 */
export async function actualizarArticulo(
  idAntiguo: string,
  articulo: ArticuloNuevo
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'articulos'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Artículo no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idarticulo', 'id artículo', 'id articulo', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === idAntiguo.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Artículo no encontrado');
  }

  const sheetRow = rowIndex + 1;
  const range = `'articulos'!A${sheetRow}:F${sheetRow}`;
  const values = [
    [
      articulo.codbarra,
      articulo.idarticulo,
      articulo.nombre,
      articulo.descripcion ?? '',
      articulo.precio,
      articulo.stock,
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Obtiene el título exacto de la hoja 'articulos' desde el spreadsheet.
 */
async function getArticulosSheetTitle(): Promise<string> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const articulosSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'articulos'
  );
  if (!articulosSheet?.properties?.title) {
    throw new Error('No se encontró la hoja articulos');
  }
  return articulosSheet.properties.title;
}

/**
 * Actualiza solo la celda de stock de un artículo (detecta columna por header).
 */
async function actualizarStockArticuloPorId(idarticulo: string, nuevoStock: number): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const sheetTitle = await getArticulosSheetTitle();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A:Z`,
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Artículo no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idarticulo', 'id artículo', 'id articulo', 'codigo', 'código']);
  const stockCol = findCol(['stock', 'existencia', 'inventario']);
  if (idCol < 0 || stockCol < 0) {
    const found = { id: idCol >= 0, stock: stockCol >= 0 };
    throw new Error(
      `Columnas no encontradas en articulos. Encontradas: ${JSON.stringify(headers)}. Se buscan: id/idarticulo y stock/existencia`
    );
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === idarticulo.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Artículo no encontrado');
  }

  const sheetRow = rowIndex + 1;
  const toCol = (n: number): string =>
    n < 26 ? String.fromCharCode(65 + n) : toCol(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
  const stockCell = `${toCol(stockCol)}${sheetRow}`;
  const range = `'${sheetTitle}'!${stockCell}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[nuevoStock]] },
  });
}

/**
 * Descuenta la cantidad vendida del stock del artículo.
 * @throws Error si el artículo no existe o no hay stock suficiente
 */
export async function descontarStockArticulo(idarticulo: string, cantidad: number): Promise<void> {
  if (!idarticulo?.trim() || cantidad <= 0) return;

  const articulos = await getArticulos();
  const articulo = articulos.find(
    (a) => a.idarticulo.trim().toLowerCase() === idarticulo.trim().toLowerCase()
  );
  if (!articulo) {
    throw new Error('Artículo no encontrado');
  }
  const nuevoStock = articulo.stock - cantidad;
  if (nuevoStock < 0) {
    throw new Error(
      `Stock insuficiente. Disponible: ${articulo.stock}, solicitado: ${cantidad}`
    );
  }
  await actualizarStockArticuloPorId(articulo.idarticulo, nuevoStock);
}

/**
 * Repone stock a un artículo (para revertir un descuento).
 */
export async function reponerStockArticulo(idarticulo: string, cantidad: number): Promise<void> {
  if (!idarticulo?.trim() || cantidad <= 0) return;

  const articulos = await getArticulos();
  const articulo = articulos.find(
    (a) => a.idarticulo.trim().toLowerCase() === idarticulo.trim().toLowerCase()
  );
  if (!articulo) return;
  await actualizarStockArticuloPorId(articulo.idarticulo, articulo.stock + cantidad);
}

/**
 * Elimina un artículo por su ID en la pestaña 'articulos'.
 */
export async function eliminarArticulo(id: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const articulosSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'articulos'
  );
  const sheetId = articulosSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontró la hoja articulos');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'articulos'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Artículo no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idarticulo', 'id artículo', 'id articulo', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === id.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Artículo no encontrado');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/**
 * Obtiene todas las ventas de la pestaña 'ventas'.
 * Columnas esperadas: idventa, fecha, idarticulo, nombre, cantidad, total
 */
export async function getVentas(): Promise<VentaList[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0] as string[];
  const headerIndex = (key: string) =>
    headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

  const idx = {
    idventa: headerIndex('idventa'),
    fecha: headerIndex('fecha'),
    idarticulo: headerIndex('idarticulo') >= 0 ? headerIndex('idarticulo') : headerIndex('articuloid'),
    nombre: headerIndex('nombre') >= 0 ? headerIndex('nombre') : headerIndex('articulonombre'),
    cantidad: headerIndex('cantidad'),
    precioUnitario: headerIndex('preciounitario') >= 0 ? headerIndex('preciounitario') : headerIndex('precio'),
    total: headerIndex('total'),
  };

  return rows.slice(1).map((row, i) => {
    const get = (j: number) => (j >= 0 && row[j] !== undefined ? String(row[j]).trim() : '');
    const getNum = (j: number) => {
      const val = get(j);
      const n = parseFloat(val);
      return Number.isNaN(n) ? 0 : n;
    };

    const idventa = idx.idventa >= 0 ? get(idx.idventa) : String(i + 1);
    const cantidad = getNum(idx.cantidad);
    const total = getNum(idx.total);
    const precioUnitario = idx.precioUnitario >= 0
      ? getNum(idx.precioUnitario)
      : (cantidad > 0 ? total / cantidad : 0);

    return {
      idventa,
      fecha: idx.fecha >= 0 ? get(idx.fecha) : '',
      idarticulo: idx.idarticulo >= 0 ? get(idx.idarticulo) : '',
      nombre: idx.nombre >= 0 ? get(idx.nombre) : '',
      cantidad,
      precioUnitario,
      total,
    } satisfies VentaList;
  });
}

/**
 * Elimina una venta por su idventa.
 */
export async function eliminarVenta(idventa: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const ventasSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'ventas'
  );
  const sheetId = ventasSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontró la hoja ventas');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Venta no encontrada');
  }

  const headers = rows[0] as string[];
  const idventaCol = headers.findIndex((h) => h.toLowerCase() === 'idventa');

  let rowIndex: number;
  if (idventaCol >= 0) {
    rowIndex = rows.findIndex(
      (row, i) => i > 0 && String(row[idventaCol] ?? '').trim() === idventa.trim()
    );
  } else {
    const num = parseInt(idventa, 10);
    rowIndex = Number.isNaN(num) || num < 1 || num >= rows.length ? -1 : num;
  }
  if (rowIndex < 0) {
    throw new Error('Venta no encontrada');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/**
 * Actualiza una venta existente por idventa.
 */
export async function actualizarVenta(
  idventaAntiguo: string,
  venta: Partial<Omit<VentaList, 'idventa'>>
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Venta no encontrada');
  }

  const headers = rows[0] as string[];
  const headerIndex = (key: string) =>
    headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

  const idx = {
    idventa: headerIndex('idventa'),
    fecha: headerIndex('fecha'),
    idarticulo: headerIndex('idarticulo') >= 0 ? headerIndex('idarticulo') : headerIndex('articuloid'),
    nombre: headerIndex('nombre') >= 0 ? headerIndex('nombre') : headerIndex('articulonombre'),
    cantidad: headerIndex('cantidad'),
    total: headerIndex('total'),
  };

  let rowIndex: number;
  if (idx.idventa >= 0) {
    rowIndex = rows.findIndex(
      (row, i) => i > 0 && String(row[idx.idventa] ?? '').trim() === idventaAntiguo.trim()
    );
  } else {
    const num = parseInt(idventaAntiguo, 10);
    rowIndex = Number.isNaN(num) || num < 1 ? -1 : num;
  }
  if (rowIndex < 0 || rowIndex >= rows.length) {
    throw new Error('Venta no encontrada');
  }

  const sheetRow = rowIndex + 1;
  const ventas = await getVentas();
  const actual = ventas.find((v) => v.idventa.trim() === idventaAntiguo.trim());
  if (!actual) throw new Error('Venta no encontrada');

  const nueva = {
    idventa: actual.idventa,
    fecha: venta.fecha ?? actual.fecha,
    idarticulo: venta.idarticulo ?? actual.idarticulo,
    nombre: venta.nombre ?? actual.nombre,
    cantidad: venta.cantidad ?? actual.cantidad,
    precioUnitario: venta.precioUnitario ?? actual.precioUnitario,
    total: venta.total ?? actual.total,
  };

  const range = `'ventas'!A${sheetRow}:G${sheetRow}`;
  const values = [[nueva.idventa, nueva.fecha, nueva.idarticulo, nueva.nombre, nueva.cantidad, nueva.precioUnitario, nueva.total]];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Genera el siguiente idventa automáticamente (secuencial).
 */
export async function generarSiguienteIdVenta(): Promise<string> {
  const ventas = await getVentas();
  let max = 0;
  for (const v of ventas) {
    const n = parseInt(v.idventa, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Inserta una nueva fila en la pestaña 'ventas'.
 * El idventa se genera automáticamente.
 */
export async function insertarVenta(venta: Venta): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const idventa = await generarSiguienteIdVenta();

  const values = [
    [
      idventa,
      venta.fecha,
      venta.articuloId,
      venta.articuloNombre,
      venta.cantidad,
      venta.precioUnitario,
      venta.total,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'ventas'!A:G",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
}