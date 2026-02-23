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

export interface Proveedor {
  idproveedor: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
}

export interface Cliente {
  idcliente: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaCreacion: string;
}

/** Compra tal como se muestra en la lista: idcompra, fecha, proveedor, idarticulo, articulo, cantidad, precio */
export interface CompraList {
  idcompra: string;
  fecha: string;
  proveedor: string;
  idarticulo: string;
  articulo: string;
  cantidad: number;
  precio: number;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID ?? '';
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : id;
}

function parsePrivateKey(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  let key = raw
    .replace(/\\n/g, '\n')        // literales \n
    .replace(/\r\n/g, '\n')       // Windows line endings
    .replace(/\r/g, '\n')         // Mac antiguo
    .trim();
  // Quita comillas externas si Vercel las añadió
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).replace(/\\n/g, '\n');
  }
  return key;
}

export async function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Faltan credenciales de Google. Configura GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY en las variables de entorno de Vercel.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
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
 * Actualiza precio y stock de un artículo (para compras).
 * Suma cantidadAAgregar al stock actual y establece nuevoPrecio.
 */
export async function actualizarPrecioYStockArticulo(
  idarticulo: string,
  nuevoPrecio: number,
  cantidadAAgregar: number
): Promise<void> {
  if (!idarticulo?.trim()) return;

  const articulos = await getArticulos();
  const articulo = articulos.find(
    (a) => a.idarticulo.trim().toLowerCase() === idarticulo.trim().toLowerCase()
  );
  if (!articulo) {
    throw new Error('Artículo no encontrado');
  }

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
  const precioCol = findCol(['precio']);
  const stockCol = findCol(['stock', 'existencia', 'inventario']);
  if (idCol < 0 || precioCol < 0 || stockCol < 0) {
    throw new Error(
      `Columnas no encontradas en articulos. Encontradas: ${JSON.stringify(headers)}`
    );
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === idarticulo.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Artículo no encontrado');
  }

  const nuevoStock = articulo.stock + cantidadAAgregar;
  const sheetRow = rowIndex + 1;
  const toCol = (n: number): string =>
    n < 26 ? String.fromCharCode(65 + n) : toCol(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
  const precioCell = `${toCol(precioCol)}${sheetRow}`;
  const stockCell = `${toCol(stockCol)}${sheetRow}`;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${sheetTitle}'!${precioCell}`, values: [[nuevoPrecio]] },
        { range: `'${sheetTitle}'!${stockCell}`, values: [[nuevoStock]] },
      ],
    },
  });
}

/**
 * Resta stock de un artículo (revierte una compra eliminada o editada).
 */
export async function restarStockArticulo(idarticulo: string, cantidad: number): Promise<void> {
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
    throw new Error(`Stock insuficiente para revertir. Disponible: ${articulo.stock}`);
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

// ─── Proveedores ────────────────────────────────────────────────────────────

/**
 * Obtiene todos los datos de la pestaña 'proveedores'.
 */
export async function getProveedores(): Promise<Proveedor[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'proveedores'!A:Z",
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
    id: headerIndex(['id', 'idproveedor', 'id proveedor', 'codigo', 'código']),
    nombre: headerIndex(['nombre']),
    telefono: headerIndex(['telefono', 'teléfono', 'phone']),
    email: headerIndex(['email', 'correo', 'e-mail']),
    direccion: headerIndex(['direccion', 'dirección', 'dir', 'address']),
    contacto: headerIndex(['contacto', 'persona contacto']),
  };

  return rows.slice(1).map((row) => {
    const get = (i: number) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '');
    return {
      idproveedor: idx.id >= 0 ? get(idx.id) : '',
      nombre: get(idx.nombre),
      telefono: idx.telefono >= 0 ? get(idx.telefono) || undefined : undefined,
      email: idx.email >= 0 ? get(idx.email) || undefined : undefined,
      direccion: idx.direccion >= 0 ? get(idx.direccion) || undefined : undefined,
      contacto: idx.contacto >= 0 ? get(idx.contacto) || undefined : undefined,
    } satisfies Proveedor;
  });
}

export interface ProveedorNuevo {
  idproveedor: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
}

export async function proveedorExiste(id: string): Promise<boolean> {
  const proveedores = await getProveedores();
  const buscado = id.trim().toLowerCase();
  return proveedores.some((p) => p.idproveedor.trim().toLowerCase() === buscado);
}

export async function insertarProveedor(proveedor: ProveedorNuevo): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = [
    [
      proveedor.idproveedor,
      proveedor.nombre,
      proveedor.telefono ?? '',
      proveedor.email ?? '',
      proveedor.direccion ?? '',
      proveedor.contacto ?? '',
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'proveedores'!A:F",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function actualizarProveedor(
  idAntiguo: string,
  proveedor: ProveedorNuevo
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'proveedores'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Proveedor no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idproveedor', 'id proveedor', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === idAntiguo.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Proveedor no encontrado');
  }

  const sheetRow = rowIndex + 1;
  const range = `'proveedores'!A${sheetRow}:F${sheetRow}`;
  const values = [
    [
      proveedor.idproveedor,
      proveedor.nombre,
      proveedor.telefono ?? '',
      proveedor.email ?? '',
      proveedor.direccion ?? '',
      proveedor.contacto ?? '',
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function eliminarProveedor(id: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const proveedoresSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'proveedores'
  );
  const sheetId = proveedoresSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontró la hoja proveedores');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'proveedores'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Proveedor no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idproveedor', 'id proveedor', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === id.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Proveedor no encontrado');
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

// ─── Compras ─────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las compras de la pestaña 'compras'.
 * Columnas: idcompra, fecha, proveedor, idarticulo, articulo, cantidad, precio
 */
export async function getCompras(): Promise<CompraList[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
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
    idcompra: headerIndex(['idcompra', 'id compra']),
    fecha: headerIndex(['fecha']),
    proveedor: headerIndex(['proveedor']),
    idarticulo: headerIndex(['idarticulo', 'id articulo', 'articuloid']),
    articulo: headerIndex(['articulo', 'nombre', 'articulonombre']),
    cantidad: headerIndex(['cantidad']),
    precio: headerIndex(['precio', 'preciounitario']),
  };

  return rows.slice(1).map((row, i) => {
    const get = (j: number) => (j >= 0 && row[j] !== undefined ? String(row[j]).trim() : '');
    const getNum = (j: number) => {
      const val = get(j);
      const n = parseFloat(val);
      return Number.isNaN(n) ? 0 : n;
    };

    const idcompra = idx.idcompra >= 0 ? get(idx.idcompra) : String(i + 1);
    return {
      idcompra,
      fecha: idx.fecha >= 0 ? get(idx.fecha) : '',
      proveedor: idx.proveedor >= 0 ? get(idx.proveedor) : '',
      idarticulo: idx.idarticulo >= 0 ? get(idx.idarticulo) : '',
      articulo: idx.articulo >= 0 ? get(idx.articulo) : '',
      cantidad: getNum(idx.cantidad),
      precio: getNum(idx.precio),
    } satisfies CompraList;
  });
}

export async function generarSiguienteIdCompra(): Promise<string> {
  const compras = await getCompras();
  let max = 0;
  for (const c of compras) {
    const n = parseInt(c.idcompra, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function insertarCompra(compra: Omit<CompraList, 'idcompra'>): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const idcompra = await generarSiguienteIdCompra();

  const values = [
    [
      idcompra,
      compra.fecha,
      compra.proveedor,
      compra.idarticulo,
      compra.articulo,
      compra.cantidad,
      compra.precio,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'compras'!A:G",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function actualizarCompra(
  idcompraAntiguo: string,
  compra: Partial<Omit<CompraList, 'idcompra'>>
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Compra no encontrada');
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
    idcompra: headerIndex(['idcompra', 'id compra']),
    fecha: headerIndex(['fecha']),
    proveedor: headerIndex(['proveedor']),
    idarticulo: headerIndex(['idarticulo', 'id articulo']),
    articulo: headerIndex(['articulo', 'nombre']),
    cantidad: headerIndex(['cantidad']),
    precio: headerIndex(['precio']),
  };
  const idCol = idx.idcompra >= 0 ? idx.idcompra : 0;

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim() === idcompraAntiguo.trim()
  );
  if (rowIndex < 0) {
    throw new Error('Compra no encontrada');
  }

  const compras = await getCompras();
  const actual = compras.find((c) => c.idcompra.trim() === idcompraAntiguo.trim());
  if (!actual) throw new Error('Compra no encontrada');

  const nueva = {
    idcompra: actual.idcompra,
    fecha: compra.fecha ?? actual.fecha,
    proveedor: compra.proveedor ?? actual.proveedor,
    idarticulo: compra.idarticulo ?? actual.idarticulo,
    articulo: compra.articulo ?? actual.articulo,
    cantidad: compra.cantidad ?? actual.cantidad,
    precio: compra.precio ?? actual.precio,
  };

  const sheetRow = rowIndex + 1;
  const range = `'compras'!A${sheetRow}:G${sheetRow}`;
  const values = [[nueva.idcompra, nueva.fecha, nueva.proveedor, nueva.idarticulo, nueva.articulo, nueva.cantidad, nueva.precio]];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function eliminarCompra(idcompra: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const comprasSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'compras'
  );
  const sheetId = comprasSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontró la hoja compras');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Compra no encontrada');
  }

  const headers = rows[0] as string[];
  const headerIndex = (keys: string[]) => {
    for (const key of keys) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === key.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = headerIndex(['idcompra', 'id compra']) >= 0 ? headerIndex(['idcompra', 'id compra']) : 0;

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim() === idcompra.trim()
  );
  if (rowIndex < 0) {
    throw new Error('Compra no encontrada');
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

// ─── Clientes ─────────────────────────────────────────────────────────────────

/**
 * Obtiene todos los datos de la pestaña 'clientes'.
 * Columnas: idcliente, nombre, telefono, email, direccion, fechaCreacion
 */
export async function getClientes(): Promise<Cliente[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'clientes'!A:Z",
    valueRenderOption: 'FORMATTED_VALUE',
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
  const fechaCreacionIdx = headerIndex([
    'fechacreacion',
    'fecha creacion',
    'fecha_creacion',
    'fecha alta',
    'fecha',
    'fechacrea',
    'creado',
    'created',
  ]);
  const idx = {
    id: headerIndex(['id', 'idcliente', 'id cliente', 'codigo', 'código']),
    nombre: headerIndex(['nombre']),
    telefono: headerIndex(['telefono', 'teléfono', 'phone']),
    email: headerIndex(['email', 'correo', 'e-mail']),
    direccion: headerIndex(['direccion', 'dirección', 'dir', 'address']),
    fechaCreacion: fechaCreacionIdx >= 0 ? fechaCreacionIdx : 5,
  };

  return rows.slice(1).map((row) => {
    const get = (i: number) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '');
    const getFecha = (i: number): string => {
      if (i < 0 || row[i] === undefined || row[i] === '') return '';
      const val = row[i];
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      const s = String(val).trim();
      return s;
    };
    return {
      idcliente: idx.id >= 0 ? get(idx.id) : '',
      nombre: get(idx.nombre),
      telefono: idx.telefono >= 0 ? get(idx.telefono) || undefined : undefined,
      email: idx.email >= 0 ? get(idx.email) || undefined : undefined,
      direccion: idx.direccion >= 0 ? get(idx.direccion) || undefined : undefined,
      fechaCreacion: getFecha(idx.fechaCreacion),
    } satisfies Cliente;
  });
}

export interface ClienteNuevo {
  idcliente: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaCreacion: string;
}

export async function clienteExiste(id: string): Promise<boolean> {
  const clientes = await getClientes();
  const buscado = id.trim().toLowerCase();
  return clientes.some((c) => c.idcliente.trim().toLowerCase() === buscado);
}

export async function generarSiguienteIdCliente(): Promise<string> {
  const clientes = await getClientes();
  let max = 0;
  for (const c of clientes) {
    const n = parseInt(c.idcliente, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function insertarCliente(cliente: ClienteNuevo): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = [
    [
      cliente.idcliente,
      cliente.nombre,
      cliente.telefono ?? '',
      cliente.email ?? '',
      cliente.direccion ?? '',
      cliente.fechaCreacion,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'clientes'!A:F",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function actualizarCliente(
  idAntiguo: string,
  cliente: ClienteNuevo
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'clientes'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Cliente no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idcliente', 'id cliente', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === idAntiguo.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Cliente no encontrado');
  }

  const sheetRow = rowIndex + 1;
  const range = `'clientes'!A${sheetRow}:F${sheetRow}`;
  const values = [
    [
      cliente.idcliente,
      cliente.nombre,
      cliente.telefono ?? '',
      cliente.email ?? '',
      cliente.direccion ?? '',
      cliente.fechaCreacion,
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function eliminarCliente(id: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const clientesSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'clientes'
  );
  const sheetId = clientesSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontró la hoja clientes');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'clientes'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Cliente no encontrado');
  }

  const headers = rows[0] as string[];
  const findCol = (names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = findCol(['id', 'idcliente', 'id cliente', 'codigo', 'código']);
  if (idCol < 0) {
    throw new Error(`Columna id no encontrada. Columnas disponibles: ${JSON.stringify(headers)}`);
  }

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim().toLowerCase() === id.trim().toLowerCase()
  );
  if (rowIndex < 0) {
    throw new Error('Cliente no encontrado');
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