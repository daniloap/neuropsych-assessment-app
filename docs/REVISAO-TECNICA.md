# Revisão técnica do piloto CogMetrics

Data: 8 de setembro de 2026.

A revisão usa o código recuperado do Site publicado (estado `a788eae`, segunda ampliação) e a proposta de código anterior no GitHub (pull request 1, estado `59bb15d`). Não se presume que uma boa aparência corresponda a uma operação persistente ou a uma norma válida.

## Avaliação do sistema anterior

O primeiro piloto era útil para discutir os módulos e o vocabulário do produto. Sua principal limitação era a distância entre a ação sugerida pelos controles e o que o código realmente executava. Para um sistema de avaliação, essa distância compromete a rastreabilidade e a confiança no vínculo entre paciente, protocolo e documento.

| Achado no código anterior | Consequência | Tratamento implementado |
| --- | --- | --- |
| Pacientes armazenados somente em `useState`; vínculo D1 nulo e esquema vazio | Cadastros desapareciam ao recarregar | Persistência relacional, inicialização idempotente e APIs autenticadas |
| `ScoreEntry` sempre identificava Maria Oliveira e não recebia paciente/avaliação | Lançamento não correspondia ao prontuário aberto | Resultados vinculados ao identificador da avaliação, validado no servidor |
| Concluir/salvar mostrava um aviso, sem atualizar resultados ou observações | Confirmação enganosa de gravação | Gravação real com retorno confirmado, revisão e auditoria atômicas |
| Percentil calculado por `(total − 14) × 2,7`, truncado em 1–99 | Transformação arbitrária podia parecer norma psicométrica | Removida; cálculo demonstrativo isolado em CM-DEMO, com parâmetros artificiais explícitos |
| TDS descrito como detecção de sinais; TSD como sequenciamento digital; TBVP como busca de padrões | Catálogo incompatível com os instrumentos do projeto | Nomes corrigidos e remoção de d-prime, viés de resposta e intervalos de confiança que não eram calculados |
| Números amostrais apresentados como bases normativas, sem distinguir banco consolidado e pares válidos | Evidência de normatização superestimada | Nenhuma alegação de norma clínica pronta; amostras não são usadas como coeficientes |
| Critérios de qualidade apenas narrados em fichas | Resultados inconsistentes podiam aparecer como interpretáveis | Validação de erros/omissões e razão bilateral, com supressão de percentil e justificativa de exclusão |
| Perfis por domínio separados dos resultados, inclusive para domínios sem medidas correspondentes | Gráficos pareciam índices psicométricos sem cálculo rastreável | Perfil por instrumento derivado dos registros, sem média de percentis ou composição de domínio |
| Indicadores 24 pacientes, 36 instrumentos e 18 relatórios fixos | Painel não refletia a base demonstrativa | Contagens calculadas a partir das mesmas entidades usadas nos módulos |
| Exportar, adicionar instrumento, editar cadastro, agenda e revisão apenas disparavam mensagens | Fluxo interrompido apesar de respostas de sucesso | Formulários reais, revisão e exportação; controles sem operação foram retirados |
| Um único componente reunia dados, cálculo, modais e relatórios | Manutenção e investigação de erros difíceis | Separação entre domínio, armazenamento, API, mutações, exportação e interface |
| Relatório derivava texto genérico de uma lista de domínios, sem histórico real | Não havia documentação do que foi revisado | Redação profissional explícita, snapshots, revisões preservadas e alerta de novos dados |
| “Ambiente protegido” e “termo assinado” eram elementos visuais sem tais operações na aplicação | Aparência de controles inexistentes | Removidas alegações não implementadas; autenticação da plataforma e limites de uso descritos |
| Tipografia recorrente de 7–10 px, estados inacessíveis e navegação sem endereços próprios | Leitura e navegação prejudicadas | Nova hierarquia visual, texto regular maior, foco, diálogos nativos e rotas diretas |
| Teste automatizado verificava somente um metadado de pré-visualização | Nenhuma proteção do fluxo de negócio | Testes de operações completas, autenticação, isolamento, qualidade, conflito, rollback e documentos |
| Site publicado e proposta no GitHub divergiam | Revisão não representava o produto disponibilizado | Fonte reconstruída e sincronizada como nova revisão da proposta existente |

## Decisões psicométricas

A definição dos instrumentos e os critérios de qualidade foram recuperados do contexto do projeto. O histórico distingue a base consolidada de 2.128 registros das amostras válidas: TDS 1.009, TSD 938, TBVN 1.712, TBVP 1.003 e 745 pares válidos TDS/TSD. Esses números não foram tratados como uma norma pronta, nem usados para calcular percentis. A consulta ao manual integral e aos coeficientes de normatização continua necessária.

As regras deste piloto são transparentes: erros >5 invalidam os quatro protocolos; omissões >5 também invalidam TDS/TSD; a razão bilateral maior que dois gera alerta nos dois protocolos do par. Não há divisão por zero. As regras atuam somente sobre o registro do protocolo, sem inferência diagnóstica. Dados brutos permanecem preservados e resultados excluídos exigem justificativa.

O gráfico não calcula uma suposta “memória global” a partir de resultados incomparáveis. Cada ponto corresponde a um resultado e seu percentil sintético. A medida CM-DEMO é explicitamente artificial. Não há estimativa de confiabilidade, intervalo de confiança, mudança confiável ou associação automática de resultados a doenças.

## Garantias e limites de implementação

As APIs rejeitam ausência de identidade, referências de outra conta, origens divergentes e entradas fora dos limites. O limite de corpo é aplicado durante a leitura, sem depender apenas de Content-Length. A gravação e a auditoria usam uma operação atômica de D1 com controle de revisão; versões concorrentes não sobrescrevem dados silenciosamente. Exportações HTML escapam o conteúdo digitado.

As versões de documentos preservam identificação, contexto, protocolo, resultados, texto, título e versão das regras. O documento finalizado é editado somente após reabertura, que cria uma nova versão; a anterior continua disponível. Alterar dados de origem exige nova revisão antes da conclusão. A conclusão é demonstrativa e não constitui assinatura clínica.

Não se afirma proteção completa para produção: faltam homologação clínica, normas verificadas, governança para uso assistencial, teste de recuperação de desastres, auditoria externa, perfis de equipe, integração com agenda externa, assinatura profissional e dimensionamento para grandes bases. O acesso inicial é individual, vinculado à conta no Site. Os testes não comprovam conformidade legal ou regulatória.

## Verificação executada

- Migração SQL gerada e inspecionada; integridade e consultas exercitadas em SQLite com chaves estrangeiras habilitadas.
- Testes de integração abrangendo o percurso completo entre paciente, avaliação, resultado, revisão, conclusão e reabertura.
- Casos adversos: gravação concorrente, rollback, tentativa de acesso entre contas, origem incorreta, campos inválidos, datas impossíveis, sobreposição de horários, razão bilateral e divisão por zero.
- Exportação e preservação de versões, proteção contra interpretação de HTML digitado e alerta de dados desatualizados.
- Verificação de tipos TypeScript e compilação do Worker.
- Testes sobre o artefato compilado para autenticação e renderização inicial de endereços diretos.
- Não houve inspeção visual interativa em navegador nesta rodada; não se alega validação por captura de tela ou teste manual de interface.

## Referências técnicas consultadas

Documentação primária da Cloudflare, consultada em 8 de setembro de 2026:

- D1 Database: instruções preparadas e operações batch. https://developers.cloudflare.com/d1/worker-api/d1-database/
- D1 SQL statements: compatibilidade SQLite e operações suportadas. https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Limites de Cloudflare Workers: memória por isolate. https://developers.cloudflare.com/workers/platform/limits/

As referências acima fundamentam aspectos da implementação, não a validade clínica dos instrumentos. As definições específicas de CogMetrics vieram do contexto e dos requisitos do projeto; não se declara consulta integral ao manual técnico nesta rodada.
