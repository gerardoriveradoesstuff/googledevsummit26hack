<?php
declare(strict_types=1);

function jsonResponse(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function handlePreflight(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        jsonResponse(['status' => 'ok']);
    }
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function nowSql(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('America/Los_Angeles')))->format('Y-m-d H:i:s');
}
