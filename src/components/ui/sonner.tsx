"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      closeButton
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "animate-toast-slide-down",
          error: "toast-error",
          success: "toast-success",
          warning: "toast-warning",
          closeButton:
            "border-border/60 bg-background/90 text-foreground/70 hover:bg-background hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
