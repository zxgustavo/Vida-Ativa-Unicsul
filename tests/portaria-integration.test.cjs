'use strict';
const assert=require('node:assert/strict');const Database=require('../backend/node_modules/better-sqlite3');const {page}=require('./front-end.test.cjs');
const db=new Database(require('node:path').join(__dirname,'../backend/dev.db')),api='http://localhost:3333/api';
async function request(path,method='GET',data){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:response.status,body:await response.json(),headers:response.headers};}
const shift=(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
async function main(){let alunoId;try{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let aluno;for(let i=0;i<10;i++){const cpf=String(Math.floor(Math.random()*1e11)).padStart(11,'0'),result=await request('/alunos','POST',{nome:'Aluno Portaria Teste',cpf});if(result.status===201){aluno=result.body;break;}}assert.ok(aluno);alunoId=aluno.id;
 const consultar=()=>request('/portaria/acesso/'+aluno.matricula),state=()=>JSON.stringify({aluno:db.prepare('SELECT * FROM Aluno WHERE id=?').get(alunoId),contratos:db.prepare('SELECT * FROM Contrato WHERE alunoId=? ORDER BY id').all(alunoId)});
 async function verificar(expected){const before=state(),result=await consultar();assert.equal(result.status,200);assert.equal(result.body.acesso,expected);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(state(),before);return result.body;}
 await verificar('NEGADO');assert.equal((await request('/portaria/acesso/abcd')).status,400);assert.equal((await request('/portaria/acesso/000000000000')).body.acesso,'NEGADO');
 let result=await request('/financeiro','POST',{alunoId,plano:'Mensal',valor:120,dataInicio:shift(today,-2),dataFim:shift(today,10),situacao:'Vigente'});assert.equal(result.status,201);const id=result.body.id;
 let allowed=await verificar('LIBERADO');assert.equal(allowed.aluno.matricula,aluno.matricula);assert.equal(allowed.contrato.plano,'Mensal');assert.equal('cpf' in allowed.aluno,false);
 const p=page('modulos/modulo-03-portaria/index.html',new Map(),fetch);p.nodes.matricula.value=aluno.matricula;await p.nodes.formCatraca.fire('submit');assert.equal(p.nodes['status-title'].textContent,'Acesso LIBERADO');
 async function alterar(data){const r=await request('/financeiro/'+id,'PUT',data);assert.equal(r.status,200);}
 await alterar({situacao:'Ativo'});await verificar('LIBERADO');
 await alterar({situacao:'Suspenso'});await verificar('NEGADO');await alterar({situacao:'Cancelado'});await verificar('NEGADO');
 await alterar({situacao:'Vencido',dataInicio:shift(today,-30),dataFim:shift(today,-1)});await verificar('NEGADO');
 await alterar({situacao:'A Iniciar',dataInicio:shift(today,1),dataFim:shift(today,30)});await verificar('NEGADO');
 await alterar({situacao:'Vigente',dataInicio:shift(today,1),dataFim:shift(today,30)});await verificar('NEGADO');
 await alterar({situacao:'Vigente',dataInicio:shift(today,-1),dataFim:today});await verificar('LIBERADO');
 assert.equal((await request('/alunos/'+alunoId,'DELETE')).status,200);await verificar('NEGADO');await p.nodes.formCatraca.fire('submit');assert.equal(p.nodes['status-title'].textContent,'Acesso NEGADO');
 assert.equal((await request('/relatorios/dashboard')).status,200);assert.equal((await request('/financeiro')).status,200);console.log('Portaria: consulta somente leitura, regras de contrato e interface verificadas com SQLite.');
 }finally{if(alunoId){db.prepare('DELETE FROM Contrato WHERE alunoId=?').run(alunoId);db.prepare('DELETE FROM Aluno WHERE id=?').run(alunoId);}db.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
