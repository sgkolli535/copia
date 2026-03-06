import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { profileAtom } from '../store/atoms';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/estate-plan',
    label: 'Estate Plan',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/scenarios',
    label: 'Scenarios',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    to: '/audit',
    label: 'Audit Trail',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'AI Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
];

const mobilityNavItems: NavItem[] = [
  {
    to: '/money-event',
    label: 'Money Event',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/mobility',
    label: 'Mobility Analysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/actions',
    label: 'Permitted Actions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const profile = useAtomValue(profileAtom);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-sidebar bg-forest-800 text-cream-100 flex flex-col z-50">
      {/* Wordmark */}
      <div className="px-5 py-6 border-b border-forest-700">
        <h1 className="font-display text-xl font-semibold tracking-[0.25em] text-cream-100 uppercase">
          COPIA
        </h1>
        <p className="font-sans text-xs text-forest-300 mt-1 tracking-wide">
          Estate Planning Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-institutional text-sm font-sans font-medium',
                  'transition-colors duration-150',
                  isActive
                    ? 'bg-forest-500 text-white'
                    : 'text-forest-200 hover:bg-forest-700 hover:text-cream-100',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-forest-700 space-y-0.5">
          <p className="px-3 py-1 font-sans text-xs font-semibold text-forest-400 uppercase tracking-wider">
            Capital Mobility
          </p>
          {mobilityNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-institutional text-sm font-sans font-medium',
                  'transition-colors duration-150',
                  isActive
                    ? 'bg-forest-500 text-white'
                    : 'text-forest-200 hover:bg-forest-700 hover:text-cream-100',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Active Profile Context */}
      <div className="px-4 py-4 border-t border-forest-700">
        {profile ? (
          <div>
            <p className="font-sans text-sm font-medium text-cream-100 truncate">
              {profile.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {profile.residencies.map((r) => (
                <span
                  key={r.country}
                  className="inline-block px-1.5 py-0.5 bg-forest-700 rounded-sm font-mono text-xs text-forest-200"
                >
                  {r.country}
                </span>
              ))}
              {profile.citizenships
                .filter((c) => !profile.residencies.some((r) => r.country === c))
                .map((c) => (
                  <span
                    key={c}
                    className="inline-block px-1.5 py-0.5 bg-forest-900 rounded-sm font-mono text-xs text-forest-300"
                  >
                    {c}
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="font-sans text-xs text-forest-400">No profile loaded</p>
            <p className="font-sans text-xs text-forest-500 mt-0.5">
              Go to Profile to get started
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
