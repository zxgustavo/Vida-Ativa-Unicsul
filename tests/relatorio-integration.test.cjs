'use strict';
// Exercita filtros da tela, API e agregação no SQLite local.
const assert=require('node:assert/strict');
const Database=require('../backend/node_modules/better-sqlite3');
const {page}=require('./front-end.test.cjs');
const db=new Database(process.env.TEST_DATABASE_PATH || process.env.RELATORIO_TEST_DB || require('node:path').join(__dirname,'../backend/dev.db'));
const api=(process.env.TEST_API_URL || process.env.RELATORIO_TEST_URL || 'http://localhost:3333')+'/api';
async function request(path,method='GET',data){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:response.status,body:await response.json()};}
const day=(value,n)=>{const d=new Date(value+'T00:00:00.000Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
async function main(){
 const ids=[],token=String(Date.now()),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),month=today.slice(0,7)+'-01',lastMonth=day(month,-1);
 try{
  const before=(await request('/relatorios/dashboard')).body;const alunos=[];
  for(let n=0;n<3;n++){
   let aluno;for(let i=0;i<10;i++){const cpf=String(Math.floor(Math.random()*1e11)).padStart(11,'0');const result=await request('/alunos','POST',{nome:`Relatorio ${token} Aluno ${n}`,cpf,dataNascimento:'1990-01-01'});if(result.status===201){aluno=result.body;break;}}
   assert.ok(aluno);alunos.push(aluno);ids.push(aluno.id);
  }
  // A primeira meia-noite e o instante imediatamente anterior testam o fuso de São Paulo.
  db.prepare('UPDATE Aluno SET criadoEm=? WHERE id=?').run(today+'T03:00:00.000Z',ids[0]);
  db.prepare('UPDATE Aluno SET criadoEm=? WHERE id=?').run(today+'T02:59:59.999Z',ids[1]);
  db.prepare('UPDATE Aluno SET criadoEm=? WHERE id=?').run(today+'T23:59:59.000Z',ids[2]);
  async function contract(alunoId,inicio,fim,valor,situacao='Ativo'){const result=await request('/financeiro','POST',{alunoId,plano:'Mensal',valor,dataInicio:inicio,dataFim:fim,situacao});assert.equal(result.status,201);}
  await contract(ids[0],day(today,-60),day(today,-30),40);await contract(ids[0],day(today,-20),day(today,-1),50,'Vencido');await contract(ids[0],day(today,1),day(today,30),60,'A Iniciar');
  await contract(ids[1],day(today,-1),day(today,30),120,'Ativo');await contract(ids[2],day(today,-1),day(today,30),80,'Vigente');await contract(ids[1],day(today,-1),day(today,30),500,'Cancelado');await contract(ids[1],day(today,-1),day(today,30),500,'Suspenso');
  assert.equal((await request('/alunos/'+ids[2],'DELETE')).status,200);
  async function avaliacao(date){const r=await request('/avaliacoes','POST',{alunoId:ids[0],dataAvaliacao:date,peso:70,altura:175,percentualGordura:null,objetivo:'Outro'});assert.equal(r.status,201);}
  await avaliacao(today);await avaliacao(lastMonth);
  const result=await request('/relatorios/dashboard?dataInicio='+today+'&dataFim='+today+'&busca='+token);assert.equal(result.status,200);const report=result.body,t=report.totais,b=before.totais;
  assert.equal(t.alunos,b.alunos+3);assert.equal(t.alunosAtivos,b.alunosAtivos+2);assert.equal(t.receitaPrevista,Math.round((b.receitaPrevista+200)*100)/100);
  assert.equal(t.alunosVencidos,b.alunosVencidos+1);assert.equal(t.alunosAIniciar,b.alunosAIniciar+1);assert.equal(t.avaliacoesMes,b.avaliacoesMes+1);
  assert.equal(t.avaliacoesPeriodo,db.prepare('SELECT COUNT(*) AS n FROM AvaliacaoFisica WHERE substr(dataAvaliacao, 1, 10) = ?').get(today).n);
  assert.equal(report.alunos.length,2);assert.equal(report.alunos.find(a=>a.id===ids[0]).contratos.length,3);assert.equal(report.alunos.find(a=>a.id===ids[0]).cpf,alunos[0].cpf);assert.ok(report.alunos.every(a=>a.dataCadastro===today));assert.ok(!report.alunos.some(a=>a.id===ids[1]));
  const yesterday=day(today,-1),anterior=await request('/relatorios/dashboard?dataInicio='+yesterday+'&dataFim='+yesterday+'&busca='+token);assert.equal(anterior.body.alunos.length,1);assert.equal(anterior.body.alunos[0].id,ids[1]);assert.equal(anterior.body.alunos[0].dataCadastro,yesterday);
  const periodo='dataInicio='+today+'&dataFim='+today+'&busca='+token;
  const vencido=await request('/relatorios/dashboard?'+periodo+'&situacao=Vencido');assert.equal(vencido.body.alunos.length,1);assert.equal(vencido.body.alunos[0].contratos.length,2);assert.ok(vencido.body.alunos[0].contratos.every(c=>c.situacaoAtual==='Vencido'));
  const futuro=await request('/relatorios/dashboard?'+periodo+'&situacao=A%20iniciar');assert.equal(futuro.body.alunos.length,1);assert.equal(futuro.body.alunos[0].id,ids[0]);
  assert.equal((await request('/relatorios/dashboard?dataInicio=2026-02-30')).status,400);assert.equal((await request('/relatorios/dashboard?dataInicio=2099-01-02&dataFim=2099-01-01')).status,400);assert.equal((await request('/relatorios/dashboard?situacao=Invalida')).status,400);
  let calls=0;const p=page('modulos/modulo-06-relatorios/index.html',new Map(),async(url,options)=>{calls++;return fetch(String(url).replace('http://localhost:3333/api',api),options);});await p.ready;
  p.nodes.dataInicio.value=today;p.nodes.dataFim.value=today;p.nodes.buscarAluno.value=token;await p.nodes.formRelatorio.fire('submit');assert.equal(p.nodes['total-alunos'].textContent,String(b.alunos+3));assert.match(p.nodes.tabelaCorpo.textContent,new RegExp(token));assert.equal(p.nodes['avaliacoes-periodo'].textContent,String(t.avaliacoesPeriodo));
  p.nodes.status.value='Vencido';await p.nodes.formRelatorio.fire('submit');assert.equal(p.nodes.tabelaCorpo.children.length,2);
  assert.ok(p.nodes.tabelaCorpo.children.every(row=>row.children[6].textContent==='Vencido'));assert.equal(p.nodes.tabelaCorpo.children[0].children[3].textContent,today.split('-').reverse().join('/'));
  const prev=calls;await p.nodes.limparFiltros.fire('click');assert.ok(calls>prev);assert.equal(p.nodes.status.value,'todos');assert.equal(p.nodes.buscarAluno.value,'');
  p.nodes.dataInicio.value=today;p.nodes.dataFim.value=today;await p.nodes.formRelatorio.fire('submit');p.nodes.buscarAluno.value=token;await p.nodes.buscarAluno.fire('input');const beforeSearch=calls;await p.flush();await new Promise(resolve=>setTimeout(resolve,50));assert.ok(calls>beforeSearch);assert.match(p.nodes.tabelaCorpo.textContent,new RegExp(token));
  console.log('Relatórios: totais, vigência, contagem por aluno, filtros e atualização da tela confirmados no SQLite.');
 }finally{
  const remove=db.transaction(()=>{for(const id of ids){db.prepare('DELETE FROM AvaliacaoFisica WHERE alunoId=?').run(id);db.prepare('DELETE FROM Pagamento WHERE contratoId IN (SELECT id FROM Contrato WHERE alunoId=?)').run(id);db.prepare('DELETE FROM Contrato WHERE alunoId=?').run(id);db.prepare('DELETE FROM Aluno WHERE id=?').run(id);}});remove();db.close();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
