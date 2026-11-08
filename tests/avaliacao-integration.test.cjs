'use strict';
// Controlador da tela em DOM mínimo, HTTP real e banco SQLite local.
const assert=require('node:assert/strict');
const Database=require('../backend/node_modules/better-sqlite3');
const {page}=require('./front-end.test.cjs');
const db=new Database(require('node:path').join(__dirname,'../backend/dev.db'));
const api='http://localhost:3333/api';
async function request(path,method='GET',data){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:response.status,body:await response.json()};}
async function waitFor(test){for(let i=0;i<100;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,30));}throw new Error('A página não concluiu a consulta à API.');}
async function main(){
 let alunoId;
 try{
  let aluno;for(let i=0;i<10;i++){const cpf=String(Math.floor(Math.random()*1e11)).padStart(11,'0');const r=await request('/alunos','POST',{nome:'Integração Avaliação Teste',cpf,dataNascimento:'1990-01-01'});if(r.status===201){aluno=r.body;break;}}
  assert.ok(aluno);alunoId=aluno.id;
  const valid={alunoId,dataAvaliacao:'2026-10-08',peso:70,altura:175,percentualGordura:18,objetivo:'Outro',dataReavaliacao:'2026-11-07'};
  for(const [campo,valor] of [['peso',19.9],['peso',350.1],['altura',49.9],['altura',250.1],['percentualGordura',1.9],['percentualGordura',70.1],['peso',null],['altura',null],['peso','70']]){
   const result=await request('/avaliacoes','POST',{...valid,[campo]:valor});assert.equal(result.status,400,`${campo}=${valor}`);assert.match(result.body.erro,/peso|altura|gordura/i);
  }
  assert.equal((await request('/avaliacoes','POST',{...valid,alunoId:'inexistente'})).status,404);
  assert.equal((await request('/avaliacoes','POST',{...valid,dataAvaliacao:'2026-02-30'})).status,400);
  assert.equal((await request('/avaliacoes','POST',{...valid,dataAvaliacao:'1989-12-31'})).status,400);
  assert.equal((await request('/avaliacoes','POST',{...valid,dataReavaliacao:'2026-10-01'})).status,400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM AvaliacaoFisica WHERE alunoId=?').get(alunoId).n,0);
  const p=page('modulos/modulo-05-avaliacao/index.html',new Map(),fetch);
  await waitFor(()=>!p.nodes['historico-feedback'].textContent&&p.nodes.historico.textContent.includes('Nenhuma'));
  // Aguardar alunos sem depender de IDs ou de outros registros existentes.
  let option;for(let i=0;i<100&&!option;i++){p.nodes.alunoBusca.value=aluno.matricula;await p.nodes.alunoBusca.fire('input');option=p.nodes.alunoResultados.querySelectorAll('.student-search-option').find(n=>n.textContent.includes(aluno.matricula));if(!option)await new Promise(resolve=>setTimeout(resolve,30));}
  assert.ok(option,'Aluno recebido da API aparece na busca');await option.fire('click');assert.equal(p.nodes.matricula.value,aluno.matricula);
  p.nodes.peso.value='74.5';p.nodes.altura.value='175';p.nodes.gordura.value='18.2';p.nodes.objetivo.value='Outro';await p.nodes.formAvaliacao.fire('submit');await p.flush();
  assert.match(p.nodes.feedback.textContent,/Avaliação salva/);
  const row=db.prepare('SELECT * FROM AvaliacaoFisica WHERE alunoId=?').get(alunoId);assert.ok(row);assert.equal(row.peso,74.5);assert.equal(row.altura,175);assert.equal(row.percentualGordura,18.2);
  assert.match(p.nodes.historico.textContent,/Integração Avaliação Teste/);assert.match(p.nodes.historico.textContent,/74,5 kg/);
  let result=await request('/avaliacoes/'+row.id);assert.equal(result.status,200);assert.equal(result.body.aluno.matricula,aluno.matricula);
  result=await request('/avaliacoes/'+row.id,'PUT',{peso:19});assert.equal(result.status,400);assert.equal(db.prepare('SELECT peso FROM AvaliacaoFisica WHERE id=?').get(row.id).peso,74.5);
  result=await request('/avaliacoes/'+row.id,'PUT',{peso:350,altura:250,percentualGordura:70});assert.equal(result.status,200);
  result=await request('/avaliacoes','POST',{...valid,peso:20,altura:50,percentualGordura:2});assert.equal(result.status,201);
  const second=result.body.id;result=await request('/avaliacoes','POST',{...valid,percentualGordura:null,dataReavaliacao:null});assert.equal(result.status,201);assert.equal(result.body.percentualGordura,null);
  const p2=page('modulos/modulo-05-avaliacao/index.html',new Map(),fetch);p2.nodes.filtroAluno.value=aluno.matricula;await p2.nodes.filtroAluno.fire('input');await waitFor(()=>p2.nodes.historico.textContent.includes('Integração Avaliação Teste'));assert.match(p2.nodes.historico.textContent,/350 kg/);
  result=await request('/avaliacoes/'+second,'DELETE');assert.equal(result.status,200);assert.equal((await request('/avaliacoes/'+second)).status,404);
  assert.equal((await request('/avaliacoes/inexistente','PUT',{peso:60})).status,404);
  console.log('Avaliações: formulário, histórico, limites inclusivos, rejeição de dados inválidos e CRUD confirmados no SQLite.');
 }finally{if(alunoId){db.prepare('DELETE FROM AvaliacaoFisica WHERE alunoId=?').run(alunoId);db.prepare('DELETE FROM Aluno WHERE id=?').run(alunoId);}db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
