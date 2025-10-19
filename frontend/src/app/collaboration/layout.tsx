'use client';

import * as React from 'react';
import TopNavigationBar from '@/components/ui/home/top-nav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);
  return (
    <>
      <TopNavigationBar onHeightChange={setAppBarHeight} />

      <main
        className="flex p-5"
        style={{
          marginTop: appBarHeight,
          height: `calc(100vh - ${appBarHeight}px)`,
        }}
      >
        {children}
      </main>
    </>
  );
}
