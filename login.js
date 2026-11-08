(function(){
'use strict';
const form=document.getElementById('formLogin'),feedback=document.getElementById('login-feedback');
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const usuario=document.getElementById('usuario').value.trim(),senha=document.getElementById('senha').value;
 const perfil=usuario==='admin'&&senha==='admin123'?'admin':usuario==='portaria'&&senha==='portaria123'?'portaria':'';
 if(!perfil){feedback.className='feedback error';feedback.textContent='Utilizador ou senha incorretos.';return;}
 try{sessionStorage.setItem('vidaAtiva.perfil',perfil);sessionStorage.setItem('vidaAtiva.inicio',perfil==='admin'?'modulos/modulo-01-cadastros/index.html':'modulos/modulo-03-portaria/index.html');}
 catch{feedback.className='feedback error';feedback.textContent='Não foi possível iniciar a sessão neste navegador.';return;}
 window.location.assign('index.html');
});
})();
