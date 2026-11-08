(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formCatraca');
let version=0,logsVersion=0;
D.initPage({bootstrap:false});
function idle(){ $('status-banner').className='status-panel';$('status-title').textContent='Aguardando matrícula';$('status-sub').textContent='O resultado da consulta aparecerá aqui.';$('student-card').hidden=true;D.feedback($('feedback'),'');}
async function carregarLogs(){
 const current=++logsVersion;
 try{
  const response=await fetch('http://localhost:3333/api/portaria/logs',{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível carregar os acessos recentes.');
  const logs=await response.json();if(!Array.isArray(logs))throw new Error('Não foi possível carregar os acessos recentes.');
  if(current!==logsVersion)return;
  const list=$('logs-list');list.replaceChildren();
  for(const log of logs){
   const item=document.createElement('li'),description=document.createElement('span'),status=document.createElement('span');
   const time=new Date(log.dataHora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
   description.textContent=time+' — '+(log.aluno?.nome||'Matrícula não encontrada')+' ('+log.matricula+')';
   status.className='log-status'+(log.status==='Negado'?' denied':'');status.textContent=log.status;
   item.append(description,status);list.append(item);
  }
  $('logs-feedback').textContent=logs.length?'':'Nenhum acesso registrado ainda.';
 }catch{if(current===logsVersion){$('logs-list').replaceChildren();$('logs-feedback').textContent='Não foi possível carregar os acessos recentes.';}}
}
async function validate(event){
 event.preventDefault();const current=++version;idle();if(!form.reportValidity())return;
 const matricula=$('matricula').value.trim();if(!/^\d{4,12}$/.test(matricula)){D.feedback($('feedback'),'Informe uma matrícula de 4 a 12 números.',true);return;}
 $('btn-validar').disabled=true;
 try{
  let response;try{response=await fetch('http://localhost:3333/api/portaria/acesso/'+encodeURIComponent(matricula),{cache:'no-store'});}catch{throw new Error('Não foi possível conectar à API. Tente novamente.');}
  let result;try{result=await response.json();}catch{throw new Error('A API retornou uma resposta inválida.');}
  if(!response.ok)throw new Error(result?.erro||'Não foi possível consultar a matrícula.');
  if(!['LIBERADO','NEGADO'].includes(result?.acesso))throw new Error('A API retornou uma resposta inválida.');
  await carregarLogs();
  if(current!==version)return;
  $('status-banner').className='status-panel '+(result.acesso==='LIBERADO'?'ok':'danger');$('status-title').textContent='Acesso '+result.acesso;$('status-sub').textContent=result.motivo;
  $('student-card').hidden=!result.aluno;
  if(result.aluno){D.avatar($('avatar'),{name:result.aluno.nome});$('student-name').textContent=result.aluno.nome;$('student-mat').textContent='Matrícula '+result.aluno.matricula;$('student-plan').textContent='Plano: '+(result.contrato?.plano||'—');$('student-due').textContent='Vencimento: '+(result.contrato?.dataFim?D.formatDate(result.contrato.dataFim.slice(0,10)):'—');}
 }catch(e){if(current===version)D.feedback($('feedback'),e.message,true);}
 finally{if(current===version)$('btn-validar').disabled=false;}
}
form.addEventListener('submit',validate);form.addEventListener('reset',()=>{version++;$('btn-validar').disabled=false;idle();});form.addEventListener('input',()=>{version++;$('btn-validar').disabled=false;idle();});form.addEventListener('invalid',idle,true);idle();carregarLogs();
})();
