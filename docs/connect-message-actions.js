(()=>{'use strict';
let dialog=null;
function close(){if(dialog){const d=dialog;dialog=null;d.close();d.remove();}}
function open(id,isRoom=false){
 const room=isRoom?window.entreRooms?.messageContext?.(id):null;
 const pair=isRoom?room?.room:state.pair?.id,m=isRoom?room?.message:state.messages.find(x=>String(x.id)===id);
 const user=state.session?.user?.id;
 if(!pair||!m||(isRoom?m.sender:m.sender_id)!==user||m.deleted_at)return;
 const valid=()=>state.session?.user?.id===user&&(isRoom?state.view==='rooms'&&window.entreRooms?.messageContext?.(id)?.room===pair:state.pair?.id===pair&&['connect','chat'].includes(state.view));
 close();const d=document.createElement('dialog');dialog=d;d.className='cp-msg-dialog';d.setAttribute('aria-label','Opções da mensagem');
 const preview='<p class="cp-msg-preview">'+esc(m.body)+'</p>';
 d.innerHTML='<header><strong>Mensagem</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header>'+preview+'<button type="button" data-msg-edit>'+ico('edit',19)+' Editar mensagem</button><button type="button" data-msg-delete>'+ico('trash',19)+' Apagar para todos</button>';
 async function mutate(body,remove){if(!valid())return close();const btn=d.querySelector('[data-msg-save]');if(btn)btn.disabled=true;try{const {data,error}=await db.rpc(isRoom?'entre_room_message_mutate':'entre_message_mutate',{[isRoom?'_room':'_pair']:pair,_id:m.id,_body:body,_delete:remove});if(error)throw error;if(valid()){if(isRoom)window.entreRooms.applyMutation(pair,data);else{const item=state.messages.find(x=>x.id===data.id);if(remove||data.deleted_at)state.messages=state.messages.filter(x=>String(x.id)!==String(data.id));else if(item)Object.assign(item,data);refreshEncounterMessages();void window.connectRelationships?.tick?.();}}close();toast(remove?'Mensagem apagada.':'Mensagem editada.');}catch(e){toast(infoError(e),true);if(btn)btn.disabled=false;}}
 d.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===d||b?.hasAttribute('data-msg-close'))return close();if(b?.hasAttribute('data-msg-edit')){d.innerHTML='<header><strong>Editar mensagem</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header><form><textarea maxlength="'+(isRoom?400:1500)+'" required rows="4" aria-label="Mensagem">'+esc(m.body)+'</textarea><button type="submit" data-msg-save>Salvar alteração</button></form>';d.querySelector('textarea').focus();}if(b?.hasAttribute('data-msg-delete')){d.innerHTML='<header><strong>Apagar para todos?</strong><button type="button" data-msg-close aria-label="Fechar">×</button></header><p>O conteúdo será removido para todos os participantes.</p><button type="button" data-msg-confirm data-msg-save>Apagar mensagem</button><button type="button" data-msg-close>Cancelar</button>';}if(b?.hasAttribute('data-msg-confirm'))void mutate('',true);});
 d.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();void mutate(d.querySelector('textarea').value.trim(),false);});d.addEventListener('close',()=>{if(dialog===d){dialog=null;d.remove();}});document.body.append(d);d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-message-menu],[data-room-message-menu]');if(b){e.preventDefault();open(b.dataset.roomMessageMenu||b.dataset.messageMenu,b.hasAttribute('data-room-message-menu'));}});
})();