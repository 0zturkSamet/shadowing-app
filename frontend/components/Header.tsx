'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BRAND, NAVIGATION } from '@/lib/constants/branding';
import { useState, useRef, useEffect } from 'react';

// ShadowTube Logo Component
function ShadowTubeLogo() {
  return (
    <div className="flex items-center space-x-3">
      {/* Logo Icon: Play button merged with speech wave */}
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Circular background */}
          <circle cx="20" cy="20" r="20" fill="#FF0000" />
          {/* Play button */}
          <path d="M15 12 L15 28 L28 20 Z" fill="white" />
          {/* Speech wave accent */}
          <path
            d="M30 16 Q32 18 30 20 Q32 22 30 24"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M32 14 Q35 18 32 22 Q35 26 32 26"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
        </svg>
      </div>
      {/* Wordmark */}
      <span className="text-2xl md:text-3xl font-bold text-secondary">
        Shadow<span className="text-youtube-red">Tube</span>
      </span>
    </div>
  );
}

// Profile Dropdown Component
function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-youtube-red flex items-center justify-center text-white font-semibold">
          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-shadowtube shadow-2xl border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-secondary">{user.name || 'User'}</p>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-youtube-red font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <ShadowTubeLogo />
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAVIGATION.main.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-youtube-red'
                    : 'text-gray-700 hover:text-youtube-red'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side: Auth Buttons or Profile */}
          <div className="flex items-center space-x-3">
            {user ? (
              <ProfileDropdown />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-secondary font-semibold hover:text-youtube-red transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="shadowtube-button-primary px-6 py-2"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-center space-x-6 mt-3 pt-3 border-t border-gray-100">
          {NAVIGATION.main.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`font-medium transition-colors text-sm ${
                isActive(item.href)
                  ? 'text-youtube-red'
                  : 'text-gray-700 hover:text-youtube-red'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
