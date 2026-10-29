<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/puerta.php';

handlePreflight();

try {
    $pdo = getPdo();
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'GET') {
        jsonResponse(['status' => 'ok', 'cliente' => portalActual($pdo)]);
    }
    if ($method === 'DELETE') {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        unset($_SESSION['portal_cliente_id']);
        jsonResponse(['status' => 'ok']);
    }
    if ($method !== 'POST') {
        jsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    $body = readJsonBody();
    $cliente = entrarPortal(
        $pdo,
        (string) ($body['usuario'] ?? ''),
        (string) ($body['contrasena'] ?? ''),
    );
    jsonResponse(['status' => 'ok', 'cliente' => $cliente]);
} catch (Throwable $e) {
    jsonResponse(['status' => 'error', 'message' => 'No se pudo entrar al portal'], 500);
}
