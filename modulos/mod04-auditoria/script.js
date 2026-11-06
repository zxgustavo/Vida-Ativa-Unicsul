(function(){
'use strict';const D=Demo,$=id=>document.getElementById(id),form=$('liberacaoForm'),feedback=$('feedback');
D.initPage();D.populateStudents($('aluno'),D.getState());D.watchForm(form);$('usuario').value=D.actor();
function clock(){$('dataHora').value=new Date().toLocaleString('pt-BR');}
function count(){$('contador').textContent=$('justificativa').value.length+' / 250';}
function typeInfo(){$('acesso-info').textContent=$('acesso').value==='restrita'?'A autorização de área restrita fica registrada neste histórico. Ela não altera o acesso de entrada pela catraca.':'A autorização de entrada permite um único acesso dentro do prazo selecionado. Após a leitura da matrícula, ela será marcada como utilizada.';}
const types={entrada:'Entrada',temporaria:'Temporário',restrita:'Área restrita'};
function render(){const state=D.getState(),body=$('historico-liberacoes');body.replaceChildren();if(!state.authorizations.length){D.empty(body,7,'Nenhuma liberação registrada.');return;}state.authorizations.slice(0,10).forEach(a=>{const row=document.createElement('tr'),s=state.students.find(s=>s.id===a.studentId),expired=new Date(a.expiresAt).getTime()<=Date.now(),label=a.usedAt?'Utilizada':expired?'Expirada':'Disponível',tone=a.usedAt?'neutral':expired?'danger':'ok';[s?.name||'Aluno não encontrado',types[a.type],a.actor,D.formatTime(a.createdAt),D.formatTime(a.expiresAt),a.reason].forEach(value=>D.cell(row,value));D.cell(row,D.badge(label,tone));body.append(row);});}
$('justificativa').addEventListener('input',count);$('acesso').addEventListener('change',typeInfo);
form.addEventListener('reset',()=>setTimeout(()=>{count();clock();typeInfo();$('usuario').value=D.actor();D.feedback(feedback,'');window.demoDirty=false;},0));
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{const authorization=D.authorize({studentId:$('aluno').value,type:$('acesso').value,minutes:Number($('validade').value),reason:$('justificativa').value.trim()});render();form.reset();setTimeout(()=>{D.feedback(feedback,'Autorização registrada. Válida até '+D.formatTime(authorization.expiresAt)+'.');window.demoDirty=false;},0);}catch(e){D.feedback(feedback,e.message,true);}});
clock();count();typeInfo();render();setInterval(()=>{clock();render();},30000);
})();