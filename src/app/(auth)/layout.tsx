import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <header>
        <Link href="/" className="text-lg font-bold tracking-tight">
          StudyDash
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="flex justify-center">
        <ThemeToggle />
      </footer>
    </div>
  );
}
