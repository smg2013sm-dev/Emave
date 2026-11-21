<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$configPath = getenv('EMAVE_CONFIG_FILE') ?: dirname(__DIR__, 2) . '/emave-config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Backend ainda não configurado.']);
    exit;
}
$config = require $configPath;
if (!is_array($config)) { http_response_code(500); exit; }
function emaveJson(int $code, array $body): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (PHP_SAPI !== 'cli') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && in_array($origin, $config['allowed_origins'] ?? [], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if (!$origin || !in_array($origin, $config['allowed_origins'] ?? [], true)) emaveJson(403,['error'=>'Origem não permitida']);
        http_response_code(204); exit;
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') == '443';
    if (!$isHttps) emaveJson(403, ['error'=>'É obrigatório usar HTTPS.']);
}
function emaveDb(array $conf): mysqli {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = mysqli_init();
    $socket = !empty($conf['db_socket']) ? $conf['db_socket'] : null;
    $db->real_connect($conf['db_host'], $conf['db_user'], $conf['db_password'], $conf['db_name'], (int)($conf['db_port']??3306), $socket);
    $db->set_charset('utf8mb4');
    return $db;
}
function emaveAuth(array $conf): void {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $k => $v) if (strtolower($k)==='authorization') $header=$v;
    }
    if (!preg_match('/^Bearer ([A-Za-z0-9_.\-]{24,200})$/', $header, $m)) emaveJson(401,['error'=>'Token ausente']);
    $configured = $conf['token_hash'] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $configured) || !hash_equals($configured, hash('sha256', $m[1]))) emaveJson(403,['error'=>'Token inválido']);
}
