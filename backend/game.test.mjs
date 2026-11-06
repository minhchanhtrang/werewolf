import test from "node:test";
import assert from "node:assert/strict";
import { beginGame, act, advanceGame, gameView, leaveGame } from "./game.mjs";
import { validateRoles } from "../js/rules.js";

function fixture(roles = ["wolf","wolf","seer","guard","witch","hunter","idiot","villager","villager","villager"]) {
  const members = roles.map((role,i) => ({id:i+1,username:"P"+(i+1)}));
  const game = beginGame({players:roles.map((role,i)=>({id:i+1,role}))},members,Date.now());
  advanceGame(game,game.deadline);
  return game;
}
const next = g => advanceGame(g,g.deadline);
const action = (g,id,targetId,kind) => act(g,id,{phaseId:g.phaseId,targetId,kind});
function voting(g) { let n=0; while(g.phase!=="voting" && g.phase!=="ended" && n++<10) next(g); assert.equal(g.phase,"voting"); }

test("Đêm tuần tự, chặn sai vai, soi riêng, cấm bảo vệ lặp",()=>{
  const g=fixture(); assert.equal(g.phase,"guard");
  action(g,4,3); assert.throws(()=>action(g,1,8)); next(g);
  action(g,1,3); action(g,2,3); assert.throws(()=>action(g,1,2)); next(g);
  assert.equal(g.phase,"seer"); action(g,3,1);
  assert.match(gameView(g,3).seerResult.text,/là Sói/);
  assert.equal(gameView(g,1).seerResult,null); assert.throws(()=>action(g,3,2));
  next(g); assert.equal(g.phase,"witch"); assert.equal(gameView(g,5).witch.canHeal,false);
  next(g); assert.ok(g.players[2].alive); voting(g); next(g); next(g);
  assert.equal(g.phase,"guard"); assert.throws(()=>action(g,4,3));
});

test("Phù thủy cứu đêm đầu và dùng cả hai bình, không lộ nạn nhân",()=>{
  const g=fixture(); next(g); action(g,1,8); action(g,2,8); next(g); next(g);
  assert.ok(g.players[7].alive);
  const view=gameView(g,5); assert.equal(view.witch.canHeal,true); assert.equal("victimId" in view.witch,false);
  assert.equal(gameView(g,8).witch,null); action(g,5,null,"heal"); action(g,5,9,"poison");
  assert.throws(()=>action(g,5,null,"heal")); assert.throws(()=>action(g,5,10,"poison"));
  const restored=JSON.parse(JSON.stringify(g)); next(restored);
  assert.ok(restored.players[7].alive); assert.equal(restored.players[8].alive,false);
  assert.deepEqual(restored.witchPotions,{heal:false,poison:false});
});

test("Bình độc xuyên Bảo vệ, cứu không chống độc",()=>{
  const g=fixture(); action(g,4,8); next(g); action(g,1,9); action(g,2,9); next(g); next(g);
  action(g,5,null,"heal"); action(g,5,8,"poison"); next(g);
  assert.ok(g.players[8].alive); assert.equal(g.players[7].alive,false);
});

test("Vai được chia nhưng đã chết vẫn có đủ lượt và thời gian như khi còn sống",()=>{
  const a=fixture(), b=fixture(); b.players[4].alive=false; b.players[2].alive=false; b.players[3].alive=false;
  for(let i=0;i<4;i++) { assert.equal(a.phase,b.phase); assert.equal(a.deadline-a.phaseStartedAt,b.deadline-b.phaseStartedAt); next(a); next(b); }
  assert.equal(a.phase,"dawn"); assert.equal(b.phase,"dawn");
});

test("Sói xem mục tiêu riêng; hòa chọn ngẫu nhiên trong nhóm cao nhất",()=>{
  let hits=new Set();
  for(let i=0;i<80;i++) {
    const g=fixture(); next(g); action(g,1,8); action(g,2,9);
    assert.equal(gameView(g,1).wolfChoices[1].targetName,"P9");
    assert.deepEqual(gameView(g,3).wolfChoices,[]); next(g);
    assert.ok([8,9].includes(g.pendingAttackId)); hits.add(g.pendingAttackId);
  }
  assert.equal(hits.size,2);
});

test("Thảo luận 120 giây; phiếu trắng kín; tất cả vote rút còn 5 giây",()=>{
  const g=fixture(); voting(g);
  assert.equal(g.deadline-g.phaseStartedAt,120000);
  // Dùng thời gian thực để gửi các phiếu trong cùng một lượt đang diễn ra.
  g.phaseStartedAt=Date.now(); g.deadline=Date.now()+120000;
  action(g,1,null,"blank"); assert.equal(gameView(g,1).hasVoted,true);
  assert.equal(gameView(g,2).hasVoted,false); assert.equal(gameView(g,2).revealedVotes.length,0);
  for(let id=2;id<=10;id++) action(g,id,null,"blank");
  assert.ok(g.deadline-Date.now()<=5000); next(g);
  assert.ok(g.players.every(p=>p.alive));
});

test("Thằng ngu thuộc phe thứ ba, thắng ngay khi bị vote loại",()=>{
  const g=fixture(); voting(g); action(g,3,7); next(g);
  assert.equal(g.players[6].alive,false);
  assert.equal(g.phase,"ended"); assert.equal(g.winner,"idiot");
  assert.equal(gameView(g,1).winner,"idiot");
  assert.equal(gameView(g,1).roster[6].role,"idiot");
  assert.equal(g.deadline,null);
});

test("Thợ săn bắn khi bị Sói/treo cổ, trì hoãn thắng; độc không được bắn",()=>{
  const g=fixture(); voting(g); action(g,3,6); next(g);
  assert.equal(g.phase,"hunter"); assert.equal(gameView(g,6).hunterTurn,true);
  action(g,6,1); assert.throws(()=>action(g,6,2)); next(g); assert.equal(g.players[0].alive,false);
  const h=fixture(); next(h); action(h,1,6); action(h,2,6); next(h); next(h); next(h);
  assert.equal(h.phase,"hunter"); action(h,6,null,"skip"); next(h); assert.equal(h.phase,"dawn");
  const p=fixture(); next(p); next(p); next(p); action(p,5,6,"poison"); next(p);
  assert.equal(p.phase,"dawn"); assert.equal(gameView(p,6).hunterTurn,false);
});

test("Bỏ API tự sát tức thì; rời ván và điều kiện thắng",()=>{
  const g=fixture();
  for(const id of [1,3,4,5,6,7,8]) assert.throws(()=>action(g,id,null,"suicide"),/chọn chính mình/);
  assert.ok(g.players.every(p=>p.alive));
  voting(g);
  leaveGame(g,1); leaveGame(g,2); assert.equal(g.phase,"ended"); assert.equal(g.winner,"villagers");
  assert.ok(gameView(g,3).roster.every(p=>p.role)); assert.equal(g.deadline,null);
});

test("Sói chọn chính mình là nạn nhân, chờ cuối đêm và có thể được cứu",()=>{
  const g=fixture(); next(g); action(g,1,1);
  assert.equal(g.actions[1],1); assert.ok(g.players[0].alive);
  assert.throws(()=>action(g,2,1));
  next(g); assert.equal(g.pendingAttackId,1); next(g);
  action(g,5,null,"heal"); next(g); assert.ok(g.players[0].alive);
  const h=fixture(); next(h); action(h,1,1); next(h); next(h); next(h);
  assert.equal(h.players[0].alive,false); assert.ok(h.players[1].alive);
});

test("Thằng ngu không thắng khi hòa phiếu hoặc chết trong đêm",()=>{
  const tied=fixture(); voting(tied); action(tied,3,7); action(tied,4,8); next(tied);
  assert.equal(tied.winner,null); assert.ok(tied.players[6].alive);
  const wolf=fixture(); next(wolf); action(wolf,1,7); action(wolf,2,7); next(wolf); next(wolf); next(wolf);
  assert.equal(wolf.players[6].alive,false); assert.notEqual(wolf.winner,"idiot");
  const poisoned=fixture(); next(poisoned); next(poisoned); next(poisoned); action(poisoned,5,7,"poison"); next(poisoned);
  assert.equal(poisoned.players[6].alive,false); assert.notEqual(poisoned.winner,"idiot");
});

test("Bộ vai tùy chọn hợp lệ; chặn thiếu người, vai lạ và quá nhiều Sói",()=>{
  assert.equal(validateRoles({wolf:2,villager:5},7).wolf,2);
  assert.throws(()=>validateRoles({wolf:2,villager:4},7));
  assert.throws(()=>validateRoles({wolf:3,villager:2},5));
  assert.throws(()=>validateRoles({wolf:1,witch:2,villager:2},5));
  assert.throws(()=>validateRoles({wolf:1,villager:4,admin:0},5));
});

test("Sói chọn theo đa số; Thợ săn trúng độc cùng lượt không được bắn",()=>{
  const g=fixture(); next(g); action(g,1,8); action(g,2,8); next(g);
  assert.equal(g.pendingAttackId,8); next(g); action(g,5,6,"poison"); next(g);
  assert.equal(g.players[7].alive,false); assert.equal(g.players[5].alive,false);
  assert.equal(g.phase,"dawn");
});

test("Phiếu trắng dẫn đầu hoặc hòa người nhiều phiếu nhất thì không loại ai",()=>{
  for(const [blank, targeted, dies] of [[3,1,false],[1,1,false],[1,2,true],[3,0,false],[0,0,false]]) {
    const g=fixture(); voting(g);
    for(let i=1;i<=blank;i++) action(g,i,null,"blank");
    for(let i=blank+1;i<=blank+targeted;i++) action(g,i,8);
    next(g); assert.equal(g.players[7].alive,!dies);
    assert.equal(g.revealedVotes.filter(([,target])=>target===null).length,blank);
    if(dies) assert.throws(()=>action(g,8,1));
  }
});

test("Phiếu trắng của người đã rời ván không được tính",()=>{
  const g=fixture(); voting(g);
  action(g,1,null,"blank"); action(g,3,8);
  leaveGame(g,1); next(g);
  assert.equal(g.players[7].alive,false);
  assert.deepEqual(g.revealedVotes,[[3,8]]);
});

test("Thợ săn bắn xong mới xét thắng; quá giờ thì bỏ phát bắn",()=>{
  const g=fixture(["wolf","hunter","villager","villager","villager"]);
  g.players[3].alive=g.players[4].alive=false;
  action(g,1,2); next(g);
  assert.equal(g.phase,"hunter"); assert.equal(g.winner,null);
  action(g,2,1); next(g); assert.equal(g.winner,"villagers");
  const h=fixture(); voting(h); action(h,3,6); next(h); next(h);
  assert.equal(h.phase,"revealed"); assert.equal(h.hunterPending,null);
});

test("Bỏ lượt và log vai không được chia; giữ lượt vai đã chết ở mọi bộ vai",()=>{
  const optional=[['guard','guard','Bảo vệ'],['seer','seer','Tiên tri'],['witch','witch','Phù thủy']];
  for(let mask=0;mask<8;mask++) for(const dead of [false,true]) {
    const chosen=optional.filter((_,i)=>mask & (1<<i));
    const roles=['wolf',...chosen.map(([role])=>role),...Array(5).fill('villager')];
    const g=fixture(roles);
    if(dead) for(const p of g.players) if(chosen.some(([role])=>role===p.role)) p.alive=false;
    const phases=[];
    for(let n=0;n<8 && g.phase!=='voting';n++){ phases.push(g.phase); next(g); }
    assert.equal(g.phase,'voting');
    assert.deepEqual(phases,[...(mask&1?['guard']:[]),'night',...(mask&2?['seer']:[]),...(mask&4?['witch']:[]),'dawn']);
    for(let i=0;i<optional.length;i++) if(!(mask&(1<<i))) assert.ok(g.history.every(e=>!e.text.includes(optional[i][2])));
  }
});
