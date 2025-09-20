import type { Metadata } from "next";
import { openSans, orbitron, sourceCodePro } from "@/app/ui/fonts";
import "@/app/ui/globals.css";

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
          fontSize: '15px'
        }}
      >
        {children}
      </body>
    </html>
  );
}
