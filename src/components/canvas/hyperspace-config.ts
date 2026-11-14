export interface StarColor {
  key: string;
  label: string;
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
    domainGroup: 'setupyes / taxyesai / uptoyes',
    r: 16,
    g: 185,
    b: 129,
    hex: '#10b981',
  },
  {
    key: 'amber',
    label: '金控清算',
    domainGroup: 'xpayes / itiscoin / asdcoin',
    r: 245,
    g: 158,
    b: 11,
    hex: '#f59e0b',
  },
  {
    key: 'cyan',
    label: 'AI 算力',
    domainGroup: 'sofayes / idles / fitjob / tocads',
    r: 0,
    g: 229,
    b: 255,
    hex: '#00e5ff',
  },
  {
    key: 'purple',
    label: '零售消费',
    domainGroup: 'hmm.sale / sheng.sale / dezi.life',
    r: 168,
    g: 85,
    b: 247,
    hex: '#a855f7',
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
