(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formCadastro'),feedback=$('feedback');
let currentId='',photoData='',photoVersion=0,photoPending=false;
D.initPage();D.watchForm(form);$('dataNascimento').max=D.today();
function preview(){D.avatar($('foto-preview'),{name:$('nome').value||'Novo aluno',photo:$('removerFoto').checked?'':photoData});}
function renderList(){
 const state=D.getState();D.populateStudents($('selecionarAluno'),state,'Novo aluno');$('selecionarAluno').value=currentId;
 $('total-alunos').textContent=state.students.length+' aluno(s)';const body=$('lista-alunos');body.replaceChildren();
 if(!state.students.length){D.empty(body,5,'Nenhum aluno cadastrado.');return;}
 state.students.forEach(s=>{
  const row=document.createElement('tr');D.cell(row,s.id);D.cell(row,s.name);D.cell(row,D.cpfText(s.cpf));D.cell(row,D.phoneText(s.phone));
  const button=document.createElement('button');button.type='button';button.className='btn btn-small';button.textContent='Editar';
  button.setAttribute('aria-label','Editar cadastro de '+s.name);button.addEventListener('click',()=>{if(mayDiscard()){load(s.id);$('nome').focus();}});
  D.cell(row,button);body.append(row);
 });
}
function load(studentId=''){
 photoVersion++;photoPending=false;$('salvar').disabled=false;
 const state=D.getState(),s=state.students.find(s=>s.id===studentId);currentId=s?.id||'';$('matricula').value=currentId||D.nextStudentId(state);
 const values={nome:s?.name||'',cpf:D.cpfText(s?.cpf||''),dataNascimento:s?.birth||'',telefone:D.phoneText(s?.phone||''),endereco:s?.address||'',nomeEmergencia:s?.emergencyName||'',telEmergencia:D.phoneText(s?.emergencyPhone||''),restricoes:s?.health||'',anotacoes:s?.notes||''};
 Object.entries(values).forEach(([id,value])=>{$(id).value=value;});
 photoData=s?.photo||'';$('foto').value='';$('foto').setCustomValidity('');$('cpf').setCustomValidity('');$('removerFoto').checked=false;
 preview();renderList();D.feedback(feedback,'');window.demoDirty=false;
}
function mayDiscard(){return !window.demoDirty||confirm('Descartar as alterações não salvas deste cadastro?');}
$('selecionarAluno').addEventListener('change',()=>{const next=$('selecionarAluno').value;if(mayDiscard())load(next);else $('selecionarAluno').value=currentId;});
$('novo-aluno').addEventListener('click',()=>{if(mayDiscard()){load();$('nome').focus();}});
$('nome').addEventListener('input',preview);$('removerFoto').addEventListener('change',preview);
$('cpf').addEventListener('input',()=>{$('cpf').setCustomValidity($('cpf').value&&!D.validCpf($('cpf').value)?'Informe um CPF válido.':'');});
$('cpf').addEventListener('blur',()=>{$('cpf').value=D.cpfText($('cpf').value);});
['telefone','telEmergencia'].forEach(id=>$(id).addEventListener('blur',()=>{$(id).value=D.phoneText($(id).value);}));
$('foto').addEventListener('change',async()=>{
 const version=++photoVersion;photoPending=true;$('salvar').disabled=true;$('foto').setCustomValidity('');
 try{const next=await D.readPhoto($('foto').files[0]);if(version!==photoVersion)return;photoData=next;$('removerFoto').checked=false;preview();D.feedback(feedback,'');}
 catch(e){if(version!==photoVersion)return;$('foto').setCustomValidity(e.message);D.feedback(feedback,e.message,true);}
 finally{if(version===photoVersion){photoPending=false;$('salvar').disabled=false;}}
});
form.addEventListener('reset',()=>setTimeout(()=>load(currentId),0));
form.addEventListener('submit',event=>{
 event.preventDefault();if(photoPending){D.feedback(feedback,'Aguarde o carregamento da foto.',true);return;}if(!form.reportValidity())return;
 const save=$('salvar');save.disabled=true;
 try{
  const student={id:currentId||D.nextStudentId(D.getState()),name:$('nome').value.trim(),cpf:D.digits($('cpf').value),birth:$('dataNascimento').value,phone:D.digits($('telefone').value),address:$('endereco').value.trim(),emergencyName:$('nomeEmergencia').value.trim(),emergencyPhone:D.digits($('telEmergencia').value),health:$('restricoes').value.trim(),notes:$('anotacoes').value.trim(),photo:$('removerFoto').checked?'':photoData};
  const saved=D.upsertStudent(student);load(saved);D.feedback(feedback,'Cadastro salvo. Matrícula '+saved+'.');
 }catch(e){D.feedback(feedback,e.message,true);}finally{save.disabled=false;}
});
load();
})();
