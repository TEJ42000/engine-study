import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-24 px-6 space-y-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">← Back</Link>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Terms of Service</h1>
      <div className="prose prose-zinc prose-sm">
        <p><strong>Last Updated: July 14, 2026</strong></p>
        
        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">1. Acceptance of Terms</h2>
        <p>By using Engine Study, you agree to these terms. If you do not agree, please do not use the service.</p>

        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">2. Usage Policy</h2>
        <p>Engine Study is a tool for academic and professional preparation. You are responsible for the content you upload and for ensuring it does not violate copyright laws or academic integrity policies of your institution.</p>

        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">3. Subscriptions and Refunds</h2>
        <p>Subscriptions are billed in advance on a monthly basis. You can cancel at any time through your dashboard. Refunds are handled on a case-by-case basis in accordance with our payment provider's policies.</p>

        <h2 className="text-lg font-semibold text-zinc-900 mt-6 mb-2">4. Disclaimer</h2>
        <p>Engine Study provides AI-generated study aids. While we strive for accuracy, AI can make mistakes. The service is provided "as is" without warranty of any kind.</p>
      </div>
    </div>
  );
}
