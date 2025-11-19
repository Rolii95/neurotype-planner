import { Link, useLocation } from 'react-router-dom';

const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  routines: 'Routines',
  mood: 'Mood & Energy',
  demo: 'Visual Tools',
  collaboration: 'Collaboration',
  profile: 'Profile',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
    return null; // Don't show breadcrumbs on home/dashboard
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
  ];

  let currentPath = '';
  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label: routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      path: currentPath,
    });
  });

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Home"
      >
        <HomeIcon className="w-4 h-4" />
      </Link>

      {breadcrumbs.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return (
          <div key={crumb.path} className="flex items-center space-x-2">
            <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-600" />
            {isLast ? (
              <span className="font-medium text-gray-900 dark:text-white">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
