# CogMetrics

Sistema web demonstrativo para avaliação neuropsicológica, com interface em português e serviços persistentes. Esta versão substitui ações apenas ilustrativas do primeiro piloto por operações completas entre prontuários, avaliações, resultados e documentos.

**Utilize exclusivamente dados fictícios. O sistema não está liberado para uso assistencial ou armazenamento de dados de pacientes reais.**

## Fluxos implementados

- Oito casos fictícios, oito avaliações, 22 resultados, três documentos e oito atendimentos iniciais, criados uma única vez por conta.
- Cadastro, edição e arquivamento de prontuários, incluindo história, demanda, funcionalidade e observações.
- Seleção de instrumentos, prioridade, prazo e revisão da entrevista por avaliação; etapas com pré-requisitos verificados no servidor.
- Escores vinculados à avaliação correta, edição, justificativa de exclusão e regras de qualidade do projeto.
- Nove entradas no catálogo: TDS, TSD, TBVN, TBVP, RAVLT, MoCA, FAS, BNT e CM-DEMO. Nenhum estímulo de teste protegido é reproduzido.
- Relatórios com texto editável, revisão, conclusão demonstrativa, reabertura e histórico preservado. Mudanças nos dados de origem são sinalizadas.
- Download real de cada versão em HTML e impressão com folha de estilo para salvar em PDF no navegador.
- Agenda com reagendamento, realização, cancelamento e bloqueio de sobreposições no fuso de Brasília.
- Busca, filtros, navegação com endereços diretos, registros de alteração e exportação JSON.

## Critério psicométrico

O catálogo anterior atribuía nomes incorretos aos instrumentos CogMetrics e apresentava regras de validade somente como texto. As definições foram corrigidas com base no contexto do projeto. TDS significa Teste Dígito Símbolo; TSD, Teste Símbolo Dígito; TBVN, Teste de Busca Visual de Números; TBVP, Teste de Busca Visual de Palavras.

TDS/TSD: mais de cinco erros ou omissões invalidam o escore principal. Para TBVN/TBVP, omissões não invalidam por esse critério; mais de cinco erros invalidam. A razão bilateral TDS/TSD maior que dois é sinalizada nos dois registros. Divisão por zero é tratada explicitamente. As regras não produzem diagnósticos.

Os percentis dos exemplos são **sintéticos**, atribuídos separadamente dos escores brutos. Não representam conversão clínica. O simulador CM-DEMO usa média artificial 50, desvio-padrão 15 e a função de distribuição normal; o servidor calcula o percentil e desconsidera o valor enviado pelo cliente. Não há normas clínicas por idade/escolaridade/sexo, intervalos de confiança ou diagnósticos automáticos.

As amostras válidas por instrumento, os coeficientes regressivos, a elegibilidade normativa e o manual integral ainda precisam ser incorporados em um trabalho psicométrico próprio. Não se declara aprovação regulatória, licença editorial ou direito de distribuição dos instrumentos.

## Arquitetura

React 19 e TypeScript sobre Vinext, preservando as dependências fixadas do projeto. O Worker encaminha `/api/*` ao serviço autenticado e as demais rotas ao renderizador. Cloudflare D1 mantém oito tabelas com índices e chaves estrangeiras. Drizzle gera somente migrações; consultas de aplicação usam instruções preparadas.

| Camada | Local |
| --- | --- |
| Interface, formulários e documentos | `components/workspace/` |
| Tipos, catálogo, regras e transformações | `lib/domain.ts` |
| Dados demonstrativos | `lib/seed.ts` |
| Consultas e gravação atômica | `lib/store.ts` |
| Operações e validação de negócios | `lib/mutations.ts` |
| Autenticação das APIs, limites de entrada e roteamento | `lib/api.ts` |
| Exportação escapada de documentos | `lib/export.ts` |
| Esquema e migração | `db/schema.ts`, `drizzle/` |
| Testes de integração e renderização | `tests/` |

A identidade vem dos cabeçalhos autenticados inseridos pela plataforma. Cada consulta e gravação é vinculada ao identificador da conta. O cliente não escolhe o proprietário. O ambiente usa a política de acesso do Site; a identidade, sozinha, não é uma autorização para pertencer a outro espaço.

Toda mutação usa a revisão do ambiente como controle de concorrência. A atualização da revisão, os registros alterados e o evento de auditoria são uma única operação `batch`. Se a revisão mudou, o lote inteiro é revertido. Uma falha não registra uma confirmação fictícia. Campos e limites também são verificados no servidor; gravações exigem origem correspondente e cabeçalho próprio.

**Limite de autenticação:** os cabeçalhos só são confiáveis atrás do despachante da plataforma. Não exponha o Worker diretamente à Internet confiando em cabeçalhos fornecidos pelo visitante. O servidor de desenvolvimento não deve ser aberto a terceiros.

## Desenvolvimento e verificação

Ambiente testado: Linux com Node.js 24. Dependências e lockfile são preservados. O manifesto público contém somente os vínculos lógicos de armazenamento; não contém a identidade da hospedagem pessoal.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:render
```

`npm run dev` inicia o ambiente de desenvolvimento. A autenticação, as migrações e o vínculo D1 precisam estar configurados no ambiente de execução; não há bypass de autenticação na aplicação. Os testes fornecem suas próprias identidades e banco SQLite isolado, sem alterar dados hospedados.

A verificação de tipos, os testes e a compilação também estão declarados em `.github/workflows/quality.yml`. O êxito de uma execução remota deve ser confirmado no GitHub; a presença do arquivo não significa que o workflow já executou.

## Validação e limites da entrega

Os testes exercitam persistência entre solicitações, isolamento entre contas, proteção de origem, validação de escores, discrepâncias bilaterais, divisão por zero, conflito de versões, rollback, agenda, revisão obrigatória, exportação e preservação de versões. O artefato compilado é verificado para rotas diretas, autenticação e renderização inicial.

Esta entrega não inclui inspeção interativa em navegador, auditoria externa de segurança, ensaios de carga, validação psicométrica ou homologação para produção clínica. A interface usa estilos responsivos, foco visível, diálogos nativos, indicadores textuais, redução de movimento e tratamento de alterações não salvas.

O carregamento do piloto lê os registros da conta para compor os módulos; não é uma implementação paginada para grandes bases. A atividade exibe os últimos 100 eventos. O download JSON contém os registros atuais e esses eventos; versões antigas dos documentos são consultadas/exportadas no próprio histórico. A primeira versão não tinha armazenamento real, portanto não há cadastro persistido do navegador a migrar.

Consulte a análise dos problemas e das correções em [docs/REVISAO-TECNICA.md](docs/REVISAO-TECNICA.md).
