import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBase64Bytes,decodeBase64Bytes} from '../src/vault.js';
import {initialData,addCustomer,registerOpeningBalance,receive,clientBalance} from '../src/finance.js';
test('Codificacao de base grande nao usa expansao variadica no WebView',()=>{
 const bytes=new Uint8Array(280000);
 for(let i=0;i<bytes.length;i++)bytes[i]=(i*31+17)%256;
 const orig=String.fromCharCode;
 String.fromCharCode=function(...args){if(args.length>128)throw RangeError('Maximum call stack size exceeded');return orig(...args);};
 try { assert.deepEqual(decodeBase64Bytes(encodeBase64Bytes(bytes)),bytes); }
 finally { String.fromCharCode=orig; }
});
test('Pagamento PIX de R$650 quita uma parcela e impede repeticao',()=>{
 const d=initialData(),c=addCustomer(d,{name:'Cliente teste'});
 const sale=registerOpeningBalance(d,{clientId:c.id,amountCents:65000,due:'9999-12-31'}),part=sale.installments[0];
 receive(d,{saleId:sale.id,installmentId:part.id,amountCents:65000,method:'PIX'});
 assert.equal(clientBalance(d,c.id),0);
 assert.equal(d.payments.length,1);
 assert.throws(()=>receive(d,{saleId:sale.id,installmentId:part.id,amountCents:65000,method:'PIX'}),/acima do saldo/);
});