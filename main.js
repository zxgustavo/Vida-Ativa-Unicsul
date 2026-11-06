(function(){
'use strict';
const profile=document.getElementById('perfil'),frame=document.getElementById('conteudo'),links=[...document.querySelectorAll('.nav-link')];
function preference(key,value){try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch(e){}return null;}
function dirty(){try{return Boolean(frame.contentWindow.demoDirty);}catch(e){return false;}}
function mayLeave(){return !dirty()||confirm('Há alterações não salvas no formulário. Deseja sair deste módulo?');}
function allowed(link){return link.parentElement.classList.contains('item-'+profile.value);}
function open(link){frame.src=link.getAttribute('href');frame.title=link.querySelector('span:last-child').textContent;links.forEach(item=>{const active=item===link;item.classList.toggle('active',active);active?item.setAttribute('aria-current','page'):item.removeAttribute('aria-current');});link.scrollIntoView({block:'nearest',inline:'nearest'});preference('moduloAtivo',link.getAttribute('href'));}
function apply(restore){links.forEach(link=>{link.parentElement.hidden=!allowed(link);});const saved=restore&&preference('moduloAtivo');const target=links.find(link=>allowed(link)&&link.getAttribute('href')===saved)||links.find(allowed);open(target);document.getElementById('workspace-name').textContent=profile.value==='portaria'?'Portaria':'Administração';preference('perfilAtivo',profile.value);}
let previous=preference('perfilAtivo');profile.value=['admin','portaria'].includes(previous)?previous:'admin';previous=profile.value;
profile.addEventListener('change',()=>{if(!mayLeave()){profile.value=previous;return;}previous=profile.value;apply(false);});
links.forEach(link=>link.addEventListener('click',event=>{event.preventDefault();if(allowed(link)&&mayLeave())open(link);}));
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();frame.focus();});
frame.addEventListener('load',()=>{try{const title=frame.contentDocument?.title;if(title)frame.title=title;}catch(e){}});
Demo.initPage();apply(true);
})();
