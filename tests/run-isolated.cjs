'use strict';
// Nunca usa dev.db: migra e executa as suítes em uma base temporária própria.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),backend=path.join(root,'backend');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vida-ativa-tests-'));
const database=path.join(directory,'integration.db');
const env={...process.env,DATABASE_URL:'file:'+database,TEST_DATABASE_PATH:database,TEST_API_URL:'http://localhost:3333',PORT:'3333'};
function run(args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});if(r.status!==0)throw new Error(args.join(' ')+' falhou: '+r.status);}
async function main(){
 await new Promise((resolve,reject)=>{const probe=require('node:net').createServer();probe.once('error',reject);probe.listen(3333,()=>probe.close(resolve));});
 run(['scripts/migrate.cjs'],backend);
 run(['node_modules/prisma/build/index.js','generate','--config','prisma7.config.ts'],backend);
 run(['node_modules/typescript/bin/tsc','--noEmit'],backend);
 run(['tests/migration.test.cjs']);
 const server=spawn(process.execPath,['-r','ts-node/register/transpile-only','src/server.ts'],{cwd:backend,env,stdio:['ignore','inherit','inherit']});
 let exited=false;server.on('exit',()=>{exited=true;});
 try{
  let ready=false;for(let attempt=0;attempt<80;attempt++){
   if(exited)throw new Error('A API de testes encerrou; confira se a porta 3333 está livre.');
   try{const response=await fetch(env.TEST_API_URL+'/api/alunos');if(response.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready)throw new Error('A API de testes não iniciou.');
  for(const file of ['front-end','contrato-renovacao','contrato-pagamento','financeiro-integration','avaliacao-integration','relatorio-integration','portaria-integration','recebimentos-integration'])run(['tests/'+file+'.test.cjs']);
  console.log('Suítes aprovadas. SQLite descartável: '+database);
 }finally{server.kill('SIGTERM');await new Promise(resolve=>{if(exited)resolve();else server.once('exit',resolve);});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
