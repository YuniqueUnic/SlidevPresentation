// Option 1: a hand-written adapter chain in plain TypeScript.
// Run: node adapter.ts  (Node >= 22.18 strips the types)
import { createHash } from "node:crypto";

// ---- 1. Contract shapes are written by hand, once per version -------------
type Version = "2026-07" | "2026-10";
const ORDER: readonly Version[] = ["2026-07", "2026-10"]; // last = HEAD

interface SendV0707 { recipient: string; text: string }
interface MessageV0707 { id: string; sender: string; text: string }

type Protocol = "imessage" | "sms" | "whatsapp";
interface SendHead { to: { handle: string; protocol: Protocol }; text: string }
interface MessageHead {
  id: string;
  sender: { handle: string; protocol: Protocol };
  text: string;
  thread_id?: string;
}

// ---- 2. The adapter interface (same shape as in the question) -------------
interface AdapterContext {
  readonly from: string;
  readonly to: string;
  readonly operationId: string;
}

class UnsupportedDowncast extends Error {
  readonly changeId: string;
  constructor(changeId: string, message: string) {
    super(message);
    this.changeId = changeId;
  }
}

interface VersionAdapter<Old, Head> {
  upcastRequest?(input: Old, ctx: AdapterContext): Head;
  downcastResponse?(input: Head, ctx: AdapterContext): Old;
  downcastEvent?(input: Head, ctx: AdapterContext): Old;
}

// ---- 3. One adapter per adjacent pair and operation -----------------------
const sendMessage_0707_to_1010: VersionAdapter<SendV0707, SendHead> = {
  upcastRequest: (old) => ({
    // 2026-07 only reached phone numbers, so the protocol is known.
    to: { handle: old.recipient, protocol: "sms" },
    text: old.text,
  }),
};

const message_1010_to_0707: VersionAdapter<MessageV0707, MessageHead> = {
  downcastResponse: (head) => {
    if (head.sender.protocol === "whatsapp") {
      // 2026-07 promised a phone-number sender; do not invent one.
      throw new UnsupportedDowncast(
        "structured-sender",
        "2026-07 cannot represent a WhatsApp sender",
      );
    }
    return { id: head.id, sender: head.sender.handle, text: head.text };
  },
};
message_1010_to_0707.downcastEvent = message_1010_to_0707.downcastResponse;

// ---- 4. The registry: someone must keep this table complete by hand -------
type AnyAdapter = VersionAdapter<unknown, unknown>;
const REGISTRY: Record<string, Partial<Record<Version, AnyAdapter>>> = {
  "messages.send": { "2026-07": sendMessage_0707_to_1010 as AnyAdapter },
  "messages.get": { "2026-07": message_1010_to_0707 as AnyAdapter },
  "message.received": { "2026-07": message_1010_to_0707 as AnyAdapter },
};

function chain(op: string, target: Version): AnyAdapter[] {
  const steps = ORDER.slice(ORDER.indexOf(target), -1);
  return steps.map((v) => {
    const a = REGISTRY[op]?.[v];
    if (!a) throw new Error(`missing adapter ${op}@${v}`); // found at runtime
    return a;
  });
}

function upcast(op: string, from: Version, body: unknown): unknown {
  return chain(op, from).reduce(
    (v, a) => a.upcastRequest?.(v, { from, to: "HEAD", operationId: op }) ?? v,
    body,
  );
}

function downcast(op: string, to: Version, head: unknown, event = false): unknown {
  return chain(op, to).reverse().reduce((v, a) => {
    const f = event ? a.downcastEvent : a.downcastResponse;
    return f ? f.call(a, v, { from: "HEAD", to, operationId: op }) : v;
  }, head);
}

// ---- 5. Business logic only ever sees HEAD --------------------------------
function sendHandler(req: SendHead): MessageHead {
  return { id: "msg_1", sender: req.to, text: req.text, thread_id: "thr_1" };
}

// A 2026-07 client calls POST /v1/messages.
const oldReq: SendV0707 = { recipient: "+15551234567", text: "Hello" };
const head = sendHandler(upcast("messages.send", "2026-07", oldReq) as SendHead);
console.log("2026-07 response:", downcast("messages.get", "2026-07", head));
console.log("2026-10 response:", head);

// Webhook: downcast once, freeze the bytes, retries resend the same bytes.
const body = JSON.stringify(downcast("message.received", "2026-07", head, true));
console.log("prepared body sha256:", createHash("sha256").update(body).digest("hex").slice(0, 16));

// A HEAD-only state that the old contract cannot express.
try {
  downcast("messages.get", "2026-07", { ...head, sender: { handle: "wa:42", protocol: "whatsapp" } });
} catch (e) {
  if (e instanceof UnsupportedDowncast) console.log("unsupported:", e.changeId, "-", e.message);
}
