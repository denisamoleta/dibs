import type { Metadata } from "next"
import { ProsePage } from "@/components/prose-page"

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Dibs stores, why, and for how long. Short version: very little.",
}

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy" updated="November 1, 2026 (usage statistics added)">
      <p>
        Dibs is built to collect as little as possible. There are no accounts, no ads, no third-party trackers and
        no selling of data — ever.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>What you type into a sheet: its title, date, location, notes and items.</li>
        <li>For each sign-up: the name and optional note the person entered.</li>
        <li>
          Hashed secrets: a fingerprint of each sheet&apos;s manage key and each sign-up&apos;s edit key. We
          can&apos;t read the keys themselves.
        </li>
        <li>
          Abuse protection: a short-lived counter keyed by a one-way hash of your IP address, so we can limit spam.
          Raw IP addresses aren&apos;t stored, and counters are deleted after a day.
        </li>
      </ul>

      <h2>Anonymous usage statistics</h2>
      <p>
        To understand whether Dibs is useful, we count things in aggregate: page views per type of page, sheets
        created, sign-ups, shares and app installs, plus which country (from your IP, never stored), device type
        and referring website a visit came from. No cookies are used. To count daily visitors without tracking
        anyone, we keep a one-way fingerprint that changes every day and is deleted after two days, so visits
        can&apos;t be linked across days or back to you. If your browser sends Do Not Track or Global Privacy
        Control, nothing is counted at all.
      </p>

      <h2>What stays on your device</h2>
      <p>
        Your browser remembers your name, the sheets you&apos;ve opened, and the keys that let you edit your own
        sheets and sign-ups. This lives in your browser&apos;s local storage and never leaves your device except
        when you use it to make a change.
      </p>

      <h2>Who can see a sheet</h2>
      <p>
        Anyone with a sheet&apos;s link can view it, including the names and notes of people who signed up. Sheets
        are unlisted and marked so search engines don&apos;t index them, but treat a link like an invitation: share
        it with the people you&apos;d invite.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Sheets are deleted automatically 90 days after the event date, or after 180 days without changes if they
        have no date. Hosts can delete a sheet at any time, and anyone can remove their own sign-up.
      </p>

      <h2>Service providers</h2>
      <p>
        Dibs runs on standard cloud infrastructure (hosting and a managed Postgres database). These providers
        process data only to run the service.
      </p>

      <h2>Questions or removal requests</h2>
      <p>
        If you need something removed and can&apos;t do it yourself, contact the host of the sheet or open an issue
        on the project&apos;s repository.
      </p>
    </ProsePage>
  )
}
