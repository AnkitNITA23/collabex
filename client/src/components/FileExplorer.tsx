import React, { useState } from 'react';
import { Folder, FolderOpen, File, FileCode, Plus, FolderPlus, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react';

export interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  parentId: string | null;
}

interface FileExplorerProps {
  fileTree: FileNode[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string, isFolder: boolean, parentId: string | null) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fileTree,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (node: FileNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRenameFile(id, editName.trim());
      setEditingId(null);
    }
  };

  const handleStartCreate = (parentId: string | null, type: 'file' | 'folder') => {
    setNewItemParentId(parentId);
    setNewItemType(type);
    setNewItemName('');
  };

  const handleSaveCreate = () => {
    if (newItemName.trim() && newItemType) {
      onCreateFile(newItemName.trim(), newItemType === 'folder', newItemParentId);
      setNewItemType(null);
      setNewItemParentId(null);
    }
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders[node.id];
    const isActive = activeFileId === node.id;
    const isEditing = editingId === node.id;

    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          className={`file-node-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.id);
            } else {
              onSelectFile(node.id);
            }
          }}
        >
          <div className="file-node-left">
            {node.isFolder ? (
              <>
                <span className="folder-chevron">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className="folder-icon">
                  {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                </span>
              </>
            ) : (
              <span className="file-icon">
                <FileCode size={16} />
              </span>
            )}

            {isEditing ? (
              <div className="rename-container" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(node.id)}
                  autoFocus
                  className="file-node-input"
                />
                <button type="button" className="rename-save-btn" onClick={() => handleSaveRename(node.id)}>✓</button>
                <button type="button" className="rename-cancel-btn" onClick={() => setEditingId(null)}>✗</button>
              </div>
            ) : (
              <span className="file-node-name">{node.name}</span>
            )}
          </div>

          {!isEditing && (
            <div className="file-node-actions" onClick={(e) => e.stopPropagation()}>
              {node.isFolder && (
                <>
                  <button
                    onClick={() => handleStartCreate(node.id, 'file')}
                    title="New File"
                    className="icon-action-btn"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => handleStartCreate(node.id, 'folder')}
                    title="New Folder"
                    className="icon-action-btn"
                  >
                    <FolderPlus size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => handleStartRename(node)}
                title="Rename"
                className="icon-action-btn"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDeleteFile(node.id)}
                title="Delete"
                className="icon-action-btn delete-btn"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Input box for creating new file/folder under this node */}
        {newItemType && newItemParentId === node.id && (
          <div
            className="file-node-item new-item-input-container"
            style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {newItemType === 'folder' ? <Folder size={16} /> : <File size={16} />}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCreate()}
              placeholder={newItemType === 'folder' ? 'Folder name...' : 'File name...'}
              autoFocus
              className="file-node-input"
            />
            <button type="button" className="rename-save-btn" onClick={handleSaveCreate}>✓</button>
            <button type="button" className="rename-cancel-btn" onClick={() => { setNewItemType(null); setNewItemParentId(null); }}>✗</button>
          </div>
        )}

        {/* Render Children */}
        {node.isFolder && isExpanded && (
          <div className="folder-children">
            {fileTree
              .filter((n) => n.parentId === node.id)
              .map((n) => renderNode(n, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = fileTree.filter((node) => node.parentId === null);

  return (
    <div className="file-explorer glassmorphism">
      <div className="file-explorer-header">
        <h3>Files Explorer</h3>
        <div className="explorer-header-actions">
          <button
            type="button"
            onClick={() => handleStartCreate(null, 'file')}
            title="Create File at Root"
            className="explorer-add-btn"
          >
            <Plus size={14} /> File
          </button>
          <button
            type="button"
            onClick={() => handleStartCreate(null, 'folder')}
            title="Create Folder at Root"
            className="explorer-add-btn"
          >
            <FolderPlus size={14} /> Folder
          </button>
        </div>
      </div>

      <div className="file-tree-container">
        {/* Input box for root creation */}
        {newItemType && newItemParentId === null && (
          <div className="file-node-item new-item-input-container" style={{ paddingLeft: '10px' }} onClick={(e) => e.stopPropagation()}>
            {newItemType === 'folder' ? <Folder size={16} /> : <File size={16} />}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCreate()}
              placeholder={newItemType === 'folder' ? 'Folder name...' : 'File name...'}
              autoFocus
              className="file-node-input"
            />
            <button type="button" className="rename-save-btn" onClick={handleSaveCreate}>✓</button>
            <button type="button" className="rename-cancel-btn" onClick={() => { setNewItemType(null); setNewItemParentId(null); }}>✗</button>
          </div>
        )}

        {rootNodes.length === 0 && !newItemType ? (
          <div className="empty-explorer">
            <p>No files yet. Create one to begin!</p>
          </div>
        ) : (
          rootNodes.map((n) => renderNode(n, 0))
        )}
      </div>
    </div>
  );
};
