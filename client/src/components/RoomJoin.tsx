import React, { useState } from 'react';
import { Terminal, Users, Sparkles } from 'lucide-react';
import { AvatarIcon, AVATAR_LIST } from './AvatarIcon';

const PRESET_COLORS = [
  '#00D7FF', // Electric Blue
  '#38E54D', // Neon Green
  '#FF4A4A', // Vibrant Red
  '#A084DC', // Soft Violet
  '#FF9F2E', // Vibrant Orange
  '#FF60B5', // Hot Pink
  '#F49D1A', // Bright Gold
  '#34d399', // Emerald
];

const ANIMAL_NAMES = [
  'Coder', 'Hacker', 'Ninja', 'Guru', 'Geek', 'Wizard', 'Architect', 'Dev',
  'Compiler', 'Script', 'Binary', 'Logic', 'Debugger', 'Stack', 'Pixel'
];
const ADJECTIVES = [
  'Super', 'Cyber', 'Async', 'Quantum', 'Dynamic', 'Stateless', 'Reactive',
  'Restless', 'Optimal', 'Smart', 'Sleek', 'Hyper', 'Swift', 'Mega'
];

function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  return `${adj} ${animal}`;
}

function generateRandomRoom() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface RoomJoinProps {
  onJoin: (roomId: string, username: string, color: string, avatar: string) => void;
}

export const RoomJoin: React.FC<RoomJoinProps> = ({ onJoin }) => {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || generateRandomRoom();
  });
  const [username, setUsername] = useState(() => generateRandomName());
  const [selectedColor, setSelectedColor] = useState(() => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  const [selectedAvatar, setSelectedAvatar] = useState(() => AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && username.trim()) {
      onJoin(roomId.trim().toUpperCase(), username.trim(), selectedColor, selectedAvatar);
    }
  };

  const handleRandomize = () => {
    setUsername(generateRandomName());
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setSelectedAvatar(AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)].id);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-logo">
        <Terminal className="logo-icon animate-pulse-glow" size={48} />
        <h1>Collab<span className="gradient-text">Ex</span></h1>
        <p>Real-Time Collaborative Code Editor</p>
      </div>

      <div className="lobby-card glassmorphism">
        <form onSubmit={handleSubmit} className="lobby-form">
          <div className="form-group">
            <label htmlFor="roomId">Collaborative Room ID</label>
            <div className="input-with-button">
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="E.G. ABCD12"
                required
                maxLength={20}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRoomId(generateRandomRoom())}
                title="Generate Random Room ID"
              >
                New ID
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Your Nickname</label>
            <div className="input-with-button">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.g. Code Ninja"
                required
                maxLength={25}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={handleRandomize}
                title="Randomize"
              >
                <Sparkles size={16} />
              </button>
            </div>
          </div>

          {/* Avatar Picker */}
          <div className="form-group">
            <label>Choose Avatar</label>
            <div className="avatar-icon-grid">
              {AVATAR_LIST.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  title={av.label}
                  className={`avatar-icon-btn ${selectedAvatar === av.id ? 'active' : ''}`}
                  onClick={() => setSelectedAvatar(av.id)}
                  style={selectedAvatar === av.id ? { borderColor: selectedColor, boxShadow: `0 0 10px ${selectedColor}55` } : {}}
                >
                  <AvatarIcon id={av.id} color={selectedAvatar === av.id ? selectedColor : '#6b7280'} size={30} />
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label>Choose Cursor Color</label>
            <div className="color-selector">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${selectedColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="avatar-preview-row">
            <div
              className="avatar-preview-badge"
              style={{ borderColor: selectedColor, boxShadow: `0 0 14px ${selectedColor}44` }}
            >
              <AvatarIcon id={selectedAvatar} color={selectedColor} size={44} />
            </div>
            <div className="avatar-preview-info">
              <span className="avatar-preview-name">{username || 'Your Name'}</span>
              <span className="avatar-preview-tag">{AVATAR_LIST.find(a => a.id === selectedAvatar)?.label}</span>
            </div>
          </div>

          <button type="submit" className="primary-btn submit-btn">
            <Users size={20} />
            Join Workspace
          </button>
        </form>
      </div>

      <div className="lobby-footer">
        <p>Built with Operational Transformation (OT) algorithm for zero-conflict sync.</p>
      </div>
    </div>
  );
};
