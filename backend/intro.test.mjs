import test from "node:test";
import assert from "node:assert/strict";
import { beginGame, advanceGame, act, gameView } from "./game.mjs";
import { createRoleIntro } from "../js/role-intro.js";

test("10 giây nhận vai chặn kỹ năng, chỉ gửi vai riêng, sau đó Đêm 1",()=>{
  const members=Array.from({length:5},(_,i)=>({id:i+1,username:"P"+i,bot:true}));
  const game=beginGame({players:members.map((m,i)=>({id:m.id,role:i===0?"wolf":"villager"}))},members,1000);
  assert.equal(game.phase,"intro"); assert.equal(game.deadline,11000);
  assert.equal(gameView(game,1).phaseDuration,10000);
  assert.equal(gameView(game,1).myRole,"wolf");
  assert.ok(gameView(game,2).roster.every(p=>!("role" in p)));
  assert.throws(()=>act(game,1,{phaseId:game.phaseId,targetId:2}));
  advanceGame(game,10999); assert.equal(game.phase,"intro");
  assert.deepEqual(game.actions,{});
  advanceGame(game,11000); assert.equal(game.phase,"guard"); assert.equal(game.day,1);
  assert.equal(game.deadline,31000);
});

test("Lá bài mở một lần, tự đóng sau 5 giây, không mở lại do polling",()=>{
  const events=[]; const sync=createRoleIntro(()=>events.push("show"),()=>events.push("hide"));
  const game={id:"A",phase:"intro",deadline:11000};
  sync(game,1000);sync(game,2000);sync(game,5999);assert.deepEqual(events,["show"]);
  sync(game,6000);sync(game,7000);sync({...game,phase:"guard"},11000);
  assert.deepEqual(events,["show","hide"]);
  sync({...game,id:"B",deadline:21000},12000);assert.equal(events.at(-1),"show");
  sync(null,12500);assert.equal(events.at(-1),"hide");
});

test("Vào muộn/tải lại sau 5 giây không mở lại bài; ẩn tab đóng bài",()=>{
  const events=[];const game={id:"A",phase:"intro",deadline:10000};
  const sync=createRoleIntro(()=>events.push("show"),()=>events.push("hide"));
  sync(game,6000);assert.deepEqual(events,[]);
  sync({...game,id:"B"},1000);sync({...game,id:"B"},2000,false);
  sync({...game,id:"B"},3000,true);assert.deepEqual(events,["show","hide"]);
});
