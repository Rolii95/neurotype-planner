import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../contexts/ThemeContext';

interface QuickAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
  color: string;
  category: 'planning' | 'tracking' | 'wellness' | 'tools';
}

const QUICK_ACTIONS: QuickAction[] = [
  // Planning
  {
    id: 'tasks',
    icon: '✓',
    title: 'Tasks',
    description: 'Manage your to-dos',
    link: '/tasks',
    color: 'blue',
    category: 'planning',
  },
  {
    id: 'routines',
    icon: '🔄',
    title: 'Routines',
    description: 'Build consistent habits',
    link: '/routines',
    color: 'purple',
    category: 'planning',
  },
  {
    id: 'focus',
    icon: '🎯',
    title: 'Focus',
    description: 'Pomodoro & Deep Work',
    link: '/focus',
    color: 'indigo',
    category: 'planning',
  },
  // Tracking
  {
    id: 'mood',
    icon: '😊',
    title: 'Mood',
    description: 'Log your feelings',
    link: '/mood',
    color: 'yellow',
    category: 'tracking',
  },
  {
    id: 'energy',
    icon: '⚡',
    title: 'Energy',
    description: 'Track energy levels',
    link: '/mood',
    color: 'amber',
    category: 'tracking',
  },
  // Wellness
  {
    id: 'wellness',
    icon: '🧘',
    title: 'Wellness',
    description: 'Sensory breaks & care',
    link: '/wellness',
    color: 'teal',
    category: 'wellness',
  },
  {
    id: 'visual-tools',
    icon: '🎨',
    title: 'Visual Tools',
    description: 'Sensory-friendly features',
    link: '/demo',
    color: 'green',
    category: 'wellness',
  },
  // Tools
  {
    id: 'tools',
    icon: '🔧',
    title: 'Tools',
    description: 'Chunking & Body Doubling',
    link: '/tools',
    color: 'violet',
    category: 'tools',
  },
  {
    id: 'collaboration',
    icon: '👥',
    title: 'Collaborate',
    description: 'Work with others',
    link: '/collaboration',
    color: 'cyan',
    category: 'tools',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'planning', label: 'Planning', icon: '📅' },
  { id: 'tracking', label: 'Tracking', icon: '📊' },
  { id: 'wellness', label: 'Wellness', icon: '💚' },
  { id: 'tools', label: 'Tools', icon: '🛠️' },
];

const DashboardEnhanced: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const haptics = useHaptics();

  const filteredActions =
    activeCategory === 'all'
      ? QUICK_ACTIONS
      : QUICK_ACTIONS.filter((action) => action.category === activeCategory);

  const getColorClasses = (color: string, isHover: boolean = false) => {
    const colors: Record<string, string> = {
      blue: isHover ? 'bg-blue-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      purple: isHover ? 'bg-purple-500' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      indigo: isHover ? 'bg-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      pink: isHover ? 'bg-pink-500' : 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
      yellow: isHover ? 'bg-yellow-500' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      amber: isHover ? 'bg-amber-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      teal: isHover ? 'bg-teal-500' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
      green: isHover ? 'bg-green-500' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      violet: isHover ? 'bg-violet-500' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
      cyan: isHover ? 'bg-cyan-500' : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your neurotype-friendly productivity hub
          </p>
        </div>

        {/* Category Filter */}
        <div className="tab-list">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                haptics.light();
              }}
              className={`tab-button ${activeCategory === category.id ? 'active' : ''}`}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredActions.map((action, index) => (
            <Link
              key={action.id}
              to={action.link}
              onClick={() => haptics.light()}
              className="group block animate-scale-in card-hover"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`h-full p-6 rounded-xl border-2 transition-all ${getColorClasses(
                  action.color
                )} group-hover:shadow-lg`}
              >
                {/* Icon */}
                <div className="text-4xl mb-3 transform transition-transform group-hover:scale-110">
                  {action.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-1">{action.title}</h3>

                {/* Description */}
                <p className="text-sm opacity-80">{action.description}</p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open
                  <svg
                    className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">8</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl">
                ✓
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">5 of 8 complete</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Habit Streak</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">12</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-2xl">
                🔥
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">Days in a row</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Focus Time</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">2.5h</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-2xl">
                🎯
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">This session</p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>💡</span> Pro Tip
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            Try starting your day with a <strong>sensory break</strong> to help regulate your nervous system. 
            Visit the <Link to="/wellness" className="text-blue-600 dark:text-blue-400 hover:underline">Wellness</Link> page 
            to explore guided exercises.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardEnhanced;
