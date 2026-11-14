import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'USDFirm (usdfirm.com) | 美元稳定币底层发行协议与储备金透明度公示',
  description:
    'ShineMight OS Web2.5 稳定币底层发行与锚定资产矩阵：USDF 铸造/销毁协议、多签时间锁财资池与实时储备金证明 (PoR)，严格物理隔离于交易所撮合与用户钱包网关。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-[#090A0F] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
