import React from 'react';
import { Users, Wifi } from 'lucide-react';
import { AvatarIcon } from './AvatarIcon';

export interface User {
  id: string;
  username: string;
  color: string;
  avatar?: string;
  status?: string;
  cursor: number | null;
  selectionEnd: number | null;
}

interface UserListProps {
  users: User[];
  currentUserId: string | null;
  roomId: string;
  onStatusChange?: (status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  away:   '#f59e0b',
  busy:   '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  away:   'Away',
  busy:   'Do Not Disturb',
};

export const UserList: React.FC<UserListProps> = ({ users, currentUserId, roomId, onStatusChange }) => {
  return (
    <div className="users-sidebar">
      <div className="sidebar-header">
        <Users size={18} className="sidebar-icon" />
        <h2>Collaborators ({users.length})</h2>
      </div>

      <div className="room-badge">
        <span className="room-label">ROOM:</span>
        <span className="room-id">{roomId}</span>
      </div>

      <div className="users-list-container">
        {users.map((user) => {
          const isSelf   = user.id === currentUserId || user.id === 'self';
          const avatarId = user.avatar || 'coder';
          const statusVal = user.status || 'active';

          return (
            <div key={user.id} className="user-item">
              {/* SVG Avatar Badge */}
              <div
                className="user-avatar-icon"
                style={{
                  background: `${user.color}18`,
                  border: `2px solid ${user.color}`,
                }}
              >
                <AvatarIcon id={avatarId} color={user.color} size={28} />
              </div>

              <div className="user-info">
                <span className="user-name">
                  {user.username}
                  {isSelf && <span className="self-tag"> (You)</span>}
                </span>

                {isSelf && onStatusChange ? (
                  <div className="user-status-row">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: STATUS_COLORS[statusVal] ?? '#10b981' }}
                    />
                    <select
                      value={statusVal}
                      onChange={(e) => onStatusChange(e.target.value)}
                      className="status-dropdown"
                    >
                      <option value="active">Active</option>
                      <option value="away">Away</option>
                      <option value="busy">Do Not Disturb</option>
                    </select>
                  </div>
                ) : (
                  <div className="user-status-row">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: STATUS_COLORS[statusVal] ?? '#10b981' }}
                    />
                    <span className="status-text">
                      {STATUS_LABELS[statusVal] ?? 'Active'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="connection-status">
        <Wifi size={14} className="conn-icon connected-pulse" />
        <span>Connected via WebSockets</span>
      </div>
    </div>
  );
};
