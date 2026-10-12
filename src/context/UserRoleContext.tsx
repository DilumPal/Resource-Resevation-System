"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Role = "ADMIN" | "MEMBER";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
}

export const DEMO_USERS: Record<Role, CurrentUser> = {
  ADMIN: {
    id: "user-admin-01",
    name: "Sarah Jenkins",
    email: "admin@syncspace.io",
    role: "ADMIN",
    department: "Operations & Facilities",
  },
  MEMBER: {
    id: "user-member-01",
    name: "Alex Morgan",
    email: "alex.member@syncspace.io",
    role: "MEMBER",
    department: "Software Engineering",
  },
};

interface UserRoleContextType {
  currentUser: CurrentUser;
  role: Role;
  setRole: (role: Role) => void;
  toggleRole: () => void;
  isAdmin: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("MEMBER");

  // Load from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("syncspace_demo_role") as Role | null;
    if (saved && (saved === "ADMIN" || saved === "MEMBER")) {
      setRoleState(saved);
    }
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem("syncspace_demo_role", newRole);
  };

  const toggleRole = () => {
    const nextRole = role === "ADMIN" ? "MEMBER" : "ADMIN";
    setRole(nextRole);
  };

  const currentUser = DEMO_USERS[role];
  const isAdmin = role === "ADMIN";

  return (
    <UserRoleContext.Provider
      value={{
        currentUser,
        role,
        setRole,
        toggleRole,
        isAdmin,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
