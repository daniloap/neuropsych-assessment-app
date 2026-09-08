"use client";
import { createContext, useContext } from "react";
import type { Assessment, Appointment, Patient, User, Workspace } from "@/lib/domain";
export type ModalSpec =
  | { kind: "patient"; patient?: Patient }
  | { kind: "assessment"; assessment?: Assessment; patientId?: string }
  | { kind: "score"; assessment: Assessment; code?: string }
  | { kind: "appointment"; appointment?: Appointment; assessmentId?: string; day?: string }
  | { kind: "search" };
export type AppContextValue = {
  w: Workspace; user: User; route: string; busy: boolean; error: string;
  navigate: (path: string) => void; open: (modal: ModalSpec) => void; close: () => void;
  run: (action: string, data: Record<string, unknown>, success?: string) => Promise<{ id: string } | null>;
  refresh: () => Promise<void>;
  setUnsaved: (value: boolean) => void;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error("Missing workspace context"); return value; }
