import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { encryptedBackup, restoreEncrypted } from './vault.js';

function toBase64(arr) {
  let result = '';
  for (let i = 0; i < arr.length; i += 16384) result += String.fromCharCode(...arr.slice(i, i + 16384));
  return btoa(result);
}

async function encryptedFile() {
  const envelope = await encryptedBackup();
  const filename = `EMAVE-backup-${new Date().toISOString().slice(0, 10)}-rev${envelope.revision}.json`;
  return { envelope, filename, content: JSON.stringify(envelope, null, 2) };
}

async function shareEncryptedFile(content, filename, title, description, dialogTitle) {
  const bytes = new TextEncoder().encode(content);
  const result = await Filesystem.writeFile({
    path: filename,
    data: toBase64(bytes),
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({
    title,
    text: description,
    files: [result.uri],
    dialogTitle,
  });
}

export async function downloadBlob(content, filename, mime = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  if (Capacitor.isNativePlatform()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const result = await Filesystem.writeFile({
      path: filename, data: toBase64(bytes), directory: Directory.Cache, recursive: true,
    });
    await Share.share({ title: `EMAVE Gestão — ${filename}`, files: [result.uri], dialogTitle: 'Salvar ou compartilhar arquivo EMAVE' });
    return;
  }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link);
  link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export async function downloadBackup() {
  const { content, filename } = await encryptedFile();
  return downloadBlob(content, filename, 'application/json');
}

/**
 * Abre o compartilhamento do Android com backup AES-GCM anexado. A escolha do Gmail
 * e o toque em "Enviar" são ações explícitas do usuário. Não existe envio silencioso
 * nesta operação; para isso é necessário configurar o servidor + cron em PHP.
 */
export async function emailBackup(email = '') {
  const { envelope, content, filename } = await encryptedFile();
  if (!Capacitor.isNativePlatform()) {
    await downloadBlob(content, filename, 'application/json');
    return { shared: false, revision: envelope.revision };
  }
  const recipientHint = email ? `Destinatário sugerido: ${email}.\n` : 'Informe o endereço destinatário no aplicativo de e-mail.\n';
  await shareEncryptedFile(
    content,
    filename,
    'Backup criptografado — EMAVE Gestão',
    `${recipientHint}Anexo: ${filename}.\nRev: ${envelope.revision}.\nEste arquivo contém dados criptografados. A senha do cofre não deve ser enviada por e-mail.`,
    'Escolha Gmail ou seu aplicativo de e-mail e confirme o envio',
  );
  return { shared: true, revision: envelope.revision };
}

export async function pushBackup(settings) {
  if (!settings.backupUrl || !settings.backupToken) throw Error('Configure a URL e o token de backup em Ajustes.');
  if (!navigator.onLine) throw Error('Sem internet. O backup poderá ser enviado quando voltar a conexão.');
  const envelope = await encryptedBackup();
  const url = settings.backupUrl.replace(/\/$/, '') + '/upload.php';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings.backupToken },
    body: JSON.stringify(envelope),
    cache: 'no-store',
  });
  const reply = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(reply.error || `Erro ${response.status} no servidor.`);
  localStorage.setItem('emave_last_backup', JSON.stringify({ revision: envelope.revision, at: new Date().toISOString() }));
  return reply;
}

export async function fetchLatestBackup(settings, password) {
  const url = settings.backupUrl.replace(/\/$/, '') + '/latest.php';
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + settings.backupToken }, cache: 'no-store' });
  if (!response.ok) throw Error('Não foi possível baixar o backup remoto.');
  const item = await response.json();
  return restoreEncrypted(item.envelope, password);
}
