const normalizeCategoryName = (name = '') => (
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(55, 65, 81, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isReunioesCategory(category) {
  return normalizeCategoryName(category?.nome || category?.name) === 'reunioes';
}

export function getCategoryColor(category) {
  return isReunioesCategory(category)
    ? 'var(--category-reunioes-color)'
    : category?.cor_hex || '#374151';
}

export function getCategoryDotStyle(category) {
  const color = isReunioesCategory(category)
    ? 'var(--category-reunioes-dot)'
    : category?.cor_hex || '#374151';

  return { backgroundColor: color, color };
}

export function getCategoryChipStyle(category, backgroundAlpha = 0.12, borderAlpha = 0.25) {
  if (isReunioesCategory(category)) {
    return {
      backgroundColor: 'var(--category-reunioes-bg)',
      borderColor: 'var(--category-reunioes-border)',
      color: 'var(--category-reunioes-color)',
    };
  }

  const color = category?.cor_hex || '#374151';
  return {
    backgroundColor: hexToRgba(color, backgroundAlpha),
    borderColor: hexToRgba(color, borderAlpha),
    color,
  };
}
