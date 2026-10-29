<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/puerta.php';

handlePreflight();

try {
    $pdo = getPdo();
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'GET') {
        jsonResponse(['status' => 'ok', 'cuentas' => listarCuentas($pdo)]);
    }
    if ($method !== 'POST') {
        jsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    $body = readJsonBody();
    if (($body['accion'] ?? '') === 'eliminar') {
        eliminarCuenta($pdo, (int) ($body['id'] ?? 0));
        jsonResponse(['status' => 'ok']);
    }
    $cuenta = crearCuenta(
        $pdo,
        (string) ($body['nombre'] ?? ''),
        (string) ($body['direccion'] ?? ''),
        (string) ($body['usuario'] ?? ''),
        (string) ($body['contrasena'] ?? ''),
        is_array($body['extras'] ?? null) ? $body['extras'] : [],
    );
    jsonResponse(['status' => 'ok', 'cuenta' => $cuenta]);
} catch (Throwable $e) {
    $accion = '';
    if (isset($body) && is_array($body)) {
        $accion = (string) ($body['accion'] ?? '');
    }
    $mensaje = $accion === 'eliminar' ? 'No se pudo eliminar la cuenta' : 'No se pudo guardar la cuenta';
    jsonResponse(['status' => 'error', 'message' => $mensaje], 500);
}
