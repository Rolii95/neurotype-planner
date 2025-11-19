import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type NeurotypeBadgeType = 'ADHD' | 'Autism' | 'Dyslexia' | 'Multiple' | 'Other';

const UserIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BrainIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const MailIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CalendarIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CameraIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

type NeurotypeBadge = {
  type: 'ADHD' | 'Autism' | 'Dyslexia' | 'Multiple' | 'Other';
  color: string;
  icon: string;
};

const neurotypeBadges: NeurotypeBadge[] = [
  { type: 'ADHD', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '⚡' },
  { type: 'Autism', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: '🧩' },
  { type: 'Dyslexia', color: 'bg-green-100 text-green-700 border-green-300', icon: '📖' },
  { type: 'Multiple', color: 'bg-pink-100 text-pink-700 border-pink-300', icon: '🌈' },
  { type: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '✨' },
];

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    displayName: 'Alex Thompson',
    email: user?.email || 'alex.thompson@example.com',
    bio: 'Passionate about productivity and neurodiversity advocacy. Using this planner to manage my ADHD and stay organized!',
    neurotypes: ['ADHD', 'Autism'] as NeurotypeBadgeType[],
    ageGroup: 'adult',
    timezone: 'America/New_York',
    language: 'en',
    joinedDate: '2024-01-15',
  });

  const [stats] = useState({
    tasksCompleted: 127,
    routinesCreated: 8,
    daysActive: 45,
    collaborations: 3,
  });

  const handleSave = () => {
    setIsEditing(false);
    // Save logic would go here
    console.log('Saving profile:', profile);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your personal information and preferences
            </p>
          </div>
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {isEditing ? (
              <span className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Save Changes
              </span>
            ) : (
              'Edit Profile'
            )}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-6 -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                  <UserIcon className="w-16 h-16 text-gray-400" />
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-700 transition-colors">
                    <CameraIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 pb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-600 focus:outline-none mb-2"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {profile.displayName}
                  </h2>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {profile.neurotypes.map((type) => {
                    const badge = neurotypeBadges.find((b) => b.type === type);
                    return badge ? (
                      <span
                        key={type}
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}
                      >
                        {badge.icon} {type}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400">{profile.bio}</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MailIcon className="w-4 h-4" />
                  Email
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {profile.email}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="w-4 h-4" />
                  Member Since
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {new Date(profile.joinedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tasks Completed', value: stats.tasksCompleted, icon: '✓', color: 'blue' },
            { label: 'Routines Created', value: stats.routinesCreated, icon: '📅', color: 'purple' },
            { label: 'Days Active', value: stats.daysActive, icon: '🔥', color: 'orange' },
            { label: 'Collaborations', value: stats.collaborations, icon: '👥', color: 'green' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm text-center"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Neurotype Preferences */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BrainIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Neurotype Preferences
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize your experience based on your needs
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Neurotype Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Your Neurotypes
              </label>
              <div className="flex flex-wrap gap-3">
                {neurotypeBadges.map((badge) => {
                  const isSelected = profile.neurotypes.includes(badge.type);
                  return (
                    <button
                      key={badge.type}
                      onClick={() => {
                        if (!isEditing) return;
                        setProfile({
                          ...profile,
                          neurotypes: isSelected
                            ? profile.neurotypes.filter((t) => t !== badge.type)
                            : [...profile.neurotypes, badge.type],
                        });
                      }}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-lg font-medium border-2 transition-all ${
                        isSelected
                          ? badge.color + ' border-current'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                      } ${!isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      {badge.icon} {badge.type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Age Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Age Group
              </label>
              <select
                value={profile.ageGroup}
                onChange={(e) => setProfile({ ...profile, ageGroup: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
              >
                <option value="child">Child (6-12)</option>
                <option value="teen">Teen (13-17)</option>
                <option value="adult">Adult (18+)</option>
                <option value="senior">Senior (65+)</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Account Security */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <ShieldIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Account Security
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your account security settings
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="font-medium text-gray-900 dark:text-white">Change Password</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Update your password to keep your account secure
              </div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div className="font-medium text-gray-900 dark:text-white">Connected Devices</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Manage devices that have access to your account
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;