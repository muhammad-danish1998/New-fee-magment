import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Sliders, BookOpen, CalendarDays, X } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monthly-reports', label: 'Monthly Reports', icon: CalendarDays },
  { to: '/students', label: 'Students Directory', icon: Users },
  { to: '/enroll', label: 'Enroll Student', icon: UserPlus },
  { to: '/config', label: 'Academic & Brokers', icon: Sliders },
];

export function Sidebar({ mobileMenuOpen, onCloseMobileMenu }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={onCloseMobileMenu}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fadeIn"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 inset-y-0 md:inset-y-auto left-0 z-50 md:z-auto w-72 md:w-64 h-full md:h-[calc(100vh-4rem)] md:self-start bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Sidebar Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Portal Navigation</span>
          <button
            type="button"
            onClick={onCloseMobileMenu}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0 p-3.5 sm:p-4">
          {/* Nav Links */}
          <div className="space-y-1.5 shrink-0">
            <div className="hidden md:block px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Quick Summary Box */}
          <div className="mt-auto pt-4 shrink-0">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                <BookOpen className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>Active Academic Sessions</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Annual I &amp; Annual II (Regular, Private &amp; Combine Gap Admissions)
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
