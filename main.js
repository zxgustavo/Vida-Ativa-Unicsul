(function(){
'use strict';
const profile=document.getElementById('perfil'),frame=document.getElementById('conteudo'),links=[...document.querySelectorAll('.nav-link')],nav=document.querySelector('.sidebar-nav'),navToggle=document.getElementById('mobile-nav-toggle');
let sessionProfile,initialModule;
try{sessionProfile=sessionStorage.getItem('vidaAtiva.perfil');initialModule=sessionStorage.getItem('vidaAtiva.inicio');sessionStorage.removeItem('vidaAtiva.inicio');}catch(e){}
if(!['admin','portaria'].includes(sessionProfile)){window.location.replace('login.html');return;}
function preference(key,value){try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch(e){}return null;}
function dirty(){try{return Boolean(frame.contentWindow.demoDirty);}catch(e){return false;}}
async function mayLeave(){return !dirty()||await Demo.confirm('Há alterações não salvas no formulário. Deseja sair deste módulo?',{title:'Descartar alterações',confirmLabel:'Sair do módulo'});}
function allowed(link){return link.parentElement.classList.contains('item-'+profile.value);}
function setNavOpen(open){nav.classList.toggle('is-open',open);navToggle.setAttribute('aria-expanded',String(open));}
function open(link){try{frame.contentWindow.__allowUnload=true;}catch(e){}frame.src=link.getAttribute('href');const label=link.querySelector('span:last-child').textContent;frame.title=label;links.forEach(item=>{const active=item===link;item.classList.toggle('active',active);active?item.setAttribute('aria-current','page'):item.removeAttribute('aria-current');});link.scrollIntoView({block:'nearest',inline:'nearest'});preference('moduloAtivo',link.getAttribute('href'));const navLabel=navToggle.querySelector('span:first-child');if(navLabel)navLabel.textContent=label;setNavOpen(false);}
function apply(restore){links.forEach(link=>{link.parentElement.hidden=!allowed(link);});const saved=restore&&(initialModule||preference('moduloAtivo'));initialModule=null;const target=links.find(link=>allowed(link)&&link.getAttribute('href')===saved)||links.find(allowed);open(target);document.getElementById('workspace-name').textContent=profile.value==='portaria'?'Portaria':'Administração';preference('perfilAtivo',profile.value);}
profile.value=sessionProfile;profile.disabled=true;
profile.addEventListener('change',()=>{profile.value=sessionProfile;});
document.getElementById('sair').addEventListener('click',async()=>{if(!await mayLeave())return;try{sessionStorage.removeItem('vidaAtiva.perfil');sessionStorage.removeItem('vidaAtiva.inicio');}catch(e){}window.location.replace('login.html');});
navToggle.addEventListener('click',()=>setNavOpen(navToggle.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('is-open')){setNavOpen(false);navToggle.focus();}});
links.forEach(link=>link.addEventListener('click',async event=>{event.preventDefault();if(allowed(link)&&await mayLeave())open(link);}));
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();frame.focus();});
frame.addEventListener('load',()=>{try{const title=frame.contentDocument?.title;if(title)frame.title=title;frame.contentDocument?.body?.classList.add('embedded');}catch(e){}});
Demo.initPage({bootstrap:false});apply(true);
})();
