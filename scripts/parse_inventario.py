"""
Parsea el reporte "Inventario General" (InventarioGral.csv) exportado del
sistema legado y lo convierte a un JSON intermedio listo para importar como
Product (scripts/import_legacy_products management command).

Formato del CSV (';' delimitado, encoding cp1252):
  - 9 líneas de encabezado de reporte a ignorar.
  - Filas de datos: Producto (código legado, numérico o alfanumérico, sin
    valor de negocio) ; Descripción (nombre real) ; ; Existencia (negativa,
    representa salidas acumuladas del sistema viejo) ; Medida.
  - Filas "Total Depósito:" y ";;Total General:" al final a ignorar.

Reglas:
  - name = Descripción tal cual.
  - stock = abs(Existencia) (se decidió usar el valor absoluto del negativo).
  - price = 0, is_active = False (no hay precio en este reporte).
  - category = "Sin categorizar" (se crea en el import command si no existe).
  - No se deduplica por nombre: se respeta el archivo tal cual, incluso si
    hay dos filas con la misma Descripción y distinto código legado.

Uso:
    python parse_inventario.py <entrada.csv> <salida.json>
"""
import csv
import json
import sys


def parse_existencia(s):
    s = (s or '').strip()
    if not s:
        return 0
    return abs(int(float(s.replace('.', '').replace(',', '.'))))


ENCABEZADOS_REPORTE = {'Producto', 'Grupo:', 'Marca:', 'Sucursal:', 'Familia:', 'Depósito:'}


def es_fila_valida(row):
    if len(row) < 5:
        return False
    codigo = row[0].strip()
    if not codigo or codigo.startswith('Total') or codigo in ENCABEZADOS_REPORTE:
        return False
    descripcion = row[1].strip()
    if not descripcion:
        return False
    return True


def main(entrada, salida):
    productos = []
    errores = []

    with open(entrada, encoding='cp1252', newline='') as f:
        reader = csv.reader(f, delimiter=';')
        rows = list(reader)

    for row in rows:
        if not es_fila_valida(row):
            continue
        try:
            codigo = row[0].strip()
            descripcion = row[1].strip()
            existencia_raw = row[3].strip()
            medida = row[4].strip() if len(row) > 4 else ''
            productos.append({
                'legacy_code': codigo,
                'name': descripcion,
                'stock': parse_existencia(existencia_raw),
                'unit': medida,
            })
        except Exception as e:
            errores.append({'fila': row, 'error': str(e)})

    resumen = {
        'total_productos': len(productos),
        'stock_total': sum(p['stock'] for p in productos),
        'sin_stock': sum(1 for p in productos if p['stock'] == 0),
        'errores': len(errores),
    }

    with open(salida, 'w', encoding='utf-8') as f:
        json.dump({'productos': productos, 'resumen': resumen, 'errores': errores[:200]}, f, ensure_ascii=False, indent=2)

    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Uso: python parse_inventario.py <entrada.csv> <salida.json>')
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
