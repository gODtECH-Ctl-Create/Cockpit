import Link from "next/link";

export default function LoginPage(){
 return <main className="login-shell"><div className="login-glow"/><section className="login-card"><div className="neural-brand-mark">A</div><span className="login-kicker">PRIVATE ARIA WORKSPACE</span><h1>Login to ARIA.</h1><p>The public neural map is view-only. Private workspace access and the server-side authentication boundary are the next security layer.</p><div className="login-status"><span/>Authentication is not connected yet</div><Link className="login-primary" href="/">Back to public map</Link></section></main>;
}
