"""
Parsea el reporte "Estado de Cuentas de Clientes" (CtaCteDetallado.csv) exportado
del sistema contable legado y lo convierte a un JSON intermedio listo para importar
a AmbuRush... digo, a Proyecto_Tienda (Customer -> Sale -> Installment).

El CSV es un reporte de cuenta corriente, no una tabla plana:
  - Encabezado de reporte (6 líneas) a ignorar.
  - Por cliente: línea "CI;NOMBRE;;;..." seguida de la fila de columnas,
    N filas de movimiento (Boleta = cargo/cuota, Rec. = recibo/pago),
    y una fila "TOTAL;NOMBRE;...".

Reglas de reconstrucción:
  - Cada número de Boleta agrupa las cuotas de una Sale distinta.
    El total de cuotas de esa Sale sale del denominador de la columna
    "Cuota" (ej. "4/.10" -> cuota 4 de 10).
  - Los "Rec." son abonos a la cuenta corriente del cliente, NO pagos que
    calcen 1:1 con el monto de una cuota (hay pagos parciales y montos
    arbitrarios). Se suman TODOS los Haber del cliente y se consumen en
    orden FIFO contra las cuotas ordenadas por vencimiento: cada cuota
    que el acumulado alcanza a cubrir por completo queda PAID (con fecha
    de pago = fecha del último recibo que la terminó de cubrir); si el
    acumulado corta a mitad de una cuota, esa cuota NO se marca como
    pagada (el modelo no soporta "parcialmente pagada").
  - Cuota no cubierta por el acumulado: OVERDUE si venció, si no PENDING.

Uso:
    python parse_ctacte.py <entrada.csv> <salida.json>
"""
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, date


def parse_fecha(s):
    s = (s or '').strip()
    if not s:
        return None
    return datetime.strptime(s, '%d/%m/%Y').date()


def parse_monto(s):
    s = (s or '').strip()
    if not s:
        return None
    # formato local: puntos de miles, coma decimal -> "1.234.567,89"
    s = s.replace('.', '').replace(',', '.')
    return float(s)


def limpiar_ci(raw):
    raw = (raw or '').strip()
    # algunos vienen "1009529-2" -> nos quedamos con la parte numérica principal
    return raw.split('-')[0].strip()


def es_inicio_cliente(row):
    if len(row) < 2:
        return False
    ci, nombre = row[0].strip(), row[1].strip()
    if not ci or not nombre:
        return False
    if ci in ('TOTAL',):
        return False
    return ci[0].isdigit()


def es_fila_columnas(row):
    return row and row[0].strip() == 'Fecha'


def es_total(row):
    return row and row[0].strip() == 'TOTAL'


def procesar_bloque_cliente(ci, nombre, filas_mov):
    """filas_mov: lista de dicts ya parseados (fecha, vencimiento, comprobante, cuota, debe, haber)"""
    boletas = defaultdict(list)  # comprobante -> lista de cuotas (dict)
    entregas_iniciales = defaultdict(float)  # comprobante -> monto de entrega inicial (denominador .0)
    recibos_por_boleta = defaultdict(list)

    orden = 0
    for f in filas_mov:
        orden += 1
        comprobante = f['comprobante']
        if comprobante.startswith('Boleta'):
            num, total = f['cuota_raw'].split('/.')
            if total == '0':
                # entrega inicial / anticipo, no es una cuota financiada
                entregas_iniciales[comprobante] += f['debe'] or 0
                continue
            boletas[comprobante].append({
                'orden': orden,
                'number': int(num),
                'installment_count': int(total),
                'fecha_emision': f['fecha'],
                'due_date': f['vencimiento'],
                'amount': f['debe'],
            })
        elif comprobante.startswith('Rec'):
            recibos_por_boleta[None].append({
                'orden': orden,
                'fecha': f['fecha'],
                'monto': f['haber'],
                'ref': comprobante,
            })

    # Los recibos no traen el número de boleta a la que pertenecen en este
    # reporte (aparecen mezclados a nivel cliente). Se tratan como abonos a
    # la cuenta corriente del cliente: se suman todos los Haber y se
    # consumen en orden FIFO contra las cuotas ordenadas por vencimiento.
    todas_cuotas = []
    for comprobante, cuotas in boletas.items():
        for c in cuotas:
            c['comprobante'] = comprobante
            todas_cuotas.append(c)
    todas_cuotas.sort(key=lambda c: (c['due_date'] or date.max, c['orden']))

    todos_recibos = sorted(recibos_por_boleta[None], key=lambda r: (r['fecha'] or date.max, r['orden']))
    total_abonado = sum(r['monto'] for r in todos_recibos if r['monto'] is not None)

    hoy = date.today()
    saldo_disponible = total_abonado
    ultima_fecha_pago = todos_recibos[-1]['fecha'] if todos_recibos else None

    for cuota in todas_cuotas:
        monto = cuota['amount'] or 0
        if saldo_disponible >= monto - 0.01:
            cuota['status'] = 'PAID'
            cuota['paid_date'] = ultima_fecha_pago.isoformat() if ultima_fecha_pago else None
            cuota['paid_amount'] = monto
            saldo_disponible -= monto
        else:
            due = cuota['due_date']
            cuota['status'] = 'OVERDUE' if (due and due < hoy) else 'PENDING'
            cuota['paid_date'] = None
            cuota['paid_amount'] = None

    recibos_sin_match = []  # ya no aplica con el modelo de saldo acumulado; se deja por compatibilidad

    ventas = []
    comprobantes_solo_entrega = set(entregas_iniciales) - set(boletas)

    for comprobante, cuotas in boletas.items():
        # deduplicar filas idénticas (mismo número/monto/vencimiento) que
        # aparecen repetidas por error de carga en el sistema legado
        vistas = set()
        cuotas_unicas = []
        for c in cuotas:
            clave = (c['number'], c['amount'], c['due_date'])
            if clave in vistas:
                continue
            vistas.add(clave)
            cuotas_unicas.append(c)
        cuotas = cuotas_unicas

        cuotas_ordenadas = sorted(cuotas, key=lambda c: c['number'])
        entrega = entregas_iniciales.get(comprobante, 0)
        ventas.append({
            'comprobante': comprobante,
            'installment_count': cuotas_ordenadas[0]['installment_count'],
            'entrega_inicial': round(entrega, 2),
            'sale_date': min(c['fecha_emision'] for c in cuotas_ordenadas if c['fecha_emision']).isoformat(),
            'total_amount': round(entrega + sum(c['amount'] for c in cuotas_ordenadas if c['amount']), 2),
            'installments': [
                {
                    'number': c['number'],
                    'amount': c['amount'],
                    'due_date': c['due_date'].isoformat() if c['due_date'] else None,
                    'status': c['status'],
                    'paid_date': c['paid_date'],
                    'paid_amount': c['paid_amount'],
                }
                for c in cuotas_ordenadas
            ],
        })

    # Boletas que solo tuvieron entrega inicial (sin cuotas financiadas):
    # se registran como venta de contado ya cobrada, para no perder el ingreso.
    for comprobante in comprobantes_solo_entrega:
        entrega = entregas_iniciales[comprobante]
        fila = next(f for f in filas_mov if f['comprobante'] == comprobante)
        ventas.append({
            'comprobante': comprobante,
            'installment_count': 1,
            'entrega_inicial': round(entrega, 2),
            'sale_date': fila['fecha'].isoformat(),
            'total_amount': round(entrega, 2),
            'installments': [{
                'number': 1,
                'amount': round(entrega, 2),
                'due_date': fila['fecha'].isoformat(),
                'status': 'PAID',
                'paid_date': fila['fecha'].isoformat(),
                'paid_amount': round(entrega, 2),
            }],
        })

    return {
        'document_number': limpiar_ci(ci),
        'full_name': nombre.strip(),
        'sales': ventas,
        'recibos_sin_match': len(recibos_sin_match),
    }


def main(entrada, salida):
    clientes = []
    errores = []

    with open(entrada, encoding='cp1252', newline='') as f:
        reader = csv.reader(f, delimiter=';')
        rows = list(reader)

    i = 0
    n = len(rows)
    # saltar encabezado de reporte hasta la primera fila que parece inicio de cliente
    while i < n and not es_inicio_cliente(rows[i]):
        i += 1

    while i < n:
        row = rows[i]
        if not es_inicio_cliente(row):
            i += 1
            continue

        ci, nombre = row[0].strip(), row[1].strip()
        i += 1
        if i < n and es_fila_columnas(rows[i]):
            i += 1

        filas_mov = []
        while i < n and not es_total(rows[i]):
            r = rows[i]
            if len(r) < 10 or not r[2].strip():
                i += 1
                continue
            try:
                filas_mov.append({
                    'fecha': parse_fecha(r[0]),
                    'vencimiento': parse_fecha(r[1]),
                    'comprobante': r[2].strip(),
                    'cuota_raw': r[4].strip(),
                    'debe': parse_monto(r[8]),
                    'haber': parse_monto(r[9]),
                })
            except Exception as e:
                errores.append({'cliente': f'{ci} {nombre}', 'fila': r, 'error': str(e)})
            i += 1

        try:
            cliente = procesar_bloque_cliente(ci, nombre, filas_mov)
            clientes.append(cliente)
        except Exception as e:
            errores.append({'cliente': f'{ci} {nombre}', 'error': str(e)})

        if i < n and es_total(rows[i]):
            i += 1
        while i < n and not rows[i]:
            i += 1

    resumen = {
        'total_clientes': len(clientes),
        'total_ventas': sum(len(c['sales']) for c in clientes),
        'total_cuotas': sum(len(s['installments']) for c in clientes for s in c['sales']),
        'cuotas_pagadas': sum(1 for c in clientes for s in c['sales'] for ins in s['installments'] if ins['status'] == 'PAID'),
        'cuotas_pendientes': sum(1 for c in clientes for s in c['sales'] for ins in s['installments'] if ins['status'] == 'PENDING'),
        'cuotas_vencidas': sum(1 for c in clientes for s in c['sales'] for ins in s['installments'] if ins['status'] == 'OVERDUE'),
        'clientes_con_recibos_sin_match': sum(1 for c in clientes if c['recibos_sin_match'] > 0),
        'errores': len(errores),
    }

    with open(salida, 'w', encoding='utf-8') as f:
        json.dump({'clientes': clientes, 'resumen': resumen, 'errores': errores[:200]}, f, ensure_ascii=False, indent=2)

    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Uso: python parse_ctacte.py <entrada.csv> <salida.json>')
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
