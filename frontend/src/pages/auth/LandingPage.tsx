import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, QrCode, ShieldCheck, ScanLine } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useTheme } from '@/contexts/ThemeContext';

export function LandingPage() {
  const {isDark,toggleTheme}=useTheme();
  return <div className="min-h-screen bg-background text-text-main">
    <header className="border-b border-glass-border bg-background-elevated">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center bg-primary font-display font-extrabold text-background">CP</div><div><p className="font-display text-sm font-extrabold leading-tight">Campus Presence</p><p className="registry-label">Digital registry</p></div></div>
        <div className="flex items-center gap-2"><button onClick={toggleTheme} className="rounded-lg border border-glass-border px-3 py-2 text-xs font-semibold">{isDark?'Light':'Dark'} mode</button><Link to="/login"><Button size="sm" rightIcon={<ArrowRight className="h-4 w-4"/>}>Sign in</Button></Link></div>
      </div>
    </header>
    <main>
      <section className="mx-auto grid max-w-7xl border-x border-glass-border lg:grid-cols-[1.2fr_.8fr]">
        <div className="flex min-h-[620px] flex-col justify-between border-b border-glass-border p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-16">
          <div><p className="registry-label rule-title">01 / Campus access</p><h1 className="mt-12 max-w-3xl font-display text-5xl font-extrabold leading-[.98] tracking-[-.05em] sm:text-7xl">Attendance,<br/><span className="text-primary">where learning</span><br/>happens.</h1><p className="mt-8 max-w-xl text-base leading-7 text-text-muted sm:text-lg">A precise, privacy-conscious attendance registry combining time-bound QR passes with on-campus location verification.</p></div>
          <div className="mt-12 flex flex-wrap items-center gap-4"><Link to="/login"><Button size="lg" rightIcon={<ArrowRight className="h-5 w-5"/>}>Enter the registry</Button></Link><span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Session secured · Location verified</span></div>
        </div>
        <div className="campus-grid relative min-h-[520px] overflow-hidden bg-background-card p-6 sm:p-10">
          <div className="absolute left-[18%] top-[12%] h-40 w-48 border border-primary/30 bg-primary/5"><span className="absolute -top-5 font-mono text-[9px] text-text-dim">LECTURE BLOCK / A</span></div>
          <div className="absolute bottom-[12%] right-[8%] h-44 w-40 border border-accent-violet/40 bg-accent-violet/5"><span className="absolute -bottom-5 font-mono text-[9px] text-text-dim">LIBRARY / 04</span></div>
          <div className="absolute left-[43%] top-[34%] grid h-20 w-20 place-items-center rounded-full border border-primary bg-primary/10"><div className="h-3 w-3 rounded-full bg-primary"/><span className="absolute top-24 whitespace-nowrap font-mono text-[9px] text-primary">6.5244° N · 3.3792° E</span></div>
          <div className="absolute bottom-8 left-6 right-6 border border-glass-border bg-background-elevated p-5 shadow-glass sm:left-10 sm:right-10">
            <div className="flex items-start justify-between"><div><p className="registry-label">Live attendance pass</p><p className="mt-2 font-display text-2xl font-bold">CSC 301</p><p className="text-sm text-text-muted">Software Engineering</p></div><div className="grid h-16 w-16 place-items-center bg-white text-slate-900"><QrCode className="h-11 w-11"/></div></div>
            <div className="mt-5 grid grid-cols-3 border-t border-glass-border pt-4 text-xs"><div><p className="registry-label">Venue</p><p className="mt-1 font-semibold">Hall A</p></div><div><p className="registry-label">Radius</p><p className="mt-1 font-semibold">75 m</p></div><div><p className="registry-label">Status</p><p className="mt-1 font-semibold text-success">Open</p></div></div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl border-x border-t border-glass-border">
        <div className="grid md:grid-cols-3">{[
          {n:'01',icon:ScanLine,title:'Scan the session',text:'A temporary QR pass connects each student to the correct lecture.'},
          {n:'02',icon:MapPin,title:'Confirm the place',text:'Browser location checks that the device is within the lecturer’s radius.'},
          {n:'03',icon:ShieldCheck,title:'Record once',text:'Identity, enrollment, time and duplicates are validated before attendance.'},
        ].map((item,i)=><article key={item.n} className={`p-8 sm:p-10 ${i<2?'border-b md:border-b-0 md:border-r':'border-b'} border-glass-border`}><div className="flex items-center justify-between"><span className="registry-label">{item.n} / Process</span><item.icon className="h-5 w-5 text-primary"/></div><h2 className="mt-10 text-xl font-bold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-text-muted">{item.text}</p></article>)}</div>
      </section>
    </main>
    <footer className="border-t border-glass-border bg-primary px-5 py-6 text-background"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row"><p className="text-sm font-semibold">Campus Presence</p><p className="font-mono text-[10px] uppercase tracking-widest">A clearer record of every class · 2026</p></div></footer>
  </div>;
}
