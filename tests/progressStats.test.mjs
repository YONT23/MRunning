import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateProgress} from '../src/utils/progressStats.js';

const now=new Date(2026,9,27,18);

const date=day =>
  new Date(2026,9,day,12).toISOString();

const run=(day,distance,elapsed,type='running',splits=[])=>({
  id:`${day}-${distance}`,
  date:date(day),
  distance,
  elapsed,
  activityType:type,
  splits,
});

test('Filtra actividades por período',()=>{
  const history=[
    run(15,9000,2800),
    run(25,2000,800,'walking'),
    run(27,5000,1500),
  ];

  const result=calculateProgress(history,{
    period:'7d',
    now,
  });

  assert.equal(result.meters,7000);
  assert.equal(result.count,2);
});

test('Separa correr y caminar',()=>{
  const history=[
    run(25,2000,800,'walking'),
    run(27,5000,1500),
  ];

  const result=calculateProgress(history,{
    period:'7d',
    type:'running',
    now,
  });

  assert.equal(result.meters,5000);
});

test('Calcula ritmo medio ponderado',()=>{
  const result=calculateProgress([
    run(25,3000,1200),
    run(26,2000,1100),
  ],{now});

  assert.equal(
    result.averagePaceSecondsPerKm,
    460
  );
});

test('Obtiene mejor parcial de 3 km',()=>{
  const splits=[310,305,299,308,302].map(
    (seconds,i)=>({
      km:i+1,
      seconds,
      partial:false,
    })
  );

  const result=calculateProgress([
    run(27,5020,1524,'running',splits),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===3).result.seconds,
    909
  );
});

test('No inventa récord de 5 km',()=>{
  const result=calculateProgress([
    run(27,4800,1400),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===5).result,
    null
  );
});

test('Diferencia récords de running y caminata',()=>{
  const splits=Array.from({length:10},(_,i)=>({
    km:i+1,
    seconds:300,
    partial:false,
  }));

  const result=calculateProgress([
    run(27,10000,3000,'walking',splits),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===10).result,
    null
  );
});

test('Desbloquea logros correctamente',()=>{
  const result=calculateProgress([
    run(25,1000,360),
    run(26,1500,450),
    run(27,2000,600),
  ],{now});

  assert.equal(
    result.achievements.find(a=>a.id==='streak3').done,
    true
  );
});
