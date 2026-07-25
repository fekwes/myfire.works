import type { Metadata } from "next";
import { AccountPanel } from "@/components/AccountPanel";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Fireworks sign-in and saved data.",
  // Private, per-user settings page — keep it out of search results.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <AccountPanel />
    </div>
  );
}
