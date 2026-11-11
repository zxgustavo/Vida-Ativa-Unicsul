(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formFinanceiro'),feedback=$('feedback');
const fieldIds=['aluno','dataInicio','dataVencimento','tolerancia','statusContrato','pagamento','status','dataPagamento'];
const expanded=new Set(),actionTargets=new Map(),planInputs=new Map();
let selectedStudent='',selectedContract='',selectedPlan='mensal',mode='new',baseline=null,returnAction='new',saving=false,managing=false,refreshVersion=0;
let state={students:[],contracts:[],payments:[]};
let pagina=1;const POR_PAGINA=10;
const api='http://localhost:3333/api';
D.initPage({bootstrap:false});
async function request(url,options={}){
 let response;try{response=await fetch(url,options);}catch{throw new Error('Não foi possível conectar à API. Verifique se o servidor está ativo.');}
 let data;try{data=await response.json();}catch{throw new Error('A API retornou uma resposta inválida.');}
 if(!response.ok)throw new Error(data.erro||'Não foi possível concluir a operação.');return data;
}
async function refresh(){
 const version=++refreshVersion;
 const [students,contracts]=await Promise.all([request(api+'/alunos'),request(api+'/financeiro')]);
 if(version!==refreshVersion)return;
 state={students:students.map(a=>({id:a.id,matricula:a.matricula,name:a.nome,cpf:a.cpf,active:a.ativo})),contracts:contracts.map(c=>({id:c.id,studentId:c.alunoId,planId:D.plans.find(p=>p.name.toLowerCase()===c.plano.toLowerCase())?.id||'mensal',planName:c.plano,amount:Math.round(c.valor*100),start:c.dataInicio.slice(0,10),due:c.dataFim.slice(0,10),state:['Vigente','Vencido','A Iniciar','A iniciar'].includes(c.situacao)?'Ativo':c.situacao,tolerance:c.tolerancia,suspendedDays:c.diasSuspensos})),payments:contracts.map(c=>({contractId:c.id,amount:Math.round(c.valor*100),method:c.formaPagamento,status:c.statusPagamento,paidDate:c.dataPagamento?.slice(0,10)||null,updatedAt:c.atualizadoEm}))};
 render();
}
function currentContract(){return state.contracts.find(c=>c.id===selectedContract);}
function payload(v){const existing=baseline?.contract,unchanged=existing&&v.planId===existing.planId;return {alunoId:v.studentId,plano:unchanged?existing.planName:D.plan(v.planId).name,valor:(unchanged?existing.amount:D.plan(v.planId).price)/100,dataInicio:v.start,dataFim:v.due,situacao:v.state,tolerancia:v.tolerance,diasSuspensos:existing?.suspendedDays||0,formaPagamento:v.method,statusPagamento:v.status,dataPagamento:v.status==='Pago'?v.paidDate:null};}
async function send(method,url,data){return request(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
D.watchForm(form,['aluno']);
const financePicker=D.createStudentPicker({input:$('alunoBusca'),results:$('alunoResultados'),value:$('aluno'),
 getStudents:()=>state.students.filter(s=>D.isActiveStudent(s)),
 beforeClear:()=>mayDiscard(),onClear:()=>{selectedStudent='';selectedContract='';mode='new';loadStudent(true);},
 onSelect:student=>{selectedStudent=student.id;selectedContract='';mode='new';loadStudent();}
});
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function contractLabel(c){
 if(!c)return 'Sem contrato';
 if(c.state!=='Ativo')return c.state;
 if(c.start>D.today())return 'A iniciar';
 return c.due<D.today()?'Vencido':'Vigente';
}
function paymentLabel(c,p){return !p?'Sem cobrança':p.status==='Pago'?'Pago':c.due<D.today()?'Atrasado':'Pendente';}
function badge(label){return D.badge(label,['Vigente','Pago'].includes(label)?'ok':['Pendente','Vencido','Suspenso','A iniciar'].includes(label)?'warn':['Sem contrato','Sem cobrança'].includes(label)?'neutral':'danger');}
function summaryItem(list,label,value,before){
 const item=el('div'),term=el('dt',label),desc=el('dd',value);
 item.append(term,desc);
 if(before!==undefined&&before!==value){item.className='changed';desc.append(el('small','Antes: '+before));}
 list.append(item);
}
function rowCell(row,label,value){const cell=D.cell(row,'');const title=el('span',label,'cell-label');title.setAttribute('aria-hidden','true');cell.append(title,value?.nodeType?value:el('span',value));return cell;}
function action(text,key,studentId,handler,className='btn btn-small'){
 const button=el('button',text,className);button.type='button';button.setAttribute('data-action',key);
 button.setAttribute('aria-label',text+' — '+state.students.find(s=>s.id===(state.contracts.find(c=>c.id===studentId)?.studentId||studentId))?.name);
 button.addEventListener('click',()=>handler(studentId,key+':'+studentId));
 actionTargets.set(key+':'+studentId,button);return button;
}
function restoreFocus(){(actionTargets.get(returnAction)||$('novo-contrato')).focus();}
async function mayDiscard(){return !window.demoDirty||await D.confirm('Descartar as alterações não salvas desta operação?',{title:'Descartar alterações',confirmLabel:'Descartar'});}
function clearErrors(){
 for(const id of fieldIds){$('erro-'+id).textContent='';$(id==='aluno'?'alunoBusca':id).removeAttribute('aria-invalid');}
 D.feedback(feedback,'');
}
async function openOperation(nextMode,id='',trigger='new'){
 if(!await mayDiscard())return false;
 mode=nextMode;selectedContract=nextMode==='new'?'':id;selectedStudent=nextMode==='new'?id:(state.contracts.find(c=>c.id===id)?.studentId||'');returnAction=trigger;
 $('painel-operacao').hidden=false;
 $('ajustes-contrato').open=false;
 loadStudent();D.feedback($('page-feedback'),'');
 $('operation-title').focus();$('painel-operacao').scrollIntoView({block:'start',behavior:'auto'});return true;
}
async function closeOperation(){
 if(saving||managing)return;
 if(!await mayDiscard())return;
 window.demoDirty=false;$('painel-operacao').hidden=true;
 try{await refresh();D.feedback($('page-feedback'),'');}catch(e){D.feedback($('page-feedback'),'Não foi possível atualizar a lista. '+e.message,true);}
 restoreFocus();
}
function effectiveDue(){
 const c=baseline?.contract;
 return c?.state==='Suspenso'&&$('statusContrato').value==='Ativo'?D.addDays(D.today(),c.suspendedDays||0):$('dataVencimento').value;
}
function values(){
 const due=mode==='payment'?baseline.contract.due:effectiveDue();
 return {studentId:selectedStudent,planId:selectedPlan,start:$('dataInicio').value,due,tolerance:Number($('tolerancia').value),state:$('statusContrato').value,
 method:$('pagamento').value,status:$('status').value==='Pago'?'Pago':due<D.today()?'Atrasado':'Pendente',paidDate:$('dataPagamento').value};
}
function review(){
 const student=state.students.find(s=>s.id===selectedStudent),list=$('resumo-operacao');
 list.replaceChildren();
 if(!student){$('review-hint').textContent='Selecione um aluno para conferir o contrato.';return;}
 const v=values(),c=baseline.contract,p=baseline.payment;
 const planoRenovacao=mode==='payment'&&v.status==='Pago'&&contractLabel(c)==='Vencido'?D.plans.find(plan=>plan.name.toLowerCase()===c.planName.toLowerCase()):null;
 $('review-hint').textContent=c?'Os itens destacados mostram o que será alterado. Nada é salvo até confirmar.':'Confira os dados. O contrato e a cobrança serão criados ao confirmar.';
 summaryItem(list,'Aluno',student.name+' • '+student.matricula);
 summaryItem(list,'Plano',c&&selectedPlan===c.planId?c.planName:D.plan(selectedPlan).name,c?.planName);
 summaryItem(list,'Valor',D.money(c&&selectedPlan===c.planId?c.amount:D.plan(selectedPlan).price),p?D.money(p.amount):undefined);
 summaryItem(list,'Início',D.formatDate(v.start),c?D.formatDate(c.start):undefined);
 summaryItem(list,'Vencimento',D.formatDate(planoRenovacao?D.addMonths(D.today(),planoRenovacao.months):v.due),c?D.formatDate(c.due):undefined);
 summaryItem(list,'Situação administrativa',planoRenovacao?'Vigente':v.state,c?.state);
 summaryItem(list,'Forma de pagamento',v.method,p?.method);
 summaryItem(list,'Pagamento',v.status,p?paymentLabel(c,p):undefined);
 summaryItem(list,'Recebimento',v.status==='Pago'?D.formatDate(v.paidDate):'—',p?D.formatDate(p.paidDate):undefined);
 if(mode!=='payment')summaryItem(list,'Tolerância',v.tolerance+' dia(s)',c?c.tolerance+' dia(s)':undefined);
}
function paymentField(){
 const paid=$('status').value==='Pago';$('paid-field').hidden=!paid;$('dataPagamento').disabled=!paid;$('dataPagamento').required=paid;
 if(paid&&!$('dataPagamento').value)$('dataPagamento').value=D.today();
 review();
}
function updatePlanDate(){
 if(D.date($('dataInicio').value))$('dataVencimento').value=D.addMonths($('dataInicio').value,D.plan(selectedPlan).months);
 if(baseline?.contract?.state==='Suspenso'&&$('statusContrato').value==='Ativo')$('dataVencimento').value=effectiveDue();
 $('dataVencimento').min=$('dataInicio').value;$('valor').textContent=D.money(D.plan(selectedPlan).price);
 $('date-hint').textContent='Vencimento atualizado pelo plano e início. Confira a data antes de salvar.';
 review();
}
function loadStudent(preserveSearch=false){
 const student=state.students.find(s=>s.id===selectedStudent),c=mode==='new'?null:currentContract(),p=c&&D.payment(state,c.id);
 baseline={contract:c||null,payment:p||null};
 const students=mode==='new'?state.students.filter(s=>D.isActiveStudent(s)):state.students.filter(s=>s.id===selectedStudent);
 if(!preserveSearch)financePicker.setStudent(mode==='new'?selectedStudent:'');
 $('student-fieldset').hidden=mode!=='new';
 $('contract-fields').hidden=mode==='payment'||!student;$('contract-fields').disabled=mode==='payment'||!student;
 $('payment-fields').hidden=!student;$('payment-fields').disabled=!student;
 $('student-context').hidden=!student;$('student-name').textContent=student?.name||'';$('student-id').textContent=student?'Matrícula '+student.matricula:'';
 $('badgeStatus').replaceChildren(badge(contractLabel(c)),badge(paymentLabel(c,p)));
 $('operation-kicker').textContent=mode==='new'?'Novo contrato':mode==='payment'?'Atualizar cobrança':'Editar registro';
 $('operation-title').textContent=mode==='new'?'Cadastrar contrato e pagamento':mode==='payment'?'Registrar pagamento':'Editar contrato e pagamento';
 $('payment-legend').textContent='Pagamento';
 $('contract-hint').textContent=mode==='payment'?'Ao marcar como Pago, contratos vencidos são renovados por um período do plano a partir de hoje. Contratos vigentes mantêm suas datas.':
 c?'Alterações no contrato e pagamento serão aplicadas ao salvar.':
 student?'Este aluno ainda não possui contrato. Preencha os dados e salve para contratar um plano.':
 students.length?'Selecione um aluno já cadastrado para contratar um plano.':'Cadastre um aluno ativo em Gestão de Cadastros antes de criar um contrato.';
 selectedPlan=c?.planId||'mensal';for(const[id,input]of planInputs)input.checked=id===selectedPlan;
 $('dataInicio').value=c?.start||D.today();$('dataVencimento').value=c?.due||D.addMonths(D.today(),1);
 $('dataVencimento').min=$('dataInicio').value;$('tolerancia').value=String(c?.tolerance??5);
 $('statusContrato').value=c?.state||'Ativo';$('pagamento').value=p?.method||'PIX';$('status').value=p?.status==='Pago'?'Pago':'Pendente';
 $('dataPagamento').value=p?.paidDate||D.today();$('dataPagamento').max=D.today();
 $('valor').textContent=D.money(c?c.amount:D.plan(selectedPlan).price);
 $('date-hint').textContent='Calculado pelo plano e início. Você pode ajustar o vencimento.';
 $('gestao-contrato').hidden=!c||c.state==='Cancelado';
 $('suspender').disabled=!c||c.state==='Cancelado';$('suspender').textContent=c?.state==='Suspenso'?'Reativar contrato':'Suspender contrato';
 $('salvar-financeiro').textContent=mode==='new'?'Cadastrar contrato e pagamento':mode==='payment'?'Salvar pagamento':'Salvar alterações';
 $('salvar-financeiro').disabled=!student;
 clearErrors();paymentField();window.demoDirty=false;
}
async function manageContract(id){
 if(saving||managing)return;
 if(!await mayDiscard())return;
 const c=state.contracts.find(item=>item.id===id),student=state.students.find(s=>s.id===c?.studentId);
 if(!c||c.state==='Cancelado')return;
 const reactivate=c.state==='Suspenso',days=reactivate?c.suspendedDays||0:Math.max(0,D.daysBetween(D.today(),c.due));
 const message=reactivate?'Reativar o contrato de '+student.name+' agora? Novo vencimento: '+D.formatDate(D.addDays(D.today(),days))+'. O pagamento será preservado.':
 'Suspender o contrato de '+student.name+' agora? Serão preservados '+days+' dia(s) e o pagamento atual.';
 if(!await D.confirm(message,{title:reactivate?'Reativar contrato':'Suspender contrato',confirmLabel:reactivate?'Reativar':'Suspender',danger:!reactivate}))return;
 managing=true;
 try{
  await send('PUT',api+'/financeiro/'+encodeURIComponent(id),{situacao:reactivate?'Ativo':'Suspenso',dataFim:reactivate?D.addDays(D.today(),days):c.due,diasSuspensos:reactivate?0:days});
  try{await refresh();}catch(e){D.feedback($('page-feedback'),'Alteração salva, mas não foi possível atualizar a lista. '+e.message,true);return;}
  if(!$('painel-operacao').hidden)loadStudent();else window.demoDirty=false;
  D.feedback($('page-feedback'),(reactivate?'Contrato reativado':'Contrato suspenso')+' — '+student.name+'. Pagamento preservado.');
  if($('painel-operacao').hidden)(actionTargets.get('manage:'+id)||$('novo-contrato')).focus();
 }catch(e){D.feedback($('page-feedback'),e.message,true);}
 finally{managing=false;}
}
function filterRows(state){
 const query=$('busca').value.trim(),contractFilter=$('filtro-contrato').value,paymentFilter=$('filtro-pagamento').value;
 const statusAluno=$('status-aluno').value;
 const from=$('vencimento-de').value,to=$('vencimento-ate').value;
 const invalid=(from&&!D.date(from))||(to&&!D.date(to))||(from&&to&&from>to);
 $('filtro-erro').textContent=invalid?'Informe um intervalo válido: a data final deve ser igual ou posterior à inicial.':'';
 $('vencimento-ate').setAttribute('aria-invalid',invalid?'true':'false');
 const active=[];
 if(query)active.push('Busca: '+$('busca').value.trim());
 if(contractFilter!=='todos')active.push('Contrato: '+contractFilter);
 if(paymentFilter!=='todos')active.push('Pagamento: '+(paymentFilter==='aberto'?'Em aberto':paymentFilter));
 if(statusAluno!=='ativos')active.push('Alunos: '+(statusAluno==='inativos'?'Inativos':'Todos'));
 if(from)active.push('De '+D.formatDate(from));if(to)active.push('Até '+D.formatDate(to));
 $('filtros-ativos').textContent=active.join(' · ');
 $('limpar-filtros').hidden=!active.length;
 $('filtrar-vigentes').setAttribute('aria-pressed',String(contractFilter==='Vigente'));
 $('filtrar-abertos').setAttribute('aria-pressed',String(paymentFilter==='aberto'));
 if(invalid)return [];
 return state.contracts.map(c=>({s:state.students.find(s=>s.id===c.studentId),c,p:D.payment(state,c.id)})).filter(row=>row.s).concat(state.students.filter(s=>!state.contracts.some(c=>c.studentId===s.id)).map(s=>({s,c:null,p:null})))
 .filter(({s,c,p})=>(statusAluno==='todos'||(statusAluno==='ativos'?D.isActiveStudent(s):!D.isActiveStudent(s)))&&(!query||D.studentMatches(s,query))&&
  (contractFilter==='todos'||contractLabel(c)===contractFilter)&&
  (paymentFilter==='todos'||(paymentFilter==='aberto'?p&&p.status!=='Pago':paymentLabel(c,p)===paymentFilter))&&
  (!from||(c&&c.due>=from))&&(!to||(c&&c.due<=to)))
 .sort((a,b)=>Boolean(b.c)-Boolean(a.c)||(a.c?(b.p?.updatedAt||'').localeCompare(a.p?.updatedAt||''):a.s.name.localeCompare(b.s.name,'pt-BR')));
}
function render(){
 const pending=state.payments.filter(p=>p.status!=='Pago'),rows=filterRows(state);
 const paginas=Math.max(1,Math.ceil(rows.length/POR_PAGINA));pagina=Math.min(pagina,paginas);
 $('financeiro-pagina').textContent='Página '+pagina+' de '+paginas;$('financeiro-anterior').disabled=pagina===1;$('financeiro-proxima').disabled=pagina===paginas;
 $('contratos-ativos').textContent=state.contracts.filter(c=>contractLabel(c)==='Vigente').length;
 $('pagamentos-pendentes').textContent=pending.length;$('receita-prevista').textContent=D.money(pending.reduce((sum,p)=>sum+p.amount,0));
 const body=$('tabelaDados');body.replaceChildren();actionTargets.clear();
 $('result-count').textContent=rows.length+' registro(s) · Contratos por alteração mais recente';
 if(!rows.length){D.empty(body,7,$('filtro-erro').textContent?'Corrija o intervalo de vencimento para consultar.':state.students.length?'Nenhum aluno encontrado. Ajuste a busca ou limpe os filtros.':'Nenhum aluno cadastrado. Comece em Gestão de Cadastros.');return;}
 for(const{s,c,p}of rows.slice((pagina-1)*POR_PAGINA,pagina*POR_PAGINA)){
  const row=el('tr',undefined,'record-row');row.setAttribute('data-student-id',s.id);
  const name=el('div');name.append(el('span',s.name,'record-name'),el('span','Matrícula '+s.matricula+(D.isActiveStudent(s)?'':' · Cadastro inativo'),'record-id'));
  rowCell(row,'Aluno',name);rowCell(row,'CPF',D.cpfText(s.cpf||'')||'—');rowCell(row,'Contrato',badge(contractLabel(c)));rowCell(row,'Pagamento',badge(paymentLabel(c,p)));
  rowCell(row,'Vencimento',D.formatDate(c?.due));rowCell(row,'Valor',p?D.money(p.amount):'—');
  const actions=el('div',undefined,'record-actions');
  if(c){
   const edit=action('Editar','edit',c.id,(id,key)=>openOperation('edit',id,key));edit.setAttribute('aria-label','Editar contrato e pagamento — '+s.name);actions.append(edit);
   if(p)actions.append(action('Registrar pagamento','payment',c.id,(id,key)=>openOperation('payment',id,key),'btn btn-small btn-primary'));
   if(c.state!=='Cancelado')actions.append(action(c.state==='Suspenso'?'Reativar':'Suspender','manage',c.id,manageContract));
  }else if(D.isActiveStudent(s))actions.append(action('Cadastrar contrato','new',s.id,(id,key)=>openOperation('new',id,key),'btn btn-small btn-primary'));
  const detail=el('tr',undefined,'record-detail');detail.id='detalhes-'+(c?.id||s.id);detail.hidden=!expanded.has(c?.id||s.id);
  const detailCell=D.cell(detail,'');detailCell.colSpan=7;const list=el('dl',undefined,'summary-grid');
  summaryItem(list,'Plano',c?c.planName:'Sem contrato');summaryItem(list,'Início',D.formatDate(c?.start));
  summaryItem(list,'Situação administrativa',c?.state||'—');summaryItem(list,'Forma de pagamento',p?.method||'—');
  summaryItem(list,'Quitação',D.formatDate(p?.paidDate));summaryItem(list,'Tolerância',c?c.tolerance+' dia(s)':'—');
  if(c?.state==='Suspenso')summaryItem(list,'Saldo preservado',(c.suspendedDays||0)+' dia(s)');
  detailCell.append(list);
  const more=action(detail.hidden?'Ver detalhes':'Ocultar detalhes','details',s.id,()=>{
   detail.hidden=!detail.hidden;detail.hidden?expanded.delete(c?.id||s.id):expanded.add(c?.id||s.id);
   more.textContent=detail.hidden?'Ver detalhes':'Ocultar detalhes';more.setAttribute('aria-expanded',String(!detail.hidden));
   more.setAttribute('aria-label',more.textContent+' — '+s.name);
  });
  more.setAttribute('aria-expanded',String(!detail.hidden));more.setAttribute('aria-controls',detail.id);actions.append(more);
  rowCell(row,'Ações',actions).classList.add('finance-actions-cell');body.append(row,detail);
 }
}
function validate(){
 clearErrors();const failures=[];
 const fail=(id,message)=>{failures.push(id);$('erro-'+id).textContent=message;$(id==='aluno'?'alunoBusca':id).setAttribute('aria-invalid','true');};
 if(!state.students.some(s=>s.id===selectedStudent))fail('aluno','Selecione um aluno cadastrado.');
 if(mode==='new'&&!state.students.some(s=>s.id===selectedStudent&&D.isActiveStudent(s)))fail('aluno','Selecione um aluno ativo.');
 if(mode!=='payment'){
  if(!D.date($('dataInicio').value))fail('dataInicio','Informe uma data de início válida.');
  if(!D.date(effectiveDue())||effectiveDue()<$('dataInicio').value)fail('dataVencimento','Informe um vencimento igual ou posterior ao início.');
  const tolerance=$('tolerancia').value;
  if(tolerance.trim()===''||!Number.isInteger(Number(tolerance))||Number(tolerance)<0||Number(tolerance)>30)fail('tolerancia','Informe um número inteiro de 0 a 30 dias.');
  if(!['Ativo','Suspenso','Cancelado'].includes($('statusContrato').value))fail('statusContrato','Selecione uma situação válida.');
 }
 if(!['PIX','Cartão','Dinheiro','Boleto'].includes($('pagamento').value))fail('pagamento','Selecione a forma de pagamento.');
 if(!['Pago','Pendente'].includes($('status').value))fail('status','Informe se o pagamento foi recebido.');
 if($('status').value==='Pago'&&(!D.date($('dataPagamento').value)||$('dataPagamento').value>D.today()))fail('dataPagamento','Informe uma data de recebimento válida, até hoje.');
 if(failures.length){
  if(failures.some(id=>['tolerancia','statusContrato'].includes(id)))$('ajustes-contrato').open=true;
  D.feedback(feedback,'Confira os campos indicados antes de salvar.',true);$(failures[0]==='aluno'?'alunoBusca':failures[0]).focus();return false;
 }
 return true;
}
for(const plan of D.plans){
 const wrapper=el('div',undefined,'plan-option'),input=el('input'),label=el('label');
 input.type='radio';input.name='plano';input.id='plano-'+plan.id;input.value=plan.id;input.required=true;label.setAttribute('for',input.id);
 label.append(el('strong',plan.name),el('span',D.money(plan.price),'plan-price'),el('span',plan.months===1?'1 mês':plan.months+' meses','plan-duration'));
 input.addEventListener('change',()=>{if(!input.checked)return;selectedPlan=plan.id;window.demoDirty=true;updatePlanDate();});
 wrapper.append(input,label);$('plan-options').append(wrapper);planInputs.set(plan.id,input);
}
$('novo-contrato').addEventListener('click',async()=>{await openOperation('new');});
$('fechar-operacao').addEventListener('click',closeOperation);
$('descartar-alteracoes').addEventListener('click',async()=>{if(await mayDiscard())loadStudent();});
$('dataInicio').addEventListener('change',updatePlanDate);
$('status').addEventListener('change',paymentField);
$('statusContrato').addEventListener('change',()=>{
 if(baseline?.contract?.state==='Suspenso'&&$('statusContrato').value==='Ativo'){
  $('dataVencimento').value=effectiveDue();$('date-hint').textContent='Reativação: vencimento calculado pelo saldo de dias preservado.';
 }
 review();
});
for(const id of fieldIds.filter(id=>id!=='aluno'))for(const event of ['input','change'])$(id).addEventListener(event,()=>{
 $('erro-'+id).textContent='';$(id).removeAttribute('aria-invalid');review();
});
$('suspender').addEventListener('click',()=>manageContract(selectedContract));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(saving||managing||!validate())return;
 saving=true;$('salvar-financeiro').disabled=true;
 try{
  const v=values(),name=state.students.find(s=>s.id===selectedStudent).name,wasNew=mode==='new';
  const body=mode==='payment'?{formaPagamento:v.method,statusPagamento:v.status,dataPagamento:v.status==='Pago'?v.paidDate:null}:payload(v);
  if(mode!=='payment'&&baseline?.contract?.state!=='Suspenso'&&v.state==='Suspenso')body.diasSuspensos=Math.max(0,D.daysBetween(D.today(),v.due));
  if(mode!=='payment'&&baseline?.contract?.state==='Suspenso'&&v.state==='Ativo')body.diasSuspensos=0;
  const saved=await send(wasNew?'POST':'PUT',api+'/financeiro'+(wasNew?'':'/'+encodeURIComponent(selectedContract)),body);
  selectedContract=saved.id;if(wasNew)mode='edit';window.demoDirty=false;
  try{await refresh();loadStudent();}catch(e){D.feedback(feedback,'Dados salvos, mas não foi possível atualizar a lista. '+e.message,true);return;}
  D.feedback(feedback,(mode==='payment'?'Pagamento salvo':wasNew?'Contrato e pagamento cadastrados':'Alterações salvas')+' — '+name+'.');
 }catch(e){D.feedback(feedback,e.message,true);}
 finally{saving=false;$('salvar-financeiro').disabled=false;}
});
function clearFilters(){
 $('busca').value='';$('filtro-contrato').value='todos';$('filtro-pagamento').value='todos';$('vencimento-de').value='';$('vencimento-ate').value='';
}
$('limpar-filtros').addEventListener('click',()=>{clearFilters();$('status-aluno').value='ativos';pagina=1;render();$('busca').focus();});
$('filtrar-vigentes').addEventListener('click',()=>{clearFilters();$('filtro-contrato').value='Vigente';pagina=1;render();});
$('filtrar-abertos').addEventListener('click',()=>{clearFilters();$('filtro-pagamento').value='aberto';pagina=1;render();});
for(const id of ['busca','status-aluno','filtro-contrato','filtro-pagamento','vencimento-de','vencimento-ate'])$(id).addEventListener(id==='busca'?'input':'change',()=>{pagina=1;render();});
$('financeiro-anterior').addEventListener('click',()=>{if(pagina>1){pagina--;render();}});
$('financeiro-proxima').addEventListener('click',()=>{if(!$('financeiro-proxima').disabled){pagina++;render();}});
loadStudent();render();refresh().catch(e=>D.feedback($('page-feedback'),e.message,true));
})();
