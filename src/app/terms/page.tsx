import type { Metadata } from "next"
import { ProsePage } from "@/components/prose-page"

export const metadata: Metadata = {
  title: "Terms",
  description: "The simple rules for using Dibs.",
}

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" updated="November 1, 2026">
      <p>By using Dibs you agree to these terms. They&apos;re short on purpose.</p>

      <h2>Use it kindly</h2>
      <ul>
        <li>Don&apos;t use Dibs for anything illegal, hateful, harassing or misleading.</li>
        <li>Don&apos;t collect sensitive information (like health details or ID numbers) in sheets.</li>
        <li>Don&apos;t try to break, overload or scrape the service.</li>
      </ul>
      <p>We may remove sheets that break these rules.</p>

      <h2>Your content</h2>
      <p>
        You own what you write. You give us permission to store and display it so the sheet works. Hosts are
        responsible for the sheets they create and who they share them with.
      </p>

      <h2>Keep your links safe</h2>
      <p>
        Your manage link is the key to your sheet. Anyone who has it can edit or delete the sheet, and we
        can&apos;t recover it for you if it&apos;s lost.
      </p>

      <h2>No warranty</h2>
      <p>
        Dibs is provided “as is”, without warranties of any kind. We do our best to keep it running and your data
        safe, but we&apos;re not liable for missed potluck dishes, lost sign-ups or other damages arising from
        using the service.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If we make a significant change, we&apos;ll update the date above.</p>
    </ProsePage>
  )
}
