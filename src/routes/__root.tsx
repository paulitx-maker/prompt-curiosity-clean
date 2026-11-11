import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ClientInit } from "@/components/ClientInit";
import { PaywallBottomSheet } from "@/components/PaywallBottomSheet"
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Anti-Jegue - Manda uma foto, que a gente cria o seu post" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as any },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body className="min-h-screen bg-[#FFFBF5] text-[#1A1A1A] antialiased selection:bg-[#FF6B00]/20">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ClientInit />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url('/printfotofundo.png')", backgroundRepeat: 'repeat', backgroundSize: '600px' }} />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: "url('/gold_mudra_pattern.png')", backgroundRepeat: 'repeat', backgroundSize: '600px' }} />
      </div>
      <div className="relative z-10">
        <Outlet />
      </div>
      <PaywallBottomSheet />
      <Toaster />
    </QueryClientProvider>
  );
}

