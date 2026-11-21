import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { openInstallments,today,brl } from './finance.js';
function atMorning(iso){return new Date(`${iso}T08:00:00`);}
export async function scheduleDueNotifications(data){
 if(!data.settings.notifications||!Capacitor.isNativePlatform())return {active:false};
 const status=await LocalNotifications.requestPermissions();if(status.display!=='granted')return {active:false,reason:'notificações não autorizadas'};
 const previous=JSON.parse(localStorage.getItem('emave_notice_ids')||'[]');if(previous.length)await LocalNotifications.cancel({notifications:previous.map(id=>({id}))});
 const todayIso=today(),now=Date.now(),all=openInstallments(data),overdue=all.filter(i=>i.due<todayIso),upcoming=all.filter(i=>i.due>=todayIso);
 const dateList=[...new Set([todayIso,...upcoming.map(i=>i.due)])].slice(0,50);let notes=[];
 for(let n=0;n<dateList.length;n++){const date=dateList[n];let when=atMorning(date);if(when.getTime()<=now)continue;
 const entries=upcoming.filter(i=>i.due===date),count=entries.length;const total=entries.reduce((a,i)=>a+i.remainingCents,0);
 if(count>0)notes.push({id:30000+n,title:`EMAVE — ${count} parcela(s) vencendo`,body:`Total previsto: ${brl(total)}. Abra o aplicativo para identificar clientes.`,schedule:{at:when,allowWhileIdle:false},extra:{route:'receivables'}});
 }
 if(overdue.length){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(8,0,0,0);notes.push({id:30999,title:'EMAVE — cobranças em atraso',body:`${overdue.length} parcela(s) vencida(s). Confira o painel de cobrança.`,schedule:{at:tomorrow,allowWhileIdle:false}});}
 if(notes.length)await LocalNotifications.schedule({notifications:notes});localStorage.setItem('emave_notice_ids',JSON.stringify(notes.map(n=>n.id)));return {active:true,count:notes.length};
}
