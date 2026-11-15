export interface StarColor {
  key: string;
  label: string;
  labelEn: string;
  domainGroup: string;
  r: number;
  g: number;
  b: number;
  hex: string;
}

export const MATRIX_PALETTE: StarColor[] = [
  {
    key: 'emerald',
    label: '企服基建',
    labelEn: 'B2B Infra',
    domainGroup: 'setupyes / taxyesai / uptoyes',
    r: 0,
    g: 220,
    b: 109,
    hex: '#00DC6D',
  },
  {
    key: 'amber',
    label: '金控清算',
    labelEn: 'FinTech Core',
    domainGroup: 'xpayes / usdfirm / itiscoin',
    r: 212,
    g: 168,
    b: 83,
    hex: '#D4A853',
  },
  {
    key: 'cyan',
    label: 'AI 算力',
    labelEn: 'AI & Compute',
    domainGroup: 'sofayes / idles / fitjob / tocads',
    r: 45,
    g: 212,
    b: 191,
    hex: '#2DD4BF',
  },
  {
    key: 'purple',
    label: '零售消费',
    labelEn: 'Retail Matrix',
    domainGroup: 'hmm.sale / sheng.sale / dezi.life',
    r: 216,
    g: 180,
    b: 254,
    hex: '#D8B4FE',
  },
];

export interface StarParticle {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  isHighlight: boolean;
}

export function createStarParticle(
  initial: boolean,
  width: number,
  activeKeys: string[]
): StarParticle {
  const angle = Math.random() * Math.PI * 2;
  const radius = 12 + Math.sqrt(Math.random()) * width * 1.4;
  const active = MATRIX_PALETTE.filter((c) => activeKeys.includes(c.key));
  const pool = active.length > 0 ? active : MATRIX_PALETTE;
  const isBg = Math.random() < 0.28;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: initial ? Math.random() * 5000 : 5000,
    r: isBg ? 90 : chosen.r,
    g: isBg ? 100 : chosen.g,
    b: isBg ? 120 : chosen.b,
    isHighlight: !isBg,
  };
}
