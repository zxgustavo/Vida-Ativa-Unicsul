'use strict';
// Compatibilidade com as instalações do MVP que seguiram o antigo db push.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
require('dotenv').config({quiet:true});
const Database=require('better-sqlite3');
const url=process.env.DATABASE_URL;
if(!url?.startsWith('file:'))throw new Error('DATABASE_URL deve apontar para um SQLite local.');
const filename=path.resolve(url.slice(5)),db=new Database(filename);
const migrations=path.resolve('prisma/migrations');
const antigas=fs.readdirSync(migrations).filter(n=>n<'20261111160000'&&fs.existsSync(path.join(migrations,n,'migration.sql'))).sort();
const prisma=(...args)=>execFileSync(process.execPath,['node_modules/prisma/build/index.js',...args,'--config','prisma7.config.ts'],{stdio:'inherit',env:process.env});
async function main(){
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);
 const temHistorico=tables.includes('_prisma_migrations')&&db.prepare('SELECT COUNT(*) AS n FROM _prisma_migrations').get().n>0;
 const baseline=tables.includes('Aluno')&&!temHistorico;
 if(baseline){
  const reference=new Database(':memory:');for(const name of antigas)reference.exec(fs.readFileSync(path.join(migrations,name,'migration.sql'),'utf8'));
  for(const table of ['Aluno','Contrato','AvaliacaoFisica']){
   const shape=(source)=>source.pragma(`table_info("${table}")`).map(({name,type,notnull,pk})=>({name,type,notnull,pk})).sort((a,b)=>a.name.localeCompare(b.name));
   if(JSON.stringify(shape(db))!==JSON.stringify(shape(reference)))throw new Error(`Schema legado inesperado em ${table}; nenhuma migração aplicada. Faça uma revisão manual.`);
   const relations=source=>source.pragma(`foreign_key_list("${table}")`).map(({table,from,to,on_update,on_delete})=>({table,from,to,on_update,on_delete})).sort((a,b)=>a.from.localeCompare(b.from));
   if(JSON.stringify(relations(db))!==JSON.stringify(relations(reference)))throw new Error(`Vínculos inesperados em ${table}; nenhuma migração aplicada.`);
  }
  for(const field of ['cpf','matricula'])if(!db.pragma('index_list("Aluno")').some(index=>index.unique&&db.pragma(`index_info("${index.name.replaceAll('"','""')}")`).some(column=>column.name===field)))throw new Error(`Unicidade de ${field} ausente; nenhuma migração aplicada.`);
  reference.close();
 }
 if(tables.length){
  if(db.pragma('quick_check',{simple:true})!=='ok'||db.pragma('foreign_key_check').length)throw new Error('Banco inconsistente; migração interrompida.');
  const backup=filename+'.backup-'+Date.now();await db.backup(backup);console.log('Backup preservado em '+backup);
 }
 db.close();
 if(baseline)for(const name of antigas)prisma('migrate','resolve','--applied',name);
 prisma('migrate','deploy');
}
main().catch(error=>{try{db.close();}catch{}console.error(error.message);process.exitCode=1;});
