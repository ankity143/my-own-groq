"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ApiKeyModal } from "@/components/byok/api-key-modal";
import { ToastProvider } from "@/components/ui/toast";
import { ProviderId } from "@/types";
import { getAllStoredKeys } from "@/lib/security/key-storage";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [modalDefaultProvider, setModalDefaultProvider] = useState<ProviderId>("groq");
  const [keysUpdatedTrigger, setKeysUpdatedTrigger] = useState(0);
  const [configuredCount, setConfiguredCount] = useState(0);

  const updateConfiguredCount = () => {
    const keys = getAllStoredKeys();
    const count = Object.values(keys).filter(Boolean).length;
    setConfiguredCount(count);
  };

  useEffect(() => {
    updateConfiguredCount();
  }, [keysUpdatedTrigger]);

  const handleOpenKeyModal = (provider?: ProviderId) => {
    if (provider) setModalDefaultProvider(provider);
    setIsKeyModalOpen(true);
  };

  const handleKeysChanged = () => {
    setKeysUpdatedTrigger((prev) => prev + 1);
    updateConfiguredCount();
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onOpenKeyModal={() => handleOpenKeyModal()}
            configuredCount={configuredCount}
          />
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-[260px] h-full bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                isCollapsed={false}
                onToggleCollapse={() => setIsMobileMenuOpen(false)}
                onOpenKeyModal={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenKeyModal();
                }}
                configuredCount={configuredCount}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            isSidebarCollapsed ? "md:pl-[72px]" : "md:pl-[240px]"
          }`}
        >
          <Header
            onOpenKeyModal={handleOpenKeyModal}
            onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
            keysUpdatedTrigger={keysUpdatedTrigger}
          />

          <main className="flex-1 flex flex-col">{children}</main>
        </div>

        {/* Global BYOK Modal */}
        <ApiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          defaultProvider={modalDefaultProvider}
          onKeysChanged={handleKeysChanged}
        />
      </div>
    </ToastProvider>
  );
}

