<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') emaveJson(405,['error'=>'Use GET']);
emaveAuth($config);
try{
    $db=emaveDb($config);
    $result=$db->query('SELECT revision,envelope,created_at FROM emave_backups ORDER BY id DESC LIMIT 1')->fetch_assoc();
    if(!$result)emaveJson(404,['error'=>'Sem backup ainda']);
    emaveJson(200,['ok'=>true,'revision'=>(int)$result['revision'],'created_at'=>$result['created_at'],'envelope'=>json_decode($result['envelope'],true)]);
}catch(Throwable $e){error_log('EMAVE latest error: '.$e->getMessage());emaveJson(500,['error'=>'Erro ao recuperar cópia']);}
