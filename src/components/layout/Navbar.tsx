"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/context/UserRoleContext";
import { useNotification } from "@/context/NotificationContext";
import {
  Layers,
  CalendarDays,
  Bookmark,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, role, toggleRole, isAdmin } = useUserRole();
  const { showToast } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleRole = () => {
    toggleRole();
    const newRole = role === "ADMIN" ? "Member" : "Administrator";
    showToast({
      type: "info",
      title: `Switched to ${newRole} View`,
      message: `You are now interacting as ${newRole === "Administrator" ? "Sarah Jenkins (Admin)" : "Alex Morgan (Member)"}.`,
    });
  };

  const navLinks = [
    {
      name: "Explore Resources",
      href: "/",
      icon: Layers,
      active: pathname === "/",
    },
    {
      name: "Schedule Timeline",
      href: "/schedule",
      icon: CalendarDays,
      active: pathname === "/schedule",
    },
    {
      name: "My Reservations",
      href: "/my-reservations",
      icon: Bookmark,
      active: pathname === "/my-reservations",
    },
    {
      name: "Admin Hub",
      href: "/admin",
      icon: ShieldCheck,
      active: pathname.startsWith("/admin"),
      badge: isAdmin ? "Active" : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-1 -m-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
                  SyncSpace
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Workspace
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden sm:block -mt-0.5">
                Smart Resource Management
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    link.active
                      ? "bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.active ? "text-emerald-500" : "text-zinc-400"}`} />
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Demo Role Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleRole}
              title="Click to switch between Admin and Member roles"
              className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer shadow-xs ${
                isAdmin
                  ? "bg-purple-50/90 hover:bg-purple-100 border-purple-200 hover:border-purple-300 text-purple-950 dark:bg-purple-950/50 dark:hover:bg-purple-900/70 dark:border-purple-800/60 dark:hover:border-purple-600 dark:text-purple-100"
                  : "bg-emerald-50/90 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300 text-emerald-950 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 dark:border-emerald-800/60 dark:hover:border-emerald-600 dark:text-emerald-100"
              }`}
            >
              <div className="relative">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                    isAdmin ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-900 ${
                    isAdmin ? "bg-purple-500" : "bg-emerald-500"
                  }`}
                />
              </div>

              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                      isAdmin
                        ? "bg-purple-200/90 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200"
                        : "bg-emerald-200/90 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    {role}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors">
                  {currentUser.department}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 ml-1 pl-1 border-l border-zinc-200 dark:border-zinc-700 transition-colors">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[10px]">Switch</span>
              </div>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                  link.active
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-emerald-500" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
