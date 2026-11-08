(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formAvaliacao'),feedback=$('feedback');
const API='http://localhost:3333/api';
let students=[],evaluations=[],rangeSubmitted=false,saving=false,pagina=1;
const POR_PAGINA=10;
const tonsObjetivo=new Map([['Emagrecimento','warn'],['Ganho de massa muscular','ok'],['Condicionamento físico','info']]);
D.initPage({bootstrap:false});D.watchForm(form);$('data').max=D.today();$('data').value=D.today();$('data').defaultValue=D.today();
async function request(path,options={}){
 let response;try{response=await fetch(API+path,options);}catch{throw new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.');}
 let data;try{data=await response.json();}catch{data=null;}
 if(!response.ok)throw new Error(typeof data?.erro==='string'?data.erro:'Não foi possível concluir a operação (HTTP '+response.status+').');
 return data;
}
async function load(){
 try{
  const [alunos,avaliacoes]=await Promise.all([request('/alunos'),request('/avaliacoes')]);
  if(!Array.isArray(alunos)||!Array.isArray(avaliacoes))throw new Error('A API retornou uma lista inválida.');
  students=alunos.map(a=>({id:a.id,matricula:a.matricula,name:a.nome,cpf:a.cpf,birth:a.dataNascimento,active:a.ativo}));evaluations=avaliacoes;render();D.feedback($('historico-feedback'),'');
 }catch(e){D.feedback($('historico-feedback'),e.message,true);}
}
const picker=D.createStudentPicker({input:$('alunoBusca'),results:$('alunoResultados'),value:$('aluno'),getStudents:()=>students.filter(D.isActiveStudent),
 onSelect:student=>{$('matricula').value=student.matricula;$('filtroAluno').value=student.matricula;pagina=1;if(student.birth)$('data').setAttribute('min',student.birth);else $('data').removeAttribute('min');validateRanges();render();},
 onClear:()=>{$('matricula').value='';$('filtroAluno').value='';pagina=1;$('data').removeAttribute('min');validateRanges();render();}
});
function validateRanges(){
 const student=students.find(s=>s.id===$('aluno').value),dateValue=$('data').value,weightValue=$('peso').value,heightValue=$('altura').value,fatValue=$('gordura').value,errors=[];
 const set=(field,invalid,message)=>{field.setCustomValidity(invalid?message:'');if(invalid)errors.push({field,message});};
 set($('data'),Boolean(dateValue)&&(!D.date(dateValue)||dateValue>D.today()||(student?.birth&&dateValue<student.birth)),'A data deve ser válida, não futura e igual ou posterior ao nascimento do aluno.');
 set($('peso'),Boolean(weightValue)&&(!Number.isFinite(Number(weightValue))||Number(weightValue)<20||Number(weightValue)>350),'O peso deve estar entre 20 e 350 kg.');
 set($('altura'),Boolean(heightValue)&&(!Number.isFinite(Number(heightValue))||Number(heightValue)<50||Number(heightValue)>250),'A altura deve estar entre 50 e 250 cm.');
 set($('gordura'),Boolean(fatValue)&&(!Number.isFinite(Number(fatValue))||Number(fatValue)<2||Number(fatValue)>70),'A gordura corporal deve estar entre 2% e 70%.');
 return errors[0]||null;
}
for(const id of ['data','peso','altura','gordura'])for(const event of ['input','change'])$(id).addEventListener(event,()=>{const error=validateRanges();if(id==='data')nextDate();if(rangeSubmitted)D.feedback(feedback,error?.message||'',Boolean(error));});
function nextDate(){const value=$('data').value;$('proxima').textContent=D.date(value)?D.formatDate(D.addDays(value,Number($('intervalo').value))):'Selecione a data da avaliação';}
function render(){
 const query=$('filtroAluno').value,from=$('filtroInicio').value,to=$('filtroFim').value,invalid=(from&&!D.date(from))||(to&&!D.date(to))||(from&&to&&from>to);
 D.feedback($('filtro-periodo-feedback'),invalid?'Informe um período válido: a data inicial deve ser anterior ou igual à data final.':'',Boolean(invalid));
 const rows=invalid?[]:evaluations.filter(e=>{const a=e.aluno,student=students.find(s=>s.id===e.alunoId)||{name:a?.nome,matricula:a?.matricula,cpf:a?.cpf},day=e.dataAvaliacao.slice(0,10);return (!query||D.studentMatches(student,query))&&(!from||day>=from)&&(!to||day<=to);});
 const paginas=Math.max(1,Math.ceil(rows.length/POR_PAGINA));pagina=Math.min(pagina,paginas);
 $('avaliacoes-pagina').textContent='Página '+pagina+' de '+paginas;$('avaliacoes-anterior').disabled=pagina===1;$('avaliacoes-proxima').disabled=pagina===paginas;
 const body=$('historico');body.replaceChildren();if(!rows.length){D.empty(body,8,invalid?'Corrija o período para visualizar as avaliações.':query||from||to?'Nenhuma avaliação encontrada para os filtros.':'Nenhuma avaliação registrada.');return;}
 rows.sort((a,b)=>b.dataAvaliacao.localeCompare(a.dataAvaliacao)).slice((pagina-1)*POR_PAGINA,pagina*POR_PAGINA).forEach(e=>{const s=students.find(s=>s.id===e.alunoId),row=document.createElement('tr');[s?.name||e.aluno?.nome||'Aluno não encontrado',s?.matricula||e.aluno?.matricula||'—',D.formatDate(e.dataAvaliacao.slice(0,10)),D.number(e.peso)+' kg',D.number(e.altura)+' cm',e.percentualGordura===null?'—':D.number(e.percentualGordura)+'%',D.badge(e.objetivo,tonsObjetivo.get(e.objetivo)||'neutral'),D.formatDate(e.dataReavaliacao?.slice(0,10))].forEach(value=>D.cell(row,value));body.append(row);});
}
$('filtroAluno').addEventListener('input',()=>{pagina=1;render();});['data','intervalo'].forEach(id=>$(id).addEventListener('change',nextDate));
for(const id of ['filtroInicio','filtroFim'])for(const event of ['input','change'])$(id).addEventListener(event,()=>{pagina=1;render();});
$('limpar-filtros').addEventListener('click',()=>{for(const id of ['filtroAluno','filtroInicio','filtroFim'])$(id).value='';pagina=1;render();});
$('avaliacoes-anterior').addEventListener('click',()=>{if(pagina>1){pagina--;render();}});
$('avaliacoes-proxima').addEventListener('click',()=>{if(!$('avaliacoes-proxima').disabled){pagina++;render();}});
form.addEventListener('reset',()=>{rangeSubmitted=false;form.classList.remove('was-validated');for(const id of ['data','peso','altura','gordura'])$(id).setCustomValidity('');setTimeout(()=>{picker.clear();$('matricula').value='';$('data').removeAttribute('min');nextDate();D.feedback(feedback,'');window.demoDirty=false;},0);});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(saving)return;const rangeError=validateRanges();if(rangeError){rangeSubmitted=true;D.feedback(feedback,rangeError.message,true);rangeError.field.focus();return;}if(!form.reportValidity())return;
 const student=students.find(s=>s.id===$('aluno').value&&D.isActiveStudent(s));
 if(!student){D.feedback(feedback,'Selecione um aluno ativo cadastrado.',true);$('alunoBusca').focus();return;}
 saving=true;$('salvar-avaliacao').disabled=true;
 try{
  const saved=await request('/avaliacoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alunoId:student.id,dataAvaliacao:$('data').value,peso:Number($('peso').value),altura:Number($('altura').value),percentualGordura:$('gordura').value===''?null:Number($('gordura').value),objetivo:$('objetivo').value,dataReavaliacao:D.addDays($('data').value,Number($('intervalo').value))})});
  evaluations.unshift(saved);form.reset();setTimeout(()=>{picker.setStudent(student.id);$('matricula').value=student.matricula;if(student.birth)$('data').setAttribute('min',student.birth);$('filtroAluno').value=student.matricula;pagina=1;render();nextDate();D.feedback(feedback,'Avaliação salva.');window.demoDirty=false;},0);
 }catch(e){D.feedback(feedback,e.message,true);}
 finally{saving=false;$('salvar-avaliacao').disabled=false;}
});
nextDate();render();load();
})();
