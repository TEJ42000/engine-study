import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { Pricing } from "@/components/pricing";
import Link from "next/link";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
              Earned mastery for law students.
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 max-w-2xl mx-auto">
              Engine Study uses cold recall and honest marking to ensure you don't just recognize concepts, but master them. No hints, no fluff.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <div className="w-full max-w-xs">
                <SignInButton />
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-32 grid grid-cols-1 gap-12 sm:grid-cols-3">
            {[
              {
                title: "Brightspace Sync",
                desc: "Automatically detect and pull syllabi, slides, and readings directly from your course portal.",
                icon: "⚡"
              },
              {
                title: "AI Analysis",
                desc: "Turn dense legal texts into high-fidelity study engines with automated extraction.",
                icon: "🤖"
              },
              {
                title: "Spaced Repetition",
                desc: "Maturity-based scheduling ensures you review what you're most likely to forget.",
                icon: "📈"
              }
            ].map((f) => (
              <div key={f.title} className="flex flex-col gap-4">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="text-base font-semibold text-zinc-900">{f.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* The Method */}
          <div className="mt-32 rounded-3xl bg-zinc-50 p-8 sm:p-12 border border-zinc-100">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-zinc-900">The Method: Zero Recognition.</h2>
              <p className="mt-4 text-zinc-600 text-sm leading-relaxed">
                Recognition is the enemy of mastery. If you see a hint, you haven't recalled the law; you've just recognized a pattern. Engine Study gates every answer behind a blind recall attempt. You grade your own reasoning path, and we track the leaks.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Two-axis maturity: Comprehension × Retrieval Reliability",
                  "Automated daily briefs focusing on at-risk engines",
                  "Timed mock drills for exam-day pressure",
                  "Direct PPTX parsing for instant slide extraction"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-600">
                    <span className="text-zinc-400 font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

          {/* Pricing */}
          <div className="mt-32">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Simple, transparent pricing.</h2>
              <p className="mt-4 text-zinc-600">Start for free, upgrade when you're serious about mastery.</p>
            </div>
            <Pricing />
          </div>


      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">Engine Study</span>
            <span className="text-xs text-zinc-400">© 2026</span>
          </div>
          <div className="flex gap-8 text-xs text-zinc-500">
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms</Link>
          </div>
          <p className="text-xs text-zinc-400">Private, secure, and built for rigorous legal study.</p>
        </div>
      </footer>
    </div>
  );
}
