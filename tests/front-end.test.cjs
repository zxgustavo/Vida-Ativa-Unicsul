const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/demo.js'),'utf8');
// Dados fictícios isolados no ambiente de testes; não inicializam o estado do aplicativo.
const fixtureSeed=`function seed(){
 const now=today();
 const students=[
 {id:'1111',name:'Lucas Andrade',cpf:'52998224725',birth:'1996-04-12',phone:'11999991111',address:'Rua Exemplo, 120',emergencyName:'Ana Andrade',emergencyPhone:'11999990001',health:'Nenhuma restrição informada.',notes:'Objetivo: condicionamento físico.',photo:''},
 {id:'2222',name:'Mariana Lima',cpf:'16899535009',birth:'1998-08-21',phone:'11999992222',address:'Avenida Modelo, 45',emergencyName:'Paulo Lima',emergencyPhone:'11999990002',health:'Nenhuma restrição informada.',notes:'Treino no período da manhã.',photo:''},
 {id:'3333',name:'Carlos Eduardo',cpf:'11144477735',birth:'1990-02-10',phone:'11999993333',address:'Rua Demonstração, 300',emergencyName:'Maria Eduardo',emergencyPhone:'11999990003',health:'Nenhuma restrição informada.',notes:'Objetivo: ganho de massa muscular.',photo:''}
 ];
 const contracts=[
 {id:'c-1111',studentId:'1111',planId:'mensal',start:addDays(now,-10),due:addDays(now,20),state:'Ativo',tolerance:5,suspendedAt:null,suspendedDays:0},
 {id:'c-2222',studentId:'2222',planId:'trimestral',start:addMonths(addDays(now,-3),-3),due:addDays(now,-3),state:'Ativo',tolerance:5,suspendedAt:null,suspendedDays:0},
 {id:'c-3333',studentId:'3333',planId:'mensal',start:addMonths(addDays(now,-12),-1),due:addDays(now,-12),state:'Ativo',tolerance:5,suspendedAt:null,suspendedDays:0}
 ];
 const payments=contracts.map((c,i)=>({id:'p-'+c.studentId,contractId:c.id,amount:plans.find(p=>p.id===c.planId).price,method:'PIX',status:i===0?'Pago':i===1?'Pendente':'Atrasado',paidDate:i===0?c.start:null,updatedAt:new Date().toISOString()}));
 const evaluations=[{id:'a-1111',studentId:'1111',date:addDays(now,-7),weight:74.5,height:175,fat:18.2,objective:'Condicionamento físico',interval:30,next:addDays(now,23)}];
 const accesses=[];
 for(let i=0;i<8;i++){const day=addDays(now,-(i%5));accesses.push({id:'ac-seed-'+i,studentId:students[i%2].id,matricula:students[i%2].id,date:day,time:day+'T08:30:00',allowed:true,result:'Liberado',tone:'ok',actor:'Portaria • João Ribeiro',reason:'Acesso de demonstração'});}
 return {version:1,students,contracts,payments,evaluations,accesses,authorizations:[]};
}`;
const FIXED='2026-10-08T15:00:00.000Z';
function fixedDate(value=FIXED){return class extends Date{constructor(...args){super(...(args.length?args:[value]));}static now(){return new Date(value).getTime();}};}
function model(storage=new Map(),fixture=true){const events=[],windowListeners={},sandbox={Date:fixedDate(),structuredClone,Event:class{constructor(type){this.type=type;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},dispatchEvent:e=>events.push(e),addEventListener:(name,fn)=>(windowListeners[name]??=[]).push(fn),windowListeners,console:{log(){throw new Error('Dados não devem ser registrados no console.');}}};sandbox.window=sandbox;sandbox.parent=sandbox;vm.createContext(sandbox);const testSource=fixture?source.replace(/function seed\(\)\{[\s\S]*?\}\r?\nfunction parentStore\(\)/,fixtureSeed+'\nfunction parentStore()'):source;vm.runInContext(testSource,sandbox,{filename:'assets/demo.js'});return{D:sandbox.Demo,sandbox,storage};}
function attributes(value){const result={};for(const m of value.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))result[m[1]]=m[2]??m[3]??m[4]??'';return result;}
class Node{
 constructor(tag,attrs={}){this.tag=tag;this.id=attrs.id||'';this.attributes=attrs;this.nodeType=1;this._value=attrs.value||'';this.defaultValue=this._value;this.children=[];this._text='';this.events={};this.hidden=Object.hasOwn(attrs,'hidden');this.disabled=Object.hasOwn(attrs,'disabled');this.checked=Object.hasOwn(attrs,'checked');this.defaultChecked=this.checked;this.className=attrs.class||'';this.files=[];this.validationMessage='';this.style={};this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:(...names)=>{this.className=[...new Set(this.className.split(/\s+/).concat(names))].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(n=>!names.includes(n)).join(' ');},toggle:(name,on)=>{const enabled=on??!this.classList.contains(name);enabled?this.classList.add(name):this.classList.remove(name);return enabled;}};}
 get value(){return this._value;}set value(v){this._value=String(v);}
 get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(v){this._text=String(v);this.children=[];}
 append(...nodes){for(const n of nodes){if(this.tag==='select'&&!this.children.length)this.value=n.value;this.children.push(n);n.parentElement=this;}}
 appendChild(node){this.append(node);}replaceChildren(...nodes){this.children=[];this._text='';if(this.tag==='select')this.value='';this.append(...nodes);}
 setAttribute(name,value){this.attributes[name]=String(value);}getAttribute(name){return this.attributes[name]??null;}removeAttribute(name){delete this.attributes[name];}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}async fire(name,props={}){const pending=[];for(const fn of this.events[name]||[])pending.push(fn({target:this,preventDefault(){},...props}));if(this.form&&['input','change'].includes(name))pending.push(this.form.fire(name,{target:this,...props}));await Promise.all(pending);}
 click(){return this.fire('click');}focus(){this.focused=true;}scrollIntoView(options){this.scrollOptions=options;}setCustomValidity(value){this.validationMessage=value;}reportValidity(){return !this.validationMessage;}showModal(){this.open=true;}close(){this.open=false;}
 querySelector(selector){if(selector==='span:last-child'||selector==='span:first-child')return this.labelNode;return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){const matches=n=>selector.startsWith('.')?n.className.split(/\s+/).includes(selector.slice(1)):selector.startsWith('[role=')?n.getAttribute('role')===selector.match(/"([^"]+)"/)[1]:false;return this.children.flatMap(n=>[...(matches(n)?[n]:[]),...n.querySelectorAll(selector)]);}
 closest(selector){for(let n=this;n;n=n.parentElement)if(selector.startsWith('.')&&n.className.split(/\s+/).includes(selector.slice(1)))return n;return null;}
 contains(node){for(let n=node;n;n=n.parentElement)if(n===this)return true;return false;}
 dispatchEvent(event){for(const fn of this.events[event.type]||[])fn({target:this,preventDefault(){},...event});return true;}
 removeChild(node){this.children=this.children.filter(child=>child!==node);node.parentElement=null;return node;}
 remove(){this.parentElement?.removeChild(this);}
}
function page(file,storage=new Map(),fetchOverride,sessionProfile='admin',sessionInicio=''){
 const html=fs.readFileSync(path.join(root,file),'utf8').replace(/<!--[\s\S]*?-->/g,''),nodes={},all=[],timeouts=[],intervals=[],links=[];
 for(const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){const attrs=attributes(m[2]),n=new Node(m[1],attrs);all.push(n);if(attrs.id)nodes[attrs.id]=n;}
 for(const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)){const attrs=attributes(m[1]),n=nodes[attrs.id];if(!n)continue;const list=[...m[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];let selected;for(const item of list){const a=attributes(item[1]),option=new Node('option',a);option.value=a.value??item[2].trim();option.textContent=item[2].trim();n.append(option);if(Object.hasOwn(a,'selected'))selected=option.value;}n.value=selected??n.value;n.defaultValue=n.value;}
 if(file==='index.html')for(const m of html.matchAll(/<li\b([^>]*)>\s*<a\b([^>]*)>([\s\S]*?)<\/a>/g)){const n=new Node('a',attributes(m[2]));n.parentElement=new Node('li',attributes(m[1]));n.labelNode=new Node('span');n.labelNode.textContent=m[3].replace(/<[^>]*>/g,'').replace(/^\s*\d+\s*/,'').trim();links.push(n);}
 if(nodes['mobile-nav-toggle'])nodes['mobile-nav-toggle'].labelNode=new Node('span');
 for(const m of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)){const form=nodes[attributes(m[1]).id];for(const id of [...m[2].matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))if(nodes[id]&&['input','select','textarea'].includes(nodes[id].tag))nodes[id].form=form;}
 const document={activeElement:null,body:new Node('body'),addEventListener(){},getElementById:id=>nodes[id]||null,createElement:tag=>new Node(tag),querySelector:selector=>all.find(n=>n.className.split(/\s+/).includes(selector.slice(1)))||null,querySelectorAll:selector=>selector==='.nav-link'?links:[]};
 const {D,sandbox}=model(storage);const session=new Map();if(sessionProfile)session.set('vidaAtiva.perfil',sessionProfile);if(sessionInicio)session.set('vidaAtiva.inicio',sessionInicio);sandbox.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};sandbox.location={href:'',assign(url){this.href=url;},replace(url){this.href=url;}};sandbox.document=document;sandbox.confirm=()=>true;sandbox.setTimeout=fn=>{timeouts.push(fn);return fn;};sandbox.clearTimeout=fn=>{const i=timeouts.indexOf(fn);if(i>=0)timeouts.splice(i,1);};sandbox.setInterval=fn=>intervals.push(fn);
 const apiAlunos=D.getState().students.map(s=>({id:'uuid-'+s.id,matricula:s.id,nome:s.name,cpf:s.cpf,dataNascimento:s.birth,telefone:s.phone,endereco:s.address,nomeEmergencia:s.emergencyName,telefoneEmergencia:s.emergencyPhone,restricoesMedicas:s.health,observacoes:s.notes,foto:s.photo,ativo:true})),apiCalls=[];
 sandbox.fetch=async(url,options={})=>{
  const method=options.method||'GET',id=decodeURIComponent(String(url).split('/').pop()),data=options.body?JSON.parse(options.body):null;
  apiCalls.push({url,method,data});
  const result=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>clone(value)});
  if(method==='GET')return result(200,apiAlunos);
  if(method==='POST'){
   if(apiAlunos.some(a=>a.cpf===data.cpf))return result(409,{erro:'Este CPF já está cadastrado.'});
   const aluno={...data,id:'uuid-novo',matricula:'4444',ativo:true};apiAlunos.push(aluno);return result(201,aluno);
  }
  const aluno=apiAlunos.find(a=>a.id===id);if(!aluno)return result(404,{erro:'Aluno não encontrado.'});
  if(method==='PUT')Object.assign(aluno,data);
  if(method==='DELETE')aluno.ativo=false;
  return result(200,aluno);
 };
 if(file==='modulos/modulo-02-financeiro/index.html')sandbox.fetch=async(url,options={})=>{
  const method=options.method||'GET',data=options.body?JSON.parse(options.body):null,id=decodeURIComponent(String(url).split('/').pop());
  apiCalls.push({url,method,data});
  const result=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>clone(value)});
  const current=D.getState();
  if(String(url).endsWith('/alunos'))return result(200,current.students.map(a=>({id:a.id,matricula:a.id,nome:a.name,cpf:a.cpf,ativo:a.active!==false})));
  const convert=c=>{const p=D.payment(D.getState(),c.id);return {id:c.id,alunoId:c.studentId,plano:D.plan(c.planId).name,valor:p.amount/100,dataInicio:c.start+'T00:00:00.000Z',dataFim:c.due+'T00:00:00.000Z',situacao:c.state,tolerancia:c.tolerance,diasSuspensos:c.suspendedDays||0,formaPagamento:p.method,statusPagamento:p.status,dataPagamento:p.paidDate?p.paidDate+'T00:00:00.000Z':null,atualizadoEm:p.updatedAt};};
  if(method==='GET')return result(200,current.contracts.map(convert));
  try{
   if(method==='POST'){
    const plan=D.plans.find(p=>p.name===data.plano);D.saveFinance({studentId:data.alunoId,planId:plan.id,start:data.dataInicio,due:data.dataFim,tolerance:data.tolerancia,state:data.situacao,method:data.formaPagamento,status:data.statusPagamento,paidDate:data.dataPagamento});
    return result(201,convert(D.contract(D.getState(),data.alunoId)));
   }
   const c=current.contracts.find(c=>c.id===id);if(!c)return result(404,{erro:'Contrato não encontrado.'});
   D.transaction(state=>{const contract=state.contracts.find(x=>x.id===id),payment=D.payment(state,id);
    if(data.plano!==undefined)contract.planId=D.plans.find(p=>p.name===data.plano).id;
    if(data.dataInicio!==undefined)contract.start=data.dataInicio;if(data.dataFim!==undefined)contract.due=data.dataFim;
    if(data.situacao!==undefined)contract.state=data.situacao;if(data.tolerancia!==undefined)contract.tolerance=data.tolerancia;
    if(data.diasSuspensos!==undefined)contract.suspendedDays=data.diasSuspensos;
    if(data.valor!==undefined)payment.amount=data.valor*100;if(data.formaPagamento!==undefined)payment.method=data.formaPagamento;
    if(data.statusPagamento!==undefined)payment.status=data.statusPagamento;if(data.dataPagamento!==undefined)payment.paidDate=data.dataPagamento;
   });return result(200,convert(D.getState().contracts.find(x=>x.id===id)));
  }catch(e){return result(500,{erro:e.message});}
 };
 if(file==='modulos/modulo-05-avaliacao/index.html')sandbox.fetch=async(url,options={})=>{
  const method=options.method||'GET',data=options.body?JSON.parse(options.body):null,current=D.getState();apiCalls.push({url,method,data});
  const result=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>clone(value)});
  const student=a=>({id:a.id,matricula:a.id,nome:a.name,cpf:a.cpf,dataNascimento:a.birth,ativo:a.active!==false});
  const convert=e=>({id:e.id,alunoId:e.studentId,dataAvaliacao:e.date+'T00:00:00.000Z',peso:e.weight,altura:e.height,percentualGordura:e.fat,objetivo:e.objective,dataReavaliacao:e.next+'T00:00:00.000Z',aluno:student(D.getState().students.find(a=>a.id===e.studentId))});
  if(String(url).endsWith('/alunos'))return result(200,current.students.map(student));
  if(method==='GET')return result(200,current.evaluations.map(convert));
  if(method==='POST'){
   try{D.saveEvaluation({studentId:data.alunoId,date:data.dataAvaliacao,weight:data.peso,height:data.altura,fat:data.percentualGordura,objective:data.objetivo,interval:D.daysBetween(data.dataAvaliacao,data.dataReavaliacao)});return result(201,convert(D.getState().evaluations[0]));}catch(e){return result(400,{erro:e.message});}
  }
 };
 if(file==='modulos/modulo-06-relatorios/index.html')sandbox.fetch=async(url,options={})=>{
  apiCalls.push({url,method:options.method||'GET'});const params=new URL(String(url)).searchParams;
  const alunos=[{id:'1111',nome:'Lucas Andrade',matricula:'1111',ativo:true,contratos:[{id:'c-1111',plano:'Mensal',valor:120,situacaoAtual:'Vigente'}]}];
  const matches=alunos.filter(a=>(!params.get('busca')||a.nome.toLowerCase().includes(params.get('busca').toLowerCase())||a.matricula.includes(params.get('busca')))&&(params.get('situacao')==='todos'||a.contratos.some(c=>c.situacaoAtual===params.get('situacao'))));
  return {ok:true,status:200,json:async()=>({periodo:{dataInicio:params.get('dataInicio'),dataFim:params.get('dataFim')},totais:{alunos:3,alunosAtivos:2,receitaPrevista:120,avaliacoesMes:1,avaliacoesPeriodo:params.get('dataInicio').startsWith('2099')?0:1,alunosVencidos:1,alunosAIniciar:0},alunos:matches})};
 };
 if(file==='modulos/modulo-03-portaria/index.html')sandbox.fetch=async(url)=>{
  if(String(url).endsWith('/logs')){apiCalls.push({url,method:'GET'});return {ok:true,status:200,json:async()=>([])};}
  apiCalls.push({url,method:'GET'});const matricula=String(url).split('/').pop(),aluno=D.getState().students.find(s=>s.id===matricula);
  const acesso=matricula==='1111'?'LIBERADO':'NEGADO';return {ok:true,status:200,json:async()=>({acesso,motivo:acesso==='LIBERADO'?'Cadastro ativo e contrato vigente.':'Aluno sem contrato vigente.',aluno:aluno?{nome:aluno.name,matricula:aluno.id,ativo:true}:null,contrato:acesso==='LIBERADO'?{plano:'Mensal',dataFim:'2026-10-28T00:00:00.000Z'}:null})};
 };
 if(fetchOverride)sandbox.fetch=fetchOverride;
 for(const node of all)if(node.tag==='form'){node.reset=()=>{for(const control of all)if(['input','select','textarea'].includes(control.tag)){control.value=control.defaultValue;control.validationMessage='';}node.fire('reset');};node.requestSubmit=()=>node.fire('submit');}
 if(nodes.conteudo){nodes.conteudo.contentWindow={demoDirty:false};nodes.conteudo.contentDocument={title:'Módulo'};}
 for(const m of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)){if(m[1].includes('demo.js'))continue;const scriptPath=path.resolve(root,path.dirname(file),m[1]);vm.runInContext(fs.readFileSync(scriptPath,'utf8'),sandbox,{filename:path.relative(root,scriptPath)});}
 async function flush(){while(timeouts.length)await timeouts.shift()();}
 return{D:sandbox.Demo,nodes,links,sandbox,document,flush,html,apiAlunos,apiCalls,ready:new Promise(resolve=>setImmediate(resolve))};
}
const cases=[];function test(name,fn){cases.push({name,fn});}const clone=v=>structuredClone(v);
async function chooseStudent(p,inputId,id){const input=p.nodes[inputId];input.value=id;await input.fire('input');const option=p.nodes.alunoResultados.querySelectorAll('.student-search-option').find(n=>n.textContent.includes('Matrícula '+id+' ·'));assert.ok(option,'Resultado da busca para '+id);await option.fire('click');}
async function answerDialog(p,accepted){await Promise.resolve();const dialog=p.document.body.children.find(n=>n.className==='app-dialog');assert.ok(dialog,'Diálogo de confirmação aberto');const button=descendants(dialog).filter(n=>n.tag==='button')[accepted?1:0];await button.fire('click');}
test('Os 8 scripts da aplicação têm sintaxe válida',()=>{for(const p of ['assets/demo.js','main.js','modulos/modulo-01-cadastros/script.js','modulos/modulo-02-financeiro/script.js','modulos/modulo-03-portaria/script.js','modulos/modulo-04-auditoria/script.js','modulos/modulo-05-avaliacao/script.js','modulos/modulo-06-relatorios/script.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p});});
test('Aplicação inicia o estado local sem dados pessoais',()=>{const {D}=model(new Map(),false);assert.equal(D.getState().students.length,0);assert.equal(D.getState().contracts.length,0);});
test('Datas usam o último dia do mês sem transbordar',()=>{const{D}=model();assert.equal(D.addMonths('2026-01-31',1),'2026-02-28');assert.equal(D.addMonths('2024-02-29',12),'2025-02-28');assert.equal(D.addMonths('2026-03-31',3),'2026-06-30');assert.equal(D.addMonths('2026-12-31',1),'2027-01-31');assert.equal(D.addDays('2026-10-08',60),'2026-12-07');assert.equal(D.daysBetween('2026-01-31','2026-02-28'),28);assert.equal(D.date('2026-02-30'),null);});
test('CPF, telefones e datas de nascimento são validados',()=>{const{D}=model();assert.equal(D.validCpf('529.982.247-25'),true);assert.equal(D.validCpf('00000000000'),false);assert.equal(D.validCpf('abc'),false);const s={...D.getState().students[0],id:'4444',cpf:'12345678909',phone:'abc'},c={planId:'mensal',start:D.today(),due:D.addMonths(D.today(),1),state:'Ativo'};assert.throws(()=>D.upsertStudent(s),/telefones/);s.phone='11999991111';s.birth='2099-01-01';assert.throws(()=>D.upsertStudent(s),/nascimento/);});
test('Não é possível cadastrar CPF duplicado',()=>{const{D}=model(),s={...D.getState().students[0],id:'4444'};assert.throws(()=>D.upsertStudent(s),/CPF/);assert.equal(D.getState().students.length,3);});
test('Cadastro conserva foto e valores ao recarregar o estado',()=>{const storage=new Map(),{D}=model(storage),s={...D.getState().students[0],id:'4444',name:'Aluno Teste',cpf:'12345678909',photo:'data:image/png;base64,AAAA'};D.upsertStudent(s);const other=model(storage).D;assert.equal(other.getState().students.find(s=>s.id==='4444').photo,s.photo);assert.equal(other.getState().students.length,4);assert.equal(other.contract(other.getState(),'4444'),undefined);assert.equal(other.getState().payments.length,3);});
test('Suspensão é preservada ao editar e conserva saldo na reativação',()=>{const{D,sandbox}=model();D.changeStatus('1111','Suspenso');const state=D.getState(),s=state.students[0],c=D.contract(state,s.id);assert.equal(c.suspendedDays,20);D.upsertStudent(s);assert.equal(D.contract(D.getState(),'1111').state,'Suspenso');sandbox.Date=fixedDate('2026-10-13T15:00:00.000Z');D.changeStatus('1111','Ativo');assert.equal(D.contract(D.getState(),'1111').due,'2026-11-02');});
test('Catraca distingue em dia, tolerância, bloqueio e matrícula inexistente',()=>{const{D}=model(),s=D.getState();assert.equal(D.access(s,'1111').tone,'ok');assert.equal(D.access(s,'2222').tone,'warn');assert.equal(D.access(s,'2222').allowed,true);assert.equal(D.access(s,'3333').allowed,false);assert.equal(D.access(s,'9999').allowed,false);D.changeStatus('1111','Suspenso');assert.equal(D.access(D.getState(),'1111').allowed,false);});
test('Atualização financeira muda indicadores e a decisão de acesso',()=>{const{D}=model();D.saveFinance({studentId:'3333',planId:'mensal',start:D.today(),due:D.addMonths(D.today(),1),tolerance:5,method:'PIX',status:'Pago',paidDate:D.today()});const state=D.getState();assert.equal(D.access(state,'3333').allowed,true);assert.equal(state.payments.filter(p=>p.status!=='Pago').length,1);assert.equal(state.payments.find(p=>p.contractId==='c-3333').amount,12000);assert.equal(state.contracts.find(c=>c.id==='c-3333').start,D.today());});
test('Datas financeiras incoerentes não alteram o estado',()=>{const{D}=model(),before=JSON.stringify(D.getState());assert.throws(()=>D.saveFinance({studentId:'1111',planId:'mensal',start:'2026-10-08',due:'2026-01-01',tolerance:5,status:'Pago',paidDate:D.today(),method:'PIX'}),/vencimento/);assert.equal(JSON.stringify(D.getState()),before);});
test('Avaliação conserva métricas dentro dos limites e calcula reavaliação',()=>{const{D}=model();D.saveEvaluation({studentId:'1111',date:D.today(),weight:74.5,height:175,fat:2,objective:'Outro',interval:60});const saved=D.getState().evaluations[0];assert.equal(saved.height,175);assert.equal(saved.fat,2);assert.equal(saved.next,'2026-12-07');});
test('Avaliação aceita os limites físicos inclusivos',()=>{const{D}=model(),base={studentId:'1111',date:D.today(),objective:'Outro',interval:30};for(const value of [{...base,weight:20,height:50,fat:2},{...base,weight:350,height:250,fat:70}])D.saveEvaluation(value);assert.equal(D.getState().evaluations.length,3);});
test('Avaliação rejeita limites irreais e datas fora do período do aluno',()=>{const{D}=model(),value={studentId:'1111',date:D.today(),weight:70,height:null,fat:null,objective:'Outro',interval:30},before=JSON.stringify(D.getState());
 for(const [invalid,message] of [[{weight:19},/20 e 350 kg/],[{weight:351},/20 e 350 kg/],[{height:49},/50 e 250 cm/],[{height:251},/50 e 250 cm/],[{fat:1},/2% e 70%/],[{fat:71},/2% e 70%/],[{date:'2026-10-09'},/até hoje/],[{date:'1996-04-11'},/nascimento/],[{studentId:'9999'},/aluno ativo/]]){assert.throws(()=>D.saveEvaluation({...value,...invalid}),message);assert.equal(JSON.stringify(D.getState()),before);}
});
test('Liberação excepcional funciona uma vez e registra autoria e uso',()=>{const{D}=model();D.authorize({studentId:'3333',type:'entrada',minutes:30,reason:'Autorização de teste'});const first=D.registerAccess('3333'),second=D.registerAccess('3333');assert.equal(first.allowed,true);assert.equal(second.allowed,false);const a=D.getState().authorizations[0];assert.ok(a.usedAt);assert.match(a.actor,/Administração/);assert.equal(D.getState().accesses.length,10);});
test('Liberação vencida, área restrita e justificativa vazia não abrem entrada',()=>{const{D,sandbox}=model();assert.throws(()=>D.authorize({studentId:'3333',type:'entrada',minutes:30,reason:'  '}),/justificativa/);D.authorize({studentId:'3333',type:'restrita',minutes:30,reason:'Autorização restrita'});assert.equal(D.access(D.getState(),'3333').allowed,false);D.authorize({studentId:'3333',type:'entrada',minutes:15,reason:'Autorização temporária'});sandbox.Date=fixedDate('2026-10-08T15:16:00.000Z');assert.equal(D.access(D.getState(),'3333').allowed,false);});
test('Histórico conserva mais de cinco acessos',()=>{const{D}=model();for(let i=0;i<12;i++)D.registerAccess('1111');assert.equal(D.getState().accesses.length,20);});
test('Relatório combina período e situação e exclui acessos bloqueados',()=>{const{D}=model();const filters={from:'2026-10-01',to:D.today(),status:'todos'};assert.equal(D.report(D.getState(),filters).reduce((sum,row)=>sum+row.count,0),8);D.registerAccess('3333');assert.equal(D.report(D.getState(),filters).reduce((sum,row)=>sum+row.count,0),8);assert.equal(D.report(D.getState(),{...filters,status:'Ativo'}).length,1);assert.equal(D.report(D.getState(),{from:'2099-01-01',to:'2099-01-02',status:'todos'}).length,0);assert.throws(()=>D.report(D.getState(),{from:'2026-10-08',to:'2026-10-01',status:'todos'}),/período/);});
test('Falha de espaço não confirma nem modifica uma gravação',()=>{const{D,sandbox}=model();D.saveState(D.getState());const before=JSON.stringify(D.getState());sandbox.localStorage.setItem=()=>{const error=new Error('Sem espaço');error.name='QuotaExceededError';throw error;};assert.throws(()=>D.changeStatus('1111','Suspenso'),/espaço/);assert.equal(JSON.stringify(D.getState()),before);});
test('Sem localStorage disponível, a prévia continua em memória',()=>{const{D,sandbox}=model();sandbox.localStorage.getItem=()=>{throw new Error('Bloqueado');};sandbox.localStorage.setItem=()=>{throw new Error('Bloqueado');};D.changeStatus('1111','Suspenso');assert.equal(D.contract(D.getState(),'1111').state,'Suspenso');});
test('Os seis controladores inicializam com o HTML correspondente',()=>{for(const p of ['modulo-01-cadastros','modulo-02-financeiro','modulo-03-portaria','modulo-04-auditoria','modulo-05-avaliacao','modulo-06-relatorios'])assert.doesNotThrow(()=>page('modulos/'+p+'/index.html'),p);});
test('Sessão seleciona Administração ou Portaria sem permitir troca no painel',async()=>{const p=page('index.html');assert.equal(p.links.length,6);assert.equal(p.links.filter(l=>!l.parentElement.hidden).length,5);assert.equal(p.nodes.perfil.disabled,true);p.nodes.perfil.value='portaria';await p.nodes.perfil.fire('change');assert.equal(p.nodes.perfil.value,'admin');const portaria=page('index.html',new Map(),undefined,'portaria');assert.equal(portaria.links.filter(l=>!l.parentElement.hidden).length,1);assert.match(portaria.nodes.conteudo.src,/modulo-03-portaria/);});
test('Login escolhe a área correspondente e rejeita senhas inválidas',async()=>{
 const login=page('login.html',new Map(),undefined,null);login.nodes.usuario.value='admin';login.nodes.senha.value='errada';await login.nodes.formLogin.fire('submit');assert.match(login.nodes['login-feedback'].textContent,/incorretos/);assert.equal(login.sandbox.location.href,'');
 login.nodes.senha.value='admin123';await login.nodes.formLogin.fire('submit');assert.equal(login.sandbox.sessionStorage.getItem('vidaAtiva.perfil'),'admin');assert.match(login.sandbox.sessionStorage.getItem('vidaAtiva.inicio'),/modulo-01-cadastros/);assert.equal(login.sandbox.location.href,'index.html');
 const portaria=page('login.html',new Map(),undefined,null);portaria.nodes.usuario.value='portaria';portaria.nodes.senha.value='portaria123';await portaria.nodes.formLogin.fire('submit');assert.equal(portaria.sandbox.sessionStorage.getItem('vidaAtiva.perfil'),'portaria');assert.match(portaria.sandbox.sessionStorage.getItem('vidaAtiva.inicio'),/modulo-03-portaria/);
 const shell=page('index.html',new Map(),undefined,'admin','modulos/modulo-06-relatorios/index.html');assert.match(shell.nodes.conteudo.src,/modulo-06-relatorios/);await shell.nodes.sair.fire('click');assert.equal(shell.sandbox.sessionStorage.getItem('vidaAtiva.perfil'),null);assert.equal(shell.sandbox.location.href,'login.html');
 const semSessao=page('index.html',new Map(),undefined,null);assert.equal(semSessao.sandbox.location.href,'login.html');
});
test('Menu mobile mostra a tela selecionada e fecha após navegar',async()=>{const p=page('index.html',new Map(),undefined,'admin','modulos/modulo-01-cadastros/index.html'),toggle=p.nodes['mobile-nav-toggle'];assert.equal(toggle.labelNode.textContent,'Gestão de Cadastros');await toggle.fire('click');assert.equal(toggle.getAttribute('aria-expanded'),'true');await p.links.find(link=>link.labelNode.textContent==='Relatórios Gerenciais').fire('click');assert.equal(toggle.labelNode.textContent,'Relatórios Gerenciais');assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.match(p.nodes.conteudo.src,/modulo-06-relatorios/);});
test('Portaria exibe o resultado da consulta e mantém erro de conexão sem liberação',async()=>{
 const storage=new Map(),p=page('modulos/modulo-03-portaria/index.html',storage);p.nodes.matricula.value='1111';await p.nodes.formCatraca.fire('submit');assert.equal(p.nodes['status-title'].textContent,'Acesso LIBERADO');assert.match(p.nodes['status-banner'].className,/ok/);assert.equal(storage.size,0);
 p.sandbox.fetch=async()=>{throw new Error('offline');};await p.nodes.formCatraca.fire('submit');assert.equal(p.nodes['status-title'].textContent,'Aguardando matrícula');assert.match(p.nodes.feedback.textContent,/conectar à API/);
});
test('Navegação do shell usa diálogo customizado para preservar alterações',async()=>{const p=page('index.html'),before=p.nodes.conteudo.src;p.nodes.conteudo.contentWindow.demoDirty=true;let pending=p.links.find(link=>link.getAttribute('href')!==before).fire('click');await answerDialog(p,false);await pending;assert.equal(p.nodes.conteudo.src,before);pending=p.links.find(link=>link.getAttribute('href')!==before).fire('click');await answerDialog(p,true);await pending;assert.notEqual(p.nodes.conteudo.src,before);});
test('Limpar avaliação atualiza também a previsão',async()=>{const p=page('modulos/modulo-05-avaliacao/index.html');p.nodes.intervalo.value='60';await p.nodes.intervalo.fire('change');assert.equal(p.nodes.proxima.textContent,'07/12/2026');p.nodes.formAvaliacao.reset();await p.flush();assert.equal(p.nodes.intervalo.value,'30');assert.equal(p.nodes.proxima.textContent,'07/11/2026');});
test('Formulário de avaliação mostra erro claro e impede valores fora da faixa',async()=>{
 const p=page('modulos/modulo-05-avaliacao/index.html');await p.ready;const count=p.D.getState().evaluations.length;assert.equal(p.nodes.peso.getAttribute('min'),'20');assert.equal(p.nodes.peso.getAttribute('max'),'350');assert.equal(p.nodes.altura.getAttribute('min'),'50');assert.equal(p.nodes.altura.getAttribute('max'),'250');assert.equal(p.nodes.gordura.getAttribute('min'),'2');assert.equal(p.nodes.gordura.getAttribute('max'),'70');await chooseStudent(p,'alunoBusca','1111');assert.equal(p.nodes.data.getAttribute('min'),'1996-04-12');p.nodes.peso.value='0.1';p.nodes.altura.value='0.1';p.nodes.gordura.value='0.1';await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/peso deve estar entre 20 e 350 kg/);assert.equal(p.D.getState().evaluations.length,count);
 p.nodes.peso.value='70';p.nodes.altura.value='0.1';await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/altura deve estar entre 50 e 250 cm/);assert.equal(p.D.getState().evaluations.length,count);
 p.nodes.altura.value='175';p.nodes.gordura.value='18';p.nodes.data.value='1996-04-11';await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/igual ou posterior ao nascimento/);assert.equal(p.D.getState().evaluations.length,count);
});
test('Formulário sujo registra proteção beforeunload',()=>{const p=page('modulos/modulo-05-avaliacao/index.html'),listener=p.sandbox.windowListeners.beforeunload?.[0];assert.equal(typeof listener,'function');const clean={preventDefault(){this.prevented=true;},returnValue:undefined};listener(clean);assert.equal(clean.prevented,undefined);p.sandbox.demoDirty=true;const dirty={preventDefault(){this.prevented=true;},returnValue:undefined};listener(dirty);assert.equal(dirty.prevented,true);assert.equal(dirty.returnValue,'');p.sandbox.__allowUnload=true;const approved={preventDefault(){this.prevented=true;},returnValue:undefined};listener(approved);assert.equal(approved.prevented,undefined);});
test('Financeiro e avaliação exibem nome com HTML como texto',async()=>{const storage=new Map(),{D}=model(storage);D.transaction(state=>{state.students[0].name='<b>Aluno Teste</b>';});const f=page('modulos/modulo-02-financeiro/index.html',storage);await f.ready;assert.match(f.nodes.tabelaDados.textContent,/<b>Aluno Teste<\/b>/);const a=page('modulos/modulo-05-avaliacao/index.html',storage);await a.ready;assert.match(a.nodes.historico.textContent,/<b>Aluno Teste<\/b>/);for(const p of [f,a])assert.equal(p.nodes[p===f?'tabelaDados':'historico'].children.some(row=>row.children.some(cell=>cell.children.some(child=>child.tag==='b'))),false);});
test('Portaria consulta a API e relatório atualiza o período',async()=>{const storage=new Map(),p=page('modulos/modulo-03-portaria/index.html',storage);p.nodes.matricula.value='3333';await p.nodes.formCatraca.fire('submit');assert.equal(p.nodes['status-title'].textContent,'Acesso NEGADO');assert.equal(storage.size,0);const r=page('modulos/modulo-06-relatorios/index.html',storage);await r.ready;r.nodes.dataInicio.value='2099-01-01';r.nodes.dataFim.value='2099-01-02';await r.nodes.formRelatorio.fire('submit');assert.equal(r.nodes['avaliacoes-periodo'].textContent,'0');assert.match(r.nodes.tabelaCorpo.textContent,/Lucas Andrade/);assert.match(r.apiCalls.at(-1).url,/2099-01-01/);});
test('Páginas têm viewport, labels associados e recursos locais existentes',()=>{for(const p of ['index.html','modulos/modulo-01-cadastros/index.html','modulos/modulo-02-financeiro/index.html','modulos/modulo-03-portaria/index.html','modulos/modulo-04-auditoria/index.html','modulos/modulo-05-avaliacao/index.html','modulos/modulo-06-relatorios/index.html']){const html=fs.readFileSync(path.join(root,p),'utf8');assert.match(html,/name="viewport"/);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,p);assert.doesNotMatch(html,/href="#"/);for(const m of html.matchAll(/<label\b([^>]*)>/g)){const attrs=attributes(m[1]);assert.ok(attrs.for&&ids.includes(attrs.for),p+': label sem associação');}for(const m of html.matchAll(/<(?:a|link|iframe|script)\b([^>]*)>/g)){const at=attributes(m[1]),url=at.href??at.src;if(!url||url.startsWith('#'))continue;assert.ok(fs.existsSync(path.resolve(root,path.dirname(p),decodeURIComponent(url))),p+' -> '+url);}}});
test('Renderizadores não inserem entradas em innerHTML nem registram dados no console',()=>{for(const p of ['assets/demo.js','modulos/modulo-01-cadastros/script.js','modulos/modulo-02-financeiro/script.js','modulos/modulo-03-portaria/script.js','modulos/modulo-04-auditoria/script.js','modulos/modulo-05-avaliacao/script.js','modulos/modulo-06-relatorios/script.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,p),'utf8'),/\.innerHTML\s*=|insertAdjacentHTML|console\.log/);});
test('Estilos compactos preservam rótulos e os módulos compartilham os componentes',()=>{const css=fs.readFileSync(path.join(root,'style.css'),'utf8');assert.match(css,/@media\(max-width:760px\)/);assert.doesNotMatch(css,/\.nav__label[^}]*display:\s*none/);for(const p of ['modulo-01-cadastros','modulo-02-financeiro','modulo-03-portaria','modulo-04-auditoria','modulo-05-avaliacao','modulo-06-relatorios'])assert.match(fs.readFileSync(path.join(root,'modulos',p,'style.css'),'utf8'),/assets\/app\.css/);assert.match(fs.readFileSync(path.join(root,'assets/app.css'),'utf8'),/prefers-reduced-motion/);});
test('Contrato com início futuro aguarda a vigência',()=>{const{D}=model();D.saveFinance({studentId:'1111',planId:'mensal',start:'2026-10-09',due:'2026-11-09',tolerance:5,method:'PIX',status:'Pago',paidDate:D.today()});assert.equal(D.access(D.getState(),'1111').allowed,false);assert.equal(D.access(D.getState(),'1111').title,'Contrato ainda não iniciado');});
test('Troca de aluno no financeiro preserva alterações quando cancelada',async()=>{const storage=new Map(),{D}=model(storage);D.transaction(s=>s.students.push({...s.students[0],id:'4444'},{...s.students[0],id:'5555'}));const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;await p.nodes['novo-contrato'].fire('click');await chooseStudent(p,'alunoBusca','4444');p.nodes.tolerancia.value='7';await p.nodes.tolerancia.fire('input');p.nodes.alunoBusca.value='5555';const pending=p.nodes.alunoBusca.fire('input');await answerDialog(p,false);await pending;assert.equal(p.nodes.aluno.value,'4444');assert.equal(p.nodes.tolerancia.value,'7');assert.equal(p.sandbox.demoDirty,true);});
test('Avaliação apresenta as métricas no formato brasileiro',async()=>{const p=page('modulos/modulo-05-avaliacao/index.html');await p.ready;assert.match(p.nodes.historico.textContent,/74,5 kg/);assert.match(p.nodes.historico.textContent,/18,2%/);});

test('Editar dados pessoais preserva integralmente contratos e pagamentos',()=>{
 const{D}=model();D.changeStatus('1111','Suspenso');const before=D.getState(),student={...before.students[0],name:'Lucas Atualizado'};
 D.upsertStudent(student);const after=D.getState();assert.deepEqual(after.contracts,before.contracts);assert.deepEqual(after.payments,before.payments);assert.equal(after.students[0].name,'Lucas Atualizado');
});
test('Cadastro salva aluno sem contrato e mantém o formulário aberto',async()=>{
 const storage=new Map(),p=page('modulos/modulo-01-cadastros/index.html',storage);await p.ready;const student={...p.D.getState().students[0],cpf:'12345678909',name:'Aluno Novo'};
 let resets=0;const reset=p.nodes.formCadastro.reset;p.nodes.formCadastro.reset=()=>{resets++;reset();};p.nodes.formCadastro.classList.add('was-validated');
 const fields={nome:student.name,cpf:student.cpf,dataNascimento:student.birth,telefone:student.phone,endereco:student.address,nomeEmergencia:student.emergencyName,telEmergencia:student.emergencyPhone,restricoes:student.health,anotacoes:student.notes};
 for(const[id,value]of Object.entries(fields))p.nodes[id].value=value;p.nodes.temRestricoes.value='nao';await p.nodes.formCadastro.fire('submit');
 assert.equal(p.apiAlunos.length,4);assert.equal(storage.size,0);assert.equal(p.apiCalls.filter(c=>c.method==='POST').length,1);
 assert.equal(resets,1);assert.equal(p.nodes.formCadastro.classList.contains('was-validated'),false);await p.flush();
 assert.equal(p.nodes.matricula.value,'');assert.equal(p.nodes.nome.value,'');assert.match(p.nodes.feedback.textContent,/Cadastro salvo.*4444/);
 assert.equal(p.nodes.plano,undefined);assert.equal(p.nodes.suspender,undefined);assert.match(p.nodes['lista-alunos'].textContent,/123\.456\.789-09/);
});
test('Desativar aluno usa diálogo visual e respeita cancelar e confirmar',async()=>{
 const p=page('modulos/modulo-01-cadastros/index.html');await p.ready;const edit=descendants(p.nodes['lista-alunos']).find(n=>n.tag==='button'&&n.getAttribute('aria-label')==='Editar cadastro de Lucas Andrade');
 await edit.fire('click');
 let pending=p.nodes.arquivar.fire('click'),dialog=p.document.body.children.find(n=>n.className==='app-dialog');
 assert.ok(dialog);assert.equal(dialog.querySelector('.app-dialog__title').textContent,'Desativar aluno');
 const buttons=descendants(dialog).filter(n=>n.tag==='button');assert.equal(buttons[0].textContent,'Cancelar');assert.equal(buttons[1].className,'btn btn-danger');
 await buttons[0].fire('click');await pending;assert.equal(p.apiAlunos.find(s=>s.id==='uuid-1111').ativo,true);
 pending=p.nodes.arquivar.fire('click');dialog=p.document.body.children.find(n=>n.className==='app-dialog');await descendants(dialog).find(n=>n.tag==='button'&&n.textContent==='Desativar aluno').fire('click');await pending;
 assert.equal(p.apiAlunos.find(s=>s.id==='uuid-1111').ativo,false);assert.equal(p.apiCalls.filter(c=>c.method==='DELETE').length,1);assert.equal(p.document.body.children.length,0);
 const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8'),{tokens}=theme();assert.match(css,/\.app-dialog::backdrop\s*\{[^}]*background:\s*rgb\(0 0 0 \/ 68%\)/);assert.match(css,/\.btn-danger\s*\{[^}]*var\(--danger-action\)/);assert.match(css,/\.btn-danger\s*\{[^}]*var\(--on-danger-action\)/);assert.match(css,/\.btn-danger:hover:not\(:disabled\)\s*\{[^}]*var\(--danger-action-hover\)/);assert.match(css,/\.app-dialog\s*\{[^}]*border:\s*1px solid var\(--dialog-border\)/);assert.match(css,/\.app-dialog__description\s*\{[^}]*color:\s*var\(--muted\)/);assert.equal(tokens['--danger-action'].toUpperCase(),'#EF4444');assert.equal(tokens['--danger-action-hover'].toUpperCase(),'#DC2626');assert.equal(tokens['--on-danger-action'].toUpperCase(),'#FFFFFF');assert.equal(tokens['--dialog-border'].toUpperCase(),'#383C42');assert.equal(tokens['--muted'].toUpperCase(),'#A0AAB2');
});
test('Edição de cadastro aguarda o diálogo antes de descartar campos',async()=>{
 const p=page('modulos/modulo-01-cadastros/index.html');await p.ready;const edit=descendants(p.nodes['lista-alunos']).find(n=>n.tag==='button'&&n.getAttribute('aria-label')==='Editar cadastro de Lucas Andrade');await edit.fire('click');p.nodes.nome.value='Alteração pendente';p.sandbox.demoDirty=true;
 let pending=descendants(p.nodes['lista-alunos']).find(n=>n.tag==='button'&&n.getAttribute('aria-label')==='Editar cadastro de Mariana Lima').fire('click');await answerDialog(p,false);await pending;assert.equal(p.nodes.nome.value,'Alteração pendente');
 pending=p.nodes['novo-aluno'].fire('click');await answerDialog(p,true);await pending;assert.equal(p.nodes.nome.value,'');
});
test('Busca consulta a API e edição preserva os campos completos',async()=>{
 const p=page('modulos/modulo-01-cadastros/index.html');await p.ready;
 const initial=p.apiCalls.length;p.nodes.buscarAluno.value='1111';await p.nodes.buscarAluno.fire('input');await p.flush();
 assert.ok(p.apiCalls.length>initial);assert.match(p.nodes['lista-alunos'].textContent,/Lucas Andrade/);assert.doesNotMatch(p.nodes['lista-alunos'].textContent,/Mariana Lima/);
 const edit=descendants(p.nodes['lista-alunos']).find(n=>n.tag==='button');await edit.fire('click');
 p.nodes.endereco.value='Rua Atualizada';p.nodes.temRestricoes.value='nao';await p.nodes.formCadastro.fire('submit');
 const call=p.apiCalls.find(c=>c.method==='PUT');assert.ok(call.url.endsWith('/uuid-1111'));assert.equal(call.data.endereco,'Rua Atualizada');assert.equal(call.data.dataNascimento,'1996-04-12');assert.equal(p.apiAlunos[0].endereco,'Rua Atualizada');
});
test('Erro da API preserva o formulário e exibe a mensagem devolvida',async()=>{
 const p=page('modulos/modulo-01-cadastros/index.html');await p.ready;
 Object.assign(p.nodes.nome,{value:'Aluno Novo'});p.nodes.cpf.value='12345678909';p.nodes.dataNascimento.value='1996-04-12';p.nodes.telefone.value='11999991111';p.nodes.endereco.value='Rua Teste';p.nodes.nomeEmergencia.value='Contato Teste';p.nodes.telEmergencia.value='11999990001';p.nodes.temRestricoes.value='nao';
 p.sandbox.fetch=async()=>({ok:false,status:409,json:async()=>({erro:'CPF já existente na API.'})});
 await p.nodes.formCadastro.fire('submit');assert.match(p.nodes.feedback.textContent,/CPF já existente na API/);assert.equal(p.nodes.nome.value,'Aluno Novo');assert.equal(p.nodes.salvar.disabled,false);
});
test('Aluno sem contrato só recebe contrato e cobrança ao salvar no Financeiro',async()=>{
 const storage=new Map(),{D}=model(storage);D.upsertStudent({...D.getState().students[0],id:'4444',cpf:'12345678909'});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;await p.nodes['novo-contrato'].fire('click');await chooseStudent(p,'alunoBusca','4444');
 assert.match(p.nodes['contract-hint'].textContent,/não possui contrato/);assert.equal(p.nodes.suspender.disabled,true);assert.equal(D.getState().contracts.length,3);
 p.nodes.status.value='Pago';await p.nodes.status.fire('change');await p.nodes.formFinanceiro.fire('submit');
 const state=D.getState();assert.equal(state.contracts.length,4);assert.equal(state.payments.length,4);assert.equal(D.access(state,'4444').allowed,true);
 assert.match(p.nodes.tabelaDados.textContent,/Ativo/);assert.match(p.nodes.tabelaDados.textContent,/Pago/);
});
test('Suspender e reativar pelo Financeiro preserva pagamento e saldo',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'1111','edit').fire('click');const before=clone(p.D.getState().payments);
 let pending=p.nodes.suspender.fire('click');await answerDialog(p,true);await pending;assert.equal(p.D.contract(p.D.getState(),'1111').state,'Suspenso');assert.equal(p.D.access(p.D.getState(),'1111').allowed,false);assert.deepEqual(p.D.getState().payments,before);
 p.sandbox.Date=fixedDate('2026-10-13T15:00:00.000Z');pending=p.nodes.suspender.fire('click');await answerDialog(p,true);await pending;
 assert.equal(p.D.contract(p.D.getState(),'1111').due,'2026-11-02');assert.equal(p.D.access(p.D.getState(),'1111').allowed,true);assert.deepEqual(p.D.getState().payments,before);
});
test('Salvar situação contratual no Financeiro respeita suspensão e reativação',()=>{
 const{D,sandbox}=model();const values={studentId:'1111',planId:'mensal',start:'2026-09-28',due:'2026-10-28',tolerance:5,method:'PIX',status:'Pago',paidDate:'2026-09-28'};
 D.saveFinance({...values,state:'Suspenso'});assert.equal(D.contract(D.getState(),'1111').suspendedDays,20);
 sandbox.Date=fixedDate('2026-10-13T15:00:00.000Z');D.saveFinance({...values,state:'Ativo'});assert.equal(D.contract(D.getState(),'1111').due,'2026-11-02');
 D.saveFinance({...values,state:'Cancelado'});assert.equal(D.access(D.getState(),'1111').allowed,false);
 const before=JSON.stringify(D.getState());assert.throws(()=>D.saveFinance({...values,state:'Inválido'}),/Situação/);assert.equal(JSON.stringify(D.getState()),before);
});
test('Aluno sem contrato é bloqueado e pode receber liberação excepcional',()=>{
 const{D}=model();D.upsertStudent({...D.getState().students[0],id:'4444',cpf:'12345678909'});assert.equal(D.access(D.getState(),'4444').title,'Sem contrato');
 D.authorize({studentId:'4444',type:'entrada',minutes:30,reason:'Entrada autorizada para teste'});assert.equal(D.registerAccess('4444').allowed,true);assert.equal(D.registerAccess('4444').allowed,false);
});
test('Preferência antiga da catraca na Administração recupera Cadastros',()=>{
 const storage=new Map([['perfilAtivo','admin'],['moduloAtivo','modulos/modulo-03-portaria/index.html']]),p=page('index.html',storage);
 assert.match(p.nodes.conteudo.src,/modulo-01-cadastros/);assert.equal(p.links.find(l=>l.getAttribute('href').includes('modulo-03-portaria')).parentElement.hidden,true);
 assert.equal(p.nodes['workspace-name'].textContent,'Administração');assert.equal(p.links.filter(l=>l.attributes['aria-current']==='page').length,1);
});
test('Interface não contém números de abas, avisos acadêmicos ou controles de restauração',()=>{
 const p=page('index.html');assert.equal(p.nodes.restaurar,undefined);assert.equal(p.nodes['reset-dialog'],undefined);assert.doesNotMatch(p.html,/nav-number|Prévia interativa|Projeto APS|Visualizar como/);
 for(const file of ['index.html',...['modulo-01-cadastros','modulo-02-financeiro','modulo-03-portaria','modulo-04-auditoria','modulo-05-avaliacao','modulo-06-relatorios'].map(m=>'modulos/'+m+'/index.html')])assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/demonstração|demonstrativa|nesta prévia|simule|simulação/i);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'style.css'),'utf8'),/nav-number|preview-bar/);
 for(const module of ['modulo-01-cadastros','modulo-02-financeiro','modulo-03-portaria','modulo-04-auditoria','modulo-05-avaliacao','modulo-06-relatorios'])assert.doesNotMatch(fs.readFileSync(path.join(root,'modulos',module,'script.js'),'utf8'),/na demonstração|nesta prévia|Simular acesso|simulação/);
});
test('Restauração permanece disponível na função de apoio',()=>{const{D}=model();D.upsertStudent({...D.getState().students[0],id:'4444',cpf:'12345678909'});D.reset();assert.equal(D.getState().students.length,3);assert.equal(D.getState().contracts.length,3);});

function theme(){const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8'),block=css.match(/:root\s*\{([^}]+)\}/)[1];return{css,block,tokens:Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*(#[\da-f]{6})\s*;/gi)].map(m=>[m[1],m[2]]))};}
function contrast(a,b){const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
test('Tema mantém contraste de texto, placeholders, ações e estados operacionais',()=>{
 const{tokens:t}=theme(),pairs=[];
 for(const text of ['--text','--muted','--accent'])for(const surface of ['--bg','--surface','--surface-soft','--accent-soft'])pairs.push([text,surface]);
 pairs.push(['--placeholder','--surface'],['--on-accent','--accent'],['--muted','--disabled-bg']);
 for(const state of ['green','yellow','red'])pairs.push(['--'+state,'--'+state+'-soft'],['--text','--'+state+'-soft'],['--muted','--'+state+'-soft']);
 for(const[a,b]of pairs)assert.ok(contrast(t[a],t[b])>=4.5,a+' / '+b+': contraste abaixo de 4,5:1');
});
test('Bordas dos campos, foco e indicadores têm contraste mínimo de 3:1',()=>{
 const{tokens:t}=theme();
 for(const surface of ['--bg','--surface','--surface-soft'])assert.ok(contrast(t['--control-border'],t[surface])>=3,'--control-border / '+surface);
 for(const surface of ['--bg','--surface','--surface-soft','--accent-soft'])assert.ok(contrast(t['--accent'],t[surface])>=3,'--accent / '+surface);
 for(const state of ['green','yellow','red'])assert.ok(contrast(t['--'+state],t['--'+state+'-soft'])>=3,state);
});
test('Tema Carbono e Neon usa cores centralizadas em todos os módulos',()=>{
 const{css,block}=theme(),shell=fs.readFileSync(path.join(root,'style.css'),'utf8'),definitions=new Set([...block.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
 assert.match(block,/color-scheme:\s*dark/);assert.match(block,/--bg:\s*#151718/i);assert.match(block,/--surface:\s*#1F2226/i);assert.match(block,/--accent:\s*#B8FF29/i);assert.match(block,/--on-accent:\s*#111315/i);assert.match(css,/\.btn-primary\s*\{[^}]*font-weight:\s*600/);assert.match(css,/\.btn-primary:hover:not\(:disabled\)\s*\{[^}]*filter:\s*brightness\(1\.1\)/);assert.doesNotMatch(css.replace(/:root\s*\{[^}]+\}/,''),/#[\da-f]{3,8}\b/gi);assert.doesNotMatch(shell,/#[\da-f]{3,8}\b/gi);
 for(const stylesheet of [css,shell])for(const m of stylesheet.matchAll(/var\((--[\w-]+)\)/g))assert.ok(definitions.has(m[1]),'Variável não declarada: '+m[1]);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/name="theme-color" content="#151718"/);assert.match(html,/<img[^>]+src="assets\/logo-vida-ativa\.png"/);assert.doesNotMatch(html,/⚡/);
 for(const module of ['modulo-01-cadastros','modulo-02-financeiro','modulo-03-portaria','modulo-04-auditoria','modulo-05-avaliacao','modulo-06-relatorios']){const local=fs.readFileSync(path.join(root,'modulos',module,'style.css'),'utf8');assert.doesNotMatch(local,/color-scheme:\s*(?:dark|light)|#[\da-f]{3,8}\b/gi);}
});
test('Aplicação não usa confirm ou alert nativos',()=>{
 const scripts=['main.js','assets/demo.js','modulos/modulo-01-cadastros/script.js','modulos/modulo-02-financeiro/script.js','modulos/modulo-03-portaria/script.js','modulos/modulo-04-auditoria/script.js','modulos/modulo-05-avaliacao/script.js','modulos/modulo-06-relatorios/script.js'];
 for(const file of scripts)assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/(^|[^\w$.])(?:window\.)?(?:confirm|alert)\s*\(/,file+' ainda usa confirmação/alerta nativo');
 assert.doesNotMatch(fs.readFileSync(path.join(root,'modulos/modulo-02-financeiro/script.js'),'utf8'),/beforeunload/,'Aviso beforeunload geraria confirmação nativa do navegador');
});


function financeRows(p){return p.nodes.tabelaDados.children.filter(n=>n.className==='record-row');}
function descendants(node){return node.children.flatMap(child=>[child,...descendants(child)]);}
function financeAction(p,id,key){const row=financeRows(p).find(n=>n.getAttribute('data-student-id')===id);return descendants(row).find(n=>n.getAttribute('data-action')===key);}
test('Financeiro inicia com consulta e abre a operação escolhida sem gravar',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;const before=JSON.stringify(p.D.getState());
 assert.equal(p.nodes['painel-operacao'].hidden,true);assert.equal(financeRows(p).length,3);
 await financeAction(p,'1111','edit').fire('click');
 assert.equal(p.nodes['painel-operacao'].hidden,false);assert.equal(p.nodes['student-fieldset'].hidden,true);assert.equal(p.nodes['student-name'].textContent,'Lucas Andrade');
 assert.equal(p.nodes['operation-title'].textContent,'Editar contrato e pagamento');
 assert.equal(JSON.stringify(p.D.getState()),before);
 await p.nodes['fechar-operacao'].fire('click');
 assert.equal(p.nodes['painel-operacao'].hidden,true);assert.equal(financeAction(p,'1111','edit').focused,true);
});
test('Financeiro filtra alunos ativos, inativos e todos localmente',async()=>{
 const storage=new Map(),{D}=model(storage);
 D.transaction(s=>{s.students[0].active=false;s.students.push({...s.students[0],id:'4444',name:'Aluno sem contrato',active:false});});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;const status=p.nodes['status-aluno'],calls=p.apiCalls.length;
 assert.equal(status.value,'ativos');assert.deepEqual(financeRows(p).map(r=>r.getAttribute('data-student-id')),['2222','3333']);
 const total=p.nodes['pagamentos-pendentes'].textContent;status.value='inativos';await status.fire('change');
 assert.equal(financeRows(p).length,2);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='1111').textContent,/Cadastro inativo/);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='4444').textContent,/Cadastro inativo/);
 status.value='todos';await status.fire('change');assert.equal(financeRows(p).length,4);assert.equal(p.nodes['pagamentos-pendentes'].textContent,total);assert.equal(p.apiCalls.length,calls);
 p.nodes.busca.value='1111';await p.nodes.busca.fire('input');assert.equal(financeRows(p).length,1);status.value='ativos';await status.fire('change');assert.equal(financeRows(p).length,0);
 status.value='todos';await status.fire('change');await p.nodes['limpar-filtros'].fire('click');assert.equal(status.value,'ativos');assert.equal(financeRows(p).length,2);
});
test('Financeiro pagina registros e reinicia a página ao filtrar',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{for(let i=0;i<23;i++)s.students.push({...s.students[0],id:String(5000+i),name:i===22?'Pessoa Singular':'Aluno '+String(i).padStart(2,'0')});});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;assert.equal(financeRows(p).length,10);assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 1 de 3');assert.equal(p.nodes['financeiro-anterior'].disabled,true);
 await p.nodes['financeiro-proxima'].fire('click');assert.equal(financeRows(p).length,10);assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 2 de 3');
 await p.nodes['financeiro-proxima'].fire('click');assert.equal(financeRows(p).length,6);assert.equal(p.nodes['financeiro-proxima'].disabled,true);
 await p.nodes['financeiro-anterior'].fire('click');assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 2 de 3');
 p.nodes.busca.value='Pessoa Singular';await p.nodes.busca.fire('input');assert.equal(financeRows(p).length,1);assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 1 de 1');
});
test('Cadastros pagina alunos e reinicia a página ao buscar',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{for(let i=0;i<23;i++)s.students.push({...s.students[0],id:String(5000+i),name:i===22?'Pessoa Singular':'Aluno '+String(i).padStart(2,'0')});});
 const p=page('modulos/modulo-01-cadastros/index.html',storage);await p.ready;assert.equal(p.nodes['lista-alunos'].children.length,10);assert.equal(p.nodes['cadastros-pagina'].textContent,'Página 1 de 3');assert.equal(p.nodes['cadastros-anterior'].disabled,true);
 await p.nodes['cadastros-proxima'].fire('click');assert.equal(p.nodes['lista-alunos'].children.length,10);await p.nodes['cadastros-proxima'].fire('click');assert.equal(p.nodes['lista-alunos'].children.length,6);assert.equal(p.nodes['cadastros-proxima'].disabled,true);
 await p.nodes['cadastros-anterior'].fire('click');assert.equal(p.nodes['cadastros-pagina'].textContent,'Página 2 de 3');p.nodes.buscarAluno.value='Pessoa Singular';await p.nodes.buscarAluno.fire('input');assert.equal(p.nodes['lista-alunos'].children.length,1);assert.equal(p.nodes['cadastros-pagina'].textContent,'Página 1 de 1');
});
test('Cadastros recua de página quando o último aluno é desativado',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{for(let i=0;i<18;i++)s.students.push({...s.students[0],id:String(5000+i),name:'Aluno '+String(i).padStart(2,'0')});});
 const p=page('modulos/modulo-01-cadastros/index.html',storage);await p.ready;await p.nodes['cadastros-proxima'].fire('click');await p.nodes['cadastros-proxima'].fire('click');assert.equal(p.nodes['cadastros-pagina'].textContent,'Página 3 de 3');
 await descendants(p.nodes['lista-alunos']).find(n=>n.tag==='button').fire('click');const pending=p.nodes.arquivar.fire('click');await answerDialog(p,true);await pending;
 assert.equal(p.nodes['cadastros-pagina'].textContent,'Página 2 de 2');assert.equal(p.nodes['lista-alunos'].children.length,10);
});
test('Financeiro volta à última página disponível após atualizar os dados',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{for(let i=0;i<18;i++)s.students.push({...s.students[0],id:String(5000+i),name:'Aluno '+String(i).padStart(2,'0')});});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;await p.nodes['financeiro-proxima'].fire('click');await p.nodes['financeiro-proxima'].fire('click');assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 3 de 3');
 const last=financeRows(p)[0].getAttribute('data-student-id');await financeAction(p,last,'new').fire('click');D.transaction(s=>{s.students.find(x=>x.id===last).active=false;});await p.nodes['fechar-operacao'].fire('click');assert.equal(p.nodes['financeiro-pagina'].textContent,'Página 2 de 2');assert.equal(financeRows(p).length,10);
});
test('Histórico de avaliações pagina e volta à primeira página na busca',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{for(let i=0;i<24;i++)s.evaluations.push({...s.evaluations[0],id:'avaliacao-'+i,date:D.addDays(D.today(),-i),objective:'Métrica '+i});});
 const p=page('modulos/modulo-05-avaliacao/index.html',storage);await p.ready;assert.equal(p.nodes.historico.children.length,10);assert.equal(p.nodes['avaliacoes-pagina'].textContent,'Página 1 de 3');assert.equal(p.nodes['avaliacoes-anterior'].disabled,true);
 await p.nodes['avaliacoes-proxima'].fire('click');assert.equal(p.nodes.historico.children.length,10);await p.nodes['avaliacoes-proxima'].fire('click');assert.equal(p.nodes.historico.children.length,5);assert.equal(p.nodes['avaliacoes-proxima'].disabled,true);
 await p.nodes['avaliacoes-anterior'].fire('click');assert.equal(p.nodes['avaliacoes-pagina'].textContent,'Página 2 de 3');p.nodes.filtroAluno.value='Não existe';await p.nodes.filtroAluno.fire('input');assert.equal(p.nodes['avaliacoes-pagina'].textContent,'Página 1 de 1');assert.match(p.nodes.historico.textContent,/Nenhuma avaliação/);
});
test('Histórico de avaliações busca por nome, CPF e matrícula e restaura a lista ao apagar',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{s.students[1].name='Mariána Lima';s.evaluations.push({...s.evaluations[0],id:'outra-avaliacao',studentId:'2222'});});
 const p=page('modulos/modulo-05-avaliacao/index.html',storage);await p.ready;const calls=p.apiCalls.length;assert.equal(p.nodes.historico.children.length,2);
 for(const query of ['MARIANA','168.995.350-09','2222']){p.nodes.filtroAluno.value=query;await p.nodes.filtroAluno.fire('input');assert.equal(p.nodes.historico.children.length,1);assert.match(p.nodes.historico.textContent,/Mariána Lima/);}
 p.nodes.filtroAluno.value='não existe';await p.nodes.filtroAluno.fire('input');assert.match(p.nodes.historico.textContent,/Nenhuma avaliação/);p.nodes.filtroAluno.value='';await p.nodes.filtroAluno.fire('input');assert.equal(p.nodes.historico.children.length,2);assert.equal(p.apiCalls.length,calls);
 assert.equal(p.nodes.filtroInicio,undefined);assert.equal(p.nodes.filtroFim,undefined);assert.equal(p.nodes['limpar-filtros'],undefined);
});
test('Objetivos exibem etiquetas do tema com cores e texto preservados',async()=>{
 const storage=new Map(),{D}=model(storage),objectives=['Emagrecimento','Ganho de massa muscular','Condicionamento físico','Manutenção da saúde','Outro','Objetivo personalizado'];D.transaction(s=>{s.evaluations=objectives.map((objective,i)=>({...s.evaluations[0],id:'objetivo-'+i,date:D.addDays(D.today(),-i),objective}));});
 const p=page('modulos/modulo-05-avaliacao/index.html',storage);await p.ready;const tones=['warn','ok','info','neutral','neutral','neutral'];for(let i=0;i<objectives.length;i++){const badge=p.nodes.historico.children[i].children[6].children[0];assert.equal(badge.textContent,objectives[i]);assert.equal(badge.className,'badge '+tones[i]);}
 const {css,tokens}=theme();assert.match(css,/\.badge\.info\s*\{[^}]*var\(--blue\)/);assert.ok(contrast(tokens['--blue'],tokens['--blue-soft'])>=4.5);
});
test('Histórico de liberações filtra datas e situação e usa etiquetas semânticas',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{s.authorizations=[
 {studentId:'1111',type:'entrada',actor:'Admin',createdAt:'2026-10-08T15:00:00Z',expiresAt:'2026-10-09T15:00:00Z',usedAt:'2026-10-08T15:01:00Z',reason:'Utilizada no teste'},
 {studentId:'2222',type:'entrada',actor:'Admin',createdAt:'2026-10-07T15:00:00Z',expiresAt:'2026-10-09T15:00:00Z',usedAt:null,reason:'Pendente no teste'},
 {studentId:'3333',type:'entrada',actor:'Admin',createdAt:'2026-10-06T15:00:00Z',expiresAt:'2026-10-07T15:00:00Z',usedAt:null,reason:'Expirada no teste'}];});
 const p=page('modulos/modulo-04-auditoria/index.html',storage),body=p.nodes['historico-liberacoes'];assert.equal(body.children.length,3);assert.equal(body.children[0].children[6].children[0].className,'badge ok');assert.equal(body.children[1].children[6].children[0].className,'badge warn');assert.equal(body.children[2].children[6].children[0].className,'badge danger');
 p.nodes.filtroSituacao.value='nao-utilizada';await p.nodes.filtroSituacao.fire('change');assert.equal(body.children.length,2);assert.match(body.textContent,/Pendente/);assert.match(body.textContent,/Expirada/);
 p.nodes.filtroInicio.value='2026-10-07';p.nodes.filtroFim.value='2026-10-07';await p.nodes.filtroInicio.fire('change');assert.equal(body.children.length,1);assert.match(body.textContent,/Mariana Lima/);p.nodes.filtroAluno.value='Lucas';await p.nodes.filtroAluno.fire('input');assert.match(body.textContent,/Nenhuma liberação/);
 p.nodes.filtroAluno.value='';p.nodes.filtroInicio.value='2026-10-08';await p.nodes.filtroInicio.fire('change');assert.match(p.nodes['filtro-periodo-feedback'].textContent,/período válido/);p.nodes.filtroInicio.value='';p.nodes.filtroFim.value='';p.nodes.filtroSituacao.value='utilizada';await p.nodes.filtroSituacao.fire('change');assert.equal(body.children.length,1);assert.match(body.textContent,/Utilizada/);assert.equal(p.nodes['filtro-periodo-feedback'].textContent,'');
});
test('Relatórios paginam contratos por linha sem repetir chamadas e reiniciam ao filtrar',async()=>{
 let calls=0;const fetchReport=async(url)=>{calls++;const params=new URL(String(url)).searchParams;const aluno={id:'1',nome:'Aluno Um',matricula:'1111',ativo:true,contratos:Array.from({length:23},(_,i)=>({id:String(i),plano:'Plano '+i,valor:100,situacaoAtual:'Vigente'}))};const alunos=params.get('busca')?[]:[aluno,{id:'2',nome:'Aluno Sem Contrato',matricula:'2222',ativo:true,contratos:[]}];return {ok:true,status:200,json:async()=>({periodo:{dataInicio:params.get('dataInicio'),dataFim:params.get('dataFim')},totais:{alunos:2,alunosAtivos:2,receitaPrevista:2300,avaliacoesMes:0,avaliacoesPeriodo:0,alunosVencidos:0,alunosAIniciar:0},alunos})};};
 const p=page('modulos/modulo-06-relatorios/index.html',new Map(),fetchReport);await p.ready;assert.equal(p.nodes.tabelaCorpo.children.length,10);assert.equal(p.nodes['relatorios-pagina'].textContent,'Página 1 de 3');const initial=calls;
 await p.nodes['relatorios-proxima'].fire('click');assert.equal(p.nodes.tabelaCorpo.children.length,10);await p.nodes['relatorios-proxima'].fire('click');assert.equal(p.nodes.tabelaCorpo.children.length,4);assert.match(p.nodes.tabelaCorpo.textContent,/Aluno Sem Contrato/);assert.equal(calls,initial);
 p.nodes.buscarAluno.value='inexistente';await p.nodes.buscarAluno.fire('input');await p.flush();assert.equal(p.nodes['relatorios-pagina'].textContent,'Página 1 de 1');assert.equal(p.nodes['relatorios-proxima'].disabled,true);assert.match(p.nodes.tabelaCorpo.textContent,/Nenhum aluno/);
});
test('Busca financeira ignora acentos e combina contrato, pagamento e vencimento',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>{s.students[0].name='Lúcas Ándrade';});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;
 p.nodes.busca.value='LUCAS';await p.nodes.busca.fire('input');assert.equal(financeRows(p).length,1);
 p.nodes['filtro-contrato'].value='Vigente';p.nodes['filtro-pagamento'].value='Pago';
 p.nodes['vencimento-de'].value='2026-10-28';p.nodes['vencimento-ate'].value='2026-10-28';await p.nodes['vencimento-ate'].fire('change');
 assert.equal(financeRows(p).length,1);
 p.nodes['filtro-pagamento'].value='Atrasado';await p.nodes['filtro-pagamento'].fire('change');assert.equal(financeRows(p).length,0);
 assert.match(p.nodes.tabelaDados.textContent,/Nenhum aluno/);
 await p.nodes['limpar-filtros'].fire('click');assert.equal(financeRows(p).length,3);assert.equal(p.nodes['limpar-filtros'].hidden,true);
 p.nodes.busca.value='2222';await p.nodes.busca.fire('input');assert.equal(financeRows(p)[0].getAttribute('data-student-id'),'2222');
});
test('Intervalo de filtro inválido tem orientação e não lista resultados enganosos',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;
 p.nodes['vencimento-de'].value='2026-11-01';p.nodes['vencimento-ate'].value='2026-10-01';await p.nodes['vencimento-ate'].fire('change');
 assert.equal(financeRows(p).length,0);assert.match(p.nodes['filtro-erro'].textContent,/intervalo válido/);
 assert.equal(p.nodes['vencimento-ate'].getAttribute('aria-invalid'),'true');
 await p.nodes['limpar-filtros'].fire('click');assert.equal(p.nodes['filtro-erro'].textContent,'');
});
test('Indicadores aplicam filtros explícitos e preservam seus totais gerais',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;
 await p.nodes['filtrar-vigentes'].fire('click');assert.equal(financeRows(p).length,1);assert.equal(p.nodes['filtro-contrato'].value,'Vigente');
 await p.nodes['filtrar-abertos'].fire('click');assert.equal(financeRows(p).length,2);
 assert.equal(p.nodes['filtro-contrato'].value,'todos');assert.equal(p.nodes['filtrar-abertos'].getAttribute('aria-pressed'),'true');
 assert.equal(p.nodes['contratos-ativos'].textContent,'1');assert.equal(p.nodes['pagamentos-pendentes'].textContent,'2');
});
test('Consulta inclui alunos sem contrato e respeita atualização e ordem alfabética',async()=>{
 const storage=new Map(),{D}=model(storage);
 D.transaction(s=>{
  s.students.push({...s.students[0],id:'4444',name:'Zélia Sem contrato'},{...s.students[0],id:'5555',name:'Ana Sem contrato'});
  s.payments[2].updatedAt='2026-10-09T12:00:00Z';
 });
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;
 assert.deepEqual(financeRows(p).map(r=>r.getAttribute('data-student-id')),['3333','1111','2222','5555','4444']);
 p.nodes['filtro-contrato'].value='Sem contrato';await p.nodes['filtro-contrato'].fire('change');assert.equal(financeRows(p).length,2);
 await financeAction(p,'5555','new').fire('click');
 assert.equal(p.nodes.aluno.value,'5555');assert.equal(p.nodes['student-fieldset'].hidden,false);
 assert.match(p.nodes.alunoBusca.value,/5555/);assert.equal(p.nodes.aluno.tag,'input');
 assert.equal(p.D.getState().contracts.length,3);
});
test('Vigência futura, suspensão e cancelamento aparecem de forma distinta',async()=>{
 const storage=new Map(),{D}=model(storage);
 D.transaction(s=>{s.contracts[0].start='2026-10-09';s.contracts[1].state='Suspenso';s.contracts[2].state='Cancelado';});
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;
 assert.match(financeRows(p)[0].textContent,/A iniciar/);assert.match(financeRows(p)[1].textContent,/Suspenso/);assert.match(financeRows(p)[2].textContent,/Cancelado/);
 assert.equal(p.nodes['contratos-ativos'].textContent,'0');assert.equal(financeAction(p,'3333','manage'),undefined);
});
test('Detalhes expandem sem gravar e mantêm os dados secundários',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;const before=JSON.stringify(p.D.getState()),button=financeAction(p,'1111','details');
 await button.fire('click');assert.equal(button.getAttribute('aria-expanded'),'true');
 const detail=p.nodes.tabelaDados.children.find(r=>r.id==='detalhes-c-1111');
 assert.equal(detail.hidden,false);assert.match(detail.textContent,/Situação administrativaAtivo/);assert.match(detail.textContent,/Quitação/);
 await button.fire('click');assert.equal(detail.hidden,true);assert.equal(JSON.stringify(p.D.getState()),before);
});
test('Pagamento isolado preserva contratos, valor e demais cobranças',()=>{
 const{D}=model();D.changeStatus('1111','Suspenso');const before=clone(D.getState());
 D.savePayment({studentId:'1111',method:'Cartão',status:'Pago',paidDate:'2026-10-07'});
 const after=D.getState(),old=before.payments.find(p=>p.contractId==='c-1111'),payment=after.payments.find(p=>p.id===old.id);
 assert.deepEqual(after.contracts,before.contracts);assert.equal(payment.amount,old.amount);assert.equal(payment.contractId,old.contractId);
 assert.equal(payment.method,'Cartão');assert.equal(payment.paidDate,'2026-10-07');
 assert.deepEqual(after.payments.filter(p=>p.id!==old.id),before.payments.filter(p=>p.id!==old.id));
});
test('Pagamento isolado rejeita dados inválidos e ausência de cobrança sem gravação parcial',()=>{
 const{D}=model();D.transaction(s=>{s.students.push({...s.students[0],id:'4444'});});
 const valid={studentId:'1111',method:'PIX',status:'Pago',paidDate:D.today()},before=JSON.stringify(D.getState());
 for(const values of [{...valid,paidDate:'2099-01-01'},{...valid,method:'Inválido'},{...valid,status:'Inválido'},{...valid,status:'Atrasado'},{...valid,studentId:'4444'},{...valid,studentId:'9999'}]){
  assert.throws(()=>D.savePayment(values));assert.equal(JSON.stringify(D.getState()),before);
 }
});
test('Tela de pagamento altera apenas a cobrança e classifica atraso automaticamente',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;const before=clone(p.D.getState());
 await financeAction(p,'3333','payment').fire('click');
 assert.equal(p.nodes['contract-fields'].hidden,true);assert.equal(p.nodes['operation-title'].textContent,'Registrar pagamento');
 p.nodes.pagamento.value='Boleto';await p.nodes.pagamento.fire('change');await p.nodes.formFinanceiro.fire('submit');
 assert.deepEqual(p.D.getState().contracts,before.contracts);
 assert.equal(p.D.payment(p.D.getState(),'c-3333').status,'Atrasado');
 p.nodes.status.value='Pago';await p.nodes.status.fire('change');p.nodes.dataPagamento.value='2026-10-08';await p.nodes.formFinanceiro.fire('submit');
 assert.equal(p.D.payment(p.D.getState(),'c-3333').status,'Pago');assert.deepEqual(p.D.getState().contracts,before.contracts);
 assert.match(p.nodes.feedback.textContent,/Pagamento salvo/);
});
test('Edição destaca mudanças no resumo e abre ajustes que contêm erros',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'1111','edit').fire('click');
 const before=JSON.stringify(p.D.getState());p.nodes.tolerancia.value='7';await p.nodes.tolerancia.fire('input');
 assert.match(p.nodes['resumo-operacao'].textContent,/7 dia\(s\)Antes: 5 dia\(s\)/);
 p.nodes.tolerancia.value='31';await p.nodes.formFinanceiro.fire('submit');
 assert.equal(p.nodes['ajustes-contrato'].open,true);assert.match(p.nodes['erro-tolerancia'].textContent,/0 a 30/);
 assert.equal(JSON.stringify(p.D.getState()),before);
 p.nodes.tolerancia.value='5';p.nodes.dataVencimento.value='2026-01-01';await p.nodes.formFinanceiro.fire('submit');
 assert.match(p.nodes['erro-dataVencimento'].textContent,/posterior/);
});
test('Trocar operação, fechar e descartar respeitam alterações pendentes',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'1111','edit').fire('click');
 p.nodes.tolerancia.value='7';await p.nodes.tolerancia.fire('input');
 let pending=financeAction(p,'2222','payment').fire('click');await answerDialog(p,false);await pending;assert.equal(p.nodes['student-name'].textContent,'Lucas Andrade');
 pending=p.nodes['fechar-operacao'].fire('click');await answerDialog(p,false);await pending;assert.equal(p.nodes['painel-operacao'].hidden,false);
 pending=p.nodes['descartar-alteracoes'].fire('click');await answerDialog(p,true);await pending;
 assert.equal(p.nodes.tolerancia.value,'5');assert.equal(p.sandbox.demoDirty,false);
});
test('Cancelamento da confirmação de suspensão não altera o estado',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;const before=JSON.stringify(p.D.getState()),pending=financeAction(p,'1111','manage').fire('click');await answerDialog(p,false);await pending;assert.equal(JSON.stringify(p.D.getState()),before);
});
test('Falha de armazenamento no pagamento mantém o formulário e não confirma sucesso',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'2222','payment').fire('click');
 const before=JSON.stringify(p.D.getState());p.nodes.pagamento.value='Dinheiro';await p.nodes.pagamento.fire('change');
 p.sandbox.localStorage.setItem=()=>{const e=new Error('Sem espaço');e.name='QuotaExceededError';throw e;};
 await p.nodes.formFinanceiro.fire('submit');
 assert.equal(JSON.stringify(p.D.getState()),before);assert.equal(p.nodes.pagamento.value,'Dinheiro');assert.equal(p.sandbox.demoDirty,true);
 assert.match(p.nodes.feedback.textContent,/espaço/);assert.equal(p.nodes['salvar-financeiro'].disabled,false);
});
test('Novo contrato oferece plano mensal e só revela os campos após selecionar aluno',async()=>{
 const storage=new Map(),{D}=model(storage);D.transaction(s=>s.students.push({...s.students[0],id:'4444'}));
 const p=page('modulos/modulo-02-financeiro/index.html',storage);await p.ready;await p.nodes['novo-contrato'].fire('click');
 assert.equal(p.nodes['contract-fields'].hidden,true);assert.equal(p.nodes['payment-fields'].hidden,true);
 await chooseStudent(p,'alunoBusca','4444');
 assert.equal(p.nodes['contract-fields'].hidden,false);assert.equal(p.nodes.status.value,'Pendente');
 const radios=descendants(p.nodes['plan-options']).filter(n=>n.type==='radio');
 assert.equal(radios.find(n=>n.value==='mensal').checked,true);
 const quarterly=radios.find(n=>n.value==='trimestral');quarterly.checked=true;await quarterly.fire('change');
 assert.equal(p.nodes.valor.textContent,p.D.money(32400));assert.equal(p.nodes.dataVencimento.value,'2027-01-08');
 assert.equal(p.D.getState().contracts.length,3);
 await p.nodes.formFinanceiro.fire('submit');assert.equal(p.D.contract(p.D.getState(),'4444').planId,'trimestral');
});

test('Relatórios enviam filtros e limpar volta a consultar a API',async()=>{
 const p=page('modulos/modulo-06-relatorios/index.html');await p.ready;assert.equal(p.nodes['total-alunos'].textContent,'3');assert.match(p.nodes.tabelaCorpo.textContent,/Lucas Andrade/);
 p.nodes.status.value='Vencido';await p.nodes.formRelatorio.fire('submit');assert.match(p.apiCalls.at(-1).url,/situacao=Vencido/);assert.match(p.nodes.tabelaCorpo.textContent,/Nenhum aluno/);
 const count=p.apiCalls.length;await p.nodes.limparFiltros.fire('click');assert.equal(p.apiCalls.length,count+1);assert.equal(p.nodes.status.value,'todos');assert.match(p.nodes.tabelaCorpo.textContent,/Lucas Andrade/);
 p.nodes.dataInicio.value='2026-11-02';p.nodes.dataFim.value='2026-11-01';await p.nodes.formRelatorio.fire('submit');assert.match(p.nodes.feedback.textContent,/período válido/);assert.equal(p.nodes['total-alunos'].textContent,'—');
});
test('Relatórios exibem erro da API e não mostram dados anteriores como atuais',async()=>{
 const p=page('modulos/modulo-06-relatorios/index.html');await p.ready;
 p.sandbox.fetch=async()=>({ok:false,status:400,json:async()=>({erro:'Filtro recusado.'})});await p.nodes.formRelatorio.fire('submit');
 assert.match(p.nodes.feedback.textContent,/Filtro recusado/);assert.equal(p.nodes['total-alunos'].textContent,'—');assert.doesNotMatch(p.nodes.tabelaCorpo.textContent,/Lucas Andrade/);
});
test('Avaliação envia os dados à API e apresenta erros sem descartar o formulário',async()=>{
 const p=page('modulos/modulo-05-avaliacao/index.html');await p.ready;await chooseStudent(p,'alunoBusca','1111');
 p.nodes.peso.value='74.5';p.nodes.altura.value='175';p.nodes.objetivo.value='Outro';
 p.sandbox.fetch=async()=>({ok:false,status:400,json:async()=>({erro:'Erro de validação da API.'})});
 await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/Erro de validação da API/);assert.equal(p.nodes.peso.value,'74.5');assert.equal(p.nodes['salvar-avaliacao'].disabled,false);
});
test('Avaliação limpa o estado de validação após salvar e continua validando novas entradas',async()=>{
 const p=page('modulos/modulo-05-avaliacao/index.html');await p.ready;await chooseStudent(p,'alunoBusca','1111');
 p.nodes.peso.value='10';await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/peso/);
 p.nodes.peso.value='74.5';p.nodes.altura.value='175';p.nodes.objetivo.value='Outro';p.nodes.formAvaliacao.classList.add('was-validated');
 await p.nodes.formAvaliacao.fire('submit');await p.flush();assert.equal(p.nodes.formAvaliacao.classList.contains('was-validated'),false);assert.equal(p.nodes.peso.validationMessage,'');assert.match(p.nodes.feedback.textContent,/Avaliação salva/);
 p.nodes.peso.value='10';await p.nodes.peso.fire('input');assert.doesNotMatch(p.nodes.feedback.textContent,/peso deve/);await p.nodes.formAvaliacao.fire('submit');assert.match(p.nodes.feedback.textContent,/peso deve/);
});
test('Avaliação comunica falha de conexão sem exibir histórico de demonstração',async()=>{
 const p=page('modulos/modulo-05-avaliacao/index.html',new Map(),async()=>{throw new Error('offline');});await p.ready;
 assert.match(p.nodes['historico-feedback'].textContent,/conectar à API/);assert.doesNotMatch(p.nodes.historico.textContent,/Lucas Andrade/);
});
test('Financeiro exibe erro da API e preserva dados não salvos',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'2222','payment').fire('click');
 p.nodes.pagamento.value='Dinheiro';await p.nodes.pagamento.fire('change');
 p.sandbox.fetch=async()=>({ok:false,status:400,json:async()=>({erro:'Pagamento recusado pela API.'})});
 await p.nodes.formFinanceiro.fire('submit');assert.match(p.nodes.feedback.textContent,/Pagamento recusado pela API/);assert.equal(p.nodes.pagamento.value,'Dinheiro');assert.equal(p.sandbox.demoDirty,true);
});
test('Financeiro consulta novamente os contratos após salvar, suspender e fechar a operação',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;
 const gets=()=>p.apiCalls.filter(c=>c.method==='GET'&&String(c.url).endsWith('/financeiro')).length;
 await financeAction(p,'2222','payment').fire('click');p.nodes.status.value='Pago';await p.nodes.status.fire('change');
 let previous=gets();await p.nodes.formFinanceiro.fire('submit');assert.ok(gets()>previous);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='2222').textContent,/Pago/);
 p.D.transaction(s=>{s.payments.find(payment=>payment.contractId==='c-2222').status='Pendente';});
 previous=gets();await p.nodes['fechar-operacao'].fire('click');assert.ok(gets()>previous);assert.equal(p.nodes['painel-operacao'].hidden,true);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='2222').textContent,/Atrasado/);
 previous=gets();const pending=financeAction(p,'1111','manage').fire('click');await answerDialog(p,true);await pending;assert.ok(gets()>previous);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='1111').textContent,/Suspenso/);
 await financeAction(p,'3333','edit').fire('click');p.nodes.statusContrato.value='Cancelado';await p.nodes.statusContrato.fire('change');previous=gets();await p.nodes.formFinanceiro.fire('submit');assert.ok(gets()>previous);assert.match(financeRows(p).find(r=>r.getAttribute('data-student-id')==='3333').textContent,/Cancelado/);
});
test('Financeiro informa quando não consegue atualizar a lista ao fechar a operação',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html');await p.ready;await financeAction(p,'1111','edit').fire('click');
 p.sandbox.fetch=async()=>{throw new Error('offline');};await p.nodes['fechar-operacao'].fire('click');
 assert.equal(p.nodes['painel-operacao'].hidden,true);assert.match(p.nodes['page-feedback'].textContent,/Não foi possível atualizar a lista/);
});
test('Financeiro comunica indisponibilidade da API sem carregar dados de demonstração',async()=>{
 const p=page('modulos/modulo-02-financeiro/index.html',new Map(),async()=>{throw new Error('offline');});await p.ready;
 assert.match(p.nodes['page-feedback'].textContent,/conectar à API/);assert.equal(financeRows(p).length,0);
});
async function run(){const results=[];for(const entry of cases){try{await entry.fn();results.push({cenario:entry.name,passou:true});}catch(e){results.push({cenario:entry.name,passou:false,erro:e.stack});}}const report={data:'2026-11-07',metodo:'Regras locais reais em VM, inicialização de controladores em DOM mínimo, interação com as buscas de alunos, consistência do tema e cálculo de contraste das cores CSS; inspeção de navegador registrada separadamente.',total:results.length,aprovados:results.filter(r=>r.passou).length,resultados:results};return report;}
module.exports={run,page,answerDialog,descendants};if(require.main===module)run().then(report=>{for(const r of report.resultados)console.log((r.passou?'PASS ':'FAIL ')+r.cenario+(r.passou?'':'\n'+r.erro));console.log(report.aprovados+'/'+report.total+' cenários passaram.');if(report.aprovados!==report.total)process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1;});
