/* Estado e regras locais da demonstração. Sem autenticação ou serviço externo. */
(function(global){
'use strict';
const KEY='vidaAtiva.demo.v1';
const plans=[{id:'mensal',name:'Mensal',months:1,price:12000},{id:'trimestral',name:'Trimestral',months:3,price:32400},{id:'anual',name:'Anual',months:12,price:115200}];
let memory=null,storageAvailable=true;
const pad=n=>String(n).padStart(2,'0');
function iso(date){return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());}
function today(){return iso(new Date());}
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const d=new Date(value+'T12:00:00');return Number.isFinite(d.getTime())&&iso(d)===value?d:null;}
function addDays(value,days){const d=date(value);if(!d||!Number.isInteger(days))throw new Error('Data ou intervalo inválido.');d.setDate(d.getDate()+days);return iso(d);}
function addMonths(value,months){const d=date(value);if(!d||!Number.isInteger(months))throw new Error('Data ou plano inválido.');const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return iso(d);}
function daysBetween(from,to){if(!date(from)||!date(to))throw new Error('Datas inválidas.');const parts=s=>s.split('-').map(Number);const a=parts(from),b=parts(to);return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000);}
function formatDate(value){return date(value)?value.split('-').reverse().join('/'):'—';}
function formatTime(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'—';}
function number(value){return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value);}
function money(cents){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);}
function digits(value){return String(value||'').replace(/\D/g,'');}
function validCpf(value){const v=digits(value);if(v.length!==11||/^(\d)\1{10}$/.test(v))return false;for(let length=9;length<11;length++){let sum=0;for(let i=0;i<length;i++)sum+=Number(v[i])*(length+1-i);let check=(sum*10)%11;if(check===10)check=0;if(check!==Number(v[length]))return false;}return true;}
function cpfText(value){const v=digits(value);return v.length===11?v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9):value;}
function phoneText(value){const v=digits(value);return /^(\d{10}|\d{11})$/.test(v)?'('+v.slice(0,2)+') '+v.slice(2,-4)+'-'+v.slice(-4):value;}
function id(prefix){return prefix+'-'+(global.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));}
function seed(){
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
}
function parentStore(){try{return global.parent!==global&&global.parent.Demo?global.parent.Demo:null;}catch(e){return null;}}
function read(){const parent=parentStore();if(parent)return parent.getState();try{const raw=global.localStorage?.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed.version===1&&['students','contracts','payments','evaluations','accesses','authorizations'].every(k=>Array.isArray(parsed[k]))){memory=parsed;return structuredClone(parsed);}}}catch(e){storageAvailable=false;}if(!memory)memory=seed();return structuredClone(memory);}
function write(state){const parent=parentStore();if(parent)return parent.saveState(state);if(storageAvailable){try{global.localStorage.setItem(KEY,JSON.stringify(state));}catch(e){if(e.name==='QuotaExceededError')throw new Error('Não há espaço disponível para salvar. Tente uma foto menor.');storageAvailable=false;}}memory=structuredClone(state);global.dispatchEvent?.(new Event('demo:change'));return state;}
function transaction(callback){const state=read();const result=callback(state);write(state);return result;}
function plan(planId){return plans.find(p=>p.id===planId);}
function contract(state,studentId){return state.contracts.find(c=>c.studentId===studentId);}
function payment(state,contractId){return state.payments.find(p=>p.contractId===contractId);}
function actor(){let profile='admin';try{profile=global.parent.document.getElementById('perfil')?.value||global.localStorage.getItem('perfilAtivo')||'admin';}catch(e){}return profile==='portaria'?'Portaria • João Ribeiro':'Administração • Marina Costa';}
function access(state,studentId,at=Date.now()){
 const student=state.students.find(s=>s.id===studentId);
 if(!student)return {allowed:false,tone:'danger',title:'Matrícula não encontrada',reason:'Confira a matrícula e tente novamente.'};
 const exception=state.authorizations.find(a=>a.studentId===studentId&&a.type!=='restrita'&&!a.usedAt&&new Date(a.expiresAt).getTime()>at);
 if(exception)return {allowed:true,tone:'warn',title:'Liberação excepcional',reason:'Acesso único autorizado por '+exception.actor+'.',authorizationId:exception.id};
 const c=contract(state,studentId);
 if(!c)return {allowed:false,tone:'danger',title:'Sem contrato',reason:'O aluno ainda não possui um plano cadastrado.'};
 if(c.state==='Suspenso'||c.state==='Cancelado')return {allowed:false,tone:'danger',title:'Acesso bloqueado',reason:'Contrato '+c.state.toLowerCase()+'. Procure a recepção.'};
 const p=payment(state,c.id), reference=iso(new Date(at)), late=daysBetween(c.due,reference);
 if(c.start>reference)return {allowed:false,tone:'danger',title:'Contrato ainda não iniciado',reason:'A vigência começa em '+formatDate(c.start)+'.'};
 if(p?.status==='Pago'&&late<=0)return {allowed:true,tone:'ok',title:'Acesso liberado',reason:'Plano em dia. Bom treino!'};
 if(p?.status!=='Pago'&&late<=0)return {allowed:true,tone:'warn',title:'Acesso com aviso',reason:'Pagamento pendente. Regularize até '+formatDate(c.due)+'.'};
 if(p?.status!=='Pago'&&late>0&&late<=c.tolerance)return {allowed:true,tone:'warn',title:'Período de tolerância',reason:'Vencimento há '+late+' dia(s). Restam '+(c.tolerance-late)+' dia(s) de tolerância.'};
 return {allowed:false,tone:'danger',title:'Acesso bloqueado',reason:p?.status==='Pago'?'Plano vencido. Renove seu contrato na recepção.':'Pagamento vencido e tolerância encerrada.'};
}
function stateLabel(c){if(!c)return 'Sem contrato';if(c.state!=='Ativo')return c.state;return c.due<today()?'Vencido':'Ativo';}
function nextStudentId(state){return String(Math.max(1000,...state.students.map(s=>Number(s.id)||0))+1);}
function validateStudent(student,state){if(!student.name||student.name.trim().length<3)throw new Error('Informe o nome completo do aluno.');if(!validCpf(student.cpf))throw new Error('Informe um CPF válido.');if(state.students.some(s=>s.id!==student.id&&digits(s.cpf)===digits(student.cpf)))throw new Error('Já existe um aluno com este CPF.');if(!date(student.birth)||student.birth>today())throw new Error('Informe uma data de nascimento válida.');for(const number of [student.phone,student.emergencyPhone])if(!/^(\d{10}|\d{11})$/.test(digits(number)))throw new Error('Informe os telefones com DDD e 10 ou 11 dígitos.');if(![student.address,student.emergencyName,student.health].every(v=>v?.trim()))throw new Error('Preencha endereço, contato de emergência e informações de saúde.');}
function validateContract(c){if(!plan(c.planId))throw new Error('Selecione um plano válido.');if(!date(c.start)||!date(c.due)||c.due<c.start)throw new Error('O vencimento deve ser igual ou posterior ao início.');if(!['Ativo','Suspenso','Cancelado'].includes(c.state))throw new Error('Situação de contrato inválida.');if(!Number.isInteger(c.tolerance)||c.tolerance<0||c.tolerance>30)throw new Error('A tolerância deve ser de 0 a 30 dias.');}
function transition(c,old){if(c.state==='Suspenso'&&old?.state!=='Suspenso'){c.suspendedAt=today();c.suspendedDays=Math.max(0,daysBetween(today(),c.due));}else if(c.state==='Ativo'&&old?.state==='Suspenso'){c.due=addDays(today(),old.suspendedDays||0);c.suspendedAt=null;c.suspendedDays=0;}else if(c.state==='Suspenso'){c.suspendedAt=old?.suspendedAt||today();c.suspendedDays=old?.suspendedDays??Math.max(0,daysBetween(today(),c.due));}}
function upsertStudent(student){return transaction(state=>{validateStudent(student,state);const index=state.students.findIndex(s=>s.id===student.id);index<0?state.students.push(student):state.students.splice(index,1,student);return student.id;});}
function changeStatus(studentId,newState){return transaction(state=>{const c=contract(state,studentId);if(!c)throw new Error('Cadastre um contrato no Financeiro antes de alterar a situação.');const old={...c};c.state=newState;transition(c,old);validateContract(c);return c;});}
function saveFinance(values){return transaction(state=>{const student=state.students.find(s=>s.id===values.studentId);if(!student)throw new Error('Selecione um aluno cadastrado.');const old=contract(state,student.id);const c={...old,id:old?.id||id('contrato'),studentId:student.id,planId:values.planId,start:values.start,due:values.due,tolerance:values.tolerance,state:values.state??old?.state??'Ativo'};transition(c,old);validateContract(c);if(!['Pago','Pendente','Atrasado'].includes(values.status))throw new Error('Selecione uma situação de pagamento válida.');if(!['PIX','Cartão','Dinheiro','Boleto'].includes(values.method))throw new Error('Selecione uma forma de pagamento válida.');if(values.status==='Pago'&&(!date(values.paidDate)||values.paidDate>today()))throw new Error('Informe uma data de pagamento válida.');if(values.status==='Atrasado'&&c.due>=today())throw new Error('Marque como atrasado somente após o vencimento.');const ci=state.contracts.findIndex(x=>x.id===c.id);ci<0?state.contracts.push(c):state.contracts.splice(ci,1,c);let p=payment(state,c.id);if(!p){p={id:id('pagamento'),contractId:c.id};state.payments.push(p);}Object.assign(p,{amount:plan(c.planId).price,method:values.method,status:values.status,paidDate:values.status==='Pago'?values.paidDate:null,updatedAt:new Date().toISOString()});return c;});}
function savePayment(values){return transaction(state=>{
 if(!state.students.some(s=>s.id===values.studentId))throw new Error('Selecione um aluno cadastrado.');
 const c=contract(state,values.studentId),p=c&&payment(state,c.id);
 if(!c||!p)throw new Error('Cadastre um contrato e uma cobrança antes de registrar o pagamento.');
 if(!['Pago','Pendente','Atrasado'].includes(values.status))throw new Error('Selecione uma situação de pagamento válida.');
 if(!['PIX','Cartão','Dinheiro','Boleto'].includes(values.method))throw new Error('Selecione uma forma de pagamento válida.');
 if(values.status==='Pago'&&(!date(values.paidDate)||values.paidDate>today()))throw new Error('Informe uma data de pagamento válida.');
 if(values.status==='Atrasado'&&c.due>=today())throw new Error('Marque como atrasado somente após o vencimento.');
 Object.assign(p,{method:values.method,status:values.status,paidDate:values.status==='Pago'?values.paidDate:null,updatedAt:new Date().toISOString()});
 return p;
});}
function saveEvaluation(value){return transaction(state=>{if(!state.students.some(s=>s.id===value.studentId))throw new Error('Selecione um aluno cadastrado.');if(!date(value.date)||value.date>today())throw new Error('A avaliação deve ter uma data válida até hoje.');if(!Number.isFinite(value.weight)||value.weight<=0||value.weight>500)throw new Error('Informe um peso maior que zero e até 500 kg.');if(value.height!==null&&(!Number.isFinite(value.height)||value.height<=0||value.height>300))throw new Error('Informe uma altura maior que zero e até 300 cm.');if(value.fat!==null&&(!Number.isFinite(value.fat)||value.fat<0||value.fat>100))throw new Error('A gordura corporal deve estar entre 0 e 100%.');if(![30,45,60,90].includes(value.interval))throw new Error('Intervalo de reavaliação inválido.');if(!['Emagrecimento','Ganho de massa muscular','Condicionamento físico','Manutenção da saúde','Outro'].includes(value.objective))throw new Error('Selecione um objetivo válido.');state.evaluations.unshift({...value,id:id('avaliacao'),next:addDays(value.date,value.interval)});});}
function authorize(value){return transaction(state=>{if(!state.students.some(s=>s.id===value.studentId))throw new Error('Selecione um aluno cadastrado.');if(!['entrada','temporaria','restrita'].includes(value.type)||![15,30,60].includes(value.minutes))throw new Error('Selecione tipo e prazo da liberação.');if(value.reason.trim().length<10||value.reason.trim().length>250)throw new Error('Descreva a justificativa com 10 a 250 caracteres.');const record={...value,reason:value.reason.trim(),id:id('liberacao'),actor:actor(),createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+value.minutes*60000).toISOString(),usedAt:null};state.authorizations.unshift(record);return record;});}
function registerAccess(matricula){return transaction(state=>{const result=access(state,matricula);const record={id:id('acesso'),studentId:state.students.some(s=>s.id===matricula)?matricula:null,matricula,date:today(),time:new Date().toISOString(),allowed:result.allowed,result:result.title,tone:result.tone,reason:result.reason,actor:actor()};state.accesses.unshift(record);if(result.authorizationId){const a=state.authorizations.find(a=>a.id===result.authorizationId);a.usedAt=record.time;}return {...result,record};});}
function report(state,{from,to,status}){if(!date(from)||!date(to)||from>to)throw new Error('Informe um período válido, com início anterior ou igual ao fim.');return state.students.map(student=>{const c=contract(state,student.id);const statusValue=stateLabel(c);const events=state.accesses.filter(a=>a.studentId===student.id&&a.allowed&&a.date>=from&&a.date<=to);return {student,contract:c,status:statusValue,count:events.length,last:events.map(a=>a.time).sort().at(-1)||null};}).filter(row=>(status==='todos'||row.status===status)&&row.count>0);}
function feedback(element,message,error=false){element.textContent=message;element.className='feedback '+(message?(error?'error':'ok'):'');element.setAttribute('role',error?'alert':'status');}
function badge(text,tone){const span=global.document.createElement('span');span.className='badge '+tone;span.textContent=text;return span;}
function cell(row,text){const td=global.document.createElement('td');if(text?.nodeType)td.append(text);else td.textContent=String(text??'—');row.append(td);return td;}
function empty(body,columns,message){body.replaceChildren();const row=global.document.createElement('tr');const td=cell(row,message);td.colSpan=columns;td.className='empty';body.append(row);}
function populateStudents(select,state,placeholder='Selecione um aluno'){const value=select.value;select.replaceChildren();const first=global.document.createElement('option');first.value='';first.textContent=placeholder;select.append(first);state.students.forEach(s=>{const option=global.document.createElement('option');option.value=s.id;option.textContent=s.name+' • '+s.id;select.append(option);});select.value=state.students.some(s=>s.id===value)?value:'';}
function populatePlans(select){plans.forEach(p=>{const option=global.document.createElement('option');option.value=p.id;option.textContent=p.name+' • '+money(p.price);select.append(option);});}
function avatar(element,student){element.replaceChildren();if(student?.photo&&/^data:image\/(png|jpeg|webp);base64,/.test(student.photo)){const img=global.document.createElement('img');img.src=student.photo;img.alt='Foto de '+student.name;element.append(img);}else element.textContent=(student?.name||'Novo aluno').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();}
function readPhoto(file){return new Promise((resolve,reject)=>{if(!file){resolve('');return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){reject(new Error('Use uma foto JPEG, PNG ou WebP.'));return;}if(file.size>1024*1024){reject(new Error('Escolha uma foto com até 1 MB.'));return;}const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(file);});}
function tone(value){return ['Ativo','Pago'].includes(value)?'ok':['Suspenso','Vencido','Pendente'].includes(value)?'warn':'danger';}
function watchForm(form,ignoredIds=[]){global.demoDirty=false;const changed=event=>{if(!ignoredIds.includes(event.target.id))global.demoDirty=true;};form.addEventListener('input',changed);form.addEventListener('change',changed);form.addEventListener('reset',()=>{global.demoDirty=false;});}
function initPage(){if(!global.document)return;const back=global.document.querySelector('.back-link');if(back&&global.parent!==global)back.hidden=true;const bootstrap=read();try{write(bootstrap);}catch(e){memory=bootstrap;const output=global.document.getElementById('feedback')||global.document.getElementById('shell-feedback');if(output)feedback(output,e.message,true);}}
const api={plans,today,date,addDays,addMonths,daysBetween,formatDate,formatTime,number,money,digits,validCpf,cpfText,phoneText,id,getState:read,saveState:write,transaction,plan,contract,payment,actor,access,stateLabel,nextStudentId,upsertStudent,changeStatus,saveFinance,savePayment,saveEvaluation,authorize,registerAccess,report,feedback,badge,cell,empty,populateStudents,populatePlans,avatar,readPhoto,tone,watchForm,reset:()=>write(seed()),initPage};
global.Demo=api;
})(window);
