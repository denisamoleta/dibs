import Link from "next/link"
import {
  ArrowRightIcon,
  BellOffIcon,
  CheckIcon,
  ClipboardListIcon,
  LinkIcon,
  MinusIcon,
  RadioIcon,
  SmartphoneIcon,
  UserRoundXIcon,
  XIcon,
} from "lucide-react"
import { DemoSheet } from "@/components/landing/demo-sheet"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { site } from "@/lib/site"
import { TEMPLATES } from "@/lib/templates"

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <ChatChaos />
        <HowItWorks />
        <Templates />
        <Comparison />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: site.name,
            description: site.description,
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-paper">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Free forever for guests · No ads · No sign-up
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] font-bold sm:text-6xl lg:text-[4.2rem]">
            Who&apos;s bringing what? <span className="marker">Sorted</span> in one link.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Make a sign-up sheet in 30 seconds. Drop the link in the group chat. Everyone taps a spot to call
            dibs — no app, no account, no five bowls of pasta salad.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/new">
                Create a free sheet <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Works in every group chat — WhatsApp, iMessage, Messenger, Slack, email.
          </p>
        </div>
        <DemoSheet className="animate-rise mx-auto w-full max-w-md [animation-delay:120ms] lg:max-w-none" />
      </div>
    </section>
  )
}

const CHAT = [
  { who: "Sam", text: "ok who's bringing what for saturday??", me: false },
  { who: "Lee", text: "I can do dessert!!", me: false },
  { who: "Ana", text: "wait I was gonna do dessert 😅", me: false },
  { who: "Sam", text: "does anyone have plates", me: false },
  { who: "Jo", text: "can someone scroll up and make a list 🙏", me: false },
]

function ChatChaos() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Group chats are great for chatting. <span className="text-muted-foreground">Terrible for lists.</span>
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Messages scroll away, two people bring the same thing, and nobody remembers the ice. Dibs gives the
            group one tidy list everyone can see and update — while the conversation stays in the chat.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-paper" aria-label="A messy group chat">
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Before</p>
            {CHAT.map((m, i) => (
              <div key={i} className="max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm">
                <span className="block text-[0.7rem] font-semibold text-muted-foreground">{m.who}</span>
                {m.text}
              </div>
            ))}
          </div>
          <div
            className="flex flex-col rounded-2xl border border-primary/25 bg-card p-4 shadow-paper"
            aria-label="The same plan on Dibs"
          >
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">After</p>
            {[
              ["Mains", "Sam, Lee", true],
              ["Dessert", "Ana", true],
              ["Plates & cups", "Jo", true],
              ["Drinks", "1 spot open", false],
              ["Ice", "1 spot open", false],
            ].map(([item, who, done]) => (
              <div key={item as string} className="flex items-center gap-2.5 border-b py-2 text-sm last:border-0">
                <span
                  className={
                    done
                      ? "flex size-5 items-center justify-center rounded-full bg-success text-white"
                      : "size-5 rounded-full border-2 border-dashed border-primary/50"
                  }
                  aria-hidden="true"
                >
                  {done && <CheckIcon className="size-3" strokeWidth={3} />}
                </span>
                <span className="font-medium">{item}</span>
                <span className={done ? "ml-auto text-muted-foreground" : "ml-auto font-medium text-primary"}>
                  {who}
                </span>
              </div>
            ))}
            <p className="mt-auto pt-3 text-xs text-muted-foreground">One link. Always up to date.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    icon: ClipboardListIcon,
    title: "Make the list",
    body: "Pick a template or start blank. Add items and how many spots each has. 30 seconds, tops.",
  },
  {
    icon: LinkIcon,
    title: "Drop the link in the chat",
    body: "The preview shows what's still open, so people actually tap it. Copy a ready-made summary any time.",
  },
  {
    icon: RadioIcon,
    title: "Everyone calls dibs",
    body: "Guests tap a spot and type their name. Changes show up live for everyone — no refreshing.",
  },
]

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">From “who&apos;s bringing what?” to done in three taps</h2>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border bg-card p-6 shadow-paper">
            <span className="absolute top-5 right-5 font-display text-5xl font-bold text-muted" aria-hidden="true">
              {i + 1}
            </span>
            <span className="flex size-11 items-center justify-center rounded-xl bg-tomato-soft text-primary">
              <s.icon className="size-5" />
            </span>
            <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Templates() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Start with a template</h2>
            <p className="mt-2 text-muted-foreground">Ready-made lists you can tweak in seconds.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/new?template=blank">Or start from scratch</Link>
          </Button>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Link
                href={`/new?template=${t.id}`}
                className="group flex h-full items-start gap-4 rounded-2xl border bg-card p-5 shadow-paper transition-all hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl transition-transform group-hover:scale-110 group-hover:-rotate-6"
                  aria-hidden="true"
                >
                  {t.emoji}
                </span>
                <span>
                  <span className="flex items-center gap-1 font-semibold">
                    {t.name}
                    <ArrowRightIcon className="size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

type Mark = "yes" | "no" | "meh"
const ROWS: { label: string; icon: typeof CheckIcon; dibs: Mark; sites: Mark; chat: Mark; note?: string }[] = [
  { label: "Free for everyone", icon: CheckIcon, dibs: "yes", sites: "meh", chat: "yes", note: "Sign-up sites often limit free sheets or upsell" },
  { label: "No ads, ever", icon: BellOffIcon, dibs: "yes", sites: "meh", chat: "yes", note: "Many show ads on free plans" },
  { label: "Guests skip accounts", icon: UserRoundXIcon, dibs: "yes", sites: "meh", chat: "yes" },
  { label: "Designed for phones first", icon: SmartphoneIcon, dibs: "yes", sites: "meh", chat: "yes" },
  { label: "One organized, live list", icon: RadioIcon, dibs: "yes", sites: "yes", chat: "no" },
  { label: "Chat-ready summaries", icon: ClipboardListIcon, dibs: "yes", sites: "no", chat: "no" },
]

function MarkIcon({ mark }: { mark: Mark }) {
  if (mark === "yes")
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckIcon className="size-4" strokeWidth={3} />
        <span className="sr-only">Yes</span>
      </span>
    )
  if (mark === "no")
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <XIcon className="size-4" />
        <span className="sr-only">No</span>
      </span>
    )
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <MinusIcon className="size-4" />
      <span className="sr-only">Sometimes</span>
    </span>
  )
}

function Comparison() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="text-center text-3xl font-bold sm:text-4xl">Why not just use a sign-up site?</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Because your aunt shouldn&apos;t have to close three pop-ups and make an account to say she&apos;s bringing
        rolls.
      </p>
      <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-paper">
        <table className="w-full text-sm">
          <caption className="sr-only">Dibs compared with typical sign-up sites and group chats</caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="px-2 py-3 text-center font-display text-base font-bold text-primary">
                Dibs
              </th>
              <th scope="col" className="px-2 py-3 text-center font-semibold text-muted-foreground">
                <span className="hidden sm:inline">Typical sign-up sites</span>
                <span className="sm:hidden">Sign-up sites</span>
              </th>
              <th scope="col" className="px-2 py-3 text-center font-semibold text-muted-foreground">
                Group chat
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <th scope="row" className="px-4 py-3.5 text-left font-medium sm:px-6">
                  <span className="flex items-center gap-2.5">
                    <r.icon className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
                    {r.label}
                  </span>
                </th>
                <td className="px-2 text-center">
                  <MarkIcon mark={r.dibs} />
                </td>
                <td className="px-2 text-center" title={r.note}>
                  <MarkIcon mark={r.sites} />
                </td>
                <td className="px-2 text-center">
                  <MarkIcon mark={r.chat} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes. Creating sheets and signing up is free, with no ads. Later we may offer optional extras for organizations (like reminders and branding), but the core will stay free.",
  },
  {
    q: "Do I need an account?",
    a: "No — not you, not your guests. When you create a sheet you get a private manage link. This device remembers it under “My sheets”, and you can email it to yourself to edit from anywhere.",
  },
  {
    q: "What if I lose my manage link?",
    a: "If you're on the same device and browser, it's saved in My sheets. Otherwise we can't recover it — we only store a scrambled fingerprint of it. That's why we nudge you to save it when the sheet is created.",
  },
  {
    q: "Who can see my sheet?",
    a: "Anyone with the link, like an invitation. Sheets are unlisted and hidden from search engines. Guests can only change their own sign-ups; only you can edit the sheet.",
  },
  {
    q: "Can people change their mind?",
    a: "Yes. Guests can edit their note or remove their sign-up from the device they used. You can remove anyone's sign-up as the host.",
  },
  {
    q: "How long do sheets last?",
    a: "Until 90 days after the event date (or 180 days of inactivity if there's no date). Then they're deleted automatically. You can delete yours anytime.",
  },
]

function Faq() {
  return (
    <section className="border-t bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="text-3xl font-bold sm:text-4xl">Questions, answered</h2>
        <div className="mt-8 divide-y rounded-2xl border bg-card shadow-paper">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold">
                {f.q}
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-lg leading-none transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-14 text-center text-background sm:px-12">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <h2 className="relative text-3xl font-bold sm:text-5xl">Got something to organize?</h2>
        <p className="relative mx-auto mt-4 max-w-lg text-background/70">
          Your next potluck, shift schedule or meal train is one link away.
        </p>
        <Button asChild size="lg" className="relative mt-8">
          <Link href="/new">
            Create a free sheet <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
