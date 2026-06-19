export default function TOS() {
  return (
    <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "var(--font-body)" }}>
      <nav className="border-b border-white/[0.04]" style={{ background: "rgba(3,3,3,0.85)" }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-extrabold text-orange-500 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Hexed</a>
          <a href="/" className="text-xs text-gray-500 hover:text-white transition-colors">← Back</a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 mb-3">Legal</p>
          <h1 className="text-4xl font-extrabold mb-3" style={{ fontFamily: "var(--font-display)" }}>Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: January 1, 2026</p>
        </div>

        <div className="space-y-10 text-gray-300 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-lg mb-3">1. Acceptance</h2>
            <p>By creating an account or using Hexed, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. Accounts</h2>
            <p>You are responsible for keeping your account credentials secure. You must be at least 13 years old to use Hexed. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Acceptable Use</h2>
            <p className="mb-3">You agree not to use Hexed to:</p>
            <ul className="space-y-2 list-none">
              {[
                "Post illegal, harmful, or abusive content",
                "Impersonate other people or entities",
                "Distribute malware or phishing links",
                "Attempt to hack or disrupt the service",
                "Violate any applicable laws or regulations",
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Content</h2>
            <p>You retain ownership of content you upload. By uploading, you grant Hexed a license to display it as part of your profile. We reserve the right to remove content that violates these terms without notice.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">5. Premium & Payments</h2>
            <p className="mb-3">Premium access is a one-time payment. By purchasing, you acknowledge and agree that:</p>
            <div className="border border-orange-500/20 rounded-2xl p-5 bg-orange-500/5">
              <p className="font-bold text-white mb-1">No Refund Policy</p>
              <p className="text-gray-400 text-sm">All purchases are final and non-refundable. We do not offer refunds for premium access, partial periods, or unused features. Please consider your purchase carefully before completing it.</p>
            </div>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Service Availability</h2>
            <p>We aim to keep Hexed running 24/7 but cannot guarantee uninterrupted service. We may update, modify, or discontinue features at any time without prior notice.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">7. Limitation of Liability</h2>
            <p>Hexed is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">8. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of Hexed after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">9. Contact</h2>
            <p className="mb-4">For any questions, concerns, or legal inquiries regarding these terms, you can reach us through:</p>
            <div className="flex flex-col gap-3">
              <a
                href="https://discord.gg/voidlink"
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/[0.06] hover:border-orange-500/30 hover:bg-white/[0.02] transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-[#5865F2]/20 flex items-center justify-center shrink-0">
                  <span className="text-base">💬</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">Discord</p>
                  <p className="text-gray-500 text-xs">discord.gg/voidlink</p>
                </div>
              </a>
              <a
                href="mailto:support@hexed.app"
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/[0.06] hover:border-orange-500/30 hover:bg-white/[0.02] transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <span className="text-base">✉️</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">Email</p>
                  <p className="text-gray-500 text-xs">support@hexed.app</p>
                </div>
              </a>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/[0.04] py-8 mt-16">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm font-extrabold text-orange-500" style={{ fontFamily: "var(--font-display)" }}>Hexed</span>
          <p className="text-[11px] text-gray-700">© 2026 Hexed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
