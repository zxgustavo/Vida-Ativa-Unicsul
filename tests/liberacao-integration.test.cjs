'use strict';
// API real e controlador da tela sobre um SQLite temporário, sem alterar o banco do projeto.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn}=require('node:child_process');
const Database=require('../backend/node_modules/better-sqlite3');
const {page}=require('./front-end.test.cjs');
const root=path.resolve(__dirname,'..');
async function waitFor(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('A tela não concluiu a consulta da API.');}
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vida-liberacoes-')),dbPath=path.join(dir,'test.db');
 const source=new Database(process.env.TEST_DATABASE_PATH || path.join(root,'backend/dev.db'),{readonly:true}),db=new Database(dbPath);
 for(const {sql} of source.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND type IN ('table','index') ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END").all())db.exec(sql);
 source.close();
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['node_modules/ts-node/dist/bin.js','--transpile-only','src/server.ts'],{cwd:path.join(root,'backend'),env:{...process.env,PORT:String(port),DATABASE_URL:'file:'+dbPath.replaceAll('\\','/')},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 const request=async(route,body,method=body?'POST':'GET')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await request('/liberacoes')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,output);
  const aluno=(await request('/alunos',{nome:'Aluno da autorização',cpf:'52998224725'})).data;
  const baseData={tipoPessoa:'Outra pessoa',nome:'Técnico de Manutenção',cpf:'168.995.350-09',tipoAcesso:'temporaria',minutos:30,justificativa:'Manutenção dos equipamentos'};
  for(const invalid of [{nome:''},{cpf:'11111111111'},{cpf:'16899535000'},{minutos:0},{justificativa:'curta'},{tipoPessoa:'Visitante'},{alunoId:aluno.id},{tipoAcesso:'invalido'}])assert.equal((await request('/liberacoes',{...baseData,...invalid})).status,400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Liberacao').get().n,0);
  const externa=await request('/liberacoes',{...baseData,responsavel:'Forjado',utilizadaEm:new Date().toISOString(),criadoEm:'2000-01-01'});assert.equal(externa.status,201);
  assert.equal(externa.data.alunoId,null);assert.equal(externa.data.cpf,'16899535009');assert.equal(externa.data.utilizadaEm,null);assert.equal(externa.data.responsavel,'Administração (login simulado)');assert.equal(new Date(externa.data.expiraEm)-new Date(externa.data.criadoEm),1800000);
  const studentData={tipoPessoa:'Aluno',alunoId:aluno.id,tipoAcesso:'entrada',minutos:15,justificativa:'Conferência administrativa'};
  const interna=await request('/liberacoes',{...studentData,nome:'Nome falso',cpf:'00000000000'});assert.equal(interna.status,201);assert.equal(interna.data.nome,aluno.nome);assert.equal(interna.data.cpf,aluno.cpf);assert.equal(interna.data.matricula,aluno.matricula);
  assert.equal((await request('/liberacoes',{...studentData,alunoId:'inexistente'})).status,404);
  await request('/alunos/'+aluno.id,{nome:'Nome atualizado',cpf:'11144477735'},'PUT');
  const saved=(await request('/liberacoes')).data.find(a=>a.id===interna.data.id);assert.equal(saved.nome,aluno.nome);assert.equal(saved.cpf,aluno.cpf);
  const calls=[],api=async(url,options={})=>{calls.push({url:String(url),method:options.method||'GET',body:options.body&&JSON.parse(options.body)});return fetch(String(url).replace('http://localhost:3333',base),options);};
  const p=page('modulos/modulo-04-auditoria/index.html',new Map(),api);await p.ready;await waitFor(()=>p.nodes['historico-liberacoes'].textContent.includes('Técnico de Manutenção'));
  assert.equal(p.nodes.campoAluno.hidden,false);assert.equal(p.nodes.nomePessoa.disabled,true);
  p.nodes.tipoPessoa.value='Outra pessoa';await p.nodes.tipoPessoa.fire('change');assert.equal(p.nodes.campoAluno.hidden,true);assert.equal(p.nodes.alunoBusca.disabled,true);assert.equal(p.nodes.nomePessoa.required,true);assert.equal(p.nodes.cpfPessoa.required,true);
  p.nodes.nomePessoa.value='Visitante Teste';p.nodes.cpfPessoa.value='16899535009';await p.nodes.cpfPessoa.fire('input');assert.equal(p.nodes.cpfPessoa.value,'168.995.350-09');
  p.nodes.justificativa.value='Inspeção dos equipamentos';p.nodes.cpfPessoa.value='11111111111';await p.nodes.liberacaoForm.fire('submit');assert.equal(calls.filter(c=>c.method==='POST').length,0);
  p.nodes.cpfPessoa.value='16899535009';await p.nodes.cpfPessoa.fire('input');await p.nodes.liberacaoForm.fire('submit');await p.flush();assert.match(p.nodes.feedback.textContent,/Autorização registrada/);assert.equal(p.nodes.tipoPessoa.value,'Aluno');assert.equal(p.nodes.nomePessoa.value,'');assert.equal(p.nodes.nomePessoa.disabled,true);assert.equal(p.nodes.alunoBusca.required,true);
  const posted=calls.find(c=>c.method==='POST').body;assert.equal(posted.tipoPessoa,'Outra pessoa');assert.equal(posted.cpf,'16899535009');assert.ok(!Object.hasOwn(posted,'alunoId'));
  assert.equal(db.prepare('SELECT nome FROM Liberacao WHERE nome=?').get('Visitante Teste').nome,'Visitante Teste');
  const reload=page('modulos/modulo-04-auditoria/index.html',new Map(),api);await reload.ready;await waitFor(()=>reload.nodes['historico-liberacoes'].textContent.includes('Visitante Teste'));assert.match(reload.nodes['historico-liberacoes'].textContent,/Visitante Teste/);
  reload.nodes.filtroAluno.value='168.995.350-09';await reload.nodes.filtroAluno.fire('input');assert.equal(reload.nodes['historico-liberacoes'].children.length,2);
  reload.nodes.tipoPessoa.value='Outra pessoa';await reload.nodes.tipoPessoa.fire('change');reload.nodes.nomePessoa.value='Dados preservados';reload.nodes.cpfPessoa.value='16899535009';reload.nodes.justificativa.value='Teste de indisponibilidade';reload.sandbox.fetch=async()=>{throw Error('offline');};await reload.nodes.liberacaoForm.fire('submit');assert.equal(reload.nodes.nomePessoa.value,'Dados preservados');assert.match(reload.nodes.feedback.textContent,/conectar à API/);assert.equal(reload.nodes.salvarLiberacao.disabled,false);
  p.nodes.alunoBusca.value=aluno.matricula;await p.nodes.alunoBusca.fire('input');const choice=p.nodes.alunoResultados.querySelectorAll('.student-search-option')[0];assert.ok(choice);await choice.fire('click');p.nodes.justificativa.value='Autorização pela interface';await p.nodes.liberacaoForm.fire('submit');await p.flush();assert.equal(calls.filter(c=>c.method==='POST').at(-1).body.tipoPessoa,'Aluno');
  await request('/alunos/'+aluno.id,undefined,'DELETE');assert.equal((await request('/liberacoes',studentData)).status,400);
  console.log('Liberações: aluno e outra pessoa, CPF, histórico persistido, identificação preservada, filtros, reset e falha da API aprovados.');
 }finally{db.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
