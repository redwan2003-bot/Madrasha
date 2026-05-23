"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "মূল পাতা" },
  { href: "/office", label: "অফিস প্যানেল" },
  { href: "/admin", label: "এডমিন প্যানেল" },
  { href: "/leave", label: "ছুটির দরখাস্ত" },
  { href: "/students", label: "শিক্ষার্থী তথ্য" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) => {
    const active = pathname === href;
    return [
      "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer",
      active
        ? "bg-teal-600 text-white"
        : "text-gray-300 hover:bg-sky-700 hover:text-white",
    ].join(" ");
  };

  return (
    <nav className="bg-sky-800 shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={signOut}
            className="hidden cursor-pointer rounded-md px-3 py-2 text-sm text-gray-300 transition-colors duration-200 hover:bg-sky-700 hover:text-white md:block"
          >
            লগআউট
          </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-gray-400 hover:bg-sky-700 hover:text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">মেনু</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        </div>
      </div>
      <div
        id="mobile-menu"
        className={`md:hidden ${open ? "block" : "hidden"} border-t border-sky-900 px-2 pb-3 pt-2`}
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`block ${linkClass(l.href)}`}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            signOut();
          }}
          className="mt-2 block w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium text-gray-300 hover:bg-sky-700 hover:text-white"
        >
          লগআউট
        </button>
      </div>
    </nav>
  );
}
