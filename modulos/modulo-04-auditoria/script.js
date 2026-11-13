(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('liberacaoForm'),feedback=$('feedback'),API='http://localhost:3333/api';
let students=[],records=[],saving=false;
D.initPage({bootstrap:false});D.watchForm(form);
const responsavel='Administração (login simulado)';$('usuario').value=responsavel;
// Mantém o histórico anterior visível, sem gravar novas autorizações no navegador.
const oldState=D.getState(),legacy=oldState.authorizations.map(a=>{const s=oldState.students.find(s=>s.id===a.studentId);return {id:a.id,tipoPessoa:'Aluno',nome:s?.name||'Aluno não encontrado',cpf:s?.cpf||'',matricula:s?.matricula||s?.id,alunoId:a.studentId,tipoAcesso:a.type,responsavel:a.actor,criadoEm:a.createdAt,expiraEm:a.expiresAt,utilizadaEm:a.usedAt,justificativa:a.reason,legado:true};});
$('historico-legado').hidden=!legacy.length;
const picker=D.createStudentPicker({input:$('alunoBusca'),results:$('alunoResultados'),value:$('aluno'),getStudents:()=>students.filter(D.isActiveStudent)});
async function request(path,options={}){
 let response;try{response=await fetch(API+path,{cache:'no-store',...options});}catch{throw new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.');}
 let data;try{data=await response.json();}catch{throw new Error('A API retornou uma resposta inválida.');}
 if(!response.ok)throw new Error(data?.erro||'Não foi possível concluir a operação.');return data;
}
async function load(){
 try{const [alunos,liberacoes]=await Promise.all([request('/alunos'),request('/liberacoes')]);if(!Array.isArray(alunos)||!Array.isArray(liberacoes))throw new Error('A API retornou uma lista inválida.');students=alunos.map(a=>({id:a.id,name:a.nome,cpf:a.cpf,matricula:a.matricula,active:a.ativo}));records=[...new Map([...liberacoes,...records].map(a=>[a.id,a])).values()];render();D.feedback($('historico-feedback'),'');}
 catch(e){D.feedback($('historico-feedback'),e.message,true);}
}
function clock(){$('dataHora').value=new Date().toLocaleString('pt-BR');}
function count(){$('contador').textContent=$('justificativa').value.length+' / 250';}
function typeInfo(){$('acesso-info').textContent=($('tipoPessoa').value==='Outra pessoa'?'Nome e CPF identificam a pessoa nesta autorização, sem criar um cadastro de aluno. ':'')+'A autorização fica registrada para conferência manual. Nesta etapa, ela não altera a validação por matrícula da Portaria.';}
function personMode(){const aluno=$('tipoPessoa').value==='Aluno';$('campoAluno').hidden=!aluno;$('alunoBusca').disabled=!aluno;$('alunoBusca').required=aluno;$('alunoBusca').setCustomValidity('');for(const [group,input]of [['campoNomePessoa','nomePessoa'],['campoCpfPessoa','cpfPessoa']]){$(group).hidden=aluno;$(input).disabled=aluno;$(input).required=!aluno;$(input).setCustomValidity('');}if(!aluno)picker.clear();typeInfo();}
function validatePerson(){if($('tipoPessoa').value==='Aluno')return;$('nomePessoa').setCustomValidity($('nomePessoa').value.trim().length>=3?'':'Informe o nome completo.');$('cpfPessoa').setCustomValidity(D.validCpf($('cpfPessoa').value)?'':'Informe um CPF válido.');}
const types={entrada:'Entrada',temporaria:'Temporário',restrita:'Área restrita'};
function dataLocal(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function render(){
 const body=$('historico-liberacoes'),query=$('filtroAluno').value,from=$('filtroInicio').value,to=$('filtroFim').value,status=$('filtroSituacao').value;
 const invalid=(from&&!D.date(from))||(to&&!D.date(to))||(from&&to&&from>to);
 D.feedback($('filtro-periodo-feedback'),invalid?'Informe um período válido: a data inicial deve ser anterior ou igual à data final.':'',Boolean(invalid));
 const rows=invalid?[]:[...records,...legacy].filter(a=>{const day=dataLocal(a.criadoEm);return (!query||D.studentMatches({name:a.nome,cpf:a.cpf,matricula:a.matricula||''},query))&&(!from||day>=from)&&(!to||day<=to)&&(status==='todas'||(status==='utilizada'?Boolean(a.utilizadaEm):!a.utilizadaEm));}).sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm));
 body.replaceChildren();if(!rows.length){D.empty(body,8,invalid?'Corrija o período para visualizar as liberações.':query||from||to||status!=='todas'?'Nenhuma liberação encontrada para os filtros.':'Nenhuma liberação registrada.');return;}
 rows.slice(0,10).forEach(a=>{const row=document.createElement('tr'),expired=new Date(a.expiraEm).getTime()<=Date.now(),label=a.utilizadaEm?'Utilizada':expired?'Expirada':'Pendente',tone=a.utilizadaEm?'ok':expired?'danger':'warn';const identity=document.createElement('div'),name=document.createElement('span'),kind=document.createElement('span');name.className='list-name';name.textContent=a.nome;kind.className='list-detail';kind.textContent=a.tipoPessoa+(a.legado?' · Registro anterior neste navegador':'');identity.append(name,kind);[identity,D.cpfText(a.cpf)||'—',types[a.tipoAcesso],a.responsavel,D.formatTime(a.criadoEm),D.formatTime(a.expiraEm),a.justificativa].forEach(value=>D.cell(row,value));D.cell(row,D.badge(label,tone));body.append(row);});
}
$('tipoPessoa').addEventListener('change',personMode);$('nomePessoa').addEventListener('input',validatePerson);$('cpfPessoa').addEventListener('input',()=>{const v=D.digits($('cpfPessoa').value).slice(0,11);$('cpfPessoa').value=v.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3}\.\d{3})(\d)/,'$1.$2').replace(/(\d{3}\.\d{3}\.\d{3})(\d)/,'$1-$2');validatePerson();});
$('justificativa').addEventListener('input',count);$('acesso').addEventListener('change',typeInfo);$('filtroAluno').addEventListener('input',render);for(const id of ['filtroInicio','filtroFim','filtroSituacao'])for(const event of ['input','change'])$(id).addEventListener(event,render);
form.addEventListener('reset',()=>setTimeout(()=>{picker.clear();personMode();count();clock();$('usuario').value=responsavel;D.feedback(feedback,'');window.demoDirty=false;},0));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(saving)return;validatePerson();if(!form.reportValidity())return;
 const tipoPessoa=$('tipoPessoa').value;
 if(tipoPessoa==='Aluno'&&!students.some(s=>s.id===$('aluno').value&&D.isActiveStudent(s))){D.feedback(feedback,'Selecione um aluno ativo.',true);return;}
 if(tipoPessoa==='Outra pessoa'&&($('nomePessoa').validationMessage||$('cpfPessoa').validationMessage)){D.feedback(feedback,$('nomePessoa').validationMessage||$('cpfPessoa').validationMessage,true);return;}
 const dados={tipoPessoa,tipoAcesso:$('acesso').value,minutos:Number($('validade').value),justificativa:$('justificativa').value.trim(),...(tipoPessoa==='Aluno'?{alunoId:$('aluno').value}:{nome:$('nomePessoa').value.trim(),cpf:D.digits($('cpfPessoa').value)})};
 saving=true;$('salvarLiberacao').disabled=true;
 try{const saved=await request('/liberacoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});records.unshift(saved);render();form.reset();setTimeout(()=>{D.feedback(feedback,'Autorização registrada. Válida até '+D.formatTime(saved.expiraEm)+'.');window.demoDirty=false;},0);}
 catch(e){D.feedback(feedback,e.message,true);}
 finally{saving=false;$('salvarLiberacao').disabled=false;}
});
personMode();clock();count();render();load();setInterval(()=>{clock();render();},30000);
})();
