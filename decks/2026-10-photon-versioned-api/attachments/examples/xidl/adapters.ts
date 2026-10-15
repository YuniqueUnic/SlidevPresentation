// Option 3 today (xidl 0.100.0): the IDL generates every version's types,
// so a hand-written step is type-checked against both versions.
// When #324 lands, the mechanical parts of this file are generated.
import type { v2026_07, v2026_10 } from "./out/ts/messages";

export class UnsupportedProjection extends Error {
  readonly changeId: string;
  constructor(changeId: string, message: string) {
    super(message);
    this.changeId = changeId;
  }
}

// The step between two adjacent versions, typed by the compiler's output.
export interface Step<Old, New> {
  upgrade(old: Old): New;
  downgrade(head: New): Old; // throw UnsupportedProjection when not total
}

export const sendRequest: Step<v2026_07.SendMessageRequest, v2026_10.SendMessageRequest> = {
  upgrade: (old) => ({ to: { handle: old.recipient, protocol: "sms" }, text: old.text }),
  downgrade: (head) => ({ recipient: head.to.handle, text: head.text }),
};

export const message: Step<v2026_07.Message, v2026_10.Message> = {
  upgrade: (old) => ({ id: old.id, sender: { handle: old.legacy_sender, protocol: "sms" }, text: old.text }),
  downgrade: (head) => {
    if (head.sender.protocol === "whatsapp") {
      throw new UnsupportedProjection("structured-sender", "2026-07 cannot represent a WhatsApp sender");
    }
    // thread_id is @added(v2026_10): dropping it is what the annotation says.
    return { id: head.id, legacy_sender: head.sender.handle, text: head.text };
  },
};
