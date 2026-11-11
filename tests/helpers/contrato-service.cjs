'use strict';
// Executa os serviços TypeScript reais; somente a persistência e o relógio são isolados.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../../backend/node_modules/typescript');
const root=path.resolve(__dirname,'../../backend/src/services');
function harness(overrides={},now='2026-10-08T15:00:00.000Z'){
 const aluno={id:'aluno-1',nome:'Aluno Teste',matricula:'1234',cpf:'52998224725',ativo:true};
 let contrato={id:'contrato-1',alunoId:aluno.id,plano:'Mensal',valor:120,dataInicio:new Date('2026-01-01T00:00:00Z'),dataFim:new Date('2026-09-01T00:00:00Z'),situacao:'Vencido',tolerancia:5,diasSuspensos:0,formaPagamento:'PIX',statusPagamento:'Pendente',dataPagamento:null,aluno,...overrides};
 let writes=0;
 const pagamentos=new Map();
 const contratoRepository={buscar:async id=>id===contrato.id?structuredClone(contrato):null,atualizar:async(id,data)=>{writes++;contrato={...contrato,...data};return structuredClone(contrato);},pagamentoPorChave:async chave=>pagamentos.get(chave),registrarPagamento:async data=>{pagamentos.set(data.chave,data);return data;}};
 contratoRepository.transacao=fn=>fn(contratoRepository);
 const alunoRepository={buscarPorId:async()=>structuredClone(aluno)};
 function Clock(...args){return new Date(...(args.length?args:[now]));}
 Clock.prototype=Date.prototype;Object.setPrototypeOf(Clock,Date);Clock.now=()=>new Date(now).getTime();
 const cache={};
 function load(name){
  if(cache[name])return cache[name];
  const module={exports:{}};
  const requireService=id=>{
   if(id==='../repositories/contratoRepository')return {contratoRepository};
   if(id==='../repositories/alunoRepository')return {alunoRepository};
   if(id==='./alunoService')return load('alunoService');
   if(id==='./dataPagamento')return load('dataPagamento');
   if(id==='node:crypto')return require(id);
   throw new Error('Dependência inesperada: '+id);
  };
  const source=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled,{module,exports:module.exports,require:requireService,Date:Clock,Intl},{filename:name+'.ts'});
  cache[name]=module.exports;return module.exports;
 }
 return {service:load('contratoService').contratoService,aluno,get contrato(){return structuredClone(contrato);},get writes(){return writes;}};
}
module.exports={harness};
