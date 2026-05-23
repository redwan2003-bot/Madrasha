import type { ReactNode } from "react";

export function BtnPrimary({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-full bg-[var(--color-primary)] py-3 px-4 text-center text-lg font-medium text-white shadow-md transition-[transform,box-shadow,background-color] duration-200 hover:bg-[var(--color-primary-hover)] ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnAccent({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-full bg-[var(--color-accent)] py-3 px-4 text-center text-lg font-medium text-white shadow-md transition-colors duration-200 hover:bg-[var(--color-accent-hover)] ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-6 block cursor-pointer rounded-full bg-[var(--color-primary)] px-8 py-2 text-white transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
    >
      ফিরে যান
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-6 mt-4 text-center text-2xl font-bold text-teal-700">{children}</h3>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-center text-gray-500">{children}</p>;
}
