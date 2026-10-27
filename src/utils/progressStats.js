const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];

const DAYS = ['D','L','M','X','J','V','S'];
const DISTANCES = [1,3,5,10];

function dayStart(d) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function addDays(d, n) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function validHistory(history, now) {
  return (Array.isArray(history) ? history : [])
    .filter(e =>
      e &&
      Number.isFinite(e.distance) &&
      e.distance > 0 &&
      Number.isFinite(e.elapsed) &&
      e.elapsed > 0
    )
    .map(e => ({
      ...e,
      parsedDate: new Date(e.date),
    }))
    .filter(e =>
      Number.isFinite(e.parsedDate.getTime()) &&
      e.parsedDate <= now
    )
    .sort((a,b) => a.parsedDate - b.parsedDate);
}

function getStart(now, period) {
  const today = dayStart(now);

  if (period === '7d') return addDays(today,-6);
  if (period === '30d') return addDays(today,-29);

  if (period === '12m') {
    return new Date(
      now.getFullYear(),
      now.getMonth()-11,
      1
    );
  }

  return null;
}

function bucketsFor(entries, period, now) {
  const today = dayStart(now);

  if (period === '7d') {
    const start = addDays(today,-6);

    return Array.from({length:7},(_,i) => {
      const d = addDays(start,i);

      return {
        key: String(i),
        label: DAYS[d.getDay()],
        meters: 0,
        count: 0,
        start: d,
        end: addDays(d,1),
      };
    });
  }

  if (period === '30d') {
    const start = addDays(today,-29);

    return Array.from({length:5},(_,i) => ({
      key: String(i),
      label: `S${i+1}`,
      meters: 0,
      count: 0,
      start: addDays(start,i*7),
      end: addDays(start,Math.min((i+1)*7,30)),
    }));
  }

  if (period === '12m') {
    return Array.from({length:12},(_,i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth()-11+i,
        1
      );

      return {
        key: String(i),
        label: MONTHS[d.getMonth()],
        meters: 0,
        count: 0,
        start: d,
        end: new Date(
          d.getFullYear(),
          d.getMonth()+1,
          1
        ),
      };
    });
  }

  const firstYear = entries.length
    ? entries[0].parsedDate.getFullYear()
    : now.getFullYear();

  const count = Math.max(
    1,
    now.getFullYear()-firstYear+1
  );

  return Array.from({length:count},(_,i) => {
    const year = firstYear+i;

    return {
      key: String(year),
      label: String(year),
      meters: 0,
      count: 0,
      start: new Date(year,0,1),
      end: new Date(year+1,0,1),
    };
  });
}

// Mejor tramo consecutivo de N kilómetros.
// Solo utiliza parciales completos y válidos.
function bestPartial(entries,kms) {
  let best = null;

  for (const entry of entries) {
    const splits = Array.isArray(entry.splits)
      ? entry.splits
      : [];

    for (let i=0;i+kms<=splits.length;i++) {
      const section = splits.slice(i,i+kms);

      const valid = section.every((s,j) =>
        !s.partial &&
        Number.isFinite(s.seconds) &&
        s.seconds > 0 &&
        Number.isInteger(s.km) &&
        (!j || s.km === section[j-1].km+1)
      );

      if (!valid) continue;

      const seconds = section.reduce(
        (sum,s) => sum+s.seconds,0
      );

      if (!best || seconds < best.seconds) {
        best = {
          distanceKm: kms,
          seconds,
          id: entry.id,
          date: entry.date,
          estimated: false,
        };
      }
    }
  }

  return best;
}

function personalRecords(runs) {
  const records = DISTANCES.map(km => ({
    km,
    result: bestPartial(runs,km),
  }));

  const target = 21097.5;
  let half = null;

  for (const run of runs) {
    if (
      run.distance < target ||
      run.distance > target*1.02
    ) continue;

    const seconds = run.elapsed*target/run.distance;

    if (!half || seconds < half.seconds) {
      half = {
        distanceKm: 21.0975,
        seconds,
        id: run.id,
        date: run.date,
        estimated: true,
      };
    }
  }

  records.push({
    km: 21.0975,
    result: half,
  });

  return records;
}

function longestStreak(entries) {
  const days = [
    ...new Set(
      entries.map(e => {
        const d = e.parsedDate;

        return Date.UTC(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        )/86400000;
      })
    )
  ].sort((a,b) => a-b);

  let best = 0;
  let current = 0;
  let previous = null;

  for (const day of days) {
    current = day === previous+1
      ? current+1
      : 1;

    best = Math.max(best,current);
    previous = day;
  }

  return best;
}

function getAchievements(entries,runs) {
  const total = entries.reduce(
    (sum,e) => sum+e.distance,0
  );

  const longest = longestStreak(entries);

  const longestRun = runs.reduce(
    (max,e) => Math.max(max,e.distance),0
  );

  const definitions = [
    {
      id:'first',
      title:'Primer paso',
      subtitle:'Completa tu primera actividad',
      icon:'●',
      value:entries.length,
      target:1,
    },
    {
      id:'five',
      title:'Constancia',
      subtitle:'Completa 5 actividades',
      icon:'◆',
      value:entries.length,
      target:5,
    },
    {
      id:'25km',
      title:'25 kilómetros',
      subtitle:'Acumula 25 km',
      icon:'◈',
      value:total,
      target:25000,
    },
    {
      id:'100km',
      title:'100 kilómetros',
      subtitle:'Acumula 100 km',
      icon:'★',
      value:total,
      target:100000,
    },
    {
      id:'streak3',
      title:'Tres días seguidos',
      subtitle:'Entrena durante 3 días consecutivos',
      icon:'↗',
      value:longest,
      target:3,
    },
    {
      id:'streak7',
      title:'Semana activa',
      subtitle:'Entrena durante 7 días consecutivos',
      icon:'✦',
      value:longest,
      target:7,
    },
    {
      id:'run5',
      title:'Corredor 5K',
      subtitle:'Completa una carrera de 5 km',
      icon:'5',
      value:longestRun,
      target:5000,
    },
    {
      id:'run10',
      title:'Corredor 10K',
      subtitle:'Completa una carrera de 10 km',
      icon:'10',
      value:longestRun,
      target:10000,
    },
  ];

  return definitions.map(d => ({
    ...d,
    done:d.value>=d.target,
    progress:Math.min(1,Math.max(0,d.value/d.target)),
  }));
}

export function calculateProgress(
  history,
  {period='30d',type='all',now=new Date()}={}
) {
  const allowedPeriods = ['7d','30d','12m','all'];
  const allowedTypes = ['all','running','walking'];

  const selectedPeriod = allowedPeriods.includes(period)
    ? period
    : '30d';

  const selectedType = allowedTypes.includes(type)
    ? type
    : 'all';

  const all = validHistory(history,now);

  const runs = all.filter(
    e => e.activityType !== 'walking'
  );

  const filtered = all.filter(e =>
    selectedType === 'all' ||
    (e.activityType === 'walking'
      ? 'walking'
      : 'running') === selectedType
  );

  const start = getStart(now,selectedPeriod);

  const selected = filtered.filter(
    e => !start || e.parsedDate>=start
  );

  const meters = selected.reduce(
    (sum,e) => sum+e.distance,0
  );

  const seconds = selected.reduce(
    (sum,e) => sum+e.elapsed,0
  );

  const longestMeters = selected.reduce(
    (max,e) => Math.max(max,e.distance),0
  );

  const buckets = bucketsFor(
    filtered,
    selectedPeriod,
    now
  );

  for (const entry of selected) {
    const bucket = buckets.find(
      b => entry.parsedDate>=b.start &&
           entry.parsedDate<b.end
    );

    if (bucket) {
      bucket.meters+=entry.distance;
      bucket.count++;
    }
  }

  return {
    meters,
    seconds,
    count:selected.length,
    longestMeters,
    averagePaceSecondsPerKm:
      meters>0 ? seconds/(meters/1000) : null,
    buckets,
    records:personalRecords(runs),
    achievements:getAchievements(all,runs),
    historicalCount:all.length,
  };
}
