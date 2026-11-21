<?php
// Copie para /home/SEU_USUARIO/emave-config.php, FORA de public_html.
// Gere o hash do token: php -r 'echo hash("sha256", "COLE_TOKEN_SECRETO_AQUI"), PHP_EOL;'
return [
    'db_host' => 'localhost',
    'db_socket' => '', // Se necessário, informe caminho absoluto, ex.: /var/lib/mysql/mysql.sock
    'db_port' => 3306,
    'db_name' => 'USUARIO_emave',
    'db_user' => 'USUARIO_emave_app',
    'db_password' => 'SENHA_FORTE_BANCO',
    'token_hash' => 'HASH_SHA256_DO_TOKEN',
    'allowed_origins' => ['https://localhost', 'https://SEU_DOMINIO'],
    'backup_email' => 'SEU_EMAIL@exemplo.com',
    'mail_from' => 'backup@SEU_DOMINIO',
    'max_backups' => 45,
];
