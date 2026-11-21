<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') emaveJson(405,['error'=>'Use POST']);
emaveAuth($config);
$raw = file_get_contents('php://input', false, null, 0, 11*1024*1024);
if (!$raw || strlen($raw)>10*1024*1024) emaveJson(413,['error'=>'Backup vazio ou maior que 10 MB']);
$item = json_decode($raw, true);
if (!is_array($item)||($item['type']??'')!=='EMAVE-ENCRYPTED-BACKUP'||($item['format']??null)!==1) emaveJson(422,['error'=>'Formato inválido']);
foreach (['salt','iv','ciphertext','deviceId'] as $field) if (!is_string($item[$field]??null)||$item[$field]==='') emaveJson(422,['error'=>'Campo inválido: '.$field]);
if (!preg_match('/^[A-Za-z0-9_.\-]{5,100}$/', $item['deviceId'])) emaveJson(422,['error'=>'deviceId inválido']);
if (!filter_var($item['revision']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>0]] ) && ($item['revision']??null)!==0) emaveJson(422,['error'=>'Revisão inválida']);
foreach (['salt','iv','ciphertext'] as $field) if (base64_decode($item[$field],true)===false) emaveJson(422,['error'=>'Dados criptografados inválidos']);
$digest=hash('sha256',$raw);
try {
    $db=emaveDb($config);
    $db->begin_transaction();
    // Lock exclusivo por token via named lock evita corridas em 2 dispositivos.
    $locked=$db->query("SELECT GET_LOCK('emave_backup_single_device', 5) AS acquired")->fetch_assoc();
    if ((int)($locked['acquired']??0)!==1) throw new RuntimeException('Servidor de backup ocupado.');
    $last=$db->query('SELECT id, device_id,revision,digest FROM emave_backups ORDER BY id DESC LIMIT 1')->fetch_assoc();
    if($last){
        if($last['device_id']!==$item['deviceId']){ $db->rollback();$db->query("SELECT RELEASE_LOCK('emave_backup_single_device')");emaveJson(409,['error'=>'Outro aparelho já está vinculado. A sincronização entre múltiplos aparelhos não é suportada nesta versão.']); }
        if((int)$item['revision']<(int)$last['revision']) { $db->rollback();$db->query("SELECT RELEASE_LOCK('emave_backup_single_device')");emaveJson(409,['error'=>'Backup local mais antigo. Não sobrescreveremos a cópia recente.']); }
        if((int)$item['revision']===(int)$last['revision']){
            $db->rollback();$db->query("SELECT RELEASE_LOCK('emave_backup_single_device')");
            if(!hash_equals($last['digest'],$digest)) emaveJson(409,['error'=>'Revisão já existente, mas conteúdo diferente. Reabra ou atualize o cofre antes de enviar.']);
            emaveJson(200,['ok'=>true,'revision'=>(int)$last['revision'],'unchanged'=>true]);
        }
    }
    $stmt=$db->prepare('INSERT INTO emave_backups(device_id, revision, digest, envelope) VALUES (?,?,?,?)');
    $rev=(int)$item['revision'];$stmt->bind_param('siss',$item['deviceId'],$rev,$digest,$raw);$stmt->execute();$stmt->close();
    $max=max(5,min(365,(int)($config['max_backups']??45)));
    $stmt=$db->prepare('DELETE FROM emave_backups WHERE id NOT IN (SELECT id FROM (SELECT id FROM emave_backups ORDER BY id DESC LIMIT ?) AS keep_rows)');$stmt->bind_param('i',$max);$stmt->execute();$stmt->close();
    $db->commit();$db->query("SELECT RELEASE_LOCK('emave_backup_single_device')");
    emaveJson(200,['ok'=>true,'revision'=>$rev,'stored'=>true]);
} catch(Throwable $e){error_log('EMAVE upload error: '.$e->getMessage());emaveJson(500,['error'=>'Falha ao salvar o backup remoto.']);}
