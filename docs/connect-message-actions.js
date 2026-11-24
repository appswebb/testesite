(()=>{'use strict';
let dialog=null;
function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}}
function open(id){
 const pair=state.pair?.id,m=state.messages.find(x=>String(x.id)===id);
 if(!pair||!m||m.sender_id!==state.session?.user?.id||m.deleted_at)return;
 close();const d=document.createElement('dialog');dialog=d;d.className='cp-msg-dialog';d.setAttribute('aria-label','Opções da mensagem');
 const preview='<p class="cp-msg-preview">'+esc(m.body)+'</p>';
 d.innerHTML='<header><strong>Mensagem</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header>'+preview+'<button type="button" data-msg-edit>'+ico('edit',19)+' Editar mensagem</button><button type="button" data-msg-delete>'+ico('trash',19)+' Apagar para todos</button>';
 async function mutate(body,remove){if(state.pair?.id!==pair)return close();const btn=d.querySelector('[data-msg-save]');if(btn)btn.disabled=true;try{const {data,error}=await db.rpc('entre_message_mutate',{_pair:pair,_id:m.id,_body:body,_delete:remove});if(error)throw error;if(state.pair?.id===pair){const item=state.messages.find(x=>x.id===data.id);if(item)Object.assign(item,data);refreshEncounterMessages();}close();toast(remove?'Mensagem apagada.':'Mensagem editada.');}catch(e){toast(infoError(e),true);if(btn)btn.disabled=false;}}
 d.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===d||b?.hasAttribute('data-msg-close'))return close();if(b?.hasAttribute('data-msg-edit')){d.innerHTML='<header><strong>Editar mensagem</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header><form><textarea maxlength="1500" required rows="4" aria-label="Mensagem">'+esc(m.body)+'</textarea><button type="submit" data-msg-save>Salvar alteração</button></form>';d.querySelector('textarea').focus();}if(b?.hasAttribute('data-msg-delete')){d.innerHTML='<header><strong>Apagar para todos?</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header><p>O conteúdo será removido dos dois chats.</p><button type="button" data-msg-confirm data-msg-save>Apagar mensagem</button><button type="button" data-msg-close>Cancelar</button>';}if(b?.hasAttribute('data-msg-confirm'))void mutate('',true);});
 d.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();void mutate(d.querySelector('textarea').value.trim(),false);});d.addEventListener('close',()=>{if(dialog===d){dialog=null;d.remove();}});document.body.append(d);d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-message-menu]');if(b){e.preventDefault();open(b.dataset.messageMenu);}});
})();