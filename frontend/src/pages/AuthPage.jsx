import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useHashRoute } from "../auth/useHashRoute.js";
import { PxButton, PxField } from "../atoms/index.jsx";

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-full grid place-items-center p-4 bg-cream2">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-10 h-10 bg-gold border-2 border-ink grid place-items-center text-brick font-display text-[10px]">MD</div>
          <div><div className="font-display text-[12px] text-brick">AIVerse Inc.</div><div className="text-[13px] text-ink5">People (and AI) build tomorrow</div></div>
        </div>
        <section className="px-panel">
          <header className="px-3 py-2 border-b-2 border-ink bg-gradient-to-b from-cream to-cream2"><h1 className="px-title">{title}</h1></header>
          <div className="p-4 flex flex-col gap-3">
            {subtitle && <p className="text-[14px] text-ink5">{subtitle}</p>}
            {children}
          </div>
        </section>
        {footer && <div className="mt-3 text-center text-[14px]">{footer}</div>}
      </div>
    </div>
  );
}

const Link = ({ to, go, children }) => <a href={`#/${to}`} onClick={(e) => { e.preventDefault(); go(to); }} className="text-brick underline underline-offset-2 hover:bg-lemon">{children}</a>;
const Msg = ({ kind = "err", children }) => children ? <div role={kind === "err" ? "alert" : "status"} className={`border-2 border-ink px-2 py-1 text-[14px] ${kind === "err" ? "bg-coral/40" : "bg-mint/50"}`}>{children}</div> : null;

function PasswordField({ label, value, onChange, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1"><PxField label={label} type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} maxLength={128} required /></div>
        <PxButton onClick={() => setShow(!show)} aria-pressed={show}>{show ? "hide" : "show"}</PxButton>
      </div>
      {hint && <div className="text-[12px] text-ink5 mt-0.5">{hint}</div>}
    </div>
  );
}

function SignIn({ go }) {
  const { signin, notice, clearNotice } = useAuth();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); clearNotice(); const r = await signin(f.email, f.password); if (!r.ok) setErr(r.error); setBusy(false); };
  return (
    <Shell title="SIGN IN" subtitle="Welcome back — your agents are waiting." footer={<>New here? <Link to="signup" go={go}>Create an account</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Msg kind="ok">{notice}</Msg><Msg>{err}</Msg>
        <PxField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <PasswordField label="Password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <div className="text-right text-[14px]"><Link to="forgot" go={go}>Forgot password?</Link></div>
        <PxButton variant="primary" type="submit" disabled={busy || !f.email || !f.password}>{busy ? "signing in…" : "sign in →"}</PxButton>
      </form>
    </Shell>
  );
}

function SignUp({ go }) {
  const { signup } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", geminiKey: "" });
  const [showKey, setShowKey] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mismatch = f.confirm && f.password !== f.confirm;
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (f.password !== f.confirm) return setErr("Passwords don't match.");
    setBusy(true); const r = await signup({ name: f.name, email: f.email, password: f.password, geminiKey: f.geminiKey }); if (!r.ok) setErr(r.error); setBusy(false);
  };
  return (
    <Shell title="CREATE ACCOUNT" subtitle="Your agents, tasks and chat are private to your account and run on your own Gemini key." footer={<>Already have an account? <Link to="signin" go={go}>Sign in</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Msg>{err}</Msg>
        <PxField label="Your name" autoComplete="name" value={f.name} onChange={set("name")} maxLength={60} required />
        <PxField label="Email" type="email" autoComplete="email" value={f.email} onChange={set("email")} required />
        <PasswordField label="Password" autoComplete="new-password" value={f.password} onChange={set("password")} hint="At least 8 characters, with a letter and a number." />
        <PxField label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} maxLength={128} required />
        {mismatch && <div className="text-[13px] text-brick">Passwords don't match yet.</div>}
        <div className="px-inset p-2 flex flex-col gap-1.5">
          <div className="flex items-end gap-2">
            <div className="flex-1"><PxField label="Google Gemini API key" type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} placeholder="AIza…" value={f.geminiKey} onChange={set("geminiKey")} maxLength={200} required /></div>
            <PxButton onClick={() => setShowKey(!showKey)}>{showKey ? "hide" : "show"}</PxButton>
          </div>
          <div className="text-[12px] text-ink5">Powers your CEO and agents. Get a free key at <a className="text-brick underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. It is stored encrypted and used only for your account.</div>
        </div>
        <PxButton variant="primary" type="submit" disabled={busy || !f.name || !f.email || !f.password || !f.geminiKey}>{busy ? "creating…" : "create account →"}</PxButton>
      </form>
    </Shell>
  );
}

function Forgot({ go }) {
  const { forgot } = useAuth();
  const [email, setEmail] = useState(""); const [done, setDone] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(""); const r = await forgot(email); if (r.ok) setDone(r.data); else setErr(r.error); setBusy(false); };
  return (
    <Shell title="FORGOT PASSWORD" subtitle="Enter your email and we'll send you a link to choose a new password." footer={<Link to="signin" go={go}>← Back to sign in</Link>}>
      {done ? (
        <div className="flex flex-col gap-2">
          <Msg kind="ok">{done.message}</Msg>
          {done.devResetLink && <div className="px-inset p-2 text-[13px]">Development mode — no email server is set up, so here is your link: <a className="text-brick underline break-all" href={done.devResetLink}>{done.devResetLink}</a></div>}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Msg>{err}</Msg>
          <PxField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PxButton variant="primary" type="submit" disabled={busy || !email}>{busy ? "sending…" : "send reset link →"}</PxButton>
        </form>
      )}
    </Shell>
  );
}

function Reset({ go, token }) {
  const { reset } = useAuth();
  const [f, setF] = useState({ password: "", confirm: "" }); const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (f.password !== f.confirm) return setErr("Passwords don't match.");
    setBusy(true); const r = await reset(token, f.password); if (r.ok) setOk(true); else setErr(r.error); setBusy(false);
  };
  if (!token) return <Shell title="RESET PASSWORD" footer={<Link to="forgot" go={go}>Request a new link</Link>}><Msg>This reset link is missing its token.</Msg></Shell>;
  return (
    <Shell title="CHOOSE A NEW PASSWORD" footer={<Link to="signin" go={go}>← Back to sign in</Link>}>
      {ok ? <div className="flex flex-col gap-3"><Msg kind="ok">Password updated. You can sign in now.</Msg><PxButton variant="primary" onClick={() => go("signin")}>go to sign in →</PxButton></div> : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Msg>{err}</Msg>
          <PasswordField label="New password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="At least 8 characters, with a letter and a number." />
          <PxField label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} maxLength={128} required />
          <PxButton variant="primary" type="submit" disabled={busy || !f.password || !f.confirm}>{busy ? "saving…" : "update password →"}</PxButton>
        </form>
      )}
    </Shell>
  );
}

export default function AuthPage() {
  const { route, params, go } = useHashRoute();
  if (route === "signup") return <SignUp go={go} />;
  if (route === "forgot") return <Forgot go={go} />;
  if (route === "reset") return <Reset go={go} token={params.token} />;
  return <SignIn go={go} />;
}
