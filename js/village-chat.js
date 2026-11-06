export function createVillageChat(send) {
  const panel=document.querySelector('#villageChat'),list=document.querySelector('#villageChatMessages');
  const form=document.querySelector('#villageChatForm'),input=document.querySelector('#villageChatInput');
  const button=document.querySelector('#villageChatSend'),status=document.querySelector('#villageChatStatus');
  let current=null,key='',epoch=0,sending=false;
  const toggle=document.querySelector('#toggleVillageChat');
  toggle.addEventListener('click',()=>{
    const open=panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Thu gọn':'Mở chat';
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!current?.canSend||button.disabled||sending||!input.value.trim())return;
    const text=input.value,version=epoch; sending=true; button.disabled=true;
    try { const ok=await send({gameId:current.gameId,text});
      if(version!==epoch)return;
      if(ok&&input.value===text)input.value='';
      status.textContent=ok?'':'Chưa gửi được tin nhắn.';
    } finally { if(version===epoch){sending=false;button.disabled=!current?.canSend;} }
  });
  return (room,busy)=>{
    const next=room?.villageChat||null;
    if(next?.gameId!==current?.gameId){epoch++;sending=false;key='';input.value='';list.replaceChildren();status.textContent='';}
    current=next;panel.hidden=!current;input.disabled=!current?.canSend;button.disabled=!current?.canSend||busy||sending;
    input.placeholder=current?.canSend?'Nhắn với dân làng…':'Chỉ đọc · Chat mở khi thảo luận';
    if(!current)return;
    const signature=JSON.stringify(current.messages);if(signature===key)return;
    const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<40;
    list.replaceChildren();for(const message of current.messages){
      const item=document.createElement('li'),name=document.createElement('strong'),text=document.createElement('span');
      name.textContent=message.name+': ';text.textContent=message.text;item.append(name,text);list.append(item);
    }
    if(bottom)list.scrollTop=list.scrollHeight;key=signature;
  };
}
