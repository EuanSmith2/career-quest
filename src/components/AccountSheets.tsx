import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Mail, MailCheck } from "lucide-react";
import { useSendMagicLink, useStartGuest } from "@/api/hooks";
import { Byte } from "./Byte";
import { ChunkyButton } from "./ChunkyButton";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";

interface AccountUi {
  /** Ask for a nickname (guest play), then run `then`. */
  askNickname: (then?: () => void) => void;
  /** Open the "save your progress" email sheet. */
  openSaveProgress: (mode?: "save" | "signin") => void;
}

const Ctx = createContext<AccountUi | null>(null);

export function useAccountUi(): AccountUi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAccountUi must be used inside <AccountUiProvider>");
  return c;
}

export function AccountUiProvider({ children }: { children: ReactNode }) {
  const [nickOpen, setNickOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"save" | "signin" | null>(null);
  const after = useRef<(() => void) | undefined>(undefined);

  const askNickname = useCallback((then?: () => void) => {
    after.current = then;
    setNickOpen(true);
  }, []);
  const openSaveProgress = useCallback((mode: "save" | "signin" = "save") => setEmailMode(mode), []);
  const value = useMemo(() => ({ askNickname, openSaveProgress }), [askNickname, openSaveProgress]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <NicknameSheet
        open={nickOpen}
        onOpenChange={setNickOpen}
        onDone={() => {
          setNickOpen(false);
          after.current?.();
          after.current = undefined;
        }}
      />
      <EmailSheet mode={emailMode} onClose={() => setEmailMode(null)} />
    </Ctx.Provider>
  );
}

const SUGGESTIONS = ["CyberOwlet", "PacketPal", "RootRaccoon", "FirewallFox", "ByteBuddy", "ZeroDayZebra"];

function NicknameSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const start = useStartGuest();
  const submit = (nick: string) => start.mutate(nick.trim() || SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)], { onSuccess: onDone });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex flex-col items-center gap-4 text-center">
          <Byte mood="wave" size={96} followPointer />
          <SheetTitle>Pick a nickname</SheetTitle>
          <SheetDescription>Play straight away as a guest. You can save your progress with an email later.</SheetDescription>
          <form
            className="flex w-full flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(name);
            }}
          >
            <Input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. PacketPal" aria-label="Nickname" />
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button key={s} type="button" onClick={() => setName(s)} className="rounded-full border-2 border-border px-3 py-1 text-caption font-bold text-muted-foreground hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
            <ChunkyButton type="submit" block disabled={start.isPending}>
              {start.isPending ? "Starting…" : "Let's go"}
            </ChunkyButton>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmailSheet({ mode, onClose }: { mode: "save" | "signin" | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const send = useSendMagicLink();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          send.reset();
        }
      }}
    >
      <SheetContent>
        {send.isSuccess ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <MailCheck className="h-16 w-16 text-correct" />
            <SheetTitle>Check your inbox</SheetTitle>
            <SheetDescription>
              We sent a sign-in link to <strong className="text-foreground">{email}</strong>. Open it on this device to keep your progress.
            </SheetDescription>
            <ChunkyButton block variant="outline" onClick={onClose}>
              Done
            </ChunkyButton>
          </div>
        ) : (
          <form
            className="flex flex-col items-center gap-4 text-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) send.mutate(email);
            }}
          >
            <Mail className="h-14 w-14 text-blue" />
            <SheetTitle>{mode === "signin" ? "Welcome back" : "Save your progress"}</SheetTitle>
            <SheetDescription>
              {mode === "signin"
                ? "Enter your email and we'll send you a sign-in link. No password needed."
                : "Add your email to keep your XP, streak and certificates on any device. No password needed."}
            </SheetDescription>
            <Input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" />
            {send.isError && <p className="text-caption font-bold text-wrong-text">Couldn't send the link. Try again.</p>}
            <ChunkyButton type="submit" block variant="secondary" disabled={!valid || send.isPending}>
              {send.isPending ? "Sending…" : "Send magic link"}
            </ChunkyButton>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
