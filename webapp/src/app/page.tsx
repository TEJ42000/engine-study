import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";

export default async function LandingPage() {
  // If already signed in, go straight to the app.
  const session = await auth();
  if (session) redirect("/leaks");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Engine Study
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Cold recall. Honest marking. Earned mastery.
          </p>
        </div>

        {/* Method blurb */}
        <ul className="text-left text-sm text-zinc-600 space-y-2">
          {[
            "Turn every exam topic into a testable engine",
            "Gate-first recall — no recognition, no hints",
            "Two-axis maturity: comprehension × reliability",
            "Log every leak, track every pass",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-0.5 text-zinc-400">→</span>
              {line}
            </li>
          ))}
        </ul>

        {/* Sign in */}
        <SignInButton />

        <p className="text-xs text-zinc-400">
          Your study data is private and tied to your Google account.
        </p>
      </div>
    </main>
  );
}
