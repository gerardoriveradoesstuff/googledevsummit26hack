<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/helpers.php';

handlePreflight();

const APK_FILE_NAME = 'Distribuidora.apk';

function apkStoragePath(): string
{
    return dirname(__DIR__, 3) . '/apk/' . APK_FILE_NAME;
}

function apkPin(): string
{
    $path = __DIR__ . '/../../config/apk.php';
    if (!is_file($path)) {
        return '';
    }
    $config = require $path;

    return is_array($config) ? trim((string) ($config['pin'] ?? '')) : '';
}

function requestWantsJson(): bool
{
    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'application/json') !== false) {
        return true;
    }
    $accept = (string) ($_SERVER['HTTP_ACCEPT'] ?? '');

    return stripos($accept, 'application/json') !== false
        && stripos($accept, 'text/html') === false;
}

function readSubmittedPin(): string
{
    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'application/json') !== false) {
        $payload = readJsonBody();

        return trim((string) ($payload['pin'] ?? ''));
    }

    return trim((string) ($_POST['pin'] ?? ''));
}

function pinMatches(string $raw): bool
{
    $expected = apkPin();
    $given = trim($raw);
    if ($expected === '' || $given === '') {
        return false;
    }

    return hash_equals($expected, $given);
}

function failPinOrMissing(string $message, int $status, bool $asJson): never
{
    if ($asJson) {
        jsonResponse(['status' => 'error', 'message' => $message], $status);
    }
    renderPinForm($message);
}

function streamApk(string $path): never
{
    header('Content-Type: application/vnd.android.package-archive');
    header('Content-Disposition: attachment; filename="' . APK_FILE_NAME . '"');
    header('Content-Length: ' . (string) filesize($path));
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Content-Type-Options: nosniff');
    header('Access-Control-Allow-Origin: *');
    readfile($path);
    exit;
}

function renderPinForm(string $error = ''): never
{
    http_response_code($error === '' ? 200 : 403);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $safeError = htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>Descargar APK</title>';
    echo '<style>
        body{font-family:Arial,sans-serif;background:#E7F3EA;color:#14241A;margin:0;padding:32px;}
        .card{max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(0,0,0,.08);}
        h1{font-size:24px;margin:0 0 12px;color:#1F6B3A;}
        p{margin:0 0 16px;line-height:1.4;}
        input{width:100%;box-sizing:border-box;font-size:22px;letter-spacing:.2em;text-align:center;padding:12px;margin:8px 0 16px;border:1px solid #c5d0de;border-radius:10px;}
        button{width:100%;background:#1F6B3A;color:#fff;border:0;border-radius:12px;font-weight:800;font-size:18px;padding:14px;cursor:pointer;}
        .err{color:#991B1B;font-weight:700;margin-bottom:12px;}
    </style></head><body><div class="card">';
    echo '<h1>Descargar APK</h1>';
    echo '<p>Por favor introduzca contraseña</p>';
    if ($safeError !== '') {
        echo '<p class="err">' . $safeError . '</p>';
    }
    echo '<form method="post" action="">';
    echo '<input type="password" name="pin" inputmode="numeric" autocomplete="off" maxlength="8" autofocus>';
    echo '<button type="submit">Descargar</button>';
    echo '</form></div></body></html>';
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$asJson = requestWantsJson();

try {
    if ($method === 'GET') {
        if ($asJson) {
            jsonResponse(['status' => 'error', 'message' => 'Contraseña requerida'], 401);
        }
        renderPinForm();
    }
    if ($method !== 'POST') {
        jsonResponse(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    if (!pinMatches(readSubmittedPin())) {
        failPinOrMissing('Contraseña incorrecta', 403, $asJson);
    }
    $path = apkStoragePath();
    if (!is_file($path) || !is_readable($path)) {
        failPinOrMissing('El archivo aún no está en el servidor.', 404, $asJson);
    }
    streamApk($path);
} catch (Throwable $exception) {
    failPinOrMissing('No se pudo completar la descarga.', 500, $asJson);
}
