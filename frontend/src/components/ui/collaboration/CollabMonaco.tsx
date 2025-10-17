// frontend/src/components/ui/collaboration/CollabMonaco.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { editor as MonacoEditor } from 'monaco-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CollabMonaco() {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<InstanceType<
    typeof import('y-monaco').MonacoBinding
  > | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();

    const sessionId = '123'; // dynamically get this from your app
    const userId = '23'; // current user's id
    const wsUrl = `ws://localhost:3000`;
    const provider = new WebsocketProvider(wsUrl, sessionId, doc);

    const yText = doc.getText('monaco');

    ydocRef.current = doc;
    providerRef.current = provider;
    yTextRef.current = yText;

    console.log('Y.Doc:', ydocRef.current);
    console.log('Y.Text:', yTextRef.current);

    // Observe changes in the Y.Text
    const observer = (event: Y.YTextEvent) => {
      console.log('Text changed:', yText.toString());
      console.log('Event details:', event);
    };
    yText.observe(observer);

    // Cleanup on unmount
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy?.();
        bindingRef.current = null;
      }
      provider.destroy();
      doc.destroy();
    };
  }, []);

  const handleEditorDidMount = async (
    editor: MonacoEditor.IStandaloneCodeEditor,
    monaco: typeof MonacoEditor,
  ) => {
    // editor model must exist
    const model = editor.getModel();
    if (!model || !yTextRef.current || !providerRef.current) return;

    // Dynamically import MonacoBinding to avoid SSR issues
    const mod = await import('y-monaco');
    const MonacoBinding = mod.MonacoBinding;

    // Create the MonacoBinding between yText and Monaco model
    bindingRef.current = new MonacoBinding(
      yTextRef.current,
      model,
      new Set([editor]),
      providerRef.current.awareness,
    );
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue="// Collaborative Monaco with Yjs"
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />
    </div>
  );
}
