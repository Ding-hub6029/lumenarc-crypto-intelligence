# Primary sources and course guidance

## Course materials provided by the student

- Instructor announcement screenshot: `屏幕截图2026-10-01205552.webp`. The later announcement sets Sunday, October 4, 2026, 23:59 Singapore time as the finish line. It asks for a roughly 1,200-word report, a face-and-screen video demo near five minutes, checked-in data and evaluations with explainers, README setup instructions, and product documentation including persona, input, output, a box architecture, targeted metrics, and reached metrics.
- Individual feedback screenshot: `屏幕截图2026-10-01205523.png`. The instructor describes a 30-PDF analyst tool that returns resistance or sentiment with a source or an honest non-answer. The feedback praises an upfront keyword baseline, abstention, trade execution out of scope, and hand-labeled holdout. It requests 50 labeled question-answer pairs with numbers fixed before final runs. It rejects an unmeasured 40 percent compilation-time target and asks for numeric accuracy and abstention instead. It notes a fixed school OpenRouter allocation of US$10 with no top-ups.
- `PE6201_Project_Proposal_Watchouts(3).pdf`. Source supplied by the student. Rubric topics include problem framing, concrete build-versus-buy reasoning, data access and permission, real evaluation, correct and wrongful abstention, risk mitigations, and a working first slice.
- `PE6201_Assessment_Timeline(5).pdf`. Source supplied by the student. This earlier timeline shows September 20, 2026 for the final project and a 1,200-word cap. The later instructor announcement explicitly supersedes that older date.

## Primary market and API documentation

- Binance Spot WebSocket specification: https://raw.githubusercontent.com/binance/binance-spot-api-docs/master/web-socket-streams.md . The market-only public endpoint `wss://data-stream.binance.vision` supports combined lower-case streams. Individual `@trade` streams push raw exchange trades in real time and `@ticker` streams push rolling 24-hour statistics around once per second. The app streams ten USDT pairs and makes their quote unit explicit.
- Coinbase Exchange WebSocket overview: https://docs.cdp.coinbase.com/exchange/websocket-feed/overview . Coinbase was considered for direct fiat USD pairs, but its WebSocket failed TLS certificate verification in this execution environment. The implementation uses Binance instead of disabling certificate checks.
- OpenRouter chat completions API: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion . The implementation accepts a protected server-side credential and uses a chat completions request. The school key has not yet been confirmed into protected project secrets.
- Public Binance Research report example: https://public.bnbstatic.com/static/files/research/monthly-market-insights-2026-02.pdf . The source report has 18 PDF pages. Its monthly market commentary includes a stated BTC surge to US$98K during January 2026. The 30 exact original report URLs and SHA256 checksums are in `../data/manifest.csv`.
- Cointelegraph publisher feed: https://cointelegraph.com/rss . Decrypt publisher feed: https://decrypt.co/feed . CoinDesk publisher feed: https://www.coindesk.com/arc/outboundfeeds/rss/ . Google News RSS search endpoint: https://news.google.com/rss/search . Only titles and excerpt text actually returned in the feed are supplied to the optional AI news classifier.

Market data and news values are time-varying. A reader should check the timestamp in the live interface rather than treating any report screenshot or copied quote as today's price.
