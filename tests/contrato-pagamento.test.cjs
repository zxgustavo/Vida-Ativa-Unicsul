'use strict';
const assert=require('node:assert/strict');
const Database=require('../backend/node_modules/better-sqlite3');
const db=new Database(require('node:path').join(__dirname,'../backend/dev.db'));
const api='http://localhost:3333/api';
async function request(path,method='GET',body){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};}
const shift=(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
async function main(){
 let alunoId;
 try{
  let aluno;for(let i=0;i<10;i++){const cpf=String(Math.floor(Math.random()*1e11)).padStart(11,'0');const r=await request('/alunos','POST',{nome:'Teste Pagamento Contrato',cpf});if(r.status===201){aluno=r.body;break;}}
  assert.ok(aluno);alunoId=aluno.id;
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function criar(situacao,inicio,fim){const r=await request('/financeiro','POST',{alunoId,plano:'Mensal',valor:120,dataInicio:inicio,dataFim:fim,situacao});assert.equal(r.status,201);return r.body;}
  async function pagar(contrato,extra={}){const r=await request('/financeiro/'+contrato.id,'PUT',{statusPagamento:'Pago',dataPagamento:hoje,...extra});assert.equal(r.status,200);assert.equal(r.body.statusPagamento,'Pago');assert.equal(r.body.id,contrato.id);assert.equal(r.body.aluno.id,alunoId);return r.body;}
  for(const situacao of ['A Iniciar','Vencido']){
   const c=await criar(situacao,hoje,shift(hoje,30)),r=await pagar(c);assert.equal(r.situacao,'Vigente');assert.equal(db.prepare('SELECT situacao FROM Contrato WHERE id=?').get(c.id).situacao,'Vigente');
  }
  const futuro=await criar('A Iniciar',shift(hoje,1),shift(hoje,30));assert.equal((await pagar(futuro)).situacao,'A Iniciar');
  const vencido=await criar('Vencido',shift(hoje,-30),shift(hoje,-1));assert.equal((await pagar(vencido)).situacao,'Vencido');
  const expiraHoje=await criar('Vencido',shift(hoje,-30),hoje);assert.equal((await pagar(expiraHoje)).situacao,'Vencido');
  const cancelado=await criar('Cancelado',shift(hoje,-1),shift(hoje,30));assert.equal((await pagar(cancelado,{situacao:'Ativo'})).situacao,'Cancelado');
  const cancelamento=await criar('Ativo',shift(hoje,-1),shift(hoje,30));assert.equal((await pagar(cancelamento,{situacao:'Cancelado'})).situacao,'Cancelado');
  const renovado=await criar('Vencido',shift(hoje,-30),shift(hoje,-1));assert.equal((await pagar(renovado,{dataFim:shift(hoje,30)})).situacao,'Vigente');
  const pendente=await criar('Vencido',shift(hoje,-1),shift(hoje,30));let r=await request('/financeiro/'+pendente.id,'PUT',{formaPagamento:'Boleto'});assert.equal(r.body.situacao,'Vencido');r=await request('/financeiro/'+pendente.id,'PUT',{statusPagamento:'Pendente'});assert.equal(r.body.situacao,'Vencido');
  console.log('Pagamento: reavaliação, limites de datas, cancelamento e resposta completa confirmados na API e no SQLite.');
 }finally{if(alunoId){db.prepare('DELETE FROM Contrato WHERE alunoId=?').run(alunoId);db.prepare('DELETE FROM Aluno WHERE id=?').run(alunoId);}db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
