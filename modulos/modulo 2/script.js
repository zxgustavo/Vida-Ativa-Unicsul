(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formFinanceiro'),feedback=$('feedback');
const fieldIds=['aluno','dataInicio','dataVencimento','tolerancia','statusContrato','pagamento','status','dataPagamento'];
const expanded=new Set(),actionTargets=new Map(),planInputs=new Map();
let selectedStudent='',selectedPlan='mensal',mode='new',baseline=null,returnAction='new',saving=false;
D.initPage();D.watchForm(form,['aluno']);
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function normalize(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
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
 button.setAttribute('aria-label',text+' — '+D.getState().students.find(s=>s.id===studentId)?.name);
 button.addEventListener('click',()=>handler(studentId,key+':'+studentId));
 actionTargets.set(key+':'+studentId,button);return button;
}
function restoreFocus(){(actionTargets.get(returnAction)||$('novo-contrato')).focus();}
function mayDiscard(){return !window.demoDirty||confirm('Descartar as alterações não salvas desta operação?');}
function clearErrors(){
 for(const id of fieldIds){$('erro-'+id).textContent='';$(id).removeAttribute('aria-invalid');}
 D.feedback(feedback,'');
}
function openOperation(nextMode,id='',trigger='new'){
 if(!mayDiscard())return false;
 mode=nextMode;selectedStudent=id;returnAction=trigger;
 $('painel-operacao').hidden=false;
 $('ajustes-contrato').open=false;
 loadStudent();D.feedback($('page-feedback'),'');
 $('operation-title').focus();$('painel-operacao').scrollIntoView({block:'start',behavior:'auto'});return true;
}
function closeOperation(){
 if(!mayDiscard())return;
 window.demoDirty=false;$('painel-operacao').hidden=true;restoreFocus();
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
 const state=D.getState(),student=state.students.find(s=>s.id===selectedStudent),list=$('resumo-operacao');
 list.replaceChildren();
 if(!student){$('review-hint').textContent='Selecione um aluno para conferir o contrato.';return;}
 const v=values(),c=baseline.contract,p=baseline.payment;
 $('review-hint').textContent=c?'Os itens destacados mostram o que será alterado. Nada é salvo até confirmar.':'Confira os dados. O contrato e a cobrança serão criados ao confirmar.';
 summaryItem(list,'Aluno',student.name+' • '+student.id);
 summaryItem(list,'Plano',D.plan(selectedPlan).name,c?D.plan(c.planId).name:undefined);
 summaryItem(list,'Valor',D.money(mode==='payment'?p.amount:D.plan(selectedPlan).price),p?D.money(p.amount):undefined);
 summaryItem(list,'Início',D.formatDate(v.start),c?D.formatDate(c.start):undefined);
 summaryItem(list,'Vencimento',D.formatDate(v.due),c?D.formatDate(c.due):undefined);
 summaryItem(list,'Situação administrativa',v.state,c?.state);
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
function loadStudent(){
 const state=D.getState(),student=state.students.find(s=>s.id===selectedStudent),c=D.contract(state,selectedStudent),p=c&&D.payment(state,c.id);
 baseline={contract:c||null,payment:p||null};
 const students=mode==='new'?state.students.filter(s=>!D.contract(state,s.id)):state.students.filter(s=>s.id===selectedStudent);
 D.populateStudents($('aluno'),{students},'Selecione um aluno sem contrato');$('aluno').value=selectedStudent;
 $('student-fieldset').hidden=mode!=='new';$('aluno').disabled=mode!=='new';
 $('contract-fields').hidden=mode==='payment'||!student;$('contract-fields').disabled=mode==='payment'||!student;
 $('payment-fields').hidden=!student;$('payment-fields').disabled=!student;
 $('student-context').hidden=!student;$('student-name').textContent=student?.name||'';$('student-id').textContent=student?'Matrícula '+student.id:'';
 $('badgeStatus').replaceChildren(badge(contractLabel(c)),badge(paymentLabel(c,p)));
 $('operation-kicker').textContent=mode==='new'?'Novo contrato':mode==='payment'?'Atualizar cobrança':'Editar registro';
 $('operation-title').textContent=mode==='new'?'Cadastrar contrato e pagamento':mode==='payment'?'Registrar pagamento':'Editar contrato e pagamento';
 $('payment-legend').textContent='Pagamento';
 $('contract-hint').textContent=mode==='payment'?'Esta operação altera somente o pagamento. Plano, valor e datas do contrato são preservados.':
 c?'Alterações no contrato e pagamento serão aplicadas ao salvar.':
 student?'Este aluno ainda não possui contrato. Preencha os dados e salve para contratar um plano.':
 students.length?'Selecione um aluno já cadastrado para contratar um plano.':'Todos os alunos cadastrados já possuem contrato. Novos alunos são cadastrados em Gestão de Cadastros.';
 selectedPlan=c?.planId||'mensal';for(const[id,input]of planInputs)input.checked=id===selectedPlan;
 $('dataInicio').value=c?.start||D.today();$('dataVencimento').value=c?.due||D.addMonths(D.today(),1);
 $('dataVencimento').min=$('dataInicio').value;$('tolerancia').value=String(c?.tolerance??5);
 $('statusContrato').value=c?.state||'Ativo';$('pagamento').value=p?.method||'PIX';$('status').value=p?.status==='Pago'?'Pago':'Pendente';
 $('dataPagamento').value=p?.paidDate||D.today();$('dataPagamento').max=D.today();
 $('valor').textContent=D.money(mode==='payment'?p.amount:D.plan(selectedPlan).price);
 $('date-hint').textContent='Calculado pelo plano e início. Você pode ajustar o vencimento.';
 $('gestao-contrato').hidden=!c||c.state==='Cancelado';
 $('suspender').disabled=!c||c.state==='Cancelado';$('suspender').textContent=c?.state==='Suspenso'?'Reativar contrato':'Suspender contrato';
 $('salvar-financeiro').textContent=mode==='new'?'Cadastrar contrato e pagamento':mode==='payment'?'Salvar pagamento':'Salvar alterações';
 $('salvar-financeiro').disabled=!student;
 clearErrors();paymentField();window.demoDirty=false;
}
function manageContract(id){
 if(!mayDiscard())return;
 const state=D.getState(),c=D.contract(state,id),student=state.students.find(s=>s.id===id);
 if(!c||c.state==='Cancelado')return;
 const reactivate=c.state==='Suspenso',days=reactivate?c.suspendedDays||0:Math.max(0,D.daysBetween(D.today(),c.due));
 const message=reactivate?'Reativar o contrato de '+student.name+' agora? Novo vencimento: '+D.formatDate(D.addDays(D.today(),days))+'. O pagamento será preservado.':
 'Suspender o contrato de '+student.name+' agora? Serão preservados '+days+' dia(s) e o pagamento atual.';
 if(!confirm(message))return;
 try{
  D.changeStatus(id,reactivate?'Ativo':'Suspenso');
  if(!$('painel-operacao').hidden)loadStudent();else window.demoDirty=false;
  render();
  D.feedback($('page-feedback'),(reactivate?'Contrato reativado':'Contrato suspenso')+' — '+student.name+'. Pagamento preservado.');
  if($('painel-operacao').hidden)(actionTargets.get('manage:'+id)||$('novo-contrato')).focus();
 }catch(e){D.feedback($('page-feedback'),e.message,true);}
}
function filterRows(state){
 const query=normalize($('busca').value),contractFilter=$('filtro-contrato').value,paymentFilter=$('filtro-pagamento').value;
 const from=$('vencimento-de').value,to=$('vencimento-ate').value;
 const invalid=(from&&!D.date(from))||(to&&!D.date(to))||(from&&to&&from>to);
 $('filtro-erro').textContent=invalid?'Informe um intervalo válido: a data final deve ser igual ou posterior à inicial.':'';
 $('vencimento-ate').setAttribute('aria-invalid',invalid?'true':'false');
 const active=[];
 if(query)active.push('Busca: '+$('busca').value.trim());
 if(contractFilter!=='todos')active.push('Contrato: '+contractFilter);
 if(paymentFilter!=='todos')active.push('Pagamento: '+(paymentFilter==='aberto'?'Em aberto':paymentFilter));
 if(from)active.push('De '+D.formatDate(from));if(to)active.push('Até '+D.formatDate(to));
 $('filtros-ativos').textContent=active.length?active.join(' · '):'Todos os registros';
 $('limpar-filtros').hidden=!active.length;
 $('filtrar-vigentes').setAttribute('aria-pressed',String(contractFilter==='Vigente'));
 $('filtrar-abertos').setAttribute('aria-pressed',String(paymentFilter==='aberto'));
 if(invalid)return [];
 return state.students.map(s=>{const c=D.contract(state,s.id),p=c&&D.payment(state,c.id);return{s,c,p};})
 .filter(({s,c,p})=>(!query||normalize(s.name).includes(query)||s.id.includes(query))&&
  (contractFilter==='todos'||contractLabel(c)===contractFilter)&&
  (paymentFilter==='todos'||(paymentFilter==='aberto'?p&&p.status!=='Pago':paymentLabel(c,p)===paymentFilter))&&
  (!from||(c&&c.due>=from))&&(!to||(c&&c.due<=to)))
 .sort((a,b)=>Boolean(b.c)-Boolean(a.c)||(a.c?(b.p?.updatedAt||'').localeCompare(a.p?.updatedAt||''):a.s.name.localeCompare(b.s.name,'pt-BR')));
}
function render(){
 const state=D.getState(),pending=state.payments.filter(p=>p.status!=='Pago'),rows=filterRows(state);
 $('contratos-ativos').textContent=state.contracts.filter(c=>contractLabel(c)==='Vigente').length;
 $('pagamentos-pendentes').textContent=pending.length;$('receita-prevista').textContent=D.money(pending.reduce((sum,p)=>sum+p.amount,0));
 const body=$('tabelaDados');body.replaceChildren();actionTargets.clear();
 $('result-count').textContent=rows.length+' de '+state.students.length+' aluno(s) · Contratos por alteração mais recente';
 if(!rows.length){D.empty(body,6,$('filtro-erro').textContent?'Corrija o intervalo de vencimento para consultar.':state.students.length?'Nenhum aluno encontrado. Ajuste a busca ou limpe os filtros.':'Nenhum aluno cadastrado. Comece em Gestão de Cadastros.');return;}
 for(const{s,c,p}of rows){
  const row=el('tr',undefined,'record-row');row.setAttribute('data-student-id',s.id);
  const name=el('div');name.append(el('span',s.name,'record-name'),el('span','Matrícula '+s.id,'record-id'));
  rowCell(row,'Aluno',name);rowCell(row,'Contrato',badge(contractLabel(c)));rowCell(row,'Pagamento',badge(paymentLabel(c,p)));
  rowCell(row,'Vencimento',D.formatDate(c?.due));rowCell(row,'Valor',p?D.money(p.amount):'—');
  const actions=el('div',undefined,'record-actions');
  if(c){
   const edit=action('Editar','edit',s.id,(id,key)=>openOperation('edit',id,key));edit.setAttribute('aria-label','Editar contrato e pagamento — '+s.name);actions.append(edit);
   if(p)actions.append(action('Registrar pagamento','payment',s.id,(id,key)=>openOperation('payment',id,key),'btn btn-small btn-primary'));
   if(c.state!=='Cancelado')actions.append(action(c.state==='Suspenso'?'Reativar':'Suspender','manage',s.id,manageContract));
  }else actions.append(action('Cadastrar contrato','new',s.id,(id,key)=>openOperation('new',id,key),'btn btn-small btn-primary'));
  const detail=el('tr',undefined,'record-detail');detail.id='detalhes-'+s.id;detail.hidden=!expanded.has(s.id);
  const detailCell=D.cell(detail,'');detailCell.colSpan=6;const list=el('dl',undefined,'summary-grid');
  summaryItem(list,'Plano',c?D.plan(c.planId).name:'Sem contrato');summaryItem(list,'Início',D.formatDate(c?.start));
  summaryItem(list,'Situação administrativa',c?.state||'—');summaryItem(list,'Forma de pagamento',p?.method||'—');
  summaryItem(list,'Quitação',D.formatDate(p?.paidDate));summaryItem(list,'Tolerância',c?c.tolerance+' dia(s)':'—');
  if(c?.state==='Suspenso')summaryItem(list,'Saldo preservado',(c.suspendedDays||0)+' dia(s)');
  detailCell.append(list);
  const more=action(detail.hidden?'Ver detalhes':'Ocultar detalhes','details',s.id,()=>{
   detail.hidden=!detail.hidden;detail.hidden?expanded.delete(s.id):expanded.add(s.id);
   more.textContent=detail.hidden?'Ver detalhes':'Ocultar detalhes';more.setAttribute('aria-expanded',String(!detail.hidden));
   more.setAttribute('aria-label',more.textContent+' — '+s.name);
  });
  more.setAttribute('aria-expanded',String(!detail.hidden));more.setAttribute('aria-controls',detail.id);actions.append(more);
  rowCell(row,'Ações',actions);body.append(row,detail);
 }
}
function validate(){
 clearErrors();const failures=[];
 const fail=(id,message)=>{failures.push(id);$('erro-'+id).textContent=message;$(id).setAttribute('aria-invalid','true');};
 const state=D.getState();
 if(!state.students.some(s=>s.id===selectedStudent))fail('aluno','Selecione um aluno cadastrado.');
 if(mode==='new'&&D.contract(state,selectedStudent))fail('aluno','Este aluno já possui contrato. Abra a edição na lista.');
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
  D.feedback(feedback,'Confira os campos indicados antes de salvar.',true);$(failures[0]).focus();return false;
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
$('novo-contrato').addEventListener('click',()=>openOperation('new'));
$('fechar-operacao').addEventListener('click',closeOperation);
$('descartar-alteracoes').addEventListener('click',()=>{if(mayDiscard())loadStudent();});
$('aluno').addEventListener('change',()=>{
 const next=$('aluno').value;if(!mayDiscard()){$('aluno').value=selectedStudent;return;}
 selectedStudent=next;mode=D.contract(D.getState(),next)?'edit':'new';loadStudent();
});
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
$('suspender').addEventListener('click',()=>manageContract(selectedStudent));
form.addEventListener('submit',event=>{
 event.preventDefault();if(saving||!validate())return;
 saving=true;$('salvar-financeiro').disabled=true;
 try{
  const v=values(),name=D.getState().students.find(s=>s.id===selectedStudent).name,wasNew=mode==='new';
  if(mode==='payment')D.savePayment({studentId:v.studentId,method:v.method,status:v.status,paidDate:v.paidDate});else D.saveFinance(v);
  if(wasNew)mode='edit';loadStudent();render();
  D.feedback(feedback,(mode==='payment'?'Pagamento salvo':wasNew?'Contrato e pagamento cadastrados':'Alterações salvas')+' — '+name+'.');
 }catch(e){D.feedback(feedback,e.message,true);}
 finally{saving=false;$('salvar-financeiro').disabled=false;}
});
function clearFilters(){
 $('busca').value='';$('filtro-contrato').value='todos';$('filtro-pagamento').value='todos';$('vencimento-de').value='';$('vencimento-ate').value='';
}
$('limpar-filtros').addEventListener('click',()=>{clearFilters();render();$('busca').focus();});
$('filtrar-vigentes').addEventListener('click',()=>{clearFilters();$('filtro-contrato').value='Vigente';render();});
$('filtrar-abertos').addEventListener('click',()=>{clearFilters();$('filtro-pagamento').value='aberto';render();});
for(const id of ['busca','filtro-contrato','filtro-pagamento','vencimento-de','vencimento-ate'])$(id).addEventListener(id==='busca'?'input':'change',render);
window.addEventListener?.('beforeunload',event=>{if(window.demoDirty){event.preventDefault();event.returnValue='';}});
loadStudent();render();
})();
