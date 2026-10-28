export function validatePlan(p) {
  if (!p || p.kind === 'free') {
    return { kind: 'free' };
  }

  if (
    p.kind === 'distance' &&
    Number.isFinite(p.meters) &&
    p.meters >= 500 &&
    p.meters <= 100000
  ) {
    return {
      kind: 'distance',
      meters: p.meters,
    };
  }

  if (
    p.kind === 'time' &&
    Number.isFinite(p.seconds) &&
    p.seconds >= 60 &&
    p.seconds <= 21600
  ) {
    return {
      kind: 'time',
      seconds: p.seconds,
    };
  }

  if (
    p.kind === 'pace' &&
    Number.isFinite(p.paceSeconds) &&
    p.paceSeconds >= 120 &&
    p.paceSeconds <= 1200
  ) {
    return {
      kind: 'pace',
      paceSeconds: p.paceSeconds,
    };
  }

  if (
    p.kind === 'intervals' &&
    Number.isInteger(p.sets) &&
    p.sets >= 1 &&
    p.sets <= 30 &&
    [p.warmup, p.work, p.recovery, p.cooldown].every(
      v => Number.isInteger(v) && v >= 0 && v <= 7200
    ) &&
    p.work > 0
  ) {
    return {
      kind: 'intervals',
      sets: p.sets,
      warmup: p.warmup,
      work: p.work,
      recovery: p.recovery,
      cooldown: p.cooldown,
    };
  }

  throw new Error('Plan de entrenamiento inválido');
}

export function trainingProgress(
  plan,
  seconds = 0,
  meters = 0
) {
  const p = validatePlan(plan);
  const t = Math.max(0, seconds);
  const d = Math.max(0, meters);

  if (p.kind === 'free') {
    return {
      title: 'Carrera libre',
      detail: 'Sin objetivo',
      progress: null,
      stage: 'free',
      complete: false,
    };
  }

  if (p.kind === 'distance') {
    return {
      title: 'Objetivo distancia',
      detail:
        (d / 1000).toFixed(2) +
        ' / ' +
        (p.meters / 1000).toFixed(1) +
        ' km',
      progress: Math.min(1, d / p.meters),
      stage: 'distance',
      complete: d >= p.meters,
    };
  }

  if (p.kind === 'time') {
    return {
      title: 'Objetivo tiempo',
      detail:
        Math.floor(t / 60) +
        ' / ' +
        Math.floor(p.seconds / 60) +
        ' min',
      progress: Math.min(1, t / p.seconds),
      stage: 'time',
      complete: t >= p.seconds,
    };
  }

  if (p.kind === 'pace') {
    const current = d >= 300 && t >= 60
      ? t / (d / 1000)
      : null;

    return {
      title: 'Ritmo objetivo',
      detail: current === null
        ? 'Recorre 300 m para comparar'
        : current <= p.paceSeconds
          ? 'En ritmo objetivo'
          : 'Por encima del tiempo objetivo',
      progress: null,
      stage: 'pace',
      complete: false,
    };
  }

  let remaining = t;

  if (remaining < p.warmup) {
    return {
      title: 'Calentamiento',
      detail: 'Inicio suave',
      progress: remaining / Math.max(1, p.warmup),
      stage: 'warmup',
      complete: false,
    };
  }

  remaining -= p.warmup;

  for (let i = 0; i < p.sets; i++) {
    if (remaining < p.work) {
      return {
        title: 'Serie ' + (i + 1) + '/' + p.sets,
        detail: 'Ritmo de trabajo',
        progress: remaining / p.work,
        stage: 'work-' + i,
        complete: false,
      };
    }

    remaining -= p.work;

    if (i < p.sets - 1 && p.recovery > 0) {
      if (remaining < p.recovery) {
        return {
          title: 'Recuperación ' + (i + 1),
          detail: 'Camina o trota suave',
          progress: remaining / p.recovery,
          stage: 'recovery-' + i,
          complete: false,
        };
      }

      remaining -= p.recovery;
    }
  }

  if (remaining < p.cooldown) {
    return {
      title: 'Vuelta a la calma',
      detail: 'Baja el ritmo',
      progress: remaining / Math.max(1, p.cooldown),
      stage: 'cooldown',
      complete: false,
    };
  }

  return {
    title: 'Intervalos completados',
    detail: 'Puedes finalizar la carrera',
    progress: 1,
    stage: 'finished',
    complete: true,
  };
}
