"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BookOpen, CalendarDays, Check, ClipboardList, FileText, HelpCircle, LayoutDashboard, LoaderCircle, Menu, Plus, RefreshCw, Search, Users, X } from "lucide-react";
import type { User, Workspace } from "@/lib/domain";
import { AppContext } from "./context";
import type { ModalSpec } from "./context";
import { AppLink, Button, Empty } from "./ui";
import { Dashboard, PatientDirectory, PatientDetail, AssessmentBoard, AssessmentDetail, InstrumentCatalog, Agenda, ActivityLog, About } from "./views";
import { ReportDirectory, ReportDetail } from "./reports";
import { WorkspaceModal } from "./forms";

const navigation = [
  ["/", "Visão geral", LayoutDashboard], ["/pacientes", "Pacientes", Users], ["/avaliacoes", "Avaliações", ClipboardList],
  ["/agenda", "Agenda", CalendarDays], ["/instrumentos", "Instrumentos", BookOpen], ["/relatorios", "Relatórios", FileText],
] as const;
export function CogMetricsApp({ user: initialUser }: { user: User }) {
  const [w, setW] = useState<Workspace | null>(null), [user, setUser] = useState(initialUser);
  const [route, setRoute] = useState("/"), [modal, setModal] = useState<ModalSpec | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [fatal, setFatal] = useState("");
  const [toast, setToast] = useState(""), [mobile, setMobile] = useState(false);
  const lock = useRef(false), pageRef = useRef<HTMLElement>(null);
  const unsaved = useRef(false);
  const routeRef = useRef("/");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os registros.");
    setW(payload.workspace); setUser(payload.user); setFatal("");
  }, []);
  useEffect(() => {
    routeRef.current = window.location.pathname + window.location.search;
    setRoute(routeRef.current);
    refresh().catch(e => setFatal(String(e.message)));
    const onPop = () => {
      if (unsaved.current && !window.confirm("Há alterações não salvas. Deseja sair sem salvá-las?")) {
        window.history.pushState({}, "", routeRef.current); return;
      }
      unsaved.current = false;
      routeRef.current = window.location.pathname + window.location.search;
      setRoute(routeRef.current); setModal(null); setMobile(false);
    };
    window.addEventListener("popstate", onPop);
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setModal({ kind: "search" }); } };
    window.addEventListener("keydown", onKey);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (unsaved.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", beforeUnload); };
  }, [refresh]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 4500); return () => clearTimeout(timer); }, [toast]);
  function navigate(path: string) {
    if (unsaved.current && !window.confirm("Há alterações não salvas. Deseja sair sem salvá-las?")) return;
    unsaved.current = false;
    if (path === route) { setMobile(false); return; }
    window.history.pushState({}, "", path); routeRef.current = path; setRoute(path); setModal(null); setMobile(false); setError("");
    window.scrollTo({ top: 0 }); requestAnimationFrame(() => pageRef.current?.focus());
  }
  async function run(action: string, data: Record<string, unknown>, success = "Alterações salvas.") {
    if (!w || lock.current) return null;
    lock.current = true; setBusy(true); setError(""); let saved = false;
    try {
      const response = await fetch("/api/mutations", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CogMetrics-Client": "workspace" },
        body: JSON.stringify({ action, data, revision: w.revision }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
      saved = true; await refresh(); setToast(success); return payload as { id: string };
    } catch (e) {
      setError(saved ? "A alteração foi salva, mas a atualização da tela falhou. Use Atualizar dados antes de continuar." : e instanceof Error ? e.message : "Falha de conexão. Atualize os dados antes de tentar novamente.");
      return null;
    } finally { lock.current = false; setBusy(false); }
  }
  if (!w) return <div className="loading-screen"><div className="brand loading-brand"><span className="brand-symbol">c<span>m</span></span><b>CogMetrics</b></div>
    {fatal ? <><h1>Não foi possível abrir seu ambiente</h1><p>{fatal}</p><Button onClick={() => { setFatal(""); refresh().catch(e => setFatal(e.message)); }}><RefreshCw size={17} />Tentar novamente</Button>
    <a href="/signin-with-chatgpt?return_to=%2F" target="_top">Entrar novamente</a></> : <><LoaderCircle className="spin" size={27} /><p>Carregando seus registros demonstrativos…</p></>}</div>;
  const path = route.split("?")[0], parts = path.split("/").filter(Boolean);
  let screen;
  if (!parts.length) screen = <Dashboard />;
  else if (parts[0] === "pacientes") screen = parts[1] ? <PatientDetail key={parts[1]} id={parts[1]} /> : <PatientDirectory key={route} />;
  else if (parts[0] === "avaliacoes") screen = parts[1] ? <AssessmentDetail key={parts[1]} id={parts[1]} /> : <AssessmentBoard />;
  else if (parts[0] === "agenda") screen = <Agenda />;
  else if (parts[0] === "instrumentos") screen = <InstrumentCatalog />;
  else if (parts[0] === "relatorios") screen = parts[1] ? <ReportDetail key={parts[1]} id={parts[1]} /> : <ReportDirectory />;
  else if (parts[0] === "atividade") screen = <ActivityLog />;
  else if (parts[0] === "sobre") screen = <About />;
  else screen = <Empty title="Página não encontrada" action={<Button onClick={() => navigate("/")}>Voltar à visão geral</Button>} />;
  const close = () => {
    if (modal?.kind === "search") { setModal(null); return; }
    if (!lock.current && (!unsaved.current || window.confirm("Há alterações não salvas. Deseja fechar sem salvá-las?"))) { unsaved.current = false; setModal(null); setError(""); }
  };
  return <AppContext.Provider value={{ w, user, route, busy, error, navigate, open: m => { setError(""); setModal(m); }, close, run, refresh, setUnsaved: value => { unsaved.current = value; } }}>
    <div className="app-shell"><a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      {mobile && <button className="sidebar-backdrop" onClick={() => setMobile(false)} aria-label="Fechar navegação" />}
      <aside className={"sidebar" + (mobile ? " is-open" : "")}><div className="sidebar-brand"><AppLink to="/" className="brand"><span className="brand-symbol" aria-hidden="true">c<span>m</span></span><b>CogMetrics<span className="brand-subtitle">CLINICAL WORKSPACE</span></b></AppLink>
        <button className="icon-button mobile-only" aria-label="Fechar menu" onClick={() => setMobile(false)}><X size={20} /></button></div>
        <div className="workspace-label"><span className="workspace-initial">C</span><div><strong>Meu consultório</strong><small>Espaço demonstrativo</small></div></div>
        <nav aria-label="Navegação principal"><p className="nav-label">ESPAÇO CLÍNICO</p>{navigation.map(([to, label, Icon]) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          const count = to === "/avaliacoes" ? w.assessments.filter(a => a.stage !== "concluida").length : to === "/relatorios" ? w.reports.filter(r => r.status === "revisao").length : 0;
          return <AppLink key={to} to={to} className={"nav-link" + (active ? " active" : "")}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{count > 0 && <small>{count}</small>}</AppLink>;
        })}<p className="nav-label second">GESTÃO</p><AppLink to="/atividade" className={"nav-link" + (path === "/atividade" ? " active" : "")}><Activity size={19} strokeWidth={1.7} />Atividade</AppLink></nav>
        <div className="sidebar-bottom"><div className="demo-card"><span className="demo-mini-label">COGMETRICS LAB</span><strong>Explore com liberdade.</strong><p>Todos os casos e escores deste ambiente são fictícios.</p><AppLink to="/sobre">Conhecer o piloto</AppLink></div>
          <AppLink to="/sobre" className="nav-link help-link"><HelpCircle size={19} />Ajuda e limites de uso</AppLink>
          <div className="account"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>Conta conectada</small></div></div></div>
      </aside>
      <div className="workspace"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-only" aria-label="Abrir menu" onClick={() => setMobile(true)}><Menu size={22} /></button><span className="breadcrumb">Meu consultório<span>/</span><b>{navigation.find(([to]) => to === "/" ? path === "/" : path.startsWith(to))?.[1] ?? (path === "/atividade" ? "Atividade" : "Sobre o piloto")}</b></span></div>
        <div className="topbar-actions"><button className="search-trigger" onClick={() => setModal({ kind: "search" })}><Search size={17} /><span>Buscar paciente</span><kbd>⌘ K</kbd></button><span className="demo-badge">Demonstração</span><button className="icon-button" disabled={busy} title="Atualizar dados" aria-label="Atualizar dados" onClick={() => refresh().then(() => { setError(""); setToast("Dados atualizados."); }).catch(e => setError(e.message))}><RefreshCw size={17} /></button></div></header>
        <main id="main-content" className="content" ref={pageRef} tabIndex={-1}>
          {error && !modal && <div className="error-banner" role="alert"><span>{error}</span><Button variant="ghost" onClick={() => refresh().then(() => setError("")).catch(e => setError(e.message))}>Atualizar dados</Button></div>}
          {screen}
          <footer className="workspace-footer"><span>CogMetrics · ambiente clínico demonstrativo</span><span><Check size={13} />Registros persistentes · revisão {w.revision}</span></footer>
        </main>
      </div>
      {modal && <WorkspaceModal key={modal.kind + ("code" in modal ? modal.code ?? "" : "")} spec={modal} />}
      {toast && <div className="toast" role="status"><Check size={18} /><span>{toast}</span></div>}
      {busy && <div className="saving-indicator" role="status"><LoaderCircle size={16} className="spin" />Salvando…</div>}
    </div>
  </AppContext.Provider>;
}
