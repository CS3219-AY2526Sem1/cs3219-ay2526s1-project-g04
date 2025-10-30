'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';
import { useCodeContext } from './CodeContext';
import { useCollab } from './CollabProvider';
import * as Y from 'yjs';
import { OnMount } from '@monaco-editor/react';
import {
  Card,
  CardHeader,
  Stack,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function CollabMonaco() {
  const { code, setCode } = useCodeContext();
  const { ydoc, provider } = useCollab(); // ✅ use shared doc & provider
  const yTextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<any>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleFullscreen = () => {
    if (!editorContainerRef.current) return;
    if (!document.fullscreenElement)
      editorContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true));
    else document.exitFullscreen().then(() => setIsFullscreen(false));
  };

  useEffect(() => {
    if (!ydoc || !provider) return;

    const yText = ydoc.getText('monaco');
    yTextRef.current = yText;

    const observer = (event: Y.YTextEvent) => setCode(yText.toString());
    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
      bindingRef.current?.destroy?.();
      bindingRef.current = null;
    };
  }, [ydoc, provider]);

  const handleEditorDidMount: OnMount = async (editor, monaco) => {
    if (!ydoc || !provider) return;
    const model = editor.getModel();
    if (!model) return;

    const mod = await import('y-monaco');
    const MonacoBinding = mod.MonacoBinding;

    const yText = ydoc.getText('monaco');
    yTextRef.current = yText;
    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness,
    );

    monaco.editor.defineTheme('peerprep-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b6f85', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'b39bff', fontStyle: 'bold' },
        { token: 'string', foreground: '7dd3fc' },
        { token: 'number', foreground: 'a78bfa' },
        { token: 'function', foreground: '60a5fa' },
        { token: 'variable', foreground: 'c084fc' },
        { token: 'type', foreground: '93c5fd' },
      ],
      colors: {
        'editor.background': '#0f0017',
        'editor.foreground': '#e5e7eb',
        'editorCursor.foreground': '#da89ffff',
        'editorLineNumber.foreground': '#a5a5a5ff',
        'editorLineNumber.activeForeground': '#edededff',
        'editor.selectionBackground': '#ff37d09a',
        'editorGutter.background': '#3e3345',
        'editorIndentGuide.background': '#1b1bf0ff',
      },
    });
    monaco.editor.setTheme('peerprep-dark');
  };

  const handleCopy = () => navigator.clipboard.writeText(code);

  return (
    <Card
      ref={editorContainerRef}
      className="flex flex-col h-full w-full shadow-2xl rounded-2xl"
      variant="outlined"
    >
      <CardHeader
        className="px-4 py-3 bg-[#0f0017] border-b-2 border-[#777889]"
        title={
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Typography
              sx={{
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 500,
              }}
            >
              Python3
            </Typography>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Copy Code">
                <IconButton onClick={handleCopy} size="small">
                  <ContentCopyIcon
                    fontSize="small"
                    className="text-gray-300 hover:text-white"
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                <IconButton onClick={handleFullscreen} size="small">
                  {isFullscreen ? (
                    <FullscreenExitIcon
                      fontSize="medium"
                      className="text-gray-300 hover:text-white"
                    />
                  ) : (
                    <FullscreenIcon
                      fontSize="medium"
                      className="text-gray-300 hover:text-white"
                    />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        }
      />

      <Editor
        defaultLanguage="python"
        theme="peerprep-dark"
        onMount={handleEditorDidMount}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
          lineNumbers: 'on',
          tabSize: 4,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 10, bottom: 10 },
          cursorWidth: 4,
          cursorStyle: 'line',
          lineNumbersMinChars: 3,
        }}
      />
    </Card>
  );
}
