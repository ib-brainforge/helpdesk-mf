import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { useHref, useNavigate } from "@modern-js/runtime/router";
import React from "react";

export function HeroProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref} locale="en-AU">
      {children}
      <ToastProvider />
    </HeroUIProvider>
  );
}
