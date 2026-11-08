(function(){
'use strict';const D=Demo,$=id=>document.getElementById(id),form=$('liberacaoForm'),feedback=$('feedback');
D.initPage();D.watchForm(form);$('usuario').value=D.actor();
const picker=D.createStudentPicker({input:$('alunoBusca'),results:$('alunoResultados'),value:$('aluno')});
function clock(){$('dataHora').value=new Date().toLocaleString('pt-BR');}
function count(){$('contador').textContent=$('justificativa').value.length+' / 250';}
function typeInfo(){$('acesso-info').textContent=$('acesso').value==='restrita'?'A autorização de área restrita fica registrada neste histórico. Ela não altera o acesso de entrada pela catraca.':'A autorização de entrada permite um único acesso dentro do prazo selecionado. Após a leitura da matrícula, ela será marcada como utilizada.';}
const types={entrada:'Entrada',temporaria:'Temporário',restrita:'Área restrita'};
function dataLocal(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function render(){
 const state=D.getState(),body=$('historico-liberacoes'),query=$('filtroAluno').value,from=$('filtroInicio').value,to=$('filtroFim').value,status=$('filtroSituacao').value;
 const invalid=(from&&!D.date(from))||(to&&!D.date(to))||(from&&to&&from>to);
 D.feedback($('filtro-periodo-feedback'),invalid?'Informe um período válido: a data inicial deve ser anterior ou igual à data final.':'',Boolean(invalid));
 const rows=invalid?[]:state.authorizations.filter(a=>{const student=state.students.find(s=>s.id===a.studentId),day=dataLocal(a.createdAt);return (!query||(student&&D.studentMatches(student,query)))&&(!from||day>=from)&&(!to||day<=to)&&(status==='todas'||(status==='utilizada'?Boolean(a.usedAt):!a.usedAt));});
 body.replaceChildren();if(!rows.length){D.empty(body,7,invalid?'Corrija o período para visualizar as liberações.':query||from||to||status!=='todas'?'Nenhuma liberação encontrada para os filtros.':'Nenhuma liberação registrada.');return;}
 rows.slice(0,10).forEach(a=>{const row=document.createElement('tr'),s=state.students.find(s=>s.id===a.studentId),expired=new Date(a.expiresAt).getTime()<=Date.now(),label=a.usedAt?'Utilizada':expired?'Expirada':'Pendente',tone=a.usedAt?'ok':expired?'danger':'warn';[s?.name||'Aluno não encontrado',types[a.type],a.actor,D.formatTime(a.createdAt),D.formatTime(a.expiresAt),a.reason].forEach(value=>D.cell(row,value));D.cell(row,D.badge(label,tone));body.append(row);});
}
$('justificativa').addEventListener('input',count);$('acesso').addEventListener('change',typeInfo);$('filtroAluno').addEventListener('input',render);for(const id of ['filtroInicio','filtroFim','filtroSituacao'])for(const event of ['input','change'])$(id).addEventListener(event,render);
form.addEventListener('reset',()=>setTimeout(()=>{picker.clear();count();clock();typeInfo();$('usuario').value=D.actor();D.feedback(feedback,'');window.demoDirty=false;},0));
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;try{const authorization=D.authorize({studentId:$('aluno').value,type:$('acesso').value,minutes:Number($('validade').value),reason:$('justificativa').value.trim()});render();form.reset();setTimeout(()=>{D.feedback(feedback,'Autorização registrada. Válida até '+D.formatTime(authorization.expiresAt)+'.');window.demoDirty=false;},0);}catch(e){D.feedback(feedback,e.message,true);}});
clock();count();typeInfo();render();setInterval(()=>{clock();render();},30000);
})();
