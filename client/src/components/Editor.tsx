import React, { useEffect, useRef } from 'react';
import { EditorState, Annotation, Compartment, StateField, StateEffect, Range } from '@codemirror/state';
import { EditorView, keymap, Decoration, type DecorationSet, WidgetType, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { TextOperation } from '../utils/ot';
import { getThemeExtension } from '../utils/themes';

export const remoteAnnotation = Annotation.define<boolean>();
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();

export interface RemoteCollaborator {
  id: string;
  username: string;
  color: string;
  avatar?: string;
  status?: string;
  activeFileId: string | null;
  cursor: number | null;
  selectionEnd: number | null;
}

export const setRemoteCursorsEffect = StateEffect.define<RemoteCollaborator[]>();

class RemoteCursorWidget extends WidgetType {
  readonly username: string;
  readonly color: string;

  constructor(username: string, color: string) {
    super();
    this.username = username;
    this.color = color;
  }

  eq(other: RemoteCursorWidget) {
    return other.username === this.username && other.color === this.color;
  }

  toDOM() {
    const cursor = document.createElement('span');
    cursor.className = 'cm-remote-cursor';
    cursor.style.borderLeftColor = this.color;

    const label = document.createElement('span');
    label.className = 'cm-remote-cursor-label';
    label.style.backgroundColor = this.color;
    label.textContent = this.username;

    cursor.appendChild(label);
    return cursor;
  }

  ignoreEvent() {
    return true;
  }
}

const remoteCursorsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursorsEffect)) {
        const collaborators = effect.value;
        const ranges: Range<Decoration>[] = [];

        const docLength = tr.state.doc.length;
        for (const user of collaborators) {
          if (user.cursor === null || user.cursor > docLength) continue;

          if (user.selectionEnd !== null && user.cursor !== user.selectionEnd) {
            const start = Math.min(user.cursor, user.selectionEnd);
            const end = Math.max(user.cursor, user.selectionEnd);
            if (start <= docLength && end <= docLength) {
              ranges.push(
                Decoration.mark({
                  attributes: {
                    style: `background-color: ${user.color}25; border-bottom: 2px solid ${user.color}40`,
                    class: 'cm-remote-selection'
                  }
                }).range(start, end)
              );
            }
          }

          const cursorWidget = Decoration.widget({
            widget: new RemoteCursorWidget(user.username, user.color),
            side: 1
          });
          ranges.push(cursorWidget.range(user.cursor));
        }

        ranges.sort((a, b) => a.from - b.from);
        return Decoration.set(ranges);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return javascript();
    case 'python':
      return python();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'markdown':
      return markdown();
    default:
      return javascript();
  }
}

interface EditorProps {
  initialText: string;
  language: string;
  theme: string;
  activeFileId: string | null;
  remoteCollaborators: RemoteCollaborator[];
  onLocalChange: (op: TextOperation) => void;
  onCursorChange: (cursor: number | null, selectionEnd: number | null) => void;
  editorRef: React.MutableRefObject<EditorView | null>;
}

export const Editor: React.FC<EditorProps> = ({
  initialText,
  language,
  theme,
  activeFileId,
  remoteCollaborators,
  onLocalChange,
  onCursorChange,
  editorRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Avoid stale closures by keeping callbacks in mutable refs ──
  const onLocalChangeRef = useRef(onLocalChange);
  const onCursorChangeRef = useRef(onCursorChange);

  useEffect(() => {
    onLocalChangeRef.current = onLocalChange;
  }, [onLocalChange]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  // Initialize CodeMirror instance
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        languageCompartment.of(getLanguageExtension(language)),
        themeCompartment.of(getThemeExtension(theme)),
        remoteCursorsField,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'Fira Code, JetBrains Mono, source-code-pro, Menlo, Monaco, Consolas, monospace' },
          '.cm-remote-cursor': {
            position: 'relative',
            borderLeft: '2px solid',
            marginLeft: '-1px',
            marginRight: '-1px',
            pointerEvents: 'none'
          },
          '.cm-remote-cursor-label': {
            position: 'absolute',
            top: '-18px',
            left: '0',
            fontSize: '10px',
            color: '#fff',
            padding: '2px 4px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            zIndex: 10,
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out'
          },
          '.cm-remote-cursor:hover .cm-remote-cursor-label': {
            opacity: 1
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const isRemote = update.transactions.some((tr) => tr.annotation(remoteAnnotation));
            if (!isRemote) {
              const op = new TextOperation();
              let lastIndex = 0;

              update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
                op.retain(fromA - lastIndex);
                op.delete(toA - fromA);
                op.insert(inserted.toString());
                lastIndex = toA;
              });

              const oldDocLength = update.startState.doc.length;
              op.retain(oldDocLength - lastIndex);

              onLocalChangeRef.current(op);
            }
          }

          if (update.selectionSet || update.docChanged) {
            const range = update.state.selection.main;
            onCursorChangeRef.current(range.from, range.to);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, []);

  // Update editor language if it changes
  useEffect(() => {
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        effects: languageCompartment.reconfigure(getLanguageExtension(language)),
      });
    }
  }, [language]);

  // Update editor theme if it changes
  useEffect(() => {
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        effects: themeCompartment.reconfigure(getThemeExtension(theme)),
      });
    }
  }, [theme]);

  // Update remote cursors decoration if user cursor data changes
  useEffect(() => {
    const view = editorRef.current;
    if (view) {
      const activeCollabs = remoteCollaborators.filter((c) => c.activeFileId === activeFileId);
      view.dispatch({
        effects: setRemoteCursorsEffect.of(activeCollabs),
      });
    }
  }, [remoteCollaborators, activeFileId]);

  return <div className="editor-container" ref={containerRef} />;
};

export function applyRemoteOperation(view: EditorView, operation: TextOperation) {
  let pos = 0;
  const changes: { from: number; to?: number; insert?: string }[] = [];

  for (const c of operation.components) {
    if (c.type === 'retain') {
      pos += c.len;
    } else if (c.type === 'insert') {
      changes.push({
        from: pos,
        insert: c.text,
      });
    } else if (c.type === 'delete') {
      changes.push({
        from: pos,
        to: pos + c.len,
        insert: '',
      });
      pos += c.len;
    }
  }

  view.dispatch({
    changes,
    annotations: remoteAnnotation.of(true),
  });
}
