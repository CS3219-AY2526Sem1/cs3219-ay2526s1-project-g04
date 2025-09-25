import type { Metadata } from "next";
import { openSans, orbitron, sourceCodePro } from "@/styles/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "PeerPrep",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${openSans.variable} ${sourceCodePro.variable} antialiased`}
        style={{
          fontSize: '18px'
        }}
      >
        {children}
      </body>
    </html>
  );
}
