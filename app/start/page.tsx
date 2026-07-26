import type { Metadata } from "next";
import { QuizFlow } from "@/components/QuizFlow";

export const metadata: Metadata = {
  title: "Build my plan",
  description:
    "A two-minute quiz that builds your FIRE plan and reveals when you could retire — no account needed to see your result.",
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  return <QuizFlow />;
}
