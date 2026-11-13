'use strict';
// API Express, serviços, Prisma e SQLite reais. Apenas o DOM do teste de interface é mínimo.
const assert=require('node:assert/strict'),Database=require('../backend/node_modules/better-sqlite3');
const {page}=require('./front-end.test.cjs');
assert.ok(process.env.TEST_DATABASE_PATH,'Execute com node tests/run-isolated.cjs.');
const db=new Database(process.env.TEST_DATABASE_PATH),api=process.env.TEST_API_URL+'/api';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function request(route,method='GET',body){const r=await fetch(api+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
async function main(){
 let aluno;
 try{
  const created=await request('/alunos','POST',{nome:'Recebimentos Ána Controlada',cpf:'16899535009'});assert.equal(created.status,201);aluno=created.body;
  db.prepare('UPDATE Aluno SET criadoEm=? WHERE id=?').run('2025-01-01T12:00:00Z',aluno.id);
  async function contract(value,status,date,extra={}){const r=await request('/financeiro','POST',{alunoId:aluno.id,plano:'Mensal',valor:value,dataInicio:'2025-01-01',dataFim:'2027-12-31',situacao:'Vigente',statusPagamento:status,dataPagamento:date,...extra});assert.equal(r.status,201,JSON.stringify(r.body));return r.body;}
  const first=await contract(120.10,'Pago','2026-10-06');
  await contract(324.20,'Pago','2026-10-07T02:59:59.999Z'); // 06/10, 23:59:59.999 SP
  await contract(50,'Pago','2026-10-07T03:00:00.000Z'); // 07/10, 00h SP
  await contract(90,'Pago','2026-10-06T00:00:00.000Z'); // instante: 05/10 em SP
  await contract(1152,'Pendente','2026-10-06');
  async function report(from,to=from,extra=''){const r=await request('/relatorios/dashboard?dataInicio='+from+'&dataFim='+to+'&busca='+aluno.matricula+extra);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.totais.recebidoCentavos,r.body.pagamentos.reduce((sum,p)=>sum+p.valorCentavos,0));return r.body;}
  let r=await report('2026-10-06');assert.equal(r.totais.recebidoCentavos,44430);assert.equal(r.pagamentos.length,2);assert.equal(r.alunos.length,0,'Cadastro anterior não impede o recebimento de aparecer.');
  assert.equal((await report('2026-10-07')).totais.recebidoCentavos,5000);
  r=await report('2026-10-08');assert.equal(r.totais.recebidoCentavos,0);assert.equal(r.pagamentos.length,0);assert.equal(r.totais.alunos,0,'Indicadores de cadastro seguem o período, independentemente dos recebimentos.');
  assert.equal((await report('2026-10-06','2026-10-07')).totais.recebidoCentavos,49430);
  for(const busca of ['recebimentos ana','168.995.350-09',aluno.matricula]){const result=await request('/relatorios/dashboard?dataInicio=2026-10-06&dataFim=2026-10-06&situacao=Vigente&busca='+encodeURIComponent(busca));assert.equal(result.body.totais.recebidoCentavos,44430);}
  assert.equal((await report('2026-10-06','2026-10-06','&situacao=Vencido')).totais.recebidoCentavos,0);
  assert.equal((await request('/relatorios/dashboard?dataInicio=2026-10-07&dataFim=2026-10-06')).status,400);
  assert.equal((await request('/relatorios/dashboard?dataInicio=2026-02-30')).status,400);
  // Editar metadados e valores atuais não reescreve o que foi recebido.
  assert.equal((await request('/financeiro/'+first.id,'PUT',{valor:999,formaPagamento:'Boleto'})).status,200);
  assert.equal((await report('2026-10-06')).totais.recebidoCentavos,44430);
  assert.equal((await request('/financeiro/'+first.id,'PUT',{statusPagamento:'Pendente'})).status,409);
  assert.equal((await request('/financeiro/'+first.id,'PUT',{statusPagamento:'Pago',dataPagamento:'2026-10-07'})).status,409);
  assert.equal((await request('/financeiro/'+first.id,'DELETE')).status,200);
  assert.equal((await report('2026-10-06')).totais.recebidoCentavos,44430,'Cancelar não apaga dinheiro já recebido.');
  assert.equal((await report('2026-10-06','2026-10-06','&situacao=Cancelado')).totais.recebidoCentavos,12010);
  // Um segundo recebimento renova sem apagar o primeiro; retries e concorrência não somam de novo.
  const expired=await contract(120,'Pago','2026-09-01',{situacao:'Vencido',dataFim:'2026-09-30'});
  const body={statusPagamento:'Pago',dataPagamento:today,operacaoPagamento:'renovacao-retry-123456'};
  const paid=await request('/financeiro/'+expired.id,'PUT',body);assert.equal(paid.status,200);assert.equal(paid.body.situacao,'Vigente');
  for(const result of await Promise.all(Array.from({length:3},()=>request('/financeiro/'+expired.id,'PUT',body)))){assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.dataFim,paid.body.dataFim);}
  const receipts=db.prepare('SELECT * FROM Pagamento WHERE contratoId=? ORDER BY dataPagamento').all(expired.id);assert.equal(receipts.length,2);assert.equal(receipts[0].dataPagamento,'2026-09-01');assert.equal(receipts[1].dataPagamento,today);
  assert.equal((await report('2026-09-01')).totais.recebidoCentavos,12000);
  const createKey={operacaoPagamento:'criacao-retry-123456'};const c1=await contract(25,'Pago','2026-10-06',createKey),c2=await contract(25,'Pago','2026-10-06',createKey);assert.equal(c1.id,c2.id);
  const unknown=await contract(120,'Pendente',null,{plano:'Personalizado',situacao:'Vencido',dataFim:'2026-09-30'});
  assert.equal((await request('/financeiro/'+unknown.id,'PUT',{statusPagamento:'Pago',dataPagamento:today})).status,400);assert.equal(db.prepare('SELECT count(*) AS n FROM Pagamento WHERE contratoId=?').get(unknown.id).n,0);assert.equal(db.prepare('SELECT statusPagamento FROM Contrato WHERE id=?').get(unknown.id).statusPagamento,'Pendente');
  const atomic=await contract(120,'Pendente',null,{situacao:'Vencido',dataFim:'2026-09-30'});
  const beforeFailure=db.prepare('SELECT * FROM Contrato WHERE id=?').get(atomic.id);
  db.exec(`CREATE TRIGGER teste_falha_pagamento BEFORE INSERT ON Pagamento WHEN NEW.contratoId='${atomic.id.replaceAll("'","''")}' BEGIN SELECT RAISE(ABORT, 'falha controlada no SQLite de testes'); END;`);
  try{
   assert.equal((await request('/financeiro/'+atomic.id,'PUT',{statusPagamento:'Pago',dataPagamento:today})).status,500);
   assert.deepEqual(db.prepare('SELECT * FROM Contrato WHERE id=?').get(atomic.id),beforeFailure,'Falha após atualizar contrato reverte inclusive a renovação.');
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Pagamento WHERE contratoId=?').get(atomic.id).n,0);
  }finally{db.exec('DROP TRIGGER teste_falha_pagamento');}
  // Interface do relatório usa a API real e limpa resultados antigos em erro.
  const p=page('modulos/modulo-06-relatorios/index.html',new Map(),(url,options)=>fetch(String(url).replace('http://localhost:3333',process.env.TEST_API_URL),options));await p.ready;
  p.nodes.dataInicio.value='2026-10-06';p.nodes.dataFim.value='2026-10-06';p.nodes.buscarAluno.value=aluno.matricula;await p.nodes.formRelatorio.fire('submit');
  assert.equal(p.nodes['recebido-periodo'].textContent,'R$ 469,30');assert.match(p.nodes.pagamentosCorpo.textContent,/168\.995\.350-09/);
  p.nodes.dataInicio.value='2026-10-08';p.nodes.dataFim.value='2026-10-08';await p.nodes.formRelatorio.fire('submit');assert.match(p.nodes['recebido-periodo'].textContent,/0,00/);assert.match(p.nodes.pagamentosCorpo.textContent,/Nenhum pagamento/);
  await p.nodes.limparFiltros.fire('click');assert.equal(p.nodes.status.value,'todos');assert.equal(p.nodes.buscarAluno.value,'');assert.equal(p.nodes.dataInicio.value,p.sandbox.Demo.today().slice(0,7)+'-01');
  for(let i=0;i<11;i++)await contract(1,'Pago','2026-10-09');
  p.nodes.dataInicio.value='2026-10-09';p.nodes.dataFim.value='2026-10-09';p.nodes.buscarAluno.value=aluno.matricula;await p.nodes.formRelatorio.fire('submit');
  assert.equal(p.nodes.pagamentosCorpo.children.length,10);assert.match(p.nodes['pagamentos-pagina'].textContent,/1 de 2/);assert.match(p.nodes['pagamentos-total'].textContent,/11,00/);
  const fetched=p.apiCalls.length;await p.nodes['pagamentos-proxima'].fire('click');assert.equal(p.nodes.pagamentosCorpo.children.length,1);assert.match(p.nodes['pagamentos-total'].textContent,/11,00/);assert.equal(p.apiCalls.length,fetched);
  p.sandbox.fetch=async()=>{throw new Error('offline');};await p.nodes.formRelatorio.fire('submit');assert.equal(p.nodes['recebido-periodo'].textContent,'—');assert.equal(p.nodes['pagamentos-total'].textContent,'—');
  console.log('Recebimentos reais: zero/um/vários, soma em centavos, limites SP, pendências, cadastro anterior, filtros, limpeza, erro, histórico, idempotência, concorrência e rollback aprovados.');
 }finally{if(aluno){db.prepare('DELETE FROM Pagamento WHERE contratoId IN (SELECT id FROM Contrato WHERE alunoId=?)').run(aluno.id);db.prepare('DELETE FROM Contrato WHERE alunoId=?').run(aluno.id);db.prepare('DELETE FROM Aluno WHERE id=?').run(aluno.id);}db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
