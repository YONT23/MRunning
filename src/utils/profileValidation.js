export function normalizeProfileDraft(
  nameText,
  weightText,
  goalText
) {
  const name = String(nameText ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (name.length > 60) {
    throw new Error(
      'El nombre no puede superar 60 caracteres.'
    );
  }

  const rawWeight = String(weightText ?? '')
    .trim()
    .replace(',', '.');

  const weightKg = rawWeight === ''
    ? null
    : Number(rawWeight);

  if (
    rawWeight !== '' &&
    (!Number.isFinite(weightKg) ||
      weightKg < 20 ||
      weightKg > 350)
  ) {
    throw new Error(
      'El peso debe estar entre 20 y 350 kg, o quedar vacío.'
    );
  }

  const rawGoal = String(goalText ?? '')
    .trim()
    .replace(',', '.');

  const goalKm = Number(rawGoal);

  if (
    rawGoal === '' ||
    !Number.isFinite(goalKm) ||
    goalKm < 1 ||
    goalKm > 500
  ) {
    throw new Error(
      'La meta debe estar entre 1 y 500 km por semana.'
    );
  }

  return { name, weightKg, goalKm };
}
