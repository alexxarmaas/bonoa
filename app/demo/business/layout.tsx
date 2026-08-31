import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo comercial",
  description: "Demostración ficticia de Bonoa Business.",
  robots: { index: false, follow: false },
};

export default function BusinessDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
