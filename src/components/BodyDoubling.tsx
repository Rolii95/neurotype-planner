import React, { useState, useEffect } from 'react';

interface BodyDoublingRoom {
  id: string;
  name: string;
  description: string;
  type: 'video' | 'silent' | 'audio-only';
  participants: number;
  max_participants: number;
  is_public: boolean;
  tags: string[];
}

export const BodyDoubling: React.FC = () => {
  const [rooms, setRooms] = useState<BodyDoublingRoom[]>([
    {
      id: '1',
      name: 'Silent Study Session',
      description: 'Quiet co-working, cameras on',
      type: 'video',
      participants: 4,
      max_participants: 8,
      is_public: true,
      tags: ['study', 'quiet', 'productive'],
    },
    {
      id: '2',
      name: 'Creative Work Room',
      description: 'For artists, writers, creators',
      type: 'video',
      participants: 2,
      max_participants: 6,
      is_public: true,
      tags: ['creative', 'art', 'writing'],
    },
    {
      id: '3',
      name: 'Late Night Crew',
      description: 'Night owls working together',
      type: 'silent',
      participants: 6,
      max_participants: 10,
      is_public: true,
      tags: ['night', 'focus', 'deep-work'],
    },
  ]);

  const [inSession, setInSession] = useState(false);
  const [sessionRoom, setSessionRoom] = useState<BodyDoublingRoom | null>(null);

  const joinRoom = (room: BodyDoublingRoom) => {
    setSessionRoom(room);
    setInSession(true);
  };

  const leaveRoom = () => {
    setInSession(false);
    setSessionRoom(null);
  };

  if (inSession && sessionRoom) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 text-white">
            <div>
              <h2 className="text-2xl font-bold">{sessionRoom.name}</h2>
              <p className="text-gray-400">{sessionRoom.participants} participants</p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: sessionRoom.participants }, (_, i) => (
              <div
                key={i}
                className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-700"
              >
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-2">👤</div>
                  <div className="text-sm">Participant {i + 1}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="bg-gray-800 rounded-lg p-4 flex justify-center gap-4">
            <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
              🎤 Mute
            </button>
            <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
              📹 Camera
            </button>
            <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
              💬 Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Body Doubling 👥
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Virtual co-working sessions for accountability and focus
        </p>
      </div>

      {/* Room List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {room.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {room.description}
                </p>
              </div>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                {room.type}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
              <span>👥 {room.participants}/{room.max_participants}</span>
              <span>•</span>
              <span>{room.is_public ? '🌐 Public' : '🔒 Private'}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {room.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            <button
              onClick={() => joinRoom(room)}
              disabled={room.participants >= room.max_participants}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {room.participants >= room.max_participants ? 'Room Full' : 'Join Room'}
            </button>
          </div>
        ))}
      </div>

      {/* Create Room */}
      <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Create Your Own Room
        </h3>
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
          + Create Room
        </button>
      </div>
    </div>
  );
};
