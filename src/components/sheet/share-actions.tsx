"use client"

import { toast } from "sonner"
import {
  CalendarPlusIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  Share2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildIcs, googleCalendarUrl } from "@/lib/calendar"
import { canNativeShare, copyText, downloadFile, nativeShare, slugify } from "@/lib/browser"
import { fullSummary, stillNeededSummary } from "@/lib/summary"
import { track } from "@/lib/track"
import type { SheetDTO } from "@/lib/types"

export function shareText(sheet: SheetDTO, url: string) {
  return {
    invite: `Sign up for "${sheet.title}" — tap to call dibs: ${url}`,
    full: () => fullSummary(sheet, url),
    needed: () => stillNeededSummary(sheet, url),
  }
}

export async function shareLink(sheet: SheetDTO, url: string) {
  if (canNativeShare()) {
    const shared = await nativeShare({ title: sheet.title, text: `Sign up for "${sheet.title}"`, url })
    if (shared) return track("share", "native")
  }
  if (await copyText(url)) {
    track("share", "copy")
    toast.success("Link copied — paste it in your group chat")
  } else toast.error("Couldn't copy. Long-press the address bar to copy the link.")
}

export function ShareButton({ sheet, url, variant = "default" }: { sheet: SheetDTO; url: string; variant?: "default" | "outline" }) {
  return (
    <Button variant={variant} onClick={() => shareLink(sheet, url)} disabled={!url}>
      <Share2Icon data-icon="inline-start" />
      Share
    </Button>
  )
}

export function CopyListMenu({ sheet, url }: { sheet: SheetDTO; url: string }) {
  const text = shareText(sheet, url)

  async function copy(value: string, label: string, kind: "full" | "needed" | "link") {
    if (await copyText(value)) {
      track("copy_list", kind)
      toast.success(`${label} copied — paste it anywhere`)
    } else toast.error("Couldn't copy to your clipboard.")
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!url}>
          <ClipboardListIcon data-icon="inline-start" />
          Copy list
          <ChevronDownIcon className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>For your group chat</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => copy(text.full(), "Full list", "full")}>
          <ClipboardListIcon />
          <div>
            <p>Full list</p>
            <p className="text-xs text-muted-foreground">Everything, with who&apos;s on it</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(text.needed(), "“Still needed” list", "needed")}>
          <MessageCircleIcon />
          <div>
            <p>Still needed</p>
            <p className="text-xs text-muted-foreground">A friendly nudge with open spots</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => copy(url, "Link", "link")}>
          <LinkIcon /> Just the link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MessengerLinks({ sheet, url }: { sheet: SheetDTO; url: string }) {
  const text = shareText(sheet, url)
  return (
    <>
      <Button variant="outline" asChild>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text.invite)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("share", "whatsapp")}
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Sign up: ${sheet.title}`)}&body=${encodeURIComponent(text.invite)}`}
          onClick={() => track("share", "email")}
        >
          <MailIcon data-icon="inline-start" />
          Email
        </a>
      </Button>
    </>
  )
}

export function CalendarMenu({ sheet, url }: { sheet: SheetDTO; url: string }) {
  if (!sheet.eventDate) return null
  const google = googleCalendarUrl(sheet, url)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <CalendarPlusIcon data-icon="inline-start" />
          <span className="hidden min-[400px]:inline">Add to calendar</span>
          <span className="min-[400px]:hidden">Calendar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {google && (
          <DropdownMenuItem asChild>
            <a href={google} target="_blank" rel="noopener noreferrer" onClick={() => track("calendar", "google")}>
              <CalendarPlusIcon /> Google Calendar
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            const ics = buildIcs(sheet, url)
            if (ics) {
              downloadFile(`${slugify(sheet.title)}.ics`, ics, "text/calendar;charset=utf-8")
              track("calendar", "ics")
            }
          }}
        >
          <DownloadIcon /> Apple / Outlook (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor" data-icon="inline-start">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.9 9.9 0 0 0 12.04 2Zm5.8 14.03c-.25.69-1.44 1.32-1.98 1.37-.53.05-1.03.24-3.46-.72-2.93-1.15-4.79-4.15-4.93-4.34-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.26-.29.57-.36.77-.36l.55.01c.18.01.42-.07.65.5.25.59.84 2.03.91 2.18.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.13.59.17.29.74 1.21 1.58 1.96 1.09.97 2 1.27 2.29 1.41.29.14.45.12.62-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.69-.18 1.38Z" />
    </svg>
  )
}
