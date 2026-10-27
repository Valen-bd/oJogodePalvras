# pista — uma palavra por vez

Jogo casual de adivinhação de palavras em português brasileiro, com desafio diário e partidas de prática.

## Executar localmente

Requer Node.js 20 ou superior. Não há dependências npm externas.

```sh
npm start
```

Abra [http://localhost:3000](http://localhost:3000). Para reiniciar o servidor automaticamente durante alterações:

```sh
npm run dev
```

## Testes

```sh
npm test
```

Os testes usam o executor nativo `node:test`, sem dependências externas. A suíte cobre normalização e pontuação, virada do dia em `America/Sao_Paulo`, fluxo de pistas e palpites, validações e erros da API, metadados/temas, respostas HTTP e proteção dos arquivos privados.

## Estrutura

- `public/`: interface responsiva, estilos e lógica do navegador.
- `server/`: API HTTP e conteúdo das palavras, mantido fora dos arquivos públicos.
- `tests/`: testes unitários e de integração.
- `prototipos/`: propostas de interface que servem como referência visual.
- `DOCUMENTO-PROJETO-TECNICO.md`: arquitetura alvo, regras e plano técnico.

O progresso e as estatísticas são locais ao navegador; as rodadas de prática existem enquanto o servidor está ativo. O conteúdo do dia é selecionado usando o calendário `America/Sao_Paulo`.
