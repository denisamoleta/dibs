"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  KeyRoundIcon,
  LockIcon,
  LockOpenIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { copyText, downloadFile, slugify } from "@/lib/browser"
import { toCsv } from "@/lib/summary"
import { track } from "@/lib/track"
import type { SheetDTO } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CopyListMenu, MessengerLinks, ShareButton } from "./share-actions"

export function HostPanel({
  sheet,
  guestUrl,
  manageUrl,
  justCreated,
  onToggleClosed,
  onDelete,
}: {
  sheet: SheetDTO
  guestUrl: string
  manageUrl: string
  justCreated: boolean
  onToggleClosed: () => Promise<void>
  onDelete: () => void
}) {
  const [showKey, setShowKey] = useState(justCreated)
  const [toggling, setToggling] = useState(false)

  return (
    <section
      aria-label="Host tools"
      className={cn(
        "animate-rise mt-6 rounded-2xl border p-4 sm:p-5",
        justCreated ? "border-primary/30 bg-tomato-soft/60" : "bg-card shadow-paper",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{justCreated ? "Your sheet is live! 🎉" : "You're the host"}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {justCreated
              ? "Drop this link in your group chat. People tap a spot to call dibs — no sign-up needed."
              : "Share the link, nudge the group, or tweak the sheet."}
          </p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More host options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <Link href={`/s/${sheet.slug}/edit`}>
                <PencilIcon /> Edit sheet
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowKey((s) => !s)}>
              <KeyRoundIcon /> {showKey ? "Hide manage link" : "Show manage link"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                downloadFile(`${slugify(sheet.title)}.csv`, toCsv(sheet), "text/csv;charset=utf-8")
              }
            >
              <DownloadIcon /> Download CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2Icon /> Delete sheet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LinkField
        className="mt-4"
        label="Guest link"
        value={guestUrl}
        copyLabel="Copy link"
        onCopied={() => track("share", "copy")}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <ShareButton sheet={sheet} url={guestUrl} />
        <MessengerLinks sheet={sheet} url={guestUrl} />
        <CopyListMenu sheet={sheet} url={guestUrl} />
      </div>

      {showKey && (
        <div className="animate-rise mt-4 rounded-xl border border-dashed border-foreground/20 bg-card p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <KeyRoundIcon className="size-4 text-primary" /> Your private manage link
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Use it to edit this sheet from another phone or computer. <strong>Don&apos;t share it</strong> —
            anyone with it can edit or delete the sheet. This device remembers it under My sheets.
          </p>
          <LinkField className="mt-3" label="Manage link" value={manageUrl} copyLabel="Copy" masked />
          <Button variant="link" size="sm" className="mt-1 h-auto px-0" asChild>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Manage link for "${sheet.title}"`)}&body=${encodeURIComponent(
                `Keep this private. Use it to edit your Dibs sheet:\n${manageUrl}`,
              )}`}
            >
              <MailIcon /> Email it to myself
            </a>
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button variant="secondary" asChild>
          <Link href={`/s/${sheet.slug}/edit`}>
            <PencilIcon data-icon="inline-start" /> Edit sheet
          </Link>
        </Button>
        <Button
          variant="secondary"
          disabled={toggling}
          onClick={async () => {
            setToggling(true)
            try {
              await onToggleClosed()
            } finally {
              setToggling(false)
            }
          }}
        >
          {sheet.isClosed ? <LockOpenIcon data-icon="inline-start" /> : <LockIcon data-icon="inline-start" />}
          {sheet.isClosed ? "Reopen sign-ups" : "Close sign-ups"}
        </Button>
      </div>
    </section>
  )
}

function LinkField({
  label,
  value,
  copyLabel,
  masked = false,
  className,
  onCopied,
}: {
  label: string
  value: string
  copyLabel: string
  masked?: boolean
  className?: string
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const display = masked && value ? value.replace(/(manage=)(.{4}).+(.{4})$/, "$1$2••••••••$3") : value

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex h-11 min-w-0 flex-1 items-center rounded-xl border bg-background px-3.5 font-mono text-[0.8rem] text-muted-foreground"
        aria-label={label}
      >
        <span className="truncate">{display || "…"}</span>
      </div>
      <Button
        variant={copied ? "secondary" : "ink"}
        className="h-11"
        disabled={!value}
        onClick={async () => {
          if (await copyText(value)) {
            onCopied?.()
            setCopied(true)
            toast.success(`${label} copied`)
            setTimeout(() => setCopied(false), 1800)
          } else {
            toast.error("Couldn't copy to your clipboard.")
          }
        }}
      >
        {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {copied ? "Copied" : copyLabel}
      </Button>
    </div>
  )
}
