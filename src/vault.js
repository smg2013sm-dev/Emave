/* Cofre AES-GCM/PBKDF2: nenhuma informação financeira persistida em texto puro. */
const DB='emave_cofre_v1', STORE='vault', ROW='primary';
let activeKey=null;
const encoder=new TextEncoder(), decoder=new TextDecoder();
const b64=a=>{let out='';for(let i=0;i<a.length;i+=16384)out+=String.fromCharCode(...a.subarray(i,i+16384));return btoa(out);};
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const vaultReady=()=>Boolean(activeKey);
async function db(){return new Promise((resolve,reject)=>{let req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function get(){const conn=await db();return new Promise((resolve,reject)=>{let tx=conn.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(ROW);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>conn.close();});}
async function set(value){const conn=await db();return new Promise((resolve,reject)=>{let tx=conn.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,ROW);tx.oncomplete=()=>{conn.close();resolve();};tx.onerror=()=>reject(tx.error);});}
async function derive(password,salt){let material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function decode(value,key){const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(value.iv)},key,from64(value.ciphertext));return JSON.parse(decoder.decode(plain));}
export async function exists(){return Boolean(await get());}
export async function initialize(password,record){if(await exists())throw Error('Este aparelho já possui dados; utilize o login.');if(password.length<10)throw Error('Use uma senha com pelo menos 10 caracteres.');const salt=crypto.getRandomValues(new Uint8Array(16));activeKey=await derive(password,salt);await save(record,salt);}
export async function login(password){const row=await get();if(!row)throw Error('Nenhuma conta cadastrada neste aparelho.');const key=await derive(password,from64(row.salt));try{const state=await decode(row,key);activeKey=key;return state;}catch{throw Error('Senha incorreta ou backup danificado.');}}
export function logout(){activeKey=null;}
export async function save(record,salt=null){if(!activeKey)throw Error('Cofre bloqueado.');const old=await get();const saltEncoded=salt?b64(salt):old?.salt;if(!saltEncoded)throw Error('Salt não encontrado.');let iv=crypto.getRandomValues(new Uint8Array(12));let bytes=encoder.encode(JSON.stringify(record));let ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},activeKey,bytes));const envelope={type:'EMAVE-ENCRYPTED-BACKUP',format:1,salt:saltEncoded,iv:b64(iv),ciphertext:b64(ciphertext),revision:record.revision,deviceId:record.deviceId,generatedAt:new Date().toISOString()};await set(envelope);return envelope;}
export async function encryptedBackup(){let row=await get();if(!row)throw Error('Não existem dados para exportar.');return row;}
export async function restoreEncrypted(envelope,password){if(envelope.type!=='EMAVE-ENCRYPTED-BACKUP'||!envelope.salt||!envelope.iv||!envelope.ciphertext)throw Error('Arquivo incompatível.');const key=await derive(password,from64(envelope.salt));let decoded=await decode(envelope,key);if(decoded.schema!==1||!Array.isArray(decoded.products)||!Array.isArray(decoded.sales))throw Error('Estrutura de backup inválida.');await set(envelope);activeKey=key;return decoded;}
export async function changePassword(record,newPassword){if(newPassword.length<10)throw Error('A nova senha precisa ter ao menos 10 caracteres.');const salt=crypto.getRandomValues(new Uint8Array(16));activeKey=await derive(newPassword,salt);await save(record,salt);}
