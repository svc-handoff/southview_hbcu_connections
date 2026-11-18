const test=require('node:test');
const assert=require('node:assert/strict');
const {readColleges,install}=require('../sheet-content.js');
const columns=['Published','College','ID','Founded','Color','Image','Short Mark','Founding Note','Founding Source','Timeline Start','Timeline Start Label','Timeline End'];
const encode=(heads,rows)=>[heads,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
const row=['TRUE','Example College','example',1900,'','','','Founded as a college.','','','',''];
test('colleges support optional assets, default color, predecessors, and unpublished rows',()=>{
 const result=readColleges(encode(columns,[row,[...row.slice(0,2),'other',...row.slice(3)].map((v,i)=>i===0?'FALSE':v)]));
 assert.equal(result.institutions.length,1);assert.equal(result.institutions[0].color,'#343b36');assert.equal(result.institutions[0].image,'');
 const school=[...row];school[9]=1890;school[10]='Earlier College';assert.equal(readColleges(encode(columns,[school])).institutions[0].timelineStart,1890);
});
test('invalid college fields and duplicates are rejected with field-specific messages',()=>{
 for(const [index,value,field] of [[3,'no','Founded'],[4,'red','Color'],[5,'javascript:alert(1)','Image'],[7,'','Founding Note'],[8,'bad','Founding Source']]){
  const changed=[...row];changed[index]=value;const result=readColleges(encode(columns,[changed]));assert.equal(result.institutions.length,0);assert.match(result.errors[0].message,new RegExp(field));
 }
 assert.match(readColleges(encode(columns,[row,row])).errors[0].message,/duplicate/);
});
test('new college loads before its profiles; failed refresh preserves both feeds',async()=>{
 const heads=['Published','College','Timeline year','Name','Life dates','College connection','Institutional Connection and Legacy','Biography','Photo','Sources','Entry ID'];
 const profile=['TRUE','Example College',1940,'Example Person','','Graduated.','Led research.','Educator.','','','example-person'];
 const store={institutions:[],people:[],timelines:[],notify(){}};let fail=false;
 const adapter=install(store,{csvUrl:'https://example.org/people',collegesCsvUrl:'https://example.org/colleges'},{fetch:async url=>({ok:!fail,text:async()=>url.includes('/colleges')?encode(columns,[row]):encode(heads,[profile])})});
 assert.equal((await adapter.refresh()).state,'ready');assert.equal(store.institutions[0].id,'example');assert.equal(store.timelines[0].institutionId,'example');assert.equal(store.people.length,1);
 fail=true;assert.equal((await adapter.refresh()).state,'error');assert.equal(store.institutions.length,1);assert.equal(store.people.length,1);
});
