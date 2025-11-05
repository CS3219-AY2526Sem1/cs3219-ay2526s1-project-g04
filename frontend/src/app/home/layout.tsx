'use client';

import * as React from 'react';
import TopNavigationBar from '@/components/ui/home/top-nav';
import SideNavigationBar from '@/components/ui/home/side-nav';
import { drawerWidth } from '@/components/ui/home/side-nav';
import AuthGuard from '@/lib/utils/AuthGuard';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
        <TopNavigationBar onHeightChange={setAppBarHeight} />
        <SideNavigationBar topOffset={appBarHeight} />

        <main
          className="flex-grow border-l overflow-y-auto border-gray-100 p-6 md:ml-[280px] md:p-10"
          style={{
            marginTop: appBarHeight,
            marginLeft: drawerWidth + 5,
          }}
        >
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
