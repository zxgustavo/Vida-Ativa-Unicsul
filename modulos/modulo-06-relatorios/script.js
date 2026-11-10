(function(){
'use strict';
const D=Demo,$=id=>document.getElementById(id),form=$('formRelatorio'),feedback=$('feedback');
const API='http://localhost:3333/api/relatorios/dashboard';
const indicadores=['total-alunos','alunos-ativos','receita-prevista','avaliacoes-mes','alunos-vencidos','alunos-a-iniciar','avaliacoes-periodo'];
let version=0,timer,pagina=1,reportData=null,aplicados=null;
const POR_PAGINA=10;
D.initPage({bootstrap:false});
function padrao(){$('dataInicio').value=D.today().slice(0,7)+'-01';$('dataFim').value=D.today();$('status').value='todos';$('buscarAluno').value='';}
function clearResults(message){reportData=null;pagina=1;for(const id of indicadores)$(id).textContent='—';D.empty($('tabelaCorpo'),8,message);$('mensagemInfo').textContent='';$('report-caption').textContent='Contratos por aluno';$('relatorios-pagina').textContent='Página 1 de 1';$('relatorios-anterior').disabled=true;$('relatorios-proxima').disabled=true;}
function render(data){
 reportData=data;
 const t=data.totais;
 $('total-alunos').textContent=t.alunos;$('alunos-ativos').textContent=t.alunosAtivos;$('receita-prevista').textContent=D.money(Math.round(t.receitaPrevista*100));
 $('avaliacoes-mes').textContent=t.avaliacoesMes;$('alunos-vencidos').textContent=t.alunosVencidos;$('alunos-a-iniciar').textContent=t.alunosAIniciar;$('avaliacoes-periodo').textContent=t.avaliacoesPeriodo;
 const body=$('tabelaCorpo');body.replaceChildren();$('mensagemInfo').textContent=data.alunos.length+' aluno(s) encontrado(s)';
 const rows=data.alunos.flatMap(aluno=>(aluno.contratos.length?aluno.contratos:[null]).map(c=>({aluno,c})));
 const paginas=Math.max(1,Math.ceil(rows.length/POR_PAGINA));pagina=Math.min(pagina,paginas);
 $('relatorios-pagina').textContent='Página '+pagina+' de '+paginas;$('relatorios-anterior').disabled=pagina===1;$('relatorios-proxima').disabled=pagina===paginas;
 $('report-caption').textContent='Cadastros de '+D.formatDate(data.periodo.dataInicio)+' a '+D.formatDate(data.periodo.dataFim);
 if(!data.alunos.length){D.empty(body,8,'Nenhum aluno encontrado para os filtros selecionados.');return;}
 for(const {aluno,c} of rows.slice((pagina-1)*POR_PAGINA,pagina*POR_PAGINA)){
  const row=document.createElement('tr');D.cell(row,aluno.matricula);D.cell(row,aluno.nome);D.cell(row,D.cpfText(aluno.cpf||'')||'—');D.cell(row,D.formatDate(aluno.dataCadastro));D.cell(row,aluno.ativo?'Ativo':'Inativo');D.cell(row,c?.plano||'—');
   const label=c?.situacaoAtual||'Sem contrato',tone=label==='Vigente'?'ok':['Vencido','A iniciar','Suspenso'].includes(label)?'warn':label==='Sem contrato'?'neutral':'danger';
   D.cell(row,D.badge(label,tone));D.cell(row,c?D.money(Math.round(c.valor*100)):'—');body.append(row);
 }
}
async function atualizar(aplicar=false){
 const id=++version,filtros=aplicar?{from:$('dataInicio').value,to:$('dataFim').value,status:$('status').value}:aplicados;
 if(!filtros)return;
 const {from,to,status}=filtros;
 if(!D.date(from)||!D.date(to)||from>to){clearResults('Corrija o período para gerar o relatório.');D.feedback(feedback,'Informe um período válido, com data final igual ou posterior à inicial.',true);return;}
 if(aplicar)aplicados=filtros;
 const query=[['dataInicio',from],['dataFim',to],['situacao',status],['busca',$('buscarAluno').value.trim()]].map(([key,value])=>encodeURIComponent(key)+'='+encodeURIComponent(value)).join('&');
 D.feedback(feedback,'Atualizando relatório…');
 try{
  let response;try{response=await fetch(API+'?'+query);}catch{throw new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.');}
  let data;try{data=await response.json();}catch{data=null;}
  if(!response.ok)throw new Error(typeof data?.erro==='string'?data.erro:'Não foi possível gerar o relatório (HTTP '+response.status+').');
  if(!data?.totais||!data?.periodo||!Array.isArray(data.alunos))throw new Error('A API retornou um relatório inválido.');
  if(id!==version)return;render(data);D.feedback(feedback,'');
 }catch(e){if(id!==version)return;clearResults('Não foi possível carregar o relatório.');D.feedback(feedback,e.message,true);}
}
form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);pagina=1;return atualizar(true);});
$('limparFiltros').addEventListener('click',()=>{clearTimeout(timer);padrao();pagina=1;return atualizar(true);});
$('buscarAluno').addEventListener('input',()=>{clearTimeout(timer);version++;pagina=1;timer=setTimeout(()=>atualizar(),250);});
$('relatorios-anterior').addEventListener('click',()=>{if(reportData&&pagina>1){pagina--;render(reportData);}});
$('relatorios-proxima').addEventListener('click',()=>{if(reportData&&!$('relatorios-proxima').disabled){pagina++;render(reportData);}});
padrao();clearResults('Carregando relatório…');atualizar(true);
})();
