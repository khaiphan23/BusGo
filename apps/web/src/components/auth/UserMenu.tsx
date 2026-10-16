'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/auth/AuthProvider';

export function UserMenu() {
  const { user, isLoading, signOut } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsidePointer(event: Event) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center gap-4" aria-busy="true" data-testid="user-menu-loading">
        <div className="w-28 h-9 animate-pulse bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-gray-600 hover:text-primary font-medium">
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  const displayName = user.fullName ?? user.email ?? 'Tài khoản';
  const initial = displayName.trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push('/');
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={displayName}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-9 w-9 object-cover" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
            {user.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-primary"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
