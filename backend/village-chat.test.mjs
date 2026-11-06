import test from "node:test";
import assert from "node:assert/strict";
import { readVillageChat, sendVillageChat, clearVillageChat } from "./village-chat.mjs";
const fixture=id=>({id,version:1,phase:'voting',players:[{id:1,name:'A',role:'villager',alive:true},{id:2,name:'B',role:'wolf',alive:true},{id:3,name:'C',alive:false}]});
test('Chat chung: ban ngày người sống gửi, người chết chỉ đọc, ban đêm khóa gửi',()=>{
  const g=fixture('chat-permission');
  sendVillageChat(g,1,{gameId:g.id,text:'Xin chào'},1000);
  assert.equal(readVillageChat(g,2).messages[0].text,'Xin chào');
  assert.equal(readVillageChat(g,3).canSend,false);
  assert.throws(()=>sendVillageChat(g,3,{gameId:g.id,text:'leak'},1000));
  assert.equal(readVillageChat(g,99),null);
  g.phase='night';assert.equal(readVillageChat(g,1).messages.length,1);
  assert.throws(()=>sendVillageChat(g,1,{gameId:g.id,text:'leak'},5000));
  g.phase='ended';assert.equal(readVillageChat(g,1),null);clearVillageChat(g.id);
});
test('Chat chung: gửi liên tiếp, chặn sai ván và nội dung không hợp lệ',()=>{
  const g=fixture('chat-input');
  for(const text of ['', 'a'.repeat(301),'\u0000',null]) assert.throws(()=>sendVillageChat(g,1,{gameId:g.id,text},1000));
  assert.throws(()=>sendVillageChat(g,1,{gameId:'old',text:'Hi'},1000));
  sendVillageChat(g,1,{gameId:g.id,text:'<img onerror=alert(1)>'},1000);
  assert.doesNotThrow(()=>sendVillageChat(g,1,{gameId:g.id,text:'Tin tiếp theo'},1000));
  assert.equal(readVillageChat(g,1).messages.length,2);
  assert.equal(readVillageChat(g,1).messages[0].text,'<img onerror=alert(1)>');clearVillageChat(g.id);
});
test('Chat chung: tối đa 50 tin, cách ly phòng, xóa khi kết thúc',()=>{
  const g=fixture('chat-limit');
  for(let i=0;i<55;i++)sendVillageChat(g,1,{gameId:g.id,text:String(i)},i*2000);
  assert.equal(readVillageChat(g,1).messages.length,50);
  assert.equal(readVillageChat(fixture('another'),1).messages.length,0);
  clearVillageChat(g.id);assert.equal(readVillageChat(g,1).messages.length,0);
});
