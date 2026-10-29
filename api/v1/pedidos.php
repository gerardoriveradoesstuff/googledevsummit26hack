<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/puerta.php';

handlePreflight();

try {
    $pdo = getPdo();
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'POST') {
        $body = readJsonBody();
        marcarProcesado($pdo, (int) ($body['numero'] ?? 0));
        jsonResponse(['status' => 'ok']);
    }
    if ($method !== 'GET') {
        jsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    jsonResponse(['status' => 'ok', 'pedidos' => listarPedidos($pdo)]);
} catch (Throwable $e) {
    jsonResponse(['status' => 'error', 'message' => 'No se pudieron leer los pedidos'], 500);
}
