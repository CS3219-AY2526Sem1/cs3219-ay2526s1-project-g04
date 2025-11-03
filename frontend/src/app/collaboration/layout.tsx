'use client';

import * as React from 'react';
import CollabNavigationBar from '@/components/ui/collaboration/collabTopNav';
import AuthGuard from '@/lib/utils/AuthGuard';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);
  return (
    <AuthGuard>
      <>
        <CollabNavigationBar onHeightChange={setAppBarHeight} />

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
    </AuthGuard>
  );
}
