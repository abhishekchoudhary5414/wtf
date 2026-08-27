import type { Metadata } from 'next';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'WTF | Work Through Frustration',
  description: 'WTF admin authentication portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
