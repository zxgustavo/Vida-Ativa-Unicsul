'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/contrato-service.cjs');
const {page,descendants}=require('./front-end.test.cjs');
const pagar=(h,extra={})=>h.service.atualizar('contrato-1',{statusPagamento:'Pago',dataPagamento:'2026-10-08',...extra});
for(const [plano,fim] of [['Mensal','2026-11-08'],['Trimestral','2027-01-08'],['Anual','2027-10-08']]){
 test('Quitar vencido renova plano '+plano+' a partir de hoje',async()=>{
  const h=harness({plano});const antes=h.contrato,r=await pagar(h);
  assert.equal(r.dataFim.toISOString().slice(0,10),fim);assert.equal(r.situacao,'Vigente');assert.equal(r.statusPagamento,'Pago');
  for(const campo of ['id','alunoId','plano','valor','tolerancia','diasSuspensos'])assert.equal(r[campo],antes[campo]);
  assert.equal(r.dataInicio.getTime(),antes.dataInicio.getTime());assert.equal(h.writes,1);
  const repetido=await pagar(h);assert.equal(repetido.dataFim.getTime(),r.dataFim.getTime());
 });
}
test('Vencimento é reconhecido pela data mesmo com situação Ativo ou Vigente',async()=>{
 for(const situacao of ['Ativo','Vigente']){
  const h=harness({situacao,statusPagamento:'Pago',dataPagamento:new Date('2026-01-01T00:00:00Z')});
  const r=await pagar(h);assert.equal(r.situacao,'Vigente');assert.equal(r.dataFim.toISOString().slice(0,10),'2026-11-08');
 }
});
test('Fim de mês, ano bissexto e duração trimestral/anual respeitam calendário',async()=>{
 for(const [hoje,plano,fim] of [['2027-01-31','Mensal','2027-02-28'],['2028-01-31','Mensal','2028-02-29'],['2028-02-29','Anual','2029-02-28'],['2026-11-30','Trimestral','2027-02-28']]){
  const h=harness({plano},hoje+'T15:00:00Z');const r=await pagar(h,{dataPagamento:hoje});assert.equal(r.dataFim.toISOString().slice(0,10),fim);
 }
});
test('Renovação usa o dia de São Paulo, inclusive antes da meia-noite local',async()=>{
 const h=harness({},'2026-10-09T01:30:00Z');assert.equal((await pagar(h)).dataFim.toISOString().slice(0,10),'2026-11-08');
});
test('Pagamento antecipado ou no vencimento mantém datas do contrato vigente',async()=>{
 for(const fim of ['2026-12-31','2026-10-08']){
  const h=harness({situacao:'Vigente',dataFim:new Date(fim+'T00:00:00Z')}),r=await pagar(h);
  assert.equal(r.dataFim.toISOString().slice(0,10),fim);assert.equal(r.statusPagamento,'Pago');assert.equal(r.situacao,'Vigente');
 }
});
test('Pagamento pendente e edição apenas da forma de pagamento não renovam',async()=>{
 const h=harness(),antes=h.contrato;
 for(const input of [{statusPagamento:'Pendente'},{formaPagamento:'Boleto'}]){
  const r=await h.service.atualizar('contrato-1',input);assert.equal(r.dataFim.getTime(),antes.dataFim.getTime());assert.equal(r.situacao,'Vencido');
 }
});
test('Pagamento não libera contratos cancelados, suspensos ou com início futuro',async()=>{
 for(const situacao of ['Cancelado','Suspenso','A Iniciar']){
  const futuro=situacao==='A Iniciar';const h=harness({situacao,...(futuro?{dataInicio:new Date('2026-11-01'),dataFim:new Date('2026-12-01')}:{})});
  const antes=h.contrato,r=await pagar(h);assert.equal(r.situacao,situacao);assert.equal(r.dataFim.getTime(),antes.dataFim.getTime());
 }
 const h=harness({situacao:'Cancelado'});assert.equal((await pagar(h,{situacao:'Ativo'})).situacao,'Cancelado');
 const h2=harness();assert.equal((await pagar(h2,{situacao:'Cancelado'})).situacao,'Cancelado');
});
test('Edição explícita da vigência é preservada ao pagar',async()=>{
 const h=harness();const r=await pagar(h,{dataFim:'2027-03-01'});assert.equal(r.dataFim.toISOString().slice(0,10),'2027-03-01');assert.equal(r.situacao,'Vigente');
});
test('Plano desconhecido e pagamento inválido são rejeitados sem gravação parcial',async()=>{
 for(const [overrides,input,pattern] of [[{plano:'Personalizado'},{},/Plano sem duração/],[{},{dataPagamento:'2099-01-01'},/futuro/],[{},{dataPagamento:null},/data de pagamento/]]){
  const h=harness(overrides);const antes=JSON.stringify(h.contrato);
  await assert.rejects(pagar(h,input),e=>e.status===400&&pattern.test(e.message));assert.equal(h.writes,0);assert.equal(JSON.stringify(h.contrato),antes);
 }
});
test('Financeiro recarrega o retorno do serviço: CPF, novo vencimento e etiqueta verde',async()=>{
 const h=harness();const calls=[];
 const api=async(url,options={})=>{
  calls.push([String(url),options.method||'GET']);
  const result=options.method==='PUT'?await h.service.atualizar('contrato-1',JSON.parse(options.body)):String(url).endsWith('/alunos')?[h.aluno]:[h.contrato];
  return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(result))};
 };
 const p=page('modulos/modulo-02-financeiro/index.html',new Map(),api);await p.ready;
 const row=()=>p.nodes.tabelaDados.children.find(n=>n.getAttribute('data-student-id')===h.aluno.id);
 assert.match(row().textContent,/Vencido/);assert.match(row().textContent,/529\.982\.247-25/);
 await descendants(row()).find(n=>n.getAttribute('data-action')==='payment').fire('click');
 p.nodes.status.value='Pago';await p.nodes.status.fire('change');
 assert.match(p.nodes['resumo-operacao'].textContent,/08\/11\/2026/);assert.match(p.nodes['resumo-operacao'].textContent,/Vigente/);
 await p.nodes.formFinanceiro.fire('submit');
 assert.match(p.nodes.feedback.textContent,/Pagamento salvo/);assert.match(row().textContent,/08\/11\/2026/);
 assert.ok(descendants(row()).some(n=>n.textContent==='Vigente'&&n.className==='badge ok'));
 assert.ok(descendants(p.nodes.badgeStatus).some(n=>n.textContent==='Vigente'&&n.className==='badge ok'));
 const put=calls.findIndex(([,method])=>method==='PUT');assert.ok(put>=0);assert.ok(calls.slice(put+1).some(([url,method])=>method==='GET'&&url.endsWith('/financeiro')));
});
