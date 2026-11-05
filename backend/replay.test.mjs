import test from "node:test";
import assert from "node:assert/strict";
import { requestReplay, voteReplay, settleReplay, replayView } from "./replay.mjs";

const fixture = () => ({ id: "game-1", phase: "night", players: [1,2,3,4].map(id => ({id,alive:id!==2,bot:false})).concat({id:-1,bot:true}) });
const cast = (game, id, agree, now=1000) => voteReplay(game,id,{gameId:game.id,voteId:game.replayVote.id,agree},now);

test("Chơi lại cần quá nửa người thật; người chết được vote; không đếm phiếu lặp",()=>{
  const g=fixture(); assert.equal(requestReplay(g,1,[1,2,3,4],1000),false);
  assert.equal(replayView(g,2).required,3);
  assert.equal(cast(g,2,true),false); assert.equal(cast(g,2,true),false);
  assert.equal(replayView(g,1).yes,2);
  assert.equal(cast(g,3,true),true);
  assert.equal(g.replayVote.status,"approved");
});
test("Chặn bot, sai ván, sai biểu quyết; một người thật tự đủ đa số",()=>{
  const g=fixture(); requestReplay(g,1,[1,2,3,4],1000);
  assert.throws(()=>cast(g,-1,true));
  assert.throws(()=>voteReplay(g,2,{gameId:"old",voteId:g.replayVote.id,agree:true},1000));
  assert.throws(()=>voteReplay(g,2,{gameId:g.id,voteId:"old",agree:true},1000));
  assert.throws(()=>cast(g,2,"yes"));
  assert.throws(()=>requestReplay(g,1,[1,2,3,4],1001));
  const solo=fixture(); assert.equal(requestReplay(solo,1,[1],1000),true);
});
test("Hết giờ hoặc tất cả vote mà thiếu đa số thì từ chối; cho yêu cầu mới",()=>{
  const g=fixture(); requestReplay(g,1,[1,2,3,4],1000);
  const oldId=g.replayVote.id;
  assert.equal(settleReplay(g,31000),false); assert.equal(g.replayVote.status,"rejected");
  requestReplay(g,1,[1,2,3,4],32000); assert.notEqual(g.replayVote.id,oldId);
  cast(g,2,false,32000); cast(g,3,false,32000); cast(g,4,true,32000);
  assert.equal(g.replayVote.status,"rejected");
  assert.equal(g.phase,"night");
});
