
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { Cairo } from 'next/font/google';
import { FirebaseClientProvider } from '@/firebase';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'نبض الملاعب',
  description: 'عالم كرة القدم بين يديك',
  manifest: `${basePath}/manifest.json`,
};

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-cairo',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const manifestPath = `${basePath}/manifest.json`;

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <link rel="manifest" href={manifestPath} />
          <link rel="apple-touch-icon" href={`${basePath}/icons/icon-192x192.png`}></link>
          <meta name="theme-color" content="#000000" />
        </head>
        <body className={`${cairo.variable} font-body antialiased`}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                themes={['light', 'dark']}
            >
              <FirebaseClientProvider>
                {children}
              </FirebaseClientProvider>
              <Toaster />
            </ThemeProvider>
        </body>
    </html>
  );
}
