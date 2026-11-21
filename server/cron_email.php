<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {http_response_code(403);exit;}
require __DIR__ . '/bootstrap.php';
try {
    $db=emaveDb($config);
    $row=$db->query('SELECT id,revision,envelope,created_at,emailed_at FROM emave_backups ORDER BY id DESC LIMIT 1')->fetch_assoc();
    if(!$row || $row['emailed_at']){echo "Sem novos backups para enviar.\n";exit(0);}
    $to=$config['backup_email'];$from=$config['mail_from'];
    if(!filter_var($to,FILTER_VALIDATE_EMAIL)||!filter_var($from,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Destinatário/remetente inválido');
    $boundary='emave_'.bin2hex(random_bytes(12));$attachment=chunk_split(base64_encode($row['envelope']));
    $headers="From: EMAVE Backup <{$from}>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"{$boundary}\"";
    $message="--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $message.=chunk_split(base64_encode("Backup EMAVE criptografado. Revisão {$row['revision']}. Criado em {$row['created_at']}. Guarde este anexo; abra-o no aplicativo usando a senha do cofre. Nunca envie a senha por e-mail. A cópia reflete apenas dados sincronizados pelo aparelho."));
    $filename='EMAVE-backup-rev'.$row['revision'].'.json';
    $message.="\r\n--{$boundary}\r\nContent-Type: application/json; name=\"{$filename}\"\r\nContent-Disposition: attachment; filename=\"{$filename}\"\r\nContent-Transfer-Encoding: base64\r\n\r\n{$attachment}\r\n--{$boundary}--\r\n";
    $sent=mail($to,'EMAVE Importados - backup criptografado rev '.$row['revision'],$message,$headers);
    if(!$sent)throw new RuntimeException('mail() recusado pelo servidor. Configure saída de e-mails da hospedagem.');
    $id=(int)$row['id'];$stmt=$db->prepare('UPDATE emave_backups SET emailed_at=NOW() WHERE id=?');$stmt->bind_param('i',$id);$stmt->execute();
    echo "Backup {$id} encaminhado ao servidor de email: {$to}\n";
}catch(Throwable $e){error_log('EMAVE cron error: '.$e->getMessage());fwrite(STDERR,"Não foi possível enviar backup: verifique logs e a configuração de e-mail.\n");exit(1);}
