'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import '@/styles/globals.css';
import { IconButton, Tooltip } from '@mui/material';
import {
  HomeIcon,
  ListBulletIcon,
  ArchiveBoxIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export const drawerWidth = 280;
const navLinks = [
  {
    name: 'Dashboard',
    href: '/home/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Practice History',
    href: '/home/practice-history',
    icon: ListBulletIcon,
  },
  {
    name: 'Question Bank',
    href: '/home/question-bank',
    icon: ArchiveBoxIcon,
  },
];

interface SideNavigationBarProps {
  topOffset?: number;
}

export default function SideNavigationBar({
  topOffset = 0,
}: SideNavigationBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  return (
    <div>
      {/* Mobile Menu Button */}
      <IconButton
        className="md:hidden fixed left-4 z-50 p-2 bg-[var(--background)] text-[var(--foreground)] rounded-md shadow-md"
        style={{ top: topOffset + 8 }}
        onClick={toggleDrawer}
      >
        {mobileOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </IconButton>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex fixed left-0 top-0 h-full flex-col bg-[var(--background)] text-[var(--foreground)] border-r border-gray-100 overflow-auto`}
        style={{ width: drawerWidth }}
      >
        <div style={{ height: topOffset + 8 }} />
        <nav className="flex flex-col p-4 space-y-4">
          {navLinks.map((link) => (
            <Tooltip key={link.name} title={link.href}>
              <Link
                href={link.href}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-md text-xl hover:bg-gray-100 dark:hover:bg-gray-800',
                  {
                    'bg-gray-100 dark:bg-gray-800': pathname === link.href,
                  },
                )}
              >
                <link.icon className="h-6 w-6" />
                {link.name}
              </Link>
            </Tooltip>
          ))}
        </nav>
      </div>
    </div>
  );

  // return (
  //     <Drawer
  //         variant='permanent'
  //         slotProps={{
  //             className: ``
  //         }}
  //         sx={{
  //             width: drawerWidth,
  //             flexShrink: 0,
  //             '& .MuiDrawer-paper': {
  //                 width: drawerWidth,
  //                 top: topOffset,
  //                 boxSizing: 'border-box',
  //                 backgroundColor: 'var(--background)',
  //                 color: 'var(--foreground)',
  //                 borderRight: '1px solid rgba(255, 255, 255, 0.2)',
  //             }
  //         }}
  //     >
  //             <Box sx={{
  //                 overflow: 'auto',
  //                 borderRight: '1px solid rgba(255, 255, 255, 0.2)'
  //                 }}
  //             >
  //                 <List>
  //                     { navLinks.map((link) => (
  //                         <ListItem key={link.name} disablePadding>
  //                             <ListItemButton>
  //                                 <ListItemIcon>
  //                                     <link.icon className="h-6 w-6" />
  //                                 </ListItemIcon>
  //                                 <ListItemText primary={link.name} />
  //                             </ListItemButton>
  //                         </ListItem>
  //                     )) }
  //                 </List>
  //             </Box>
  //     </Drawer>
  // )
}
