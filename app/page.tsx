"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

type View = "Visão geral" | "Pacientes" | "Avaliações" | "Instrumentos" | "Relatórios";

type Patient = {
  initials: string;
  name: string;
  age: string;
  protocol: string;
  status: "Em avaliação" | "Triagem" | "Concluída";
  updated: string;
  tone: string;
};

const initialPatients: Patient[] = [
  {
    initials: "MO",
    name: "Maria Oliveira",
    age: "68 anos",
    protocol: "Avaliação neuropsicológica",
    status: "Em avaliação",
    updated: "Hoje, 09:42",
    tone: "sage",
  },
  {
    initials: "RL",
    name: "Rafael Lima",
    age: "34 anos",
    protocol: "Funções executivas",
    status: "Triagem",
    updated: "Ontem, 16:20",
    tone: "blue",
  },
  {
    initials: "AC",
    name: "Ana Costa",
    age: "23 anos",
    protocol: "Atenção e controle inibitório",
    status: "Em avaliação",
    updated: "05 ago, 14:10",
    tone: "plum",
  },
  {
    initials: "JC",
    name: "João Carvalho",
    age: "51 anos",
    protocol: "Avaliação cognitiva breve",
    status: "Concluída",
    updated: "03 ago, 11:35",
    tone: "sand",
  },
];

const navItems: { label: View; icon: typeof LayoutDashboard; count?: number }[] = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Pacientes", icon: UsersRound },
  { label: "Avaliações", icon: ClipboardCheck, count: 6 },
  { label: "Instrumentos", icon: BookOpen },
  { label: "Relatórios", icon: FileText, count: 2 },
];

const instruments = [
  { code: "RAVLT", name: "Teste de Aprendizagem Auditivo-Verbal de Rey", domain: "Memória", use: "12 protocolos" },
  { code: "MoCA", name: "Montreal Cognitive Assessment", domain: "Rastreio", use: "9 protocolos" },
  { code: "FAS", name: "Fluência Verbal Fonêmica", domain: "Funções executivas", use: "8 protocolos" },
  { code: "TMT", name: "Teste de Trilhas A e B", domain: "Atenção", use: "7 protocolos" },
  { code: "BNT", name: "Teste de Nomeação de Boston", domain: "Linguagem", use: "4 protocolos" },
];

const statusClass: Record<Patient["status"], string> = {
  "Em avaliação": "status-progress",
  Triagem: "status-screening",
  Concluída: "status-done",
};

function Logo() {
  return (
    <div className="brand" aria-label="CogMetrics">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-name">Cog<span>Metrics</span></span>
    </div>
  );
}

function MiniTrend({ points }: { points: number[] }) {
  const line = points.map((value, index) => `${index * 18},${40 - value}`).join(" ");
  return (
    <svg className="mini-trend" viewBox="0 0 90 44" role="img" aria-label="Tendência crescente">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, detail, icon: Icon, trend, variant = "plain" }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  trend: number[];
  variant?: "plain" | "accent";
}) {
  return (
    <article className={`stat-card ${variant === "accent" ? "stat-accent" : ""}`}>
      <div className="stat-top">
        <span className="stat-icon"><Icon size={18} strokeWidth={1.8} /></span>
        <MiniTrend points={trend} />
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PatientAvatar({ patient }: { patient: Patient }) {
  return <span className={`patient-avatar ${patient.tone}`}>{patient.initials}</span>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("Visão geral");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [patientModal, setPatientModal] = useState(false);
  const [scoreModal, setScoreModal] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState("");
  const [scores, setScores] = useState([4, 6, 8, 9, 10]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.name, patient.protocol, patient.status].some((field) =>
        field.toLocaleLowerCase("pt-BR").includes(term),
      ),
    );
  }, [patients, search]);

  const totalScore = scores.reduce((sum, value) => sum + value, 0);
  const simulatedPercentile = Math.max(1, Math.min(99, Math.round((totalScore - 14) * 2.7)));

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const changeView = (view: View) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const addPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "Novo paciente").trim();
    const age = String(data.get("age") || "—").trim();
    const protocol = String(data.get("protocol") || "Avaliação neuropsicológica");
    const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    setPatients((current) => [
      { initials, name, age: age ? `${age} anos` : "Idade não informada", protocol, status: "Triagem", updated: "Agora", tone: "mint" },
      ...current,
    ]);
    setPatientModal(false);
    setActiveView("Pacientes");
    showToast("Paciente cadastrado no ambiente demonstrativo.");
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-caption">Ambiente clínico</p>
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} className={activeView === label ? "active" : ""} onClick={() => changeView(label)}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {count ? <small>{count}</small> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button><CircleHelp size={18} /> Central de ajuda</button>
          <button><Settings size={18} /> Configurações</button>
          <div className="security-note">
            <ShieldCheck size={18} />
            <div><strong>Ambiente protegido</strong><span>Dados demonstrativos</span></div>
          </div>
          <div className="profile-card">
            <span className="profile-avatar">DA</span>
            <div><strong>Dr. Danilo Assis</strong><span>Administrador</span></div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {sidebarOpen ? <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} /> : null}

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <div className="global-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente, protocolo ou relatório" aria-label="Buscar" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <span className="pilot-chip"><Sparkles size={14} /> Piloto</span>
            <div className="notification-wrap">
              <button className="icon-button" onClick={() => setNotifications((value) => !value)} aria-label="Notificações">
                <Bell size={19} /><i />
              </button>
              {notifications ? (
                <div className="notification-popover">
                  <div><strong>Notificações</strong><button onClick={() => setNotifications(false)} aria-label="Fechar"><X size={16} /></button></div>
                  <p><span className="dot teal" />2 avaliações aguardam revisão clínica.</p>
                  <p><span className="dot gold" />Relatório de João Carvalho pronto para emissão.</p>
                </div>
              ) : null}
            </div>
            <button className="primary-button compact" onClick={() => setPatientModal(true)}><Plus size={18} /> Novo paciente</button>
          </div>
        </header>

        <div className="content-area">
          {activeView === "Visão geral" ? (
            <Overview patients={patients} setView={changeView} openScores={() => setScoreModal(true)} openPatient={() => setPatientModal(true)} showToast={showToast} />
          ) : null}
          {activeView === "Pacientes" ? (
            <PatientsView patients={filteredPatients} search={search} setSearch={setSearch} openPatient={() => setPatientModal(true)} showToast={showToast} />
          ) : null}
          {activeView === "Avaliações" ? <AssessmentsView openScores={() => setScoreModal(true)} /> : null}
          {activeView === "Instrumentos" ? <InstrumentsView showToast={showToast} /> : null}
          {activeView === "Relatórios" ? <ReportsView showToast={showToast} /> : null}
        </div>
      </section>

      {patientModal ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
          <button className="modal-backdrop" onClick={() => setPatientModal(false)} aria-label="Fechar" />
          <form className="modal-card" onSubmit={addPatient}>
            <div className="modal-heading">
              <div><span className="eyebrow">Cadastro clínico</span><h2 id="patient-modal-title">Novo paciente</h2><p>Inclua somente informações essenciais para iniciar a triagem.</p></div>
              <button type="button" className="icon-button" onClick={() => setPatientModal(false)} aria-label="Fechar"><X size={20} /></button>
            </div>
            <label>Nome completo<input name="name" required placeholder="Ex.: Mariana Souza" autoFocus /></label>
            <div className="form-grid">
              <label>Idade<input name="age" type="number" min="5" max="110" required placeholder="42" /></label>
              <label>Escolaridade<select name="education"><option>Ensino superior</option><option>Ensino médio</option><option>Ensino fundamental</option><option>Pós-graduação</option></select></label>
            </div>
            <label>Protocolo inicial<select name="protocol"><option>Avaliação neuropsicológica</option><option>Avaliação cognitiva breve</option><option>Funções executivas</option><option>Atenção e controle inibitório</option><option>Linguagem e memória semântica</option></select></label>
            <label>Motivo do encaminhamento<textarea name="referral" rows={3} placeholder="Síntese breve da questão clínica..." /></label>
            <div className="privacy-hint"><LockKeyhole size={17} /><span>Na versão de produção, o cadastro será protegido por controle de acesso, trilha de auditoria e criptografia.</span></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPatientModal(false)}>Cancelar</button><button className="primary-button" type="submit">Cadastrar paciente</button></div>
          </form>
        </div>
      ) : null}

      {scoreModal ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="score-modal-title">
          <button className="modal-backdrop" onClick={() => setScoreModal(false)} aria-label="Fechar" />
          <div className="score-panel">
            <div className="modal-heading">
              <div><span className="eyebrow">Maria Oliveira · sessão 2</span><h2 id="score-modal-title">Entrada de resultados</h2><p>Teste de Aprendizagem Auditivo-Verbal de Rey (RAVLT)</p></div>
              <button className="icon-button" onClick={() => setScoreModal(false)} aria-label="Fechar"><X size={20} /></button>
            </div>
            <div className="demo-warning"><Sparkles size={16} /> Cálculo demonstrativo, sem validade clínica ou normativa.</div>
            <div className="score-grid">
              {scores.map((score, index) => (
                <label key={index}>A{index + 1}<input type="number" min="0" max="15" value={score} onChange={(event) => setScores((current) => current.map((value, itemIndex) => itemIndex === index ? Number(event.target.value) : value))} /></label>
              ))}
            </div>
            <div className="score-summary">
              <div><span>Total A1–A5</span><strong>{totalScore}</strong><small>Escore bruto</small></div>
              <div><span>Índice demonstrativo</span><strong>P{simulatedPercentile}</strong><small>Percentil simulado</small></div>
              <div className="summary-interpretation"><span>Leitura automática</span><strong>{simulatedPercentile < 9 ? "Faixa inferior" : simulatedPercentile < 25 ? "Média inferior" : simulatedPercentile < 75 ? "Faixa média" : "Média superior"}</strong><small>Requer julgamento clínico</small></div>
            </div>
            <div className="clinical-note">
              <label>Observação clínica<textarea rows={4} defaultValue="Paciente manteve boa compreensão das instruções. Observou-se uso espontâneo de agrupamento semântico a partir da terceira tentativa." /></label>
            </div>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setScoreModal(false)}>Salvar rascunho</button><button className="primary-button" onClick={() => { setScoreModal(false); showToast("Resultados demonstrativos registrados."); }}><Check size={17} /> Concluir instrumento</button></div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast"><Check size={17} />{toast}</div> : null}
    </main>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function Overview({ patients, setView, openScores, openPatient, showToast }: { patients: Patient[]; setView: (view: View) => void; openScores: () => void; openPatient: () => void; showToast: (message: string) => void }) {
  return (
    <>
      <PageHeading eyebrow="Sexta-feira, 7 de agosto" title="Bom dia, Dr. Danilo." description="Acompanhe o fluxo clínico e retome as avaliações prioritárias." action={<button className="secondary-button date-button"><CalendarDays size={17} /> Esta semana <ChevronDown size={15} /></button>} />

      <section className="stats-grid" aria-label="Indicadores do consultório">
        <StatCard label="Pacientes ativos" value="24" detail="+3 neste mês" icon={UsersRound} trend={[8, 10, 9, 14, 18, 22]} />
        <StatCard label="Avaliações em curso" value="6" detail="2 aguardam revisão" icon={ClipboardCheck} trend={[10, 15, 12, 18, 16, 24]} variant="accent" />
        <StatCard label="Relatórios no mês" value="18" detail="+12% em relação a julho" icon={FileText} trend={[7, 10, 15, 13, 20, 25]} />
        <StatCard label="Tempo médio" value="9,4 dias" detail="1,2 dia mais rápido" icon={Clock3} trend={[20, 18, 19, 13, 12, 9]} />
      </section>

      <div className="overview-grid">
        <section className="panel active-assessment">
          <div className="panel-head"><div><span className="eyebrow">Retomar avaliação</span><h2>Maria Oliveira</h2></div><span className="session-pill">Sessão 2 de 3</span></div>
          <div className="assessment-meta"><span><UserRound size={16} /> 68 anos</span><span><CalendarDays size={16} /> Iniciada em 30 jul</span><span><Activity size={16} /> Queixa mnésica</span></div>
          <div className="progress-row"><div><span>Progresso do protocolo</span><strong>64%</strong></div><div className="progress-track"><i style={{ width: "64%" }} /></div></div>
          <div className="assessment-steps">
            <div className="step done"><span><Check size={15} /></span><div><strong>Anamnese e rastreio</strong><small>Concluído em 30 jul</small></div></div>
            <div className="step current"><span>2</span><div><strong>Memória e aprendizagem</strong><small>RAVLT · Figura Complexa de Rey</small></div><button onClick={openScores}>Continuar <ChevronRight size={16} /></button></div>
            <div className="step"><span>3</span><div><strong>Integração e relatório</strong><small>Aguardando instrumentos</small></div></div>
          </div>
        </section>

        <section className="panel agenda-panel">
          <div className="panel-head"><div><span className="eyebrow">Agenda clínica</span><h2>Hoje</h2></div><button className="text-button" onClick={() => showToast("Agenda completa disponível na versão de produção.")}>Ver agenda</button></div>
          <div className="agenda-line"><time>09:30</time><i className="agenda-marker teal" /><div><strong>Maria Oliveira</strong><span>Avaliação · sessão 2</span></div><span className="agenda-status active">Em curso</span></div>
          <div className="agenda-line"><time>14:00</time><i className="agenda-marker blue" /><div><strong>Rafael Lima</strong><span>Entrevista inicial</span></div><span className="agenda-status">50 min</span></div>
          <div className="agenda-line"><time>16:30</time><i className="agenda-marker plum" /><div><strong>Ana Costa</strong><span>Devolutiva</span></div><span className="agenda-status">50 min</span></div>
          <button className="agenda-add" onClick={() => showToast("Novo horário reservado como rascunho.")}><Plus size={16} /> Adicionar horário</button>
        </section>
      </div>

      <section className="panel patient-list-panel">
        <div className="panel-head"><div><span className="eyebrow">Atividade recente</span><h2>Pacientes</h2></div><div className="panel-actions"><button className="secondary-button small" onClick={openPatient}><Plus size={16} /> Adicionar</button><button className="text-button" onClick={() => setView("Pacientes")}>Ver todos <ChevronRight size={16} /></button></div></div>
        <PatientTable patients={patients.slice(0, 4)} />
      </section>
    </>
  );
}

function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Paciente</th><th>Protocolo</th><th>Status</th><th>Atualização</th><th><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>{patients.map((patient) => (
          <tr key={`${patient.name}-${patient.updated}`}>
            <td><div className="patient-cell"><PatientAvatar patient={patient} /><div><strong>{patient.name}</strong><span>{patient.age}</span></div></div></td>
            <td>{patient.protocol}</td><td><span className={`status-badge ${statusClass[patient.status]}`}><i />{patient.status}</span></td><td className="muted-cell">{patient.updated}</td><td><button className="icon-button ghost" aria-label={`Mais opções para ${patient.name}`}><MoreHorizontal size={18} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PatientsView({ patients, search, setSearch, openPatient, showToast }: { patients: Patient[]; search: string; setSearch: (value: string) => void; openPatient: () => void; showToast: (message: string) => void }) {
  return (
    <>
      <PageHeading eyebrow="Prontuários demonstrativos" title="Pacientes" description="Centralize o histórico clínico, protocolos e documentos de cada avaliação." action={<button className="primary-button" onClick={openPatient}><Plus size={18} /> Novo paciente</button>} />
      <section className="panel directory-panel">
        <div className="directory-tools"><div className="inline-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na lista de pacientes" /></div><button className="secondary-button small" onClick={() => showToast("Filtros disponíveis: status, protocolo e período.")}><Filter size={16} /> Filtrar</button><span>{patients.length} registros</span></div>
        {patients.length ? <PatientTable patients={patients} /> : <div className="empty-state"><Search size={30} /><h3>Nenhum paciente encontrado</h3><p>Tente buscar por outro nome, protocolo ou status.</p></div>}
      </section>
    </>
  );
}

function AssessmentsView({ openScores }: { openScores: () => void }) {
  const columns = [
    { title: "Triagem", count: 2, cards: [{ name: "Rafael Lima", note: "Entrevista inicial", due: "Hoje, 14:00" }, { name: "Beatriz Martins", note: "Selecionar protocolo", due: "12 ago" }] },
    { title: "Em aplicação", count: 3, cards: [{ name: "Maria Oliveira", note: "Memória e aprendizagem", due: "64% concluído", featured: true }, { name: "Ana Costa", note: "Controle inibitório", due: "82% concluído" }, { name: "Paulo Mendes", note: "Linguagem", due: "45% concluído" }] },
    { title: "Em integração", count: 1, cards: [{ name: "João Carvalho", note: "Revisão do raciocínio clínico", due: "Relatório em rascunho" }] },
  ];
  return (
    <>
      <PageHeading eyebrow="Fluxo clínico" title="Avaliações" description="Visualize cada caso por etapa e identifique os próximos passos do protocolo." action={<button className="primary-button" onClick={openScores}><Plus size={18} /> Lançar resultado</button>} />
      <div className="kanban-grid">{columns.map((column) => <section className="kanban-column" key={column.title}><div className="kanban-head"><h2>{column.title}</h2><span>{column.count}</span></div>{column.cards.map((card) => <article className={`case-card ${card.featured ? "featured" : ""}`} key={card.name}><div><PatientAvatar patient={initialPatients.find((item) => item.name === card.name) || { initials: card.name.split(" ").map((item) => item[0]).slice(0, 2).join(""), name: card.name, age: "", protocol: "", status: "Triagem", updated: "", tone: "mint" }} /><button className="icon-button ghost"><MoreHorizontal size={17} /></button></div><h3>{card.name}</h3><p>{card.note}</p><span><Clock3 size={14} />{card.due}</span>{card.featured ? <button className="card-action" onClick={openScores}>Continuar avaliação <ChevronRight size={15} /></button> : null}</article>)}</section>)}</div>
    </>
  );
}

function InstrumentsView({ showToast }: { showToast: (message: string) => void }) {
  return (
    <>
      <PageHeading eyebrow="Biblioteca técnica" title="Instrumentos" description="Organize testes, parâmetros normativos e versões dos protocolos utilizados pela equipe." action={<button className="primary-button" onClick={() => showToast("Solicitação de instrumento registrada.")}><Plus size={18} /> Adicionar instrumento</button>} />
      <section className="panel instrument-panel">
        <div className="instrument-summary"><div><strong>36</strong><span>instrumentos ativos</span></div><div><strong>8</strong><span>domínios cognitivos</span></div><div><strong>4</strong><span>bases normativas</span></div><p><ShieldCheck size={18} /><span><strong>Curadoria técnica</strong>Última revisão em 5 de agosto de 2026</span></p></div>
        <div className="instrument-list">{instruments.map((item) => <article key={item.code}><span className="instrument-code">{item.code}</span><div><h3>{item.name}</h3><p>{item.domain}</p></div><span>{item.use}</span><button className="secondary-button small" onClick={() => showToast(`${item.code}: ficha técnica aberta em modo demonstrativo.`)}>Abrir ficha</button></article>)}</div>
      </section>
    </>
  );
}

function ReportsView({ showToast }: { showToast: (message: string) => void }) {
  const reports = [
    { name: "João Carvalho", type: "Laudo neuropsicológico", status: "Pronto para revisão", updated: "Hoje, 08:55" },
    { name: "Ana Costa", type: "Relatório de avaliação", status: "Aguardando devolutiva", updated: "Ontem, 17:10" },
    { name: "Lúcia Ferreira", type: "Parecer clínico", status: "Emitido", updated: "01 ago, 12:30" },
  ];
  return (
    <>
      <PageHeading eyebrow="Documentos clínicos" title="Relatórios" description="Acompanhe rascunhos, revisões e documentos finalizados com rastreabilidade." action={<button className="primary-button" onClick={() => showToast("Modelo clínico selecionado para novo rascunho.")}><Plus size={18} /> Novo relatório</button>} />
      <section className="panel reports-panel">
        <div className="report-banner"><div className="report-illustration"><FileText size={28} /><Sparkles size={16} /></div><div><span className="eyebrow">Assistência à redação</span><h2>Transforme resultados em uma síntese clínica estruturada</h2><p>O piloto organiza achados por domínio, preservando a revisão e a responsabilidade do profissional.</p></div><button className="secondary-button" onClick={() => showToast("Assistente de redação aberto em modo demonstrativo.")}>Criar rascunho</button></div>
        <div className="report-list">{reports.map((report) => <article key={report.name}><span className="report-icon"><FileText size={19} /></span><div><strong>{report.name}</strong><span>{report.type}</span></div><span className="report-status">{report.status}</span><time>{report.updated}</time><button className="icon-button ghost"><ChevronRight size={18} /></button></article>)}</div>
      </section>
    </>
  );
}
