// frontend/src/app/collaboration/editor/page.tsx
"use client";

import React from 'react';
import CollabMonaco from '../../components/ui/collaboration/CollabMonaco';

export default function Page() {
  return (
    <main style={{ height: '100vh' }}>
      <h1 style={{ padding: 16 }}>Collaboration editor (Yjs + Monaco) — demo</h1>
      <div style={{ height: 'calc(100vh - 56px)' }}>
        <CollabMonaco />
      </div>
    </main>
  );
}