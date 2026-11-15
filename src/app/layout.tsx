import type { Metadata, Viewport } from 'next';
import { UsdfirmLocaleProvider } from '@/lib/usdfirm/i18n';
import { SofaYesSplash } from '@/components/ui/SofaYesSplash';
import { UI_PREF_BOOTSTRAP_SCRIPT } from '@/lib/uiPreferences';
import './globals.css';

const SITE_TITLE =
  'USDFirm (usdfirm.com) | 美元稳定币底层发行协议与储备金透明度公示';
const SITE_DESC =
  'ShineMight OS Web2.5 稳定币底层发行与锚定资产矩阵：USDF 铸造/销毁协议、3-of-5 多签时间锁财资池与实时储备金证明 (PoR)，严格物理隔离于二级市场撮合与用户钱包管理。';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#111215',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usdfirm.com'),
  title: SITE_TITLE,
  description: SITE_DESC,
  alternates: {
    canonical: 'https://www.usdfirm.com/',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: 'https://www.usdfirm.com/',
    siteName: 'USDFirm Stablecoin Protocol',
    locale: 'zh_CN',
    type: 'website',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'USDFirm Stablecoin Issuance & Proof-of-Reserves Protocol',
  url: 'https://www.usdfirm.com/',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  inLanguage: ['zh-CN', 'en'],
  description: SITE_DESC,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: UI_PREF_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="bg-[#111215] text-[#F4F4F6] antialiased selection:bg-[#00DC6D]/25 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <UsdfirmLocaleProvider>
          <SofaYesSplash appLabel="USDFirm · USDF Protocol" />
          {children}
        </UsdfirmLocaleProvider>
      </body>
    </html>
  );
}
