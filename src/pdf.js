/* PDF leve, sem serviços externos, em páginas A4. Usa WinAnsi para acentos comuns. */
const normalize=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2022\u25cf]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\xFF\n]/g,'?');
const textPdf=s=>normalize(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const latinBytes=s=>Uint8Array.from([...s].map(c=>c.charCodeAt(0)&255));
function linesWrapped(lines,maxChars=91){let out=[];for(const line of lines){let s=normalize(line);if(!s){out.push('');continue;}while(s.length>maxChars){let at=s.lastIndexOf(' ',maxChars);if(at<20)at=maxChars;out.push(s.slice(0,at));s=s.slice(at).trimStart();}out.push(s);}return out;}
export function makePdf({title='EMAVE - Relatório',lines=[],footer='Gerado pelo EMAVE Gestão'}){
 const all=linesWrapped([title,'',...lines]);const chunks=[];for(let p=0;p<all.length;p+=48)chunks.push(all.slice(p,p+48));if(!chunks.length)chunks.push([]);
 const objects={1:'<< /Type /Catalog /Pages 2 0 R >>',2:'',3:'<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'};
 let kids=[];
 chunks.forEach((entries,pageIndex)=>{const pageId=4+pageIndex*2, streamId=pageId+1;kids.push(`${pageId} 0 R`);let ops=['BT','/F1 9 Tf'];let y=792;entries.forEach((line,i)=>{ops.push(`1 0 0 1 42 ${y} Tm (${textPdf(line)}) Tj`);y-=15;});ops.push(`1 0 0 1 42 47 Tm (${textPdf(footer+' | Página '+(pageIndex+1)+'/'+chunks.length)}) Tj`,'ET');let stream=ops.join('\n')+'\n';objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`;objects[streamId]=`<< /Length ${latinBytes(stream).length} >>\nstream\n${stream}endstream`;});
 objects[2]=`<< /Type /Pages /Count ${chunks.length} /Kids [${kids.join(' ')}] >>`;
 const count=Math.max(...Object.keys(objects).map(Number));let doc='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];for(let id=1;id<=count;id++){offsets[id]=latinBytes(doc).length;doc+=`${id} 0 obj\n${objects[id]}\nendobj\n`;}let xref=latinBytes(doc).length;doc+=`xref\n0 ${count+1}\n0000000000 65535 f \n`;for(let id=1;id<=count;id++)doc+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;doc+=`trailer\n<< /Root 1 0 R /Size ${count+1} >>\nstartxref\n${xref}\n%%EOF\n`;return new Blob([latinBytes(doc)],{type:'application/pdf'});
}
