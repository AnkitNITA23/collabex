import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { EditorView } from '@codemirror/view';
import { RoomJoin } from './components/RoomJoin';
import { UserList } from './components/UserList';
import { FileExplorer } from './components/FileExplorer';
import { ExecutionPanel } from './components/ExecutionPanel';
import { Editor } from './components/Editor';
import { useCollab } from './hooks/useCollab';
import { Copy, Check, MessageSquare, Send, LogOut, Code, Languages, Palette, Download } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<{ roomId: string; username: string; color: string; avatar: string } | null>(() => {
    const saved = localStorage.getItem('collabex_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const params = new URLSearchParams(window.location.search);
        const urlRoom = params.get('room');
        if (!urlRoom || urlRoom.toUpperCase() === parsed.roomId.toUpperCase()) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to restore session from localStorage:', e);
      }
    }
    return null;
  });

  const editorRef = useRef<EditorView | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('one-dark');

  // Sync browser URL room query parameter with session state on mount/change
  useEffect(() => {
    if (session) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') !== session.roomId) {
        const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${session.roomId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
    }
  }, [session]);

  const {
    connected,
    collaborators,
    language,
    chatMessages,
    initialText,
    socketId,
    sendLocalChange,
    sendCursorChange,
    changeLanguage,
    sendChatMessage,
    files,
    fileTree,
    activeFileId,
    switchActiveFile,
    createFile,
    deleteFile,
    renameFile,
    changePresenceStatus,
    activeFileContent,
    activeFileLanguage,
  } = useCollab(
    session?.roomId || null,
    session?.username || null,
    session?.color || null,
    session?.avatar || null,
    editorRef
  );

  const handleJoin = (roomId: string, username: string, color: string, avatar: string) => {
    const newSession = { roomId, username, color, avatar };
    localStorage.setItem('collabex_session', JSON.stringify(newSession));
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setSession(newSession);
  };

  const handleLeave = () => {
    localStorage.removeItem('collabex_session');
    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    setSession(null);
  };

  const copyRoomId = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleDownload = async () => {
    if (!session) return;
    const zip = new JSZip();

    // Save current editor content to the active file first
    const currentCode = editorRef.current?.state.doc.toString() ?? '';
    const filesToZip = files.map((f) =>
      f.id === activeFileId ? { ...f, text: currentCode } : f
    );

    if (filesToZip.length === 0) {
      alert('No files to download.');
      return;
    }

    for (const file of filesToZip) {
      zip.file(file.name, file.text ?? '');
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `collabex-${session.roomId.toLowerCase()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!session) {
    return <RoomJoin onJoin={handleJoin} />;
  }

  const allCollaborators = [
    {
      id: socketId || 'self',
      username: session.username,
      color: session.color,
      avatar: session.avatar,
      status: collaborators.find(c => c.id === socketId)?.status || 'active',
      activeFileId: activeFileId,
      cursor: null,
      selectionEnd: null,
    },
    ...collaborators,
  ];

  return (
    <div className="app-layout">
      {/* Sidebar Panel */}
      <aside className="sidebar glassmorphism">
        <div className="sidebar-logo">
          <Code className="logo-icon-small" size={24} />
          <h1>Collab<span>Ex</span></h1>
        </div>

        <UserList
          users={allCollaborators}
          currentUserId={socketId}
          roomId={session.roomId}
          onStatusChange={changePresenceStatus}
        />

        <FileExplorer
          fileTree={fileTree}
          activeFileId={activeFileId}
          onSelectFile={switchActiveFile}
          onCreateFile={createFile}
          onDeleteFile={deleteFile}
          onRenameFile={renameFile}
        />

        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-header">
            <MessageSquare size={16} />
            <h3>Room Chat</h3>
          </div>

          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div className="chat-empty">
                <p>No messages yet. Say hello to your collaborators!</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isSelf = msg.clientID === socketId;
                return (
                  <div key={idx} className={`chat-bubble-container ${isSelf ? 'self' : ''}`}>
                    <div className="chat-bubble-meta">
                      <span className="chat-user" style={{ color: msg.color }}>{msg.username}</span>
                      <span className="chat-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="chat-bubble" style={{ borderLeft: `3px solid ${msg.color}` }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="chat-input-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={150}
            />
            <button type="submit" disabled={!chatInput.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace-main">
        {/* Workspace Header */}
        <header className="workspace-header glassmorphism">
          <div className="header-left">
            <div className="header-status">
              <span className={`status-pill ${connected ? 'connected' : 'disconnected'}`}>
                {connected ? 'Sync Connected' : 'Connecting...'}
              </span>
            </div>

            <div className="share-btn-wrapper">
              <button className="share-btn button-ripple" onClick={copyRoomId} title="Copy Room ID">
                {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                <span>Room: {session.roomId}</span>
              </button>
            </div>
          </div>

          <div className="header-right">
            {/* Theme Selector */}
            <div className="language-selector-wrapper">
              <Palette size={16} className="lang-icon" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="language-dropdown"
              >
                <option value="one-dark">One Dark</option>
                <option value="nord">Nord</option>
                <option value="monokai">Monokai</option>
                <option value="solarized-dark">Solarized Dark</option>
                <option value="github-light">GitHub Light</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="language-selector-wrapper">
              <Languages size={16} className="lang-icon" />
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="language-dropdown"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>

            <button className="download-btn" onClick={handleDownload} title="Download all files as ZIP">
              <Download size={16} />
              <span>Download</span>
            </button>

            <button className="leave-btn" onClick={handleLeave} title="Leave room">
              <LogOut size={16} />
              <span>Leave Workspace</span>
            </button>
          </div>
        </header>

        {/* Code Editor & Execution Panel Split Layout */}
        <div className="workspace-editor-area">
          <div className="editor-pane">
            {activeFileId !== null ? (
              <Editor
                initialText={initialText}
                language={language}
                theme={theme}
                activeFileId={activeFileId}
                remoteCollaborators={collaborators}
                onLocalChange={sendLocalChange}
                onCursorChange={sendCursorChange}
                editorRef={editorRef}
              />
            ) : (
              <div className="editor-loading">
                <div className="spinner" />
                <p>Fetching document state...</p>
              </div>
            )}
          </div>
          
          <ExecutionPanel code={activeFileContent} language={activeFileLanguage} />
        </div>
      </main>
    </div>
  );
}
