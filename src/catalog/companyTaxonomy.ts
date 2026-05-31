export const companyCountryIds = ['China', 'United States'] as const;

export type CompanyCountryId = (typeof companyCountryIds)[number];

export const companyCountryLabels: Record<CompanyCountryId, string> = {
  China: '中国',
  'United States': '美国',
};

export const companySectorIds = [
  'Commercial space station',
  'Launch',
  'Lunar commercial services',
  'lunar services',
  'Remote sensing',
  'Satellite communications',
  'Satellite internet',
  'satellite internet',
  'Satellite manufacturing',
  'spacecraft',
  'Space stations',
] as const;

export type CompanySectorId = (typeof companySectorIds)[number];

export const companySectorLabels: Record<CompanySectorId, string> = {
  'Commercial space station': '商业空间站',
  Launch: '发射服务',
  'Lunar commercial services': '月球商业服务',
  'lunar services': '月球服务',
  'Remote sensing': '遥感数据',
  'Satellite communications': '卫星通信',
  'Satellite internet': '卫星互联网',
  'satellite internet': '卫星互联网',
  'Satellite manufacturing': '卫星制造',
  spacecraft: '航天器',
  'Space stations': '空间站',
};

function normalizeTaxonomyText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function companyCountryLabel(country: string): string {
  const normalized = normalizeTaxonomyText(country);

  return companyCountryLabels[normalized as CompanyCountryId] ?? '地区待确认';
}

export function companySectorValues(sector: string): string[] {
  return sector.split(',').map(normalizeTaxonomyText);
}

export function companySectorLabel(sector: string): string {
  const seen = new Set<string>();
  const label = companySectorValues(sector)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((item) => companySectorLabels[item as CompanySectorId] ?? '赛道待确认')
    .join('、');

  return label || '赛道待确认';
}
