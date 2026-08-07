# CogMetrics Pilot

Piloto de um sistema web para apoiar o fluxo de avaliações neuropsicológicas e psicométricas.

## Escopo desta versão

- painel clínico com indicadores operacionais;
- cadastro e busca de pacientes demonstrativos;
- acompanhamento de avaliações por etapa;
- entrada de resultados com cálculo ilustrativo;
- biblioteca de instrumentos;
- organização de relatórios e rascunhos clínicos;
- interface responsiva e acessível.

## Uso responsável

Todos os dados apresentados na interface são fictícios. Os cálculos normativos são exclusivamente demonstrativos e não devem ser usados para decisão clínica. Uma versão de produção deverá incorporar autenticação, perfis de acesso, criptografia, trilha de auditoria, persistência segura e validação técnica das bases normativas.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Para validar a compilação de produção:

```bash
npm run build
```
