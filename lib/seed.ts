import { addDays, snapshotFor, todayBR } from "./domain.ts";
import type { Assessment, Patient, Result, Report, Appointment, Workspace } from "./domain.ts";

export async function exampleWorkspace(owner: string, now = new Date()): Promise<Workspace> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  const prefix = Array.from(new Uint8Array(digest)).slice(0, 10).map(n => n.toString(16).padStart(2, "0")).join("");
  const id = (kind: string, n: number) => prefix + "-" + kind + n;
  const day = todayBR(now), stamp = now.toISOString();
  const rows = [
    ["Maria Oliveira", "1958-02-14", 16, "Professora aposentada", "Memória e envelhecimento",
      "Caso fictício para explorar queixas de memória e a relação entre aprendizagem e evocação.",
      "Exemplo de entrevista: queixas graduais de esquecimento, sono fragmentado e acompanhamento clínico regular.",
      "Independência nas atividades básicas; uso de agenda como apoio às atividades instrumentais."],
    ["Rafael Lima", "1991-09-22", 18, "Analista de sistemas", "Atenção e funcionamento executivo",
      "Caso fictício de variabilidade atencional no contexto profissional.",
      "Exemplo de entrevista: alternância entre tarefas, dificuldade de organização e rotina de sono irregular.",
      "Autonomia preservada. Dificuldades relatadas na gestão do tempo e na conclusão de projetos."],
    ["Ana Costa", "2003-05-03", 15, "Estudante universitária", "Aprendizagem e atenção",
      "Caso fictício para examinar aprendizagem e desempenho em tarefas com limite de tempo.",
      "Exemplo de entrevista: desempenho variável em avaliações acadêmicas e ansiedade situacional.",
      "Independente na rotina universitária, nos deslocamentos e na administração de despesas."],
    ["João Carvalho", "1974-11-18", 11, "Técnico administrativo", "Avaliação cognitiva breve",
      "Caso fictício para demonstrar a conclusão do fluxo de avaliação e a preservação de versões de documentos.",
      "Exemplo de entrevista: queixas subjetivas de lentificação e cansaço ao realizar várias tarefas.",
      "Atividades básicas e instrumentais independentes, com maior uso de anotações."],
    ["Beatriz Martins", "1984-06-09", 20, "Pesquisadora", "Mapeamento cognitivo",
      "Caso fictício em entrevista inicial, ainda sem resultados registrados.",
      "História a complementar durante a entrevista demonstrativa.",
      "Informações funcionais ainda não revisadas."],
    ["Paulo Mendes", "1950-01-27", 8, "Comerciante aposentado", "Linguagem e memória",
      "Caso fictício para comparar resultados de nomeação, rastreio e busca visual.",
      "Exemplo de entrevista: dificuldades de acesso a palavras em situações cotidianas.",
      "Rotina básica independente. Atividades instrumentais e comunicação em investigação."],
    ["Helena Duarte", "1964-04-20", 16, "Arquiteta", "Caracterização cognitiva",
      "Caso fictício em revisão, com resultados e integração disponíveis para edição.",
      "Exemplo de entrevista: queixas de memória em períodos de maior sobrecarga profissional.",
      "Autonomia preservada, com estratégias de organização compensatórias."],
    ["Lucas Ferreira", "1997-07-12", 16, "Designer", "Velocidade e busca visual",
      "Caso fictício para explorar os protocolos nativos CogMetrics e o controle de qualidade do par TDS/TSD.",
      "Exemplo de entrevista: dificuldades percebidas em atividades com alternância de demandas.",
      "Independente nas atividades diárias e profissionais."],
  ];
  const patients: Patient[] = rows.map((r, i) => ({
    id: id("p", i), name: String(r[0]), birthDate: String(r[1]), education: Number(r[2]), occupation: String(r[3]),
    referral: String(r[5]), history: String(r[6]), functioning: String(r[7]), notes: "", archived: 0,
    createdAt: addDays(day, -18 + i) + "T12:00:00Z", updatedAt: stamp,
  }));
  const stages: Assessment["stage"][] = ["aplicacao", "aplicacao", "integracao", "concluida", "triagem", "aplicacao", "revisao", "integracao"];
  const plans = [
    ["RAVLT", "TDS", "TSD", "BNT", "TBVN"], ["TDS", "TSD", "TBVP"], ["RAVLT", "TDS", "TSD", "TBVN"],
    ["TDS", "TSD", "RAVLT", "FAS"], ["TDS", "TSD", "CM-DEMO"], ["BNT", "MoCA", "TBVP"],
    ["RAVLT", "MoCA", "BNT"], ["TDS", "TSD", "TBVN"],
  ];
  const assessments: Assessment[] = patients.map((p, i) => ({
    id: id("a", i), patientId: p.id, title: String(rows[i][4]), stage: stages[i], priority: i === 1 || i === 5 ? "alta" : "normal",
    startDate: addDays(day, -18 + i), dueDate: addDays(day, [-1, 3, 2, -4, 12, 7, 1, 4][i]),
    plan: plans[i], anamnesisReviewed: i === 4 ? 0 : 1, notes: "", createdAt: p.createdAt, updatedAt: stamp,
  }));
  const results: Result[] = [];
  const put = (i: number, code: string, raw: Record<string, number>, percentile: number | null, notes = "") => results.push({
    id: id("r", results.length), assessmentId: assessments[i].id, instrumentCode: code, raw, percentile, notes,
    excluded: 0, exclusionReason: "", createdAt: stamp, updatedAt: stamp,
  });
  const counts = (acertos: number, omissoes = 1, erros = 0) => ({ acertos, omissoes, erros });
  const ravlt = (v: number[]) => Object.fromEntries(["A1", "A2", "A3", "A4", "A5", "B1", "A6", "A7"].map((k, i) => [k, v[i]]));
  put(0, "RAVLT", ravlt([3, 4, 7, 8, 9, 3, 6, 5]), 9, "Exemplo sintético: progressão da aprendizagem ao longo das tentativas.");
  put(0, "TDS", counts(38, 2), 34); put(0, "TSD", counts(34, 1), 27); put(0, "BNT", { total: 51 }, 58);
  put(1, "TDS", counts(42), 21); put(1, "TSD", counts(16, 6), 16, "Caso intencional de inconsistência para demonstrar o controle de qualidade.");
  put(2, "RAVLT", ravlt([6, 8, 12, 13, 15, 6, 12, 12]), 68);
  put(2, "TDS", counts(48), 44); put(2, "TSD", counts(42), 31); put(2, "TBVN", counts(63, 4, 2), 62);
  put(3, "TDS", counts(36), 27); put(3, "TSD", counts(35), 23);
  put(3, "RAVLT", ravlt([4, 6, 8, 10, 11, 4, 8, 8]), 31); put(3, "FAS", { F: 10, A: 11, S: 10 }, 18);
  put(5, "BNT", { total: 29 }, 3); put(5, "MoCA", { total: 20 }, 7);
  put(6, "RAVLT", ravlt([5, 7, 9, 10, 11, 5, 9, 8]), 22); put(6, "MoCA", { total: 24 }, 33); put(6, "BNT", { total: 48 }, 29);
  put(7, "TDS", counts(48), 50); put(7, "TSD", counts(44), 43); put(7, "TBVN", counts(54, 7, 1), 62);
  const reports: Report[] = [2, 3, 6].map((i, j) => {
    const integration = [
      "No caso inteiramente fictício de Ana, a aprendizagem aumenta ao longo das tentativas. O documento organiza esses registros e a funcionalidade descrita na entrevista. Os percentis foram atribuídos apenas para demonstrar a interface e não permitem conclusões sobre o funcionamento de uma pessoa.",
      "O exemplo de João permite visualizar resultados heterogêneos e a preservação de uma versão concluída. Esta integração foi redigida como conteúdo sintético de demonstração. Não há diagnóstico, interpretação normativa validada ou inferência sobre retorno ao trabalho.",
      "O exemplo de Helena organiza medidas de aprendizagem, nomeação e rastreio em um documento ainda em revisão. A interpretação clínica depende de normas adequadas e da integração com a história e a funcionalidade; esses requisitos não são substituídos pelos percentis ilustrativos.",
    ][j];
    return { id: id("doc", j), assessmentId: assessments[i].id, title: "Relatório de avaliação neuropsicológica",
      status: j === 1 ? "finalizado" : j === 2 ? "revisao" : "rascunho", version: 1,
      snapshot: snapshotFor(patients[i], assessments[i], results, integration,
        "Exemplo de encaminhamento do trabalho: revisar as informações registradas, discutir a coerência entre os dados e preparar a devolutiva demonstrativa. Nenhuma recomendação assistencial é emitida pelo sistema.", stamp),
      createdAt: stamp, updatedAt: stamp };
  });
  const appts = [[0, 0, "09:00", "Aplicação"], [1, 0, "11:00", "Entrevista"], [2, 0, "14:00", "Integração"], [6, 0, "16:00", "Devolutiva"],
    [4, 1, "09:30", "Entrevista"], [5, 1, "14:00", "Aplicação"], [7, 2, "10:00", "Integração"], [0, 3, "15:00", "Aplicação"]];
  const appointments: Appointment[] = appts.map((r, i) => ({
    id: id("s", i), assessmentId: assessments[Number(r[0])].id, startsAt: addDays(day, Number(r[1])) + "T" + r[2] + ":00-03:00",
    duration: 50, kind: String(r[3]), status: "agendado", notes: "", createdAt: stamp, updatedAt: stamp,
  }));
  return { revision: 1, patients, assessments, results, reports, appointments,
    audit: [{ id: id("event", 0), action: "demo.seed", entityId: "workspace", summary: "8 casos fictícios e seus registros demonstrativos foram criados.", createdAt: stamp }], auditTotal: 1 };
}
