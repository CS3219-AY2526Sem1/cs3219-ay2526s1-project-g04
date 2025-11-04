import { useEffect } from 'react';
import type * as monacoType from 'monaco-editor';
import type { Awareness } from 'y-protocols/awareness';

export function useRemoteCursors(
  editor: monacoType.editor.IStandaloneCodeEditor | null,
  monaco: typeof monacoType | null,
  awareness: Awareness | null,
) {
  useEffect(() => {
    if (!editor || !monaco || !awareness) return;

    const remoteDecorations = new Map<number, string[]>();

    const ensureStyles = () => {
      if (!document.getElementById('remote-cursor-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'remote-cursor-styles';
        document.head.appendChild(styleEl);
      }
    };
    ensureStyles();

    const hexToRgba = (hex: string, alpha = 0.25) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h,
        16,
      );
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const setColorStyle = (id: number, color: string) => {
      const styleEl = document.getElementById(
        'remote-cursor-styles',
      ) as HTMLStyleElement;
      styleEl.textContent += `
        .caret-${id} {
          border-left: 2px solid ${color};
        }
        .selection-${id} {
          background-color: ${hexToRgba(color, 0.25)};
        }
      `;
    };

    const renderCursors = () => {
      const states = awareness.getStates();
      const allOld = Array.from(remoteDecorations.values()).flat();
      const newDecorations: monacoType.editor.IModelDeltaDecoration[] = [];

      for (const [id, state] of states.entries()) {
        if (id === awareness.clientID) continue;
        const { cursor, user } = state;
        if (!cursor) continue;
        setColorStyle(id, user?.color || '#c084fc');

        const head = new monaco.Position(
          cursor.head.lineNumber,
          cursor.head.column,
        );
        const anchor = new monaco.Position(
          cursor.anchor.lineNumber,
          cursor.anchor.column,
        );
        const range = monaco.Range.fromPositions(anchor, head);

        newDecorations.push({
          range,
          options: { inlineClassName: `selection-${id}` },
        });
        newDecorations.push({
          range: new monaco.Range(
            head.lineNumber,
            head.column,
            head.lineNumber,
            head.column,
          ),
          options: { inlineClassName: `caret-${id}` },
        });
      }

      const newIds = editor.deltaDecorations(allOld, newDecorations);
      remoteDecorations.clear();
      remoteDecorations.set(0, newIds);
    };

    const onAwarenessChange = () => renderCursors();
    awareness.on('change', onAwarenessChange);
    renderCursors();

    return () => {
      awareness.off('change', onAwarenessChange);
      const allOld = Array.from(remoteDecorations.values()).flat();
      editor.deltaDecorations(allOld, []);
      remoteDecorations.clear();
    };
  }, [editor, monaco, awareness]);
}
