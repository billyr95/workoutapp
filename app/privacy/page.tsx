import Link from "next/link";

export const metadata = { title: "Privacy Policy — Repra" };

const EFFECTIVE_DATE = "August 28, 2026";
const CONTACT_EMAIL = "billy.e.riley@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col px-5 py-8">
      <div className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/repra-full-logo.svg" alt="Repra" className="h-6 w-auto" />
      </div>

      <h1 className="font-display text-3xl leading-none mb-1">Privacy Policy</h1>
      <p className="font-label text-xs text-[var(--muted)] mb-6">Effective {EFFECTIVE_DATE}</p>

      <div className="card flex flex-col gap-5 text-[13px] leading-relaxed text-[var(--chalk-dim)]">
        <p>
          This Privacy Policy explains what information Repra collects, how it&apos;s used, and who it&apos;s shared
          with. Repra is operated by Billy Riley (&quot;<strong className="text-[var(--chalk)]">we</strong>&quot;,
          &quot;<strong className="text-[var(--chalk)]">us</strong>&quot;).
        </p>

        <Section title="1. Information We Collect">
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1">
            <li><strong className="text-[var(--chalk)]">Account info</strong>: name, username, email, and a hashed password (or, if you use Google sign-in, the name/email/profile photo Google provides).</li>
            <li><strong className="text-[var(--chalk)]">Fitness data</strong>: workouts, sets, reps, weights logged, cardio sessions, body measurements, weight history, and nutrition/macro goals you enter.</li>
            <li><strong className="text-[var(--chalk)]">Profile photo</strong>, if you upload one.</li>
            <li><strong className="text-[var(--chalk)]">Usage data</strong>: basic technical data like IP address and browser type, collected automatically to keep the Service secure and working.</li>
          </ul>
        </Section>

        <Section title="2. How We Use It">
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1">
            <li>To operate the Service — save your workouts, show your progress, run your schedule;</li>
            <li>To generate the AI-powered &quot;Insights&quot; and &quot;Coach&apos;s Take&quot; summaries (see below);</li>
            <li>To authenticate you and keep your account secure;</li>
            <li>To improve and troubleshoot the Service.</li>
          </ul>
          <p className="mt-2">We do not sell your personal information.</p>
        </Section>

        <Section title="3. AI Processing">
          <p>
            To generate your daily Insights and weekly Coach&apos;s Take, a summary of your recent training data
            (exercises, sets, weights, schedule — not your name, email, or password) is sent to Google&apos;s Gemini
            API for processing. That data is subject to Google&apos;s API terms and is not used by Google to train
            their models when accessed this way. We cache the generated text so the same summary isn&apos;t
            regenerated on every page load.
          </p>
        </Section>

        <Section title="4. Who We Share Data With">
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1">
            <li><strong className="text-[var(--chalk)]">Service providers</strong> we use to run Repra: Neon (database hosting), Vercel (application hosting and photo/file storage), and Google (sign-in and the Gemini API described above). These providers only process data on our behalf.</li>
            <li><strong className="text-[var(--chalk)]">Other users</strong>, but only for fields you explicitly choose to make public — your profile page has separate toggles for showing your weight, program, maxes, and workout days. Everything is private by default until you turn a toggle on.</li>
            <li>We may disclose information if required by law, or to protect the rights, safety, or property of Repra or others.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We keep your account and fitness data for as long as your account is active. If you request deletion (see
            below), we&apos;ll delete your account data within a reasonable time, except where we&apos;re required to
            retain something for legal or security reasons.
          </p>
        </Section>

        <Section title="6. Your Choices">
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1">
            <li><strong className="text-[var(--chalk)]">Access/correction</strong>: most of your data is editable directly in the app (Profile, Schedule, etc.).</li>
            <li><strong className="text-[var(--chalk)]">Visibility</strong>: control what&apos;s public via the toggles on your Profile page.</li>
            <li><strong className="text-[var(--chalk)]">Deletion</strong>: email <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--chalk)] underline">{CONTACT_EMAIL}</a> to request your account and data be deleted.</li>
          </ul>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            Repra is not directed to children under 16, and we don&apos;t knowingly collect information from them. If
            you believe a child has created an account, contact us and we&apos;ll remove it.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use reasonable technical measures (like password hashing and encrypted connections) to protect your
            data, but no method of transmission or storage is 100% secure, and we can&apos;t guarantee absolute
            security.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we&apos;ll update the
            effective date above.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about this policy or your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--chalk)] underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>

      <p className="text-center font-label text-xs text-[var(--muted)] mt-6">
        <Link href="/auth/sign-up" className="text-[var(--chalk)] underline">Back to sign up</Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-label mb-2">{title}</div>
      {children}
    </div>
  );
}
