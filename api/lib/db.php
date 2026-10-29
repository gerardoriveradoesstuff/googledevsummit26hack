<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

function loadDbConfig(): array
{
    $configPath = __DIR__ . '/../config/db.php';
    if (!is_file($configPath)) {
        throw new RuntimeException('Copia api/config/db.sample.php a api/config/db.php');
    }
    $config = require $configPath;
    foreach (['host', 'database', 'username'] as $key) {
        if (!isset($config[$key]) || (string) $config[$key] === '') {
            throw new RuntimeException('Database config missing: ' . $key);
        }
    }
    if (!array_key_exists('password', $config)) {
        throw new RuntimeException('Database config missing: password');
    }
    return $config;
}

function getPdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $config = loadDbConfig();
    $charset = (string) ($config['charset'] ?? 'utf8mb4');
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['database'],
        $charset
    );
    $pdo = new PDO($dsn, (string) $config['username'], (string) $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '-07:00'");
    return $pdo;
}
