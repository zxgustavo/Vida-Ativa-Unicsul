'use strict';
// Exercita o controlador do Financeiro em DOM mínimo, com API e SQLite reais.
const assert=require('node:assert/strict');
const Database=require('../backend/node_modules/better-sqlite3');
const {page,answerDialog,descendants}=require('./front-end.test.cjs');
const api=(process.env.TEST_API_URL || 'http://localhost:3333')+'/api';
const db=new Database(process.env.TEST_DATABASE_PATH || require('node:path').join(__dirname,'../backend/dev.db'));
async function request(route,method='GET',data){const response=await fetch(api+route,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:response.status,body:await response.json()};}
async function waitFor(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,30));}throw new Error('A página não concluiu a consulta da API.');}
async function main(){
 let alunoId;
 try{
  let aluno;
  for(let i=0;i<10;i++){const cpf=String(Math.floor(Math.random()*1e11)).padStart(11,'0');const result=await request('/alunos','POST',{nome:'Integração Financeiro Teste',cpf});if(result.status===201){aluno=result.body;break;}}
  assert.ok(aluno,'Aluno de teste criado');alunoId=aluno.id;
  const invalid=await request('/financeiro','POST',{alunoId:'inexistente',plano:'Mensal',valor:120,dataInicio:'2026-10-08',dataFim:'2026-11-08',situacao:'Vigente'});assert.equal(invalid.status,404);
  const calls=[];const p=page('modulos/modulo-02-financeiro/index.html',new Map(),(url,options={})=>{calls.push({url:String(url),method:options.method||'GET'});return fetch(String(url).replace("http://localhost:3333/api",api),options);});
  p.nodes.busca.value=aluno.matricula;await p.nodes.busca.fire('input');await waitFor(()=>p.nodes.tabelaDados.textContent.includes('Integração Financeiro Teste'));
  await p.nodes['novo-contrato'].fire('click');p.nodes.alunoBusca.value=aluno.matricula;await p.nodes.alunoBusca.fire('input');
  const choice=p.nodes.alunoResultados.querySelectorAll('.student-search-option').find(n=>n.textContent.includes(aluno.matricula));assert.ok(choice);await choice.fire('click');
  p.nodes.status.value='Pago';await p.nodes.status.fire('change');await p.nodes.formFinanceiro.fire('submit');assert.match(p.nodes.feedback.textContent,/cadastrados/);
  const row=db.prepare('SELECT * FROM Contrato WHERE alunoId = ?').get(alunoId);assert.ok(row);assert.equal(row.plano,'Mensal');assert.equal(row.valor,120);assert.equal(row.statusPagamento,'Pago');assert.equal(row.formaPagamento,'PIX');
  assert.match(p.nodes.tabelaDados.textContent,/Integração Financeiro Teste/);assert.match(p.nodes.tabelaDados.textContent,/Pago/);
  const countGets=()=>calls.filter(c=>c.method==='GET'&&c.url.endsWith('/api/financeiro')).length;
  let previous=countGets();await p.nodes['fechar-operacao'].fire('click');assert.ok(countGets()>previous);assert.equal(p.nodes['painel-operacao'].hidden,true);
  const record=p.nodes.tabelaDados.children.find(n=>n.getAttribute('data-student-id')===alunoId);const edit=descendants(record).find(n=>n.getAttribute('data-action')==='edit');await edit.fire('click');
  p.nodes.pagamento.value='Boleto';await p.nodes.pagamento.fire('change');await p.nodes.formFinanceiro.fire('submit');assert.equal(db.prepare('SELECT formaPagamento FROM Contrato WHERE id = ?').get(row.id).formaPagamento,'Boleto');
  previous=countGets();let pending=p.nodes.suspender.fire('click');await answerDialog(p,true);await pending;assert.ok(countGets()>previous);assert.equal(db.prepare('SELECT situacao FROM Contrato WHERE id = ?').get(row.id).situacao,'Suspenso');assert.match(p.nodes.tabelaDados.textContent,/Suspenso/);
  pending=p.nodes.suspender.fire('click');await answerDialog(p,true);await pending;assert.equal(db.prepare('SELECT situacao FROM Contrato WHERE id = ?').get(row.id).situacao,'Ativo');
  const second=await request('/financeiro','POST',{alunoId,plano:'Anual',valor:1152,dataInicio:'2026-10-08',dataFim:'2027-10-08',situacao:'Vigente'});assert.equal(second.status,201);
  const p2=page('modulos/modulo-02-financeiro/index.html',new Map(),(url,options)=>fetch(String(url).replace('http://localhost:3333/api',api),options));p2.nodes.busca.value=aluno.matricula;await p2.nodes.busca.fire('input');await waitFor(()=>p2.nodes.tabelaDados.children.filter(n=>n.getAttribute('data-student-id')===alunoId).length===2);
  const cancel=await request('/financeiro/'+second.body.id,'DELETE');assert.equal(cancel.status,200);assert.equal(db.prepare('SELECT situacao FROM Contrato WHERE id = ?').get(second.body.id).situacao,'Cancelado');
  const missing=await request('/financeiro/id-inexistente','PUT',{situacao:'Cancelado'});assert.equal(missing.status,404);
  assert.equal((await request('/alunos/'+alunoId,'DELETE')).status,200);
  const filteredCalls=[];const p3=page('modulos/modulo-02-financeiro/index.html',new Map(),(url,options={})=>{filteredCalls.push(String(url));return fetch(String(url).replace("http://localhost:3333/api",api),options);});
  assert.equal(p3.nodes['status-aluno'].value,'ativos');p3.nodes.busca.value=aluno.matricula;await p3.nodes.busca.fire('input');p3.nodes['status-aluno'].value='inativos';await p3.nodes['status-aluno'].fire('change');
  await waitFor(()=>p3.nodes.tabelaDados.children.some(n=>n.getAttribute('data-student-id')===alunoId));const callsAfterLoad=filteredCalls.length;
  p3.nodes['status-aluno'].value='ativos';await p3.nodes['status-aluno'].fire('change');assert.equal(p3.nodes.tabelaDados.children.some(n=>n.getAttribute('data-student-id')===alunoId),false);
  p3.nodes['status-aluno'].value='todos';await p3.nodes['status-aluno'].fire('change');assert.match(p3.nodes.tabelaDados.textContent,/Cadastro inativo/);assert.equal(filteredCalls.length,callsAfterLoad);
  console.log('Integração Financeiro: criação, pagamento, suspensão, reativação, múltiplos contratos e cancelamento confirmados no SQLite.');
 }finally{if(alunoId){db.prepare('DELETE FROM Pagamento WHERE contratoId IN (SELECT id FROM Contrato WHERE alunoId=?)').run(alunoId);db.prepare('DELETE FROM Contrato WHERE alunoId = ?').run(alunoId);db.prepare('DELETE FROM Aluno WHERE id = ?').run(alunoId);}db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
