# Vozen Helper — Site

Site público do Vozen Helper, com o painel de configuração autenticado, o painel
de dados do Vozen e as páginas legais.

## Estrutura

```
site/
  index.html          painel React do Helper (OAuth + configuração)
  vozen.html          painel de dados do Vozen
  privacidade.html    política de privacidade
  rank-card.html      compatibilidade com o editor antigo
  rank-card-banners/  banners curados para o rank card
  assets/             bundles e fontes publicados
tools/minify-site.mjs site/ -> site-dist/ (minifica HTML/CSS/JS)
.github/workflows/pages.yml  build + deploy para o Pages
```

## Desenvolvimento

```bash
npm install
npm run build:site
```

O painel comunica apenas com `https://api.vozen.org/rust` e inicia o OAuth pelo
endpoint PKCE da API. O callback cria uma sessão HttpOnly e redireciona de volta
para esta página; não há segredos Discord no bundle público.

## Publicação

Cada `push` a `main` que altere `site/**` corre o workflow `pages.yml`, que gera
`site-dist/` e publica-o no GitHub Pages em
`https://rexy40407.github.io/painel/`.

Sem afiliação com a Discord Inc.

## Organização do painel privado

`site/vozen.html` abre em **Resumo**. As outras áreas são Site, Sistema,
Servidores e Passes. A autenticação, as APIs e as ações de gestão existentes
mantêm-se; mudar de aba não concede nem revoga passes.

- **Estado atual:** `currentGuilds`, `configuredGuilds` e `usedGuilds`.
  As percentagens usam os servidores atuais como denominador, nos dois produtos.
  Uso histórico não significa atividade dentro do período selecionado.
- **Movimento:** `joins`, `leaves` e a diferença entre ambos na janela de
  7/30/90 dias, incluindo hoje, em UTC. Reentradas contam como eventos.
- **Ativação:** visitas anónimas e eventos por servidor são populações diferentes;
  as barras comparam volumes independentes, não uma taxa de conversão atribuída.
- **Retenção:** atividade nos dias 7 e 30 após ativação, apenas com coortes
  elegíveis. Dados ausentes não são apresentados como zero.
- **Site:** Cloudflare agregado de todo `vozen.org`, independentemente do produto
  selecionado. O período é partilhado com o Resumo. Os Web Vitals são p75;
  uma leitura com poucas amostras não valida o desempenho geral.
- **Sistema:** armazenamento e saúde Top.gg atuais, fora do filtro temporal.
  O detalhe de votos mantém a janela de análise indicada.

Fontes preservadas: TTS `/api/admin/growth`, Helper `/rust/api/admin/growth`
e tráfego `/api/admin/web-analytics`, sempre na API autenticada. A proveniência
e as datas incompletas do histórico são explicadas na secção expansível do
Resumo. Não existem dados de demonstração incorporados na página publicada.

Estilos da reformulação: `site/panel-clarity.css`. Regressões de navegação,
filtros, estados ausentes e responsividade: `tests/dashboard-clarity.spec.mjs`.
As capturas geradas por esses testes usam fixtures sintéticas, não dados de
produção. A reformulação não altera permissões, segredos ou dados nos bots.
