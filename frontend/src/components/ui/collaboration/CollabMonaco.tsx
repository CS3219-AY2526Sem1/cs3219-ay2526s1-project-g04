// frontend/src/components/CollabMonaco.tsx
'use client';

import dynamic from 'next/dynamic'; 
import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CollabMonaco() {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<any>(null);

  useEffect(() => {
    const doc = new Y.Doc();

    const sessionId = '123';  // dynamically get this from your app
    const userId = '23';     // current user's id
    const wsUrl = `ws://localhost:3000/${sessionId}?userId=${userId}`;
    const provider = new WebsocketProvider(wsUrl, sessionId, doc);



    const yText = doc.getText('monaco');

    ydocRef.current = doc;
    providerRef.current = provider;
    yTextRef.current = yText;

    console.log('Y.Doc:', ydocRef.current);
    console.log('Y.Text:', yTextRef.current);

    // ✅ Observe changes in the Y.Text
    const observer = (event: Y.YTextEvent) => {
      console.log('Text changed:', yText.toString());
      console.log('Event details:', event);
    };
    yText.observe(observer);

    // cleanup on unmount
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy?.();
        bindingRef.current = null;
      }
      provider.destroy();
      doc.destroy();
    };
  }, []);

  const handleEditorDidMount = async (editor: any, monaco: any) => {
    // editor model must exist
    const model = editor.getModel();
    if (!model || !yTextRef.current || !providerRef.current) return;

    // dynamically import MonacoBinding to avoid evaluating monaco-editor on the server
    const mod = await import('y-monaco');
    const MonacoBinding = mod.MonacoBinding;

    // create the MonacoBinding between yText and monaco model
    // MonacoBinding(yText, monacoModel, editors, awareness)
    bindingRef.current = new MonacoBinding(
      yTextRef.current,
      model,
      new Set([editor]),
      providerRef.current.awareness
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