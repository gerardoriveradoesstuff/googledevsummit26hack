<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/puerta.php';

handlePreflight();

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'POST') {
        jsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    $pdo = getPdo();
    $resultado = recibirMensaje($pdo, readJsonBody());
    jsonResponse(['status' => 'ok', 'numero' => $resultado['numero']]);
} catch (Throwable $e) {
    jsonResponse(['status' => 'error', 'message' => 'No se pudo recibir el pedido'], 500);
}
