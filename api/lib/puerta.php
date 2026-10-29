<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/labels.php';

const PORTAL_URL = 'https://demo.ouwap.com/portal';

function nuevaContrasena(): string
{
    $letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $tope = strlen($letras) - 1;
    $numero = (string) random_int(2, 9);

    return $numero . $letras[random_int(0, $tope)] . $letras[random_int(0, $tope)];
}

function usuarioDesdeNombre(string $nombre): string
{
    $mapa = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n'];
    $base = strtr(mb_strtolower(trim($nombre), 'UTF-8'), $mapa);
    $partes = preg_split('/[^a-z0-9]+/u', $base, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($partes) || $partes === []) {
        return 'cliente';
    }
    $tomar = static function (string $palabra, int $n): string {
        return mb_substr($palabra, 0, $n, 'UTF-8');
    };
    $cuantas = count($partes);
    if ($cuantas === 1) {
        return $tomar((string) $partes[0], 6);
    }
    if ($cuantas === 2) {
        return $tomar((string) $partes[0], 3) . $tomar((string) $partes[1], 3);
    }

    return $tomar((string) $partes[0], 2) . $tomar((string) $partes[1], 2) . $tomar((string) $partes[2], 2);
}

function usuarioLibre(PDO $pdo, string $nombre): string
{
    $base = usuarioDesdeNombre($nombre);
    $buscar = $pdo->prepare('SELECT id FROM clientes WHERE usuario = :u LIMIT 1');
    $candidato = $base;
    $n = 2;
    while (true) {
        $buscar->execute(['u' => $candidato]);
        if (!$buscar->fetch()) {
            return $candidato;
        }
        $candidato = $base . $n;
        $n++;
    }
}

function asegurarPortal(PDO $pdo): void
{
    $cols = [];
    foreach ($pdo->query('SHOW COLUMNS FROM clientes') as $col) {
        if (!is_array($col)) {
            continue;
        }
        $cols[strtolower((string) $col['Field'])] = $col;
    }
    if (!isset($cols['usuario'])) {
        $pdo->exec('ALTER TABLE clientes ADD usuario VARCHAR(160) NULL');
        $pdo->exec('ALTER TABLE clientes ADD UNIQUE KEY uq_clientes_usuario (usuario)');
    } else {
        $pdo->exec('ALTER TABLE clientes MODIFY usuario VARCHAR(160) NULL');
    }
    if (!isset($cols['contrasena'])) {
        $pdo->exec("ALTER TABLE clientes ADD contrasena VARCHAR(20) NOT NULL DEFAULT ''");
    }
    if (isset($cols['llave'])) {
        $pdo->exec('ALTER TABLE clientes DROP COLUMN llave');
    }
    $pendientes = $pdo->query("SELECT id, nombre FROM clientes WHERE usuario IS NULL OR usuario = ''")->fetchAll();
    foreach ($pendientes as $row) {
        if (!is_array($row)) {
            continue;
        }
        $guardar = $pdo->prepare('UPDATE clientes SET usuario = :u, contrasena = :c WHERE id = :id');
        $guardar->execute([
            'u' => usuarioLibre($pdo, (string) $row['nombre']),
            'c' => nuevaContrasena(),
            'id' => (int) $row['id'],
        ]);
    }
}

function cuentaLista(int $id, string $nombre, string $direccion, string $usuario, string $contrasena, string $direccionExtra = ''): array
{
    return [
        'id' => $id,
        'nombre' => $nombre,
        'direccion' => $direccion,
        'direccion_extra' => $direccionExtra,
        'usuario' => $usuario,
        'contrasena' => $contrasena,
        'url' => PORTAL_URL,
    ];
}

function asegurarDireccionExtra(PDO $pdo): void
{
    $col = $pdo->query("SHOW COLUMNS FROM clientes LIKE 'direccion_extra'")->fetch();
    if (!is_array($col)) {
        $pdo->exec('ALTER TABLE clientes ADD direccion_extra TEXT NULL AFTER direccion');
    }
}

function asegurarDireccionPedido(PDO $pdo): void
{
    $col = $pdo->query("SHOW COLUMNS FROM pedidos LIKE 'direccion'")->fetch();
    if (!is_array($col)) {
        $pdo->exec('ALTER TABLE pedidos ADD direccion VARCHAR(255) NULL AFTER cerrado_por');
    }
}

function crearCuenta(PDO $pdo, string $nombre, string $direccion, string $usuarioPedido = '', string $contrasenaPedida = '', array $extras = []): array
{
    $nombre = trim($nombre);
    $direccion = trim($direccion);
    if ($nombre === '' || $direccion === '') {
        jsonResponse(['status' => 'error', 'message' => 'Nombre y dirección son obligatorios'], 400);
    }
    asegurarPortal($pdo);
    asegurarDireccionExtra($pdo);
    $extra = implode("\n", array_values(array_filter(array_map(
        static fn ($linea): string => trim((string) $linea),
        $extras
    ), static fn (string $linea): bool => $linea !== '')));
    $usuario = trim($usuarioPedido);
    if ($usuario === '') {
        $usuario = usuarioLibre($pdo, $nombre);
    } else {
        $ocupado = $pdo->prepare('SELECT id FROM clientes WHERE usuario = :u LIMIT 1');
        $ocupado->execute(['u' => $usuario]);
        if ($ocupado->fetch()) {
            jsonResponse(['status' => 'error', 'message' => 'Ese usuario ya existe'], 409);
        }
    }
    $contrasena = trim($contrasenaPedida);
    if ($contrasena === '') {
        $contrasena = nuevaContrasena();
    }
    $stmt = $pdo->prepare(
        'INSERT INTO clientes (nombre, direccion, direccion_extra, usuario, contrasena, creado_en)
         VALUES (:n, :d, :e, :u, :p, :c)'
    );
    $stmt->execute([
        'n' => $nombre,
        'd' => $direccion,
        'e' => $extra,
        'u' => $usuario,
        'p' => $contrasena,
        'c' => nowSql(),
    ]);

    return cuentaLista((int) $pdo->lastInsertId(), $nombre, $direccion, $usuario, $contrasena, $extra);
}

function entrarPortal(PDO $pdo, string $usuario, string $contrasena): array
{
    asegurarPortal($pdo);
    $usuario = trim($usuario);
    $contrasena = trim($contrasena);
    $stmt = $pdo->prepare('SELECT id, nombre, contrasena FROM clientes WHERE usuario = :u LIMIT 1');
    $stmt->execute(['u' => $usuario]);
    $row = $stmt->fetch();
    if (!is_array($row) || !hash_equals((string) ($row['contrasena'] ?? ''), $contrasena) || $contrasena === '') {
        jsonResponse(['status' => 'error', 'message' => 'Usuario o contraseña incorrectos'], 401);
    }
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $_SESSION['portal_cliente_id'] = (int) $row['id'];

    return ['nombre' => (string) $row['nombre']];
}

function portalActual(PDO $pdo): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $id = (int) ($_SESSION['portal_cliente_id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['status' => 'error', 'message' => 'Sin sesión'], 401);
    }
    $stmt = $pdo->prepare('SELECT nombre FROM clientes WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        jsonResponse(['status' => 'error', 'message' => 'Sin sesión'], 401);
    }

    return ['nombre' => (string) $row['nombre']];
}

function eliminarCuenta(PDO $pdo, int $id): void
{
    if ($id <= 0) {
        jsonResponse(['status' => 'error', 'message' => 'Cuenta no encontrada'], 404);
    }
    $existe = $pdo->prepare('SELECT id FROM clientes WHERE id = :id LIMIT 1');
    $existe->execute(['id' => $id]);
    if (!$existe->fetch()) {
        jsonResponse(['status' => 'error', 'message' => 'Cuenta no encontrada'], 404);
    }
    $pedidos = $pdo->prepare('SELECT id FROM pedidos WHERE cliente_id = :id');
    $pedidos->execute(['id' => $id]);
    $ids = [];
    foreach ($pedidos->fetchAll() as $row) {
        if (is_array($row)) {
            $ids[] = (int) $row['id'];
        }
    }
    $pdo->beginTransaction();
    try {
        if ($ids !== []) {
            $marcas = implode(',', array_fill(0, count($ids), '?'));
            $lineas = $pdo->prepare("DELETE FROM pedido_lineas WHERE pedido_id IN ($marcas)");
            $lineas->execute($ids);
        }
        $borrarPedidos = $pdo->prepare('DELETE FROM pedidos WHERE cliente_id = :id');
        $borrarPedidos->execute(['id' => $id]);
        $cliente = $pdo->prepare('DELETE FROM clientes WHERE id = :id');
        $cliente->execute(['id' => $id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function listarCuentas(PDO $pdo): array
{
    asegurarPortal($pdo);
    asegurarDireccionExtra($pdo);
    $rows = $pdo->query(
        'SELECT id, nombre, direccion, direccion_extra, usuario, contrasena FROM clientes ORDER BY id DESC'
    )->fetchAll();
    return array_map(static function (array $row): array {
        return cuentaLista(
            (int) $row['id'],
            (string) $row['nombre'],
            (string) $row['direccion'],
            (string) $row['usuario'],
            (string) $row['contrasena'],
            (string) ($row['direccion_extra'] ?? ''),
        );
    }, $rows);
}

function recibirMensaje(PDO $pdo, array $body): array
{
    asegurarPortal($pdo);
    asegurarDireccionPedido($pdo);
    $usuario = trim((string) ($body['usuario'] ?? ''));
    $contrasena = trim((string) ($body['contrasena'] ?? ''));
    $fecha = trim((string) ($body['fecha_esperada'] ?? ''));
    $cerradoPor = trim((string) ($body['cerrado_por'] ?? ''));
    $lineas = $body['lineas'] ?? null;
    if ($usuario === '' || $contrasena === '') {
        jsonResponse(['status' => 'error', 'message' => 'Usuario o contraseña incorrectos'], 401);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        jsonResponse(['status' => 'error', 'message' => 'Fecha esperada inválida'], 400);
    }
    if (!is_array($lineas) || $lineas === []) {
        jsonResponse(['status' => 'error', 'message' => 'El pedido no trae líneas'], 400);
    }

    $busca = $pdo->prepare('SELECT id, contrasena FROM clientes WHERE usuario = :u LIMIT 1');
    $busca->execute(['u' => $usuario]);
    $cliente = $busca->fetch();
    if (!is_array($cliente) || !hash_equals((string) ($cliente['contrasena'] ?? ''), $contrasena)) {
        jsonResponse(['status' => 'error', 'message' => 'Usuario o contraseña incorrectos'], 401);
    }

    $limpias = [];
    foreach ($lineas as $linea) {
        if (!is_array($linea)) {
            continue;
        }
        $nombre = trim((string) ($linea['nombre'] ?? ''));
        $unidad = trim((string) ($linea['unidad'] ?? ''));
        $cantidad = (float) ($linea['cantidad'] ?? 0);
        if ($nombre === '' || $cantidad <= 0) {
            continue;
        }
        if ($unidad === '') {
            $unidad = 'unidad';
        }
        $limpias[] = [
            'nombre' => $nombre,
            'unidad' => $unidad,
            'cantidad' => $cantidad,
            'copias' => copiasLabel($cantidad),
        ];
    }
    if ($limpias === []) {
        jsonResponse(['status' => 'error', 'message' => 'El pedido no trae líneas'], 400);
    }

    $pdo->beginTransaction();
    try {
        $direccionPedido = trim((string) ($body['direccion'] ?? ''));
        $ins = $pdo->prepare(
            'INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en)
             VALUES (:c, :f, :p, :d, :r)'
        );
        $ins->execute([
            'c' => (int) $cliente['id'],
            'f' => $fecha,
            'p' => $cerradoPor,
            'd' => $direccionPedido !== '' ? $direccionPedido : null,
            'r' => nowSql(),
        ]);
        $numero = (int) $pdo->lastInsertId();
        $lin = $pdo->prepare(
            'INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad)
             VALUES (:p, :n, :u, :c)'
        );
        foreach ($limpias as $linea) {
            $lin->execute([
                'p' => $numero,
                'n' => $linea['nombre'],
                'u' => $linea['unidad'],
                'c' => $linea['cantidad'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return ['numero' => $numero];
}

function asegurarProcesado(PDO $pdo): void
{
    $col = $pdo->query("SHOW COLUMNS FROM pedidos LIKE 'procesado'")->fetch();
    if (!is_array($col)) {
        $pdo->exec('ALTER TABLE pedidos ADD procesado TINYINT(1) NOT NULL DEFAULT 0');
    }
    $cuando = $pdo->query("SHOW COLUMNS FROM pedidos LIKE 'procesado_en'")->fetch();
    if (!is_array($cuando)) {
        $pdo->exec('ALTER TABLE pedidos ADD procesado_en DATETIME NULL AFTER procesado');
    }
}

function marcarProcesado(PDO $pdo, int $numero): void
{
    asegurarProcesado($pdo);
    if ($numero <= 0) {
        jsonResponse(['status' => 'error', 'message' => 'Pedido no encontrado'], 404);
    }
    $stmt = $pdo->prepare('UPDATE pedidos SET procesado = 1, procesado_en = IFNULL(procesado_en, NOW()) WHERE id = :id');
    $stmt->execute(['id' => $numero]);
    $existe = $pdo->prepare('SELECT id FROM pedidos WHERE id = :id LIMIT 1');
    $existe->execute(['id' => $numero]);
    if (!$existe->fetch()) {
        jsonResponse(['status' => 'error', 'message' => 'Pedido no encontrado'], 404);
    }
}

function listarPedidos(PDO $pdo): array
{
    asegurarProcesado($pdo);
    asegurarDireccionPedido($pdo);
    $pedidos = $pdo->query(
        'SELECT p.id, p.fecha_esperada, p.cerrado_por, p.recibido_en, p.procesado, p.procesado_en,
                c.nombre AS cliente, COALESCE(NULLIF(p.direccion, \'\'), c.direccion) AS direccion
         FROM pedidos p
         JOIN clientes c ON c.id = p.cliente_id
         ORDER BY p.id DESC'
    )->fetchAll();
    if ($pedidos === []) {
        return [];
    }
    $ids = array_map(static fn (array $row): int => (int) $row['id'], $pedidos);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT pedido_id, nombre, unidad, cantidad
         FROM pedido_lineas
         WHERE pedido_id IN ($placeholders)
         ORDER BY id ASC"
    );
    $stmt->execute($ids);
    $porPedido = [];
    foreach ($stmt->fetchAll() as $linea) {
        $pid = (int) $linea['pedido_id'];
        $cantidad = (float) $linea['cantidad'];
        $porPedido[$pid][] = [
            'nombre' => $linea['nombre'],
            'unidad' => $linea['unidad'],
            'cantidad' => $cantidad,
            'copias' => copiasLabel($cantidad),
        ];
    }
    return array_map(static function (array $row) use ($porPedido): array {
        $id = (int) $row['id'];
        return [
            'numero' => $id,
            'cliente' => $row['cliente'],
            'direccion' => $row['direccion'],
            'fecha_esperada' => $row['fecha_esperada'],
            'cerrado_por' => $row['cerrado_por'],
            'recibido_en' => $row['recibido_en'],
            'procesado' => (int) ($row['procesado'] ?? 0) === 1,
            'procesado_en' => $row['procesado_en'] ?: null,
            'lineas' => $porPedido[$id] ?? [],
        ];
    }, $pedidos);
}
