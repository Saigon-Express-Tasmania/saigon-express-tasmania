import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type ReactNode } from 'react';

import heroBg from '@/assets/background.webp';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

const titleShadow = '[text-shadow:0_2px_18px_rgba(0,0,0,0.85),0_1px_4px_rgba(0,0,0,0.6)]';
const subtitleShadow = '[text-shadow:0_1px_10px_rgba(0,0,0,0.8),0_1px_3px_rgba(0,0,0,0.5)]';

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#1a0a0a]/75 to-primary/40"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-10 max-w-lg text-center">
          <p
            className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/90 ${subtitleShadow}`}
          >
            Admin Portal
          </p>
          <h1 className={`font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl ${titleShadow}`}>
            Saigon Express Tasmania
          </h1>
          <p className={`mt-3 text-base text-white/90 sm:text-lg ${subtitleShadow}`}>
            Fresh Vietnamese food — manage your restaurant platform
          </p>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-white/15 bg-white/95 shadow-2xl backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl">{title}</CardTitle>
              {description && (
                <CardDescription className="text-muted-foreground">
                  {description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>

        <p className={`mt-8 text-center text-sm text-white/75 ${subtitleShadow}`}>
          Bánh mì · Phở · Catering · 8 Tasmania locations
        </p>
      </div>
    </div>
  );
}
