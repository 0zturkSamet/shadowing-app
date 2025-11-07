import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'ShadowSpeak - Master Languages Through Shadowing',
  description: 'Learn languages naturally by shadowing native speakers in real videos',
  keywords: 'language learning, shadowing, pronunciation, speech practice',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
