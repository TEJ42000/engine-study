import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-24 px-6 space-y-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">← Back</Link>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Privacy Policy</h1>
      <div className="prose prose-zinc prose-sm">
        <p><strong>Last Updated: July 14, 2026</strong></p>
        <p>At Engine Study, your privacy is a core part of the product. Our "v1" architecture is built on the principle of minimal data collection.</p>
        
        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">1. Data Storage</h2>
        <p>By default, your study data (courses, engines, test sessions) is stored in your browser's local storage or our secure encrypted database if you have an account. We do not sell your study patterns or personal data to third parties.</p>

        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">2. AI Processing</h2>
        <p>When you use AI generation or marking features, the specific legal text or your recall attempt is sent to our AI providers (Google, OpenAI, or Anthropic) via secure API. This data is used solely to generate your study materials or feedback and is not used to train the underlying models.</p>

        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">3. Payments</h2>
        <p>Payment processing is handled entirely by Stripe. We do not store your credit card information on our servers.</p>
      </div>
    </div>
  );
}
