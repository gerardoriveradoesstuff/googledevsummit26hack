#!/usr/bin/env python3
"""Genera database/seed.sql y mcp/fixtures/seed-data.json con los mismos datos demo.

Las fechas son relativas a "hoy" (CURDATE() / NOW() en MySQL, hora -07:00) para que el
demo siempre se vea al día, sin importar cuándo se aplique el seed.

    python3 database/generar_seed.py
"""
from __future__ import annotations

import json
import random
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
rng = random.Random(2026)

# usuario y contrasena siguen el formato real de api/lib/puerta.php:
#   usuario = usuarioDesdeNombre(nombre)  (2+2+2 letras de 3 palabras, 3+3 de 2, 6 de 1)
#   contrasena = nuevaContrasena()        (dígito 2-9 + 2 letras de ABCDEFGHJKLMNPQRSTUVWXYZ)
CLIENTES = [
    dict(nombre="Araujos Mexican Grill", usuario="armegr", contrasena="7KM",
         direccion="2125 Story Rd, San Jose, CA 95122",
         extra=["Entrega por la puerta de cocina, atrás", "Recibe: Don Chuy"],
         p=0.65, cierran=["Chuy", "Lupita", "Marco"],
         productos=["Tomate", "Cebolla blanca", "Cilantro", "Aguacate", "Limón", "Jalapeño",
                    "Lechuga romana", "Tomatillo", "Serrano", "Repollo", "Rábano", "Papa"]),
    dict(nombre="Taquería La Palma", usuario="talapa", contrasena="4RT",
         direccion="2884 24th St, San Francisco, CA 94110",
         extra=["Zona de carga en Bryant St antes de las 9 am"],
         p=0.35, cierran=["Rosa", "Beto"],
         productos=["Tomate", "Cebolla blanca", "Cilantro", "Aguacate", "Limón", "Jalapeño",
                    "Rábano", "Repollo", "Tomatillo"]),
    dict(nombre="Mariscos El Güero", usuario="maelgu", contrasena="9HX",
         direccion="2427 E Cesar E Chavez Ave, Los Angeles, CA 90033",
         extra=["Llamar al llegar: (323) 555-0142"],
         p=0.25, cierran=["Güero", "Nayeli"],
         productos=["Limón", "Pepino", "Cebolla morada", "Cilantro", "Tomate", "Aguacate",
                    "Serrano", "Mango"]),
    dict(nombre="Cocina Oaxaqueña Guelaguetza", usuario="cooagu", contrasena="3PN",
         direccion="3014 W Olympic Blvd, Los Angeles, CA 90006",
         extra=["Bodega por el callejón"],
         p=0.22, cierran=["Fernanda", "Bricia"],
         productos=["Tomate", "Tomatillo", "Cebolla blanca", "Ajo", "Cilantro", "Aguacate",
                    "Limón", "Chile pasilla", "Repollo", "Rábano"]),
    dict(nombre="Pupusería San Miguel", usuario="pusami", contrasena="6WD",
         direccion="2632 Middlefield Rd, Redwood City, CA 94063",
         extra=[],
         p=0.25, cierran=["Doña Marta", "Kevin"],
         productos=["Repollo", "Zanahoria", "Cebolla blanca", "Tomate", "Jalapeño", "Ajo",
                    "Pimentón"]),
    dict(nombre="Tacos Los Primos", usuario="talopr", contrasena="5BJ",
         direccion="1950 University Ave, East Palo Alto, CA 94303",
         extra=["Truck estacionado atrás del local después de las 11 am"],
         p=0.25, cierran=["Primo Luis", "Primo Juan"],
         productos=["Cebolla blanca", "Cilantro", "Limón", "Jalapeño", "Tomate", "Aguacate",
                    "Rábano", "Pepino"]),
    dict(nombre="Pho Saigon Kitchen", usuario="phsaki", contrasena="8ZQ",
         direccion="1688 Tully Rd, San Jose, CA 95122",
         extra=["Recibe: Mr. Tran"],
         p=0.25, cierran=["Tran", "Linh"],
         productos=["Germinado de soya", "Albahaca tailandesa", "Limón", "Jalapeño", "Cilantro",
                    "Cebollín", "Cebolla blanca", "Ajo"]),
    dict(nombre="Green Fork Café", usuario="grfoca", contrasena="2LV",
         direccion="2190 Shattuck Ave, Berkeley, CA 94704",
         extra=["Factura a nombre de Green Fork LLC"],
         p=0.2, cierran=["Sam", "Priya"],
         productos=["Lechuga romana", "Espinaca", "Aguacate", "Tomate", "Pepino", "Limón",
                    "Cebolla morada", "Calabacín", "Naranja"]),
    dict(nombre="Sabor de Michoacán", usuario="sademi", contrasena="3YC",
         direccion="411 W 4th St, Santa Ana, CA 92701",
         extra=[],
         p=0.15, cierran=["Don Rigo"],
         productos=["Tomate", "Cebolla blanca", "Cilantro", "Limón", "Aguacate", "Chile pasilla",
                    "Papa", "Piña"]),
    dict(nombre="El Farolito Cocina", usuario="elfaco", contrasena="7GF",
         direccion="4817 International Blvd, Oakland, CA 94601",
         extra=["Cerrado los lunes"],
         p=0.2, cierran=["Memo", "Alicia"],
         productos=["Tomate", "Cebolla blanca", "Cilantro", "Aguacate", "Limón", "Jalapeño",
                    "Lechuga romana", "Tomatillo", "Papa"]),
]

# nombre -> (unidad, generador de cantidad)
def entero(a, b):
    return lambda: float(rng.randint(a, b))

def pasos(a, b, paso):
    n = int(round((b - a) / paso))
    return lambda: round(a + paso * rng.randint(0, n), 2)

PRODUCTOS = {
    "Tomate": ("caja", pasos(2, 8, 0.5)),
    "Tomatillo": ("lb", pasos(5, 20, 2.5)),
    "Cebolla blanca": ("caja", pasos(1, 5, 0.5)),
    "Cebolla morada": ("caja", pasos(0.5, 3, 0.5)),
    "Cilantro": ("caja", pasos(0.5, 3, 0.5)),
    "Aguacate": ("caja", entero(2, 10)),
    "Limón": ("caja", pasos(1, 6, 0.5)),
    "Jalapeño": ("lb", pasos(5, 25, 2.5)),
    "Serrano": ("lb", pasos(2, 8, 0.5)),
    "Chile pasilla": ("lb", pasos(1, 4, 0.25)),
    "Lechuga romana": ("caja", entero(1, 4)),
    "Espinaca": ("caja", pasos(0.5, 3, 0.5)),
    "Repollo": ("pieza", entero(4, 16)),
    "Rábano": ("lb", pasos(2, 6, 0.5)),
    "Papa": ("kg", pasos(10, 25, 2.5)),
    "Zanahoria": ("kg", pasos(4, 12, 0.75)),
    "Ajo": ("lb", pasos(1, 5, 0.5)),
    "Pepino": ("caja", pasos(1, 4, 0.5)),
    "Pimentón": ("caja", pasos(0.5, 2, 0.5)),
    "Calabacín": ("caja", pasos(0.5, 2, 0.5)),
    "Naranja": ("caja", entero(1, 3)),
    "Mango": ("caja", entero(1, 3)),
    "Piña": ("pieza", entero(4, 12)),
    "Germinado de soya": ("lb", pasos(10, 30, 2.5)),
    "Albahaca tailandesa": ("lb", pasos(1, 4, 0.25)),
    "Cebollín": ("caja", pasos(0.5, 2, 0.5)),
}

DIAS = range(-21, 4)  # 3 semanas atrás .. 3 días adelante
# Pedidos atrasados sin procesar (la historia del WhatsApp perdido).
ATRASADOS = {("talapa", -1), ("elfaco", -2)}

pedidos = []
for f in DIAS:
    factor = {0: 2.2, 1: 1.6, 2: 0.7, 3: 0.4}.get(f, 0.8)
    for c in CLIENTES:
        if c["usuario"] == "elfaco" and f % 7 == 4:  # "cerrado los lunes" aproximado
            continue
        if rng.random() > c["p"] * factor:
            continue
        n = rng.randint(4, min(8, len(c["productos"])))
        elegidos = rng.sample(c["productos"], n)
        lineas = []
        for nombre in elegidos:
            unidad, gen = PRODUCTOS[nombre]
            lineas.append({"nombre": nombre, "unidad": unidad, "cantidad": gen()})
        # recibido: la noche anterior (o hoy, pocos minutos atrás, si cae en el futuro)
        dia_rec = min(f - 1, 0) if rng.random() < 0.85 else min(f, 0)
        hora = f"{rng.randint(17, 22):02d}:{rng.choice([5, 12, 20, 34, 41, 47, 55]):02d}:00"
        if dia_rec == f:
            hora = f"{rng.randint(6, 8):02d}:{rng.choice([3, 15, 28, 44]):02d}:00"
        proc_hora = f"0{rng.randint(5, 7)}:{rng.choice([10, 25, 40, 50])}:00"
        if dia_rec == f:  # pedido del mismo día: se procesa ~2 h después de recibirlo
            h, m, _ = map(int, hora.split(":"))
            proc_hora = f"{h + 2:02d}:{m:02d}:00"
        if f < 0:
            procesado = (c["usuario"], f) not in ATRASADOS
        elif f == 0:
            procesado = rng.random() < 0.5
        else:
            procesado = False
        pedidos.append({
            "cliente": c["usuario"],
            "fecha_offset": f,
            "recibido_dia": dia_rec,
            "recibido_hora": hora,
            "cerrado_por": rng.choice(c["cierran"]),
            "procesado": procesado,
            "procesado_hora": proc_hora,
            "lineas": lineas,
        })

# Forzar los atrasados si el azar no los generó.
for usuario, f in sorted(ATRASADOS):
    if not any(p["cliente"] == usuario and p["fecha_offset"] == f for p in pedidos):
        c = next(x for x in CLIENTES if x["usuario"] == usuario)
        lineas = [{"nombre": n, "unidad": PRODUCTOS[n][0], "cantidad": PRODUCTOS[n][1]()}
                  for n in c["productos"][:5]]
        pedidos.append({"cliente": usuario, "fecha_offset": f, "recibido_dia": f - 1,
                        "recibido_hora": "21:12:00", "cerrado_por": c["cierran"][0],
                        "procesado": False, "procesado_hora": "06:00:00", "lineas": lineas})

# Recortar historia vieja para quedar en ~55 pedidos (sin tocar hoy, mañana ni atrasados).
while len(pedidos) > 56:
    viejos = [p for p in pedidos if p["fecha_offset"] < -2 and p["procesado"]]
    pedidos.remove(rng.choice(viejos))

pedidos.sort(key=lambda p: (p["recibido_dia"], p["recibido_hora"], p["fecha_offset"]))
# minutos_atras: orden estable para los recibidos "hoy" (siempre en el pasado)
hoy = [p for p in pedidos if p["recibido_dia"] == 0]
for i, p in enumerate(hoy):
    p["minutos_atras"] = (len(hoy) - i) * 17

def q(s: str) -> str:
    return "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"

def ts(dia: int, hora: str) -> str:
    return f"TIMESTAMP(CURDATE() - INTERVAL {-dia} DAY, '{hora}')" if dia <= 0 else \
        f"TIMESTAMP(CURDATE() + INTERVAL {dia} DAY, '{hora}')"

def fecha(dia: int) -> str:
    return f"CURDATE() - INTERVAL {-dia} DAY" if dia <= 0 else f"CURDATE() + INTERVAL {dia} DAY"

usuarios = ", ".join(q(c["usuario"]) for c in CLIENTES)
sql = [
    "-- Datos demo para Distribuidora de Productos. GENERADO por database/generar_seed.py; no editar a mano.",
    "-- Aplicar DESPUÉS de schema.sql:",
    "--   mysql -u root distribuidora < database/seed.sql",
    "-- Idempotente: primero borra solo las cuentas demo (por usuario) con sus pedidos y líneas,",
    "-- luego las vuelve a crear. Cuentas creadas a mano desde el panel no se tocan.",
    "-- Fechas relativas a hoy (CURDATE()/NOW() en -07:00) para que el inbox siempre se vea al día.",
    f"-- {len(CLIENTES)} clientes, {len(pedidos)} pedidos, {sum(len(p['lineas']) for p in pedidos)} líneas.",
    "",
    "SET NAMES utf8mb4;",
    "SET time_zone = '-07:00';",
    "",
    "-- 1. Borrar demo previo (hijos primero por las llaves foráneas).",
    "DELETE pl FROM pedido_lineas pl JOIN pedidos p ON p.id = pl.pedido_id JOIN clientes c ON c.id = p.cliente_id",
    f"  WHERE c.usuario IN ({usuarios});",
    f"DELETE p FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.usuario IN ({usuarios});",
    f"DELETE FROM clientes WHERE usuario IN ({usuarios});",
    "",
    "-- Reinicia contadores (MySQL/MariaDB los suben solos a MAX(id)+1 si quedan filas).",
    "ALTER TABLE pedido_lineas AUTO_INCREMENT = 1;",
    "ALTER TABLE pedidos AUTO_INCREMENT = 1;",
    "ALTER TABLE clientes AUTO_INCREMENT = 1;",
    "",
    "START TRANSACTION;",
    "-- 2. Clientes.",
    "INSERT INTO clientes (nombre, direccion, direccion_extra, usuario, contrasena, creado_en) VALUES",
]
filas = []
for i, c in enumerate(CLIENTES):
    extra = q("\n".join(c["extra"])) if c["extra"] else "NULL"
    filas.append(f"  ({q(c['nombre'])}, {q(c['direccion'])}, {extra}, {q(c['usuario'])}, "
                 f"{q(c['contrasena'])}, {ts(-45 + i, '10:00:00')})")
sql.append(",\n".join(filas) + ";")
sql += ["", "-- 3. Pedidos y líneas (en orden de llegada, así el número crece con el tiempo)."]
for p in pedidos:
    if p["recibido_dia"] == 0:
        rec = f"NOW() - INTERVAL {p['minutos_atras']} MINUTE"
    else:
        rec = ts(p["recibido_dia"], p["recibido_hora"])
    if p["procesado"]:
        proc = f"LEAST({ts(p['fecha_offset'], p['procesado_hora'])}, NOW() - INTERVAL 5 MINUTE)"
        if p["recibido_dia"] == 0:
            proc = "NOW() - INTERVAL 3 MINUTE"
    else:
        proc = "NULL"
    sql.append(
        "INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) "
        f"SELECT id, {fecha(p['fecha_offset'])}, {q(p['cerrado_por'])}, NULL, {rec}, {1 if p['procesado'] else 0}, {proc} "
        f"FROM clientes WHERE usuario = {q(p['cliente'])};"
    )
    sql.append("SET @p = LAST_INSERT_ID();")
    vals = ", ".join(f"(@p, {q(l['nombre'])}, {q(l['unidad'])}, {l['cantidad']:.2f})" for l in p["lineas"])
    sql.append(f"INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES {vals};")
sql += ["", "COMMIT;", ""]
(RAIZ / "database" / "seed.sql").write_text("\n".join(sql), encoding="utf-8")

fixture = {
    "nota": "Generado por database/generar_seed.py. Mismos datos que database/seed.sql. "
            "Fechas como desplazamientos en días respecto a hoy (America/Los_Angeles).",
    "clientes": [{k: c[k] for k in ("nombre", "direccion", "usuario", "contrasena")}
                 | {"direccion_extra": "\n".join(c["extra"])} for c in CLIENTES],
    "pedidos": pedidos,
}
(RAIZ / "mcp" / "fixtures" / "seed-data.json").write_text(
    json.dumps(fixture, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(CLIENTES)} clientes, {len(pedidos)} pedidos, "
      f"{sum(len(p['lineas']) for p in pedidos)} líneas")
