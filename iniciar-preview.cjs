// Servidor estático local da apresentação. Sem dependências externas.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT||8765);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 try{const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),relative=pathname==='/'?'./login.html':'.'+pathname+(pathname.endsWith('/')?'index.html':''),target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep)||!mime[path.extname(target)]||pathname.split('/').some(part=>part.startsWith('.')&&part!=='.')){res.writeHead(403);res.end('Acesso não permitido.');return;}
 const data=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){res.writeHead(e instanceof URIError?400:404);res.end('Página não encontrada.');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'A porta '+port+' está em uso. Defina outra porta na variável PORT.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log('Vida Ativa: http://127.0.0.1:'+port+'/');console.log('Use Ctrl+C para encerrar a prévia.');});
