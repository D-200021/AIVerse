import { useState, useEffect, useRef } from "react";
import { PxButton } from "../../atoms/index.jsx";

export default function ChatTab({ engine, snap }) {
  const [text, setText] = useState("");
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [snap.chat.length, snap.chatTyping]);
  const send = () => { if (text.trim()) { engine.talkToCeo(text); setText(""); } };
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 px-mono flex flex-col gap-2 bg-paper">
        {!snap.chat.length && <p className="text-ink5">› Tell Michael what you need. He routes it to the best-fit agent. Hire more agents from the agents tab.</p>}
        {snap.chat.map((m) => (
          <div key={m.id} className={m.sender === "user" ? "self-end max-w-[85%] bg-lemon border-2 border-ink px-2 py-1" : "max-w-[90%]"}>
            {m.sender === "ceo" ? <>● <span className="text-brick">Michael:</span> {m.text}</> : <>› {m.text}</>}
          </div>
        ))}
        {snap.chatTyping && <div className="px-blink">● Michael is thinking…</div>}
        <div ref={end} />
      </div>
      <div className="p-2 border-t-2 border-ink flex flex-col gap-2">
        <textarea className="px-input px-mono resize-none" rows={3} placeholder="Message Michael" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <PxButton variant="primary" className="self-end" disabled={!text.trim()} onClick={send}>send →</PxButton>
      </div>
    </>
  );
}
