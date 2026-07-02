import { DocumentState, Collaborator } from './document';

export interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  parentId: string | null;
}

export interface CollaboratorState extends Collaborator {
  avatar?: string;
  status?: string;
  activeFileId: string | null;
}

export class RoomState {
  roomId: string;
  files: Map<string, DocumentState>; // fileId -> DocumentState
  fileTree: Map<string, FileNode>; // fileId -> FileNode
  collaborators: Map<string, CollaboratorState>; // socketId -> collaborator state

  constructor(roomId: string, skipDefault = false) {
    this.roomId = roomId;
    this.files = new Map();
    this.fileTree = new Map();
    this.collaborators = new Map();

    if (!skipDefault) {
      // Create a default file so the room is not empty on first join
      const defaultFileId = 'main-js';
      const defaultContent = `// Welcome to CollabEx Room: ${roomId}\n// Start coding here!\n\nfunction helloWorld() {\n  console.log("Hello, Collaborative World!");\n}\n`;
      this.files.set(defaultFileId, new DocumentState(defaultContent, 'javascript'));
      this.fileTree.set(defaultFileId, {
        id: defaultFileId,
        name: 'main.js',
        isFolder: false,
        parentId: null
      });
    }
  }

  createFile(id: string, name: string, isFolder: boolean, parentId: string | null): FileNode {
    const fileNode: FileNode = { id, name, isFolder, parentId };
    this.fileTree.set(id, fileNode);
    if (!isFolder) {
      let lang = 'javascript';
      if (name.endsWith('.py')) lang = 'python';
      else if (name.endsWith('.html')) lang = 'html';
      else if (name.endsWith('.css')) lang = 'css';
      else if (name.endsWith('.md')) lang = 'markdown';
      else if (name.endsWith('.ts')) lang = 'typescript';

      this.files.set(id, new DocumentState('', lang));
    }
    return fileNode;
  }

  deleteFile(id: string) {
    const nodesToDelete = this.getChildrenRecursive(id);
    nodesToDelete.push(id);

    for (const nodeId of nodesToDelete) {
      this.files.delete(nodeId);
      this.fileTree.delete(nodeId);

      for (const collab of this.collaborators.values()) {
        if (collab.activeFileId === nodeId) {
          collab.activeFileId = null;
          collab.cursor = null;
          collab.selectionEnd = null;
        }
      }
    }
  }

  renameFile(id: string, newName: string) {
    const node = this.fileTree.get(id);
    if (node) {
      node.name = newName;
      if (!node.isFolder) {
        const file = this.files.get(id);
        if (file) {
          let lang = 'javascript';
          if (newName.endsWith('.py')) lang = 'python';
          else if (newName.endsWith('.html')) lang = 'html';
          else if (newName.endsWith('.css')) lang = 'css';
          else if (newName.endsWith('.md')) lang = 'markdown';
          else if (newName.endsWith('.ts')) lang = 'typescript';
          file.language = lang;
        }
      }
    }
  }

  private getChildrenRecursive(parentId: string): string[] {
    const children: string[] = [];
    for (const node of this.fileTree.values()) {
      if (node.parentId === parentId) {
        children.push(node.id);
        if (node.isFolder) {
          children.push(...this.getChildrenRecursive(node.id));
        }
      }
    }
    return children;
  }

  addCollaborator(id: string, username: string, color: string, avatar: string = '💻'): CollaboratorState {
    const collab: CollaboratorState = {
      id,
      username,
      color,
      avatar,
      status: 'active',
      cursor: null,
      selectionEnd: null,
      activeFileId: 'main-js',
      lastActive: Date.now()
    };
    this.collaborators.set(id, collab);
    return collab;
  }

  removeCollaborator(id: string) {
    this.collaborators.delete(id);
  }

  getCollaboratorsList(): CollaboratorState[] {
    return Array.from(this.collaborators.values());
  }

  getFileTreeList(): FileNode[] {
    return Array.from(this.fileTree.values());
  }

  getFilesWithContent() {
    const list: { id: string; name: string; language: string; text: string; version: number }[] = [];
    for (const [id, node] of this.fileTree.entries()) {
      if (!node.isFolder) {
        const fileDoc = this.files.get(id);
        list.push({
          id,
          name: node.name,
          language: fileDoc?.language || 'javascript',
          text: fileDoc?.text || '',
          version: fileDoc?.version || 0
        });
      }
    }
    return list;
  }
}
