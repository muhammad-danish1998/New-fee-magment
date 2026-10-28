import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, LogOut, KeyRound, Menu, X, Download, Sun, Moon, ChevronDown } from 'lucide-react';
import { CollegeLogo } from '../common/CollegeLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstallPrompt } from '../../hooks/usePWAInstallPrompt';
import { UpdateCredentialsModal } from '../auth/UpdateCredentialsModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function Navbar({ onToggleMobileMenu, mobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isInstallable, installApp } = usePWAInstallPrompt();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownContainerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const getMenuItems = () => {
    if (!menuRef.current) return [];
    return Array.from(menuRef.current.querySelectorAll('[role="menuitem"]:not([disabled])'));
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => {
          const items = getMenuItems();
          if (items.length > 0) items[0].focus();
        }, 10);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    const items = getMenuItems();
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between transition-colors duration-200">
        {/* Left: Mobile Toggle & College Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <CollegeLogo className="w-9 h-9 sm:w-11 sm:h-11 shadow-md rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-teal-500/30 shrink-0" />
          <div className="overflow-hidden">
            <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-1 block">
              {collegeName}
            </span>
            <p className="text-[10px] sm:text-[11px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-ping"></span>
              <span className="hidden sm:inline">Admission &amp; Fee Management Portal</span>
              <span className="sm:hidden">Fee LMS Portal</span>
            </p>
          </div>
        </div>

        {/* Right: User Profile & Actions Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="relative" ref={dropdownContainerRef}>
            {/* Admin Profile Trigger Button */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              onKeyDown={handleKeyDown}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-controls="admin-user-menu"
              aria-label="Admin profile and account settings"
              className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                isOpen
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-400 dark:border-slate-600'
                  : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-slate-900 dark:text-white font-bold leading-tight line-clamp-1 max-w-[120px] md:max-w-[150px]">
                  {user?.full_name || user?.username || 'Admin'}
                </div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-mono leading-none">
                  {user?.role || 'Administrator'}
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div
                ref={menuRef}
                id="admin-user-menu"
                role="menu"
                aria-orientation="vertical"
                aria-label="Account options"
                onKeyDown={handleKeyDown}
                className="absolute right-0 top-full mt-2 w-56 sm:w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 focus:outline-none"
              >
                {/* User Info Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
                      {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user?.full_name || user?.username || 'Administrator'}
                      </div>
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium font-mono uppercase tracking-wide truncate">
                        {user?.role || 'Administrator'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  {/* Install App (if installable) */}
                  {isInstallable && (
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => {
                        setIsOpen(false);
                        triggerRef.current?.focus();
                        installApp();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 focus:outline-none focus:bg-teal-50 dark:focus:bg-teal-950/40 transition-colors text-left"
                    >
                      <Download className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>Install App</span>
                    </button>
                  )}

                  {/* Dark Mode / Light Mode Toggle */}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                      )}
                      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {isDark ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  {/* Credentials */}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setIsOpen(false);
                      triggerRef.current?.focus();
                      setShowUpdateModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Credentials</span>
                  </button>
                </div>

                {/* Sign Out (Destructive, Red) */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" role="separator" />
                <div className="py-0.5">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setIsOpen(false);
                      triggerRef.current?.focus();
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 focus:outline-none focus:bg-rose-50 dark:focus:bg-rose-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Update Credentials Modal */}
      {showUpdateModal && (
        <UpdateCredentialsModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out of Portal?"
        description="Are you sure you want to end your current session and sign out from the administrative staff portal?"
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="warning"
        focusCancel={true}
      />
    </>
  );
}
