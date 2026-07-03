import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { EditorView } from '@codemirror/view';
import { TextOperation, transform, compose, transformPosition } from '../utils/ot';
import { applyRemoteOperation, remoteAnnotation, type RemoteCollaborator } from '../components/Editor';

export interface ChatMessage {
  clientID: string;
  username: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  parentId: string | null;
}

export interface ProjectFile {
  id: string;
  name: string;
  language: string;
  text: string;
  version: number;
}

export interface ChangeLogEntry {
  userId: string;
  username: string;
  color: string;
  fileName: string;
  timestamp: number;
  changeType: 'edit' | 'create' | 'delete' | 'rename';
  description: string;
}

export const useCollab = (
  roomId: string | null,
  username: string | null,
  color: string | null,
  avatar: string | null,
  editorRef: React.MutableRefObject<EditorView | null>
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<RemoteCollaborator[]>([]);
  const [language, setLanguage] = useState('javascript');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [initialText, setInitialText] = useState('');
  const [changesLog, setChangesLog] = useState<ChangeLogEntry[]>([]);

  // Multi-file States
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // References to keep event handlers fresh and avoid stale closures
  const activeFileIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
    if (activeFileId) {
      const activeFile = files.find(f => f.id === activeFileId);
      if (activeFile) {
        setLanguage(activeFile.language);
      }
    }
  }, [activeFileId, files]);

  // Per-file OT Engine State
  const versionsRef = useRef<Map<string, number>>(new Map());
  const outstandingOpsRef = useRef<Map<string, TextOperation | null>>(new Map());
  const bufferOpsRef = useRef<Map<string, TextOperation | null>>(new Map());
  const fileContentsRef = useRef<Map<string, string>>(new Map());

  // Connect to Socket.io server
  useEffect(() => {
    if (!roomId || !username || !color) return;

    const socketUrl = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/');
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join-room', { roomId, username, color, avatar });
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Collab] Socket connection error:', err);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // 1. Initial State from Server
    newSocket.on('init-room', ({ files: initialFiles, fileTree: initialTree, activeFileId: serverActiveFileId, collaborators: list, changesLog: serverChangesLog }) => {
      versionsRef.current.clear();
      outstandingOpsRef.current.clear();
      bufferOpsRef.current.clear();
      fileContentsRef.current.clear();

      console.log('[Collab] Received init-room:', {
        filesCount: initialFiles.length,
        fileTreeCount: initialTree.length,
        serverActiveFileId,
        collaboratorsCount: list.length
      });

      initialFiles.forEach((f: ProjectFile) => {
        versionsRef.current.set(f.id, f.version);
        outstandingOpsRef.current.set(f.id, null);
        bufferOpsRef.current.set(f.id, null);
        fileContentsRef.current.set(f.id, f.text);
      });

      setFiles(initialFiles);
      setFileTree(initialTree);
      
      const defaultActiveFile = initialFiles.find((f: any) => f.id === serverActiveFileId);
      const textToLoad = defaultActiveFile ? defaultActiveFile.text : '';
      setInitialText(textToLoad);
      setActiveFileId(serverActiveFileId);
      activeFileIdRef.current = serverActiveFileId;
      setLanguage(defaultActiveFile?.language || 'javascript');

      const view = editorRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: textToLoad },
          selection: { anchor: 0 },
          annotations: [remoteAnnotation.of(true)]
        });
      }

      setCollaborators(list.filter((c: any) => c.id !== newSocket.id));
      setChangesLog(serverChangesLog || []);
    });

    // 2. A remote operation was applied
    newSocket.on('operation', ({ fileId, op: opJson, clientID, version: serverVersion }) => {
      console.log('[Collab] Received operation event from server:', { fileId, clientID, serverVersion });
      if (clientID === newSocket.id) return;

      const remoteOp = TextOperation.fromJSON(opJson);

      // Transform remote operation against client's pending local operations for this file
      let transformedRemoteOp = remoteOp.clone();

      const outstanding = outstandingOpsRef.current.get(fileId) || null;
      if (outstanding) {
        const [remotePrime, outstandingPrime] = transform(transformedRemoteOp, outstanding, 'left');
        transformedRemoteOp = remotePrime;
        outstandingOpsRef.current.set(fileId, outstandingPrime);
      }

      const buffer = bufferOpsRef.current.get(fileId) || null;
      if (buffer) {
        const [remotePrime, bufferPrime] = transform(transformedRemoteOp, buffer, 'left');
        transformedRemoteOp = remotePrime;
        bufferOpsRef.current.set(fileId, bufferPrime);
      }

      // If active file, apply to view, otherwise update cached contents
      if (fileId === activeFileIdRef.current) {
        const view = editorRef.current;
        console.log('[Collab] Applying remote operation to active view for file:', fileId);
        if (view) {
          applyRemoteOperation(view, transformedRemoteOp);
          const newContent = view.state.doc.toString();
          fileContentsRef.current.set(fileId, newContent);
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, text: newContent } : f))
          );
        }
      } else {
        const currentContent = fileContentsRef.current.get(fileId) || '';
        console.log('[Collab] Applying remote operation to cached file:', fileId);
        try {
          const newContent = transformedRemoteOp.apply(currentContent);
          fileContentsRef.current.set(fileId, newContent);
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, text: newContent } : f))
          );
        } catch (err) {
          console.error(`Error applying remote op to cached content:`, err);
        }
      }

      // Shift other collaborator cursors locally in response to the operation
      setCollaborators((prev) =>
        prev.map((c) => {
          if (c.activeFileId === fileId) {
            return {
              ...c,
              cursor: c.cursor !== null ? transformPosition(c.cursor, transformedRemoteOp) : null,
              selectionEnd: c.selectionEnd !== null ? transformPosition(c.selectionEnd, transformedRemoteOp) : null
            };
          }
          return c;
        })
      );

      // Update local version for this file
      versionsRef.current.set(fileId, serverVersion);
    });

    // 3. Outstanding operation was acknowledged by the server
    newSocket.on('ack', ({ fileId, version: newVersion }) => {
      console.log('[Collab] Received ack from server:', { fileId, newVersion });
      versionsRef.current.set(fileId, newVersion);
      outstandingOpsRef.current.set(fileId, null);

      const buffer = bufferOpsRef.current.get(fileId) || null;
      if (buffer) {
        const payloadOp = buffer.clone();
        outstandingOpsRef.current.set(fileId, payloadOp);
        bufferOpsRef.current.set(fileId, null);

        console.log('[Collab] Emitting buffered operation:', { fileId, newVersion });
        newSocket.emit('operation', {
          roomId,
          fileId,
          op: payloadOp.toJSON(),
          version: newVersion,
        });
      }
    });

    // 4. Force Resync
    newSocket.on('resync', ({ fileId, text, version }) => {
      console.warn(`Sync drift detected for file ${fileId}. Resetting.`);
      versionsRef.current.set(fileId, version);
      outstandingOpsRef.current.set(fileId, null);
      bufferOpsRef.current.set(fileId, null);
      fileContentsRef.current.set(fileId, text);

      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, text, version } : f)));

      if (fileId === activeFileIdRef.current) {
        const view = editorRef.current;
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
            annotations: [remoteAnnotation.of(true)]
          });
        }
      }
    });

    // 5. File Created
    newSocket.on('file-created', ({ node, file }) => {
      setFileTree((prev) => [...prev, node]);
      if (file) {
        setFiles((prev) => [...prev, { ...file, text: '', version: 0 }]);
        versionsRef.current.set(file.id, 0);
        outstandingOpsRef.current.set(file.id, null);
        bufferOpsRef.current.set(file.id, null);
        fileContentsRef.current.set(file.id, '');
      }
    });

    // 6. File Deleted
    newSocket.on('file-deleted', ({ fileId }) => {
      setFileTree((prev) => {
        const getChildrenRecursive = (pId: string): string[] => {
          const children: string[] = [];
          for (const n of prev) {
            if (n.parentId === pId) {
              children.push(n.id);
              if (n.isFolder) {
                children.push(...getChildrenRecursive(n.id));
              }
            }
          }
          return children;
        };
        const idsToDelete = [fileId, ...getChildrenRecursive(fileId)];
        
        setFiles((prevFiles) => prevFiles.filter((f) => !idsToDelete.includes(f.id)));
        
        if (activeFileIdRef.current && idsToDelete.includes(activeFileIdRef.current)) {
          setTimeout(() => {
            switchActiveFile('main-js');
          }, 10);
        }
        
        return prev.filter((n) => !idsToDelete.includes(n.id));
      });
    });

    // 7. File Renamed
    newSocket.on('file-renamed', ({ fileId, newName, language: newLang }) => {
      setFileTree((prev) =>
        prev.map((n) => (n.id === fileId ? { ...n, name: newName } : n))
      );
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, name: newName, language: newLang } : f))
      );
    });

    // 8. Remote client cursor changes
    newSocket.on('cursor', ({ clientID, fileId, cursor, selectionEnd }) => {
      setCollaborators((prev) =>
        prev.map((c) => (c.id === clientID ? { ...c, activeFileId: fileId, cursor, selectionEnd } : c))
      );
    });

    // 9. Language override changes
    newSocket.on('language-change', ({ fileId, language: newLang }) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, language: newLang } : f))
      );
      if (fileId === activeFileIdRef.current) {
        setLanguage(newLang);
      }
    });

    // 10. Presence status changes
    newSocket.on('presence-change', ({ clientID, status }) => {
      setCollaborators((prev) =>
        prev.map((c) => (c.id === clientID ? { ...c, status } : c))
      );
    });

    // 11. Change Log updates
    newSocket.on('new-changelog-entry', (entry: ChangeLogEntry) => {
      setChangesLog((prev) => {
        // Group consecutive edits within 15 seconds by same user on same file
        if (entry.changeType === 'edit' && prev.length > 0) {
          const last = prev[prev.length - 1];
          if (
            last.changeType === 'edit' &&
            last.userId === entry.userId &&
            last.fileName === entry.fileName &&
            Math.abs(entry.timestamp - last.timestamp) < 15000
          ) {
            return [...prev.slice(0, -1), entry];
          }
        }
        return [...prev, entry];
      });
    });

    // 11. Collaborator Joined/Left
    newSocket.on('collaborator-joined', (collab: RemoteCollaborator) => {
      setCollaborators((prev) => {
        if (prev.some((c) => c.id === collab.id)) return prev;
        return [...prev, collab];
      });
    });

    newSocket.on('collaborator-left', ({ id }) => {
      setCollaborators((prev) => prev.filter((c) => c.id !== id));
    });

    // 12. Chat messages
    newSocket.on('chat-message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, username, color, avatar, editorRef]);

  // Local Edits emitter
  const sendLocalChange = useCallback((op: TextOperation) => {
    if (!socket || !connected || !roomId || !activeFileId) {
      console.warn('[Collab] sendLocalChange ignored: missing dependencies:', {
        hasSocket: !!socket,
        connected,
        roomId,
        activeFileId
      });
      return;
    }

    const fileId = activeFileId;
    const currentVer = versionsRef.current.get(fileId) || 0;
    const outstanding = outstandingOpsRef.current.get(fileId) || null;
    
    console.log('[Collab] sendLocalChange called:', {
      fileId,
      currentVer,
      hasOutstanding: !!outstanding,
      op: op.toJSON()
    });

    if (outstanding === null) {
      outstandingOpsRef.current.set(fileId, op.clone());
      socket.emit('operation', {
        roomId,
        fileId,
        op: op.toJSON(),
        version: currentVer,
      });
    } else {
      const buffer = bufferOpsRef.current.get(fileId) || null;
      if (buffer === null) {
        bufferOpsRef.current.set(fileId, op.clone());
      } else {
        bufferOpsRef.current.set(fileId, compose(buffer, op));
      }
      console.log('[Collab] Buffered local operation. Current buffer:', bufferOpsRef.current.get(fileId)?.toJSON());
    }

    const view = editorRef.current;
    if (view) {
      const newContent = view.state.doc.toString();
      fileContentsRef.current.set(fileId, newContent);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, text: newContent } : f))
      );
    }
  }, [socket, connected, roomId, activeFileId, editorRef]);

  // Cursor movements emitter
  const sendCursorChange = useCallback((cursor: number | null, selectionEnd: number | null) => {
    if (!socket || !connected || !roomId || !activeFileId) return;
    socket.emit('cursor', { roomId, fileId: activeFileId, cursor, selectionEnd });
  }, [socket, connected, roomId, activeFileId]);

  // Switch Active File
  const switchActiveFile = useCallback((fileId: string) => {
    const view = editorRef.current;
    if (!view || fileId === activeFileIdRef.current) return;

    // Save current active file text to local cache
    const currentActive = activeFileIdRef.current;
    if (currentActive) {
      fileContentsRef.current.set(currentActive, view.state.doc.toString());
    }

    // Set new active file state
    activeFileIdRef.current = fileId;
    setActiveFileId(fileId);

    // Load new content into CodeMirror
    const newContent = fileContentsRef.current.get(fileId) || '';
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newContent },
      selection: { anchor: 0 },
      annotations: [remoteAnnotation.of(true)]
    });

    // ── Sync language to the new file's language ──
    setFiles((prev) => {
      const targetFile = prev.find((f) => f.id === fileId);
      if (targetFile) setLanguage(targetFile.language);
      return prev;
    });

    // Notify backend of current active file and cursor reset
    if (socket && connected && roomId) {
      socket.emit('cursor', { roomId, fileId, cursor: 0, selectionEnd: 0 });
    }
  }, [editorRef, socket, connected, roomId]);

  // File system emitters
  const createFile = useCallback((name: string, isFolder: boolean, parentId: string | null) => {
    if (!socket || !connected || !roomId) return;
    const id = Math.random().toString(36).substring(2, 9);
    socket.emit('create-file', { roomId, id, name, isFolder, parentId });
  }, [socket, connected, roomId]);

  const deleteFile = useCallback((fileId: string) => {
    if (!socket || !connected || !roomId) return;
    socket.emit('delete-file', { roomId, fileId });
  }, [socket, connected, roomId]);

  const renameFile = useCallback((fileId: string, newName: string) => {
    if (!socket || !connected || !roomId) return;
    socket.emit('rename-file', { roomId, fileId, newName });
  }, [socket, connected, roomId]);

  // Language override emitter
  const changeLanguage = useCallback((newLang: string) => {
    if (!socket || !connected || !roomId || !activeFileId) return;
    socket.emit('language-change', { roomId, fileId: activeFileId, language: newLang });
  }, [socket, connected, roomId, activeFileId]);

  // Presence status emitter
  const changePresenceStatus = useCallback((status: string) => {
    if (!socket || !connected || !roomId) return;
    socket.emit('presence-change', { roomId, status });
  }, [socket, connected, roomId]);

  // Chat message emitter
  const sendChatMessage = useCallback((text: string) => {
    if (!socket || !connected || !roomId) return;
    socket.emit('chat-message', { roomId, text });
  }, [socket, connected, roomId]);

  // Get active file content — always from the live editor when possible
  const getActiveFileContent = (): string => {
    const view = editorRef.current;
    if (view) return view.state.doc.toString();
    if (!activeFileId) return '';
    return fileContentsRef.current.get(activeFileId) || '';
  };

  // Derive the active file's language directly from files state
  // (more reliable than the language state which can lag behind after file switches)
  const getActiveFileLanguage = (): string => {
    if (!activeFileId) return language;
    // Read from files state
    const activeFile = files.find((f) => f.id === activeFileId);
    return activeFile?.language || language;
  };

  return {
    connected,
    collaborators,
    language,
    chatMessages,
    initialText,
    socketId: socket?.id || null,
    files,
    fileTree,
    activeFileId,
    sendLocalChange,
    sendCursorChange,
    changeLanguage,
    sendChatMessage,
    switchActiveFile,
    createFile,
    deleteFile,
    renameFile,
    changePresenceStatus,
    activeFileContent: getActiveFileContent(),
    activeFileLanguage: getActiveFileLanguage(),
    changesLog,
  };
};
