// fonts accessed via https://fonts.google.com/

import { Open_Sans, Orbitron, Source_Code_Pro } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'], // light, regular, medium, semibold, bold, extrabold
  variable: '--font-open-sans',
});

export const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['600'], // semibold
  variable: '--font-orbitron',
});

export const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500'], // regular, medium
  variable: '--font-source-code-pro',
});
