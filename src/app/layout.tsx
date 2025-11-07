
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { Cairo } from 'next/font/google';
import { FirebaseClientProvider } from '@/firebase';

const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';

export const metadata: Metadata = {
  title: 'نبض الملاعب',
  description: 'عالم كرة القدم بين يديك',
  manifest: repoName ? `/${repoName}/manifest.json` : '/manifest.json',
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
  const manifestPath = repoName ? `/${repoName}/manifest.json` : '/manifest.json';
  const iconPath = repoName ? `/${repoName}/icons/icon-192x192.png` : '/icons/icon-192x192.png';

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <link rel="manifest" href={manifestPath} />
          <link rel="apple-touch-icon" href={iconPath}></link>
          <meta name="theme-color" content="#000000" />
          <meta name="background-color" content="#000000" />
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
