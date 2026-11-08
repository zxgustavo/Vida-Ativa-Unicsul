(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formCadastro'),feedback=$('feedback');
const API='http://localhost:3333/api/alunos';
let alunos=[],currentId='',photoData='',photoVersion=0,photoPending=false,requestVersion=0,searchTimer,resetInterno=false,pagina=1;
const POR_PAGINA=10;
D.initPage({bootstrap:false});D.watchForm(form);$('dataNascimento').max=D.today();

async function api(path='',options={}){
 let response;
 try{response=await fetch(API+path,options);}
 catch{throw new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.');}
 let data;
 try{data=await response.json();}catch{data=null;}
 if(!response.ok)throw new Error(typeof data?.erro==='string'?data.erro:'Não foi possível concluir a operação (HTTP '+response.status+').');
 return data;
}
function preview(){D.avatar($('foto-preview'),{name:$('nome').value||'Novo aluno',photo:$('removerFoto').checked?'':photoData});}
function syncRestrictions(){const has=$('temRestricoes').value==='sim';$('restricoes-field').hidden=!has;$('restricoes').required=has;$('restricoes').disabled=!has;if(!has)$('restricoes').setCustomValidity('');}
function validateCpf(){const value=$('cpf').value,duplicate=alunos.some(s=>s.id!==currentId&&D.digits(s.cpf)===D.digits(value));$('cpf').setCustomValidity(value&&!D.validCpf(value)?'Informe um CPF válido.':duplicate?'Este CPF já está cadastrado.':'');}
function validatePhone(id){const input=$(id);input.setCustomValidity(input.value&&!D.validPhone(input.value)?'Informe um telefone válido com DDD e 10 ou 11 dígitos.':'');}
function validateText(id){const input=$(id),length=input.value.trim().length;input.setCustomValidity(input.value&&length<(id==='nome'?3:1)?'Preencha este campo com informações válidas.':'');}
function validateBirth(){const input=$('dataNascimento');input.setCustomValidity(input.value&&(!D.date(input.value)||input.value>D.today())?'Informe uma data de nascimento válida.':'');}
function renderList(){
 const active=alunos.filter(s=>s.ativo),students=active.filter(s=>D.studentMatches({id:s.matricula,name:s.nome,cpf:s.cpf},$('buscarAluno').value));
 const paginas=Math.max(1,Math.ceil(students.length/POR_PAGINA));pagina=Math.min(pagina,paginas);
 $('cadastros-pagina').textContent='Página '+pagina+' de '+paginas;$('cadastros-anterior').disabled=pagina===1;$('cadastros-proxima').disabled=pagina===paginas;
 $('total-alunos').textContent=students.length+' de '+active.length+' aluno(s) ativo(s)';const body=$('lista-alunos');body.replaceChildren();
 if(!students.length){D.empty(body,5,active.length?'Nenhum aluno encontrado. Ajuste a busca.':'Nenhum aluno ativo cadastrado.');return;}
 students.slice((pagina-1)*POR_PAGINA,pagina*POR_PAGINA).forEach(s=>{
  const row=document.createElement('tr');D.cell(row,s.matricula);D.cell(row,s.nome);D.cell(row,D.cpfText(s.cpf));D.cell(row,D.phoneText(s.telefone||''));
  const button=document.createElement('button');button.type='button';button.className='btn btn-small';button.textContent='Editar';
  button.setAttribute('aria-label','Editar cadastro de '+s.nome);button.addEventListener('click',async()=>{if(await mayDiscard()){load(s.id);$('nome').focus();}});
  D.cell(row,button);body.append(row);
 });
}
async function atualizarLista(){
 const version=++requestVersion;
 try{
  const result=await api();
  if(version!==requestVersion)return true;
  if(!Array.isArray(result))throw new Error('A API retornou uma lista de alunos inválida.');
  alunos=result;renderList();validateCpf();D.feedback($('lista-feedback'),'');return true;
 }catch(e){
  if(version!==requestVersion)return false;
  D.feedback($('lista-feedback'),e.message,true);return false;
 }
}
function load(studentId=''){
 photoVersion++;photoPending=false;$('salvar').disabled=false;
 const s=alunos.find(aluno=>aluno.id===studentId&&aluno.ativo);currentId=s?.id||'';$('matricula').value=s?.matricula||'';
 $('cadastro-title').textContent=currentId?'Editar cadastro':'Novo cadastro';$('novo-aluno').hidden=!currentId;$('arquivar').hidden=!currentId;$('salvar').textContent=currentId?'Salvar alterações':'Salvar cadastro';
 $('matricula-ajuda').textContent=currentId?'Matrícula preservada durante a edição.':'Gerada automaticamente ao salvar o cadastro.';
 const noRestrictions=/^(?:nenhuma(?: restrição(?: informada)?)?|sem restrições?)\.?$/i.test((s?.restricoesMedicas||'').trim());
 const values={nome:s?.nome||'',cpf:D.cpfText(s?.cpf||''),dataNascimento:s?.dataNascimento||'',telefone:D.phoneText(s?.telefone||''),endereco:s?.endereco||'',nomeEmergencia:s?.nomeEmergencia||'',telEmergencia:D.phoneText(s?.telefoneEmergencia||''),restricoes:noRestrictions?'':s?.restricoesMedicas||'',anotacoes:s?.observacoes||''};
 Object.entries(values).forEach(([id,value])=>{$(id).value=value;});
 $('temRestricoes').value=s?(noRestrictions?'nao':s.restricoesMedicas?'sim':''):'';syncRestrictions();
 photoData=s?.foto||'';$('foto').value='';$('foto').setCustomValidity('');$('removerFoto').checked=false;$('removerFoto-field').hidden=!photoData;
 for(const id of ['nome','cpf','dataNascimento','telefone','endereco','nomeEmergencia','telEmergencia','restricoes'])$(id).setCustomValidity('');
 preview();D.feedback(feedback,'');window.demoDirty=false;
}
function limparFormulario(){
 resetInterno=true;try{form.reset();}finally{resetInterno=false;}
 form.classList.remove('was-validated');load();
}
async function mayDiscard(){return !window.demoDirty||await D.confirm('Descartar as alterações não salvas deste cadastro?',{title:'Descartar alterações',confirmLabel:'Descartar'});}
$('novo-aluno').addEventListener('click',async()=>{if(await mayDiscard()){limparFormulario();$('nome').focus();}});
$('buscarAluno').addEventListener('input',()=>{pagina=1;renderList();requestVersion++;clearTimeout(searchTimer);searchTimer=setTimeout(atualizarLista,200);});
$('cadastros-anterior').addEventListener('click',()=>{if(pagina>1){pagina--;renderList();}});
$('cadastros-proxima').addEventListener('click',()=>{if(!$('cadastros-proxima').disabled){pagina++;renderList();}});
$('arquivar').addEventListener('click',async()=>{
 if(!currentId)return;
 const student=alunos.find(s=>s.id===currentId);if(!student)return;
 if(!await D.confirm('Desativar '+student.nome+' (matrícula '+student.matricula+')? O aluno sairá da lista de cadastros ativos. O cadastro e a matrícula serão preservados. Alterações não salvas serão descartadas.',{title:'Desativar aluno',confirmLabel:'Desativar aluno',danger:true}))return;
 const button=$('arquivar');button.disabled=true;
 try{
  await api('/'+encodeURIComponent(student.id),{method:'DELETE'});
  limparFormulario();const atualizado=await atualizarLista();
  D.feedback(feedback,'Aluno desativado. Matrícula '+student.matricula+' preservada.'+(atualizado?'':' Não foi possível atualizar a lista.'));
  $('nome').focus();
 }catch(e){D.feedback(feedback,e.message,true);}
 finally{button.disabled=false;}
});
$('nome').addEventListener('input',preview);$('removerFoto').addEventListener('change',()=>{if($('removerFoto').checked){photoVersion++;photoPending=false;$('salvar').disabled=false;$('foto').value='';$('foto').setCustomValidity('');photoData=alunos.find(s=>s.id===currentId)?.foto||'';}preview();});
$('temRestricoes').addEventListener('change',syncRestrictions);
$('cpf').addEventListener('input',validateCpf);
$('cpf').addEventListener('blur',()=>{$('cpf').value=D.cpfText($('cpf').value);validateCpf();});
$('dataNascimento').addEventListener('input',validateBirth);
['telefone','telEmergencia'].forEach(id=>{$(id).addEventListener('input',()=>validatePhone(id));$(id).addEventListener('blur',()=>{$(id).value=D.phoneText($(id).value);validatePhone(id);});});
['nome','endereco','nomeEmergencia','restricoes'].forEach(id=>$(id).addEventListener('input',()=>validateText(id)));
$('foto').addEventListener('change',async()=>{
 const version=++photoVersion;photoPending=true;$('salvar').disabled=true;$('foto').setCustomValidity('');
 try{const file=$('foto').files[0],next=file?await D.readPhoto(file):alunos.find(s=>s.id===currentId)?.foto||'';if(version!==photoVersion)return;photoData=next;$('removerFoto').checked=false;$('removerFoto-field').hidden=!alunos.find(s=>s.id===currentId)?.foto;preview();D.feedback(feedback,'');}
 catch(e){if(version!==photoVersion)return;$('foto').setCustomValidity(e.message);D.feedback(feedback,e.message,true);}
 finally{if(version===photoVersion){photoPending=false;$('salvar').disabled=false;}}
});
form.addEventListener('reset',()=>{form.classList.remove('was-validated');if(!resetInterno)setTimeout(()=>load(),0);});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(photoPending){D.feedback(feedback,'Aguarde o carregamento da foto.',true);return;}validateCpf();validateBirth();for(const id of ['telefone','telEmergencia'])validatePhone(id);for(const id of ['nome','endereco','nomeEmergencia','restricoes'])validateText(id);if(!form.reportValidity())return;
 const save=$('salvar');save.disabled=true;
 try{
  const student={nome:$('nome').value.trim(),cpf:D.digits($('cpf').value),dataNascimento:$('dataNascimento').value,telefone:D.digits($('telefone').value),endereco:$('endereco').value.trim(),nomeEmergencia:$('nomeEmergencia').value.trim(),telefoneEmergencia:D.digits($('telEmergencia').value),restricoesMedicas:$('temRestricoes').value==='nao'?'Nenhuma restrição informada.':$('restricoes').value.trim(),observacoes:$('anotacoes').value.trim(),foto:$('removerFoto').checked?'':photoData};
  const wasEditing=Boolean(currentId),saved=await api(wasEditing?'/'+encodeURIComponent(currentId):'',{method:wasEditing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(student)});
  limparFormulario();save.disabled=true;const atualizado=await atualizarLista();
  D.feedback(feedback,(wasEditing?'Cadastro atualizado.':'Cadastro salvo.')+' Matrícula '+saved.matricula+'.'+(atualizado?'':' Não foi possível atualizar a lista.'));
 }catch(e){D.feedback(feedback,e.message,true);}finally{save.disabled=false;}
});
load();atualizarLista();
})();
