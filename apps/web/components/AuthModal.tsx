"use client";

import React, { useState } from "react";
import { api, SessionData, setStoredToken, setStoredWorkspaceId } from "../lib/api";
import { X, Lock, Mail, User, Building2, AlertCircle } from "lucide-react";
import { Logo } from "./Logo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: SessionData) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let session: SessionData;
      if (isRegister) {
        session = await api.register({
          email,
          password,
          display_name: displayName,
          workspace_name: workspaceName || "Default Workspace",
        });
      } else {
        session = await api.login({ email, password });
      }

      setStoredToken(session.token.access_token);
      setStoredWorkspaceId(session.active_workspace.id);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess() {
    setError(null);
    setLoading(true);
    try {
      const session = await api.getDemoSession();
      setStoredToken(session.token.access_token);
      setStoredWorkspaceId(session.active_workspace.id);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to initialize demo workspace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 relative transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header with Saffron Logo */}
        <div className="text-center space-y-2 pb-4">
          <div className="flex justify-center">
            <Logo size="md" showWordmark tagline="TRADE BINDAS" />
          </div>
          <h2 className="text-base font-bold text-[var(--text)] pt-2">
            {isRegister ? "Create TradingWave Account" : "Sign In to Workspace"}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {isRegister
              ? "Provision your quantitative research workspace for Indian markets"
              : "Access your deterministic strategy library and backtests"}
          </p>
        </div>

        {/* Instant 1-Click Developer Demo Access */}
        <div className="mb-4 p-3 rounded-xl bg-[#FF7722]/10 border border-[#FF7722]/25 flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="block text-xs font-bold text-[var(--text)]">Instant Developer Sandbox</span>
            <span className="block text-[11px] text-[var(--text-muted)]">One-click access with seeded strategies</span>
          </div>
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold shadow transition-all disabled:opacity-50 whitespace-nowrap"
          >
            Launch Demo Desk →
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-[var(--bg)] p-1 mb-4 border border-[var(--border)]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              !isRegister
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isRegister
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--loss)]/10 border border-[var(--loss)]/30 text-[var(--loss)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Arjun Sharma"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-1">
                  Initial Workspace Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Nifty Alpha Desk"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="trader@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text)] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722]"
              />
            </div>
            {isRegister && (
              <span className="block text-[10px] text-[var(--text-muted)] mt-1">
                Must be at least 8 characters long
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : isRegister ? "Create Free Workspace" : "Sign In to Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
