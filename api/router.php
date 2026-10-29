<?php
// Router for PHP's built-in server so the API answers both with and without an /api prefix:
//   php -S 127.0.0.1:8084 -t api api/router.php
//   GET /v1/pedidos.php      -> api/v1/pedidos.php
//   GET /api/v1/pedidos.php  -> api/v1/pedidos.php   (same thing; base URLs ending in /api keep working)
// Only PHP files under v1/ are reachable; config/, lib/, tests/ and anything else return 404.
declare(strict_types=1);

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if ($path === '/api' || str_starts_with($path, '/api/')) {
    $path = substr($path, 4) ?: '/';
}

$noEncontrado = function (): bool {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['ok' => false, 'error' => 'No encontrado']);
    return true;
};

if ($path === '/' || $path === '') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'api' => 'distribuidora', 'endpoints' => '/v1/*.php']);
    return true;
}
if (str_contains($path, '..') || !preg_match('#^/v1/[A-Za-z0-9_/-]+\.php$#', $path)) {
    return $noEncontrado();
}
$file = __DIR__ . $path;
if (!is_file($file)) {
    return $noEncontrado();
}
$_SERVER['SCRIPT_NAME'] = $path;
$_SERVER['PHP_SELF'] = $path;
$_SERVER['SCRIPT_FILENAME'] = $file;
chdir(dirname($file));
require $file;
return true;
