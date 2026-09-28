"use client";

import { FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Avatar } from "./ui";
import { useAuth } from "../../lib/auth";

const UserMenu: FC<{ align?: "left" | "right" }> = ({ align = "right" }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const signOut = async () => {
    setOpen(false);
    await logout();
    // Full navigation: resets all in-memory state and avoids racing the dashboard's
    // own "signed out → /login" redirect.
    window.location.assign("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center rounded-full ring-white/30 transition hover:ring-2 focus-visible:ring-2"
      >
        <Avatar user={user} size={34} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/95 shadow-2xl shadow-black backdrop-blur-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="truncate text-sm font-medium text-white">{user.name || user.username}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <div className="p-1.5">
            {[
              { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
              { href: "/dashboard/settings", label: "Settings", icon: Settings },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-300 hover:bg-white/[0.06] hover:text-white"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
            <button
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-300 hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
