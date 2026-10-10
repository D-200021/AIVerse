export default function InboxTab({ snap, engine }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5">
      <p className="text-[13px] text-ink5">Mailbox — every envelope that flies across the floor lands here.</p>
      {!snap.inbox.length && <p className="text-ink3">No messages yet.</p>}
      {snap.inbox.map((m) => (
        <div key={m.id} className="px-inset px-2 py-1 flex gap-2 items-baseline">
          <span className="text-[12px] text-ink5 shrink-0">{m.time}</span>
          <span className="px-mono"><b>{engine.nameOf(m.from)}</b> → <b>{engine.nameOf(m.to)}</b>: {m.text}</span>
        </div>
      ))}
    </div>
  );
}
