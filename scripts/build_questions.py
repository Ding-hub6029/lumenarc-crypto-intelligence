import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data'
BASE = 'https://public.bnbstatic.com/static/files/research/monthly-market-insights-{}.pdf'
STATUS = 'candidate_source_text_checked_not_independently_manually_verified'

def clean(s):
    return re.sub(r'\s+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Cf')).strip()

def item(split, n, month, question, answer, quote, answer_type='numeric', **extra):
    d = {
        'id': f'{split}_{n:03d}',
        'split': split,
        'question': f'In the {month} report, {question[0].lower() + question[1:]}',
        'answer': answer,
        'answer_type': answer_type,
        'report_month': month,
        'source_url': BASE.format(month),
        'local_pdf': f'source_pdfs/monthly-market-insights-{month}.pdf',
        'pdf_page': 3,
        'printed_page': 2,
        'evidence_quote': quote,
        'label_status': STATUS,
        'provenance': 'Quote was checked against pdftotext output from the downloaded source PDF. This is a source-text-checked candidate label, not an independently manually verified label.'
    }
    d.update(extra)
    return d

dev_specs = [
('2024-03','What increase in total market capitalization did the report say occurred in February?','40%','ending the month with a 40% increase in total market capitalization'),
('2024-03','Approximately what share of global cryptocurrency owners did the report say were women?','approximately 37%','women represent approximately 37% of global cryptocurrency owners'),
('2024-04','What all-time-high price did Bitcoin touch twice in March?','US$73,000','Bitcoin reached an all-time high, touching US$73,000 twice'),
('2024-04','By as much as what percentage had median Layer-2 gas fees fallen post-Dencun?','96.8%','Median L2 gas fees have fallen by as much as 96.8% post-Dencun'),
('2024-05','What TVL threshold did liquid restaking protocols cross in April?','US$10B','crossing the US$10B mark in April'),
('2024-05','What total supply of USD-pegged stablecoins did the report give for April?','US$160B','reaching US$160B in April'),
('2024-06','By what percentage did ETH price surge in a single day leading up to spot ETH ETF approval?','21.2%','ETH’s price surged 21.2% in a single day leading up to the approval'),
('2024-06','Around what value of tokenized U.S. treasuries was recorded on-chain in May?','around US$1.5B','recording around US$1.5B in value on-chain'),
('2024-07','How many BTC in upcoming repayment distributions did Mt. Gox announce for July?','over 140,000 BTC','repayment distributions of over 140,000 BTC in July'),
('2024-07','To how many BTC did the April halving reduce the miner block reward?','3.125 BTC','halved the miner block reward from 6.25 BTC to 3.125 BTC'),
('2024-08','What net outflows did new spot Ether ETFs register in their first week?','approximately US$484M','registered ~US$484M in net outflows'),
('2024-08','What trading volume did Polymarket surpass in July?','US$387M','surpassing US$387M in trading volumes'),
]

holdout_specs = [
('2024-09','What percentage drop in total market capitalization did the report attribute to August 2024?','13.1%','the cryptocurrency market experienced a 13.1% drop in total market capitalization'),
('2024-09','How much in crypto liquidations did the report say occurred in a single day?','over US$819M','The crypto market saw over US$819M in liquidations in a single day'),
('2024-10','What increase in total market capitalization did the report give for September 2024?','8.0%','the cryptocurrency market experienced an 8.0% increase in total market capitalization'),
('2024-10','What market share did wrapped Bitcoin hold according to the report?','over 65%','holding over 65% of the market share'),
('2024-11','What increase in total market capitalization did the report give for October 2024?','2.8%','the cryptocurrency market saw a 2.8% increase in total market capitalization'),
('2024-11','What share of all token launches did Solana capture in the week ending October 21?','90.6%','Solana capturing a record 90.6% of all token launches in the week ending on October 21'),
('2025-01','To what record value did the cryptocurrency market initially surge in December 2024?','US$3.91T','the cryptocurrency market initially surged to a record US$3.91T'),
('2025-01','What approximate 2024 YTD market-cap growth did the report give for Bitcoin?','approximately 123.4%','~123.4% year-to-date (YTD) market cap growth'),
('2025-02','How many active crypto ETF filings in the U.S. did the report say there were?','47','Currently, there are 47 active filings in the U.S.'),
('2025-02','How many tokens had been created according to the report?','over 37M','over 37M tokens'),
('2025-03','By what percentage did the cryptocurrency market decline in February 2025?','20.2%','the cryptocurrency market declined by 20.2%'),
('2025-03','How much in outflows had Solana seen over the prior 30 days?','US$485M','Solana has seen US$485M in outflows'),
('2025-04','By what percentage did the crypto market decline in March 2025?','4.4%','the crypto market declined by 4.4%'),
('2025-04','What was the reported one-year surge in BTCFi total value locked?','2,767%','Bitcoin DeFi (BTCFi) experiencing a 2,767% surge in total value locked (TVL) over the past year'),
('2025-05','By what percentage did cryptocurrency market cap rise in April?','10.8%','cryptocurrency market cap rose by 10.8% in April'),
('2025-05','What four-year high in Bitcoin dominance did the report state?','63%','dominance has surged to a four-year high of 63%'),
('2025-06','By what percentage did the cryptocurrency market rise in May 2025?','10.3%','the cryptocurrency market rose 10.3%'),
('2025-06','What net inflows did U.S. spot Bitcoin ETFs attract in May?','US$5.2B','attracting US$5.2B in net inflows'),
('2025-07','By what percentage did total cryptocurrency market capitalization increase in June?','2.62%','the total cryptocurrency market capitalization increased modestly by 2.62%'),
('2025-07','What stablecoin-supply milestone did the report state was crossed in June?','US$250B','supply crossed US$250B for the first time in June'),
('2025-08','By what percentage did cryptocurrency market capitalization rise in July?','13.3%','the cryptocurrency market capitalization rose 13.3%'),
('2025-08','What Bitcoin dominance level did the report say followed a 5.2% fall in July?','60.6%','Bitcoin dominance fell 5.2% to 60.6%'),
('2025-09','By what percentage did total cryptocurrency market cap decline in August?','1.7%','the total cryptocurrency market cap declined slightly by 1.7%'),
('2025-09','What USDe supply did the report give after its August growth?','US$12.2B','USDe grew over 43.5% in August, reaching US$12.2B supply'),
('2025-10','By what percentage did cryptocurrency market capitalization grow in September?','4.3%','the cryptocurrency market capitalization grew by 4.3%'),
('2025-10','How many crypto ETP applications did the report say were in the U.S. pipeline?','more than 90','More than 90 crypto ETP applications are currently in the U.S. pipeline'),
('2025-11','By what percentage did the cryptocurrency market decline in October?','6.1%','the cryptocurrency market experienced a 6.1% decline'),
('2025-11','What value did the report give for the historic October liquidation?','US$19 billion','a historic US$19 billion liquidation'),
('2025-12','By what percentage did cryptocurrency market cap fall in November?','15.43%','the cryptocurrency market cap fell 15.43%'),
('2025-12','What monthly outflows from spot BTC ETFs did the report say were exceeded in November?','US$3.5B','exceeding US$3.5B in November'),
('2026-01','How many new stablecoins surpassed US$1B in 2025, according to the report?','six','six new stablecoins surpassed US$1B'),
('2026-01','Above what level did cumulative altcoin ETF flows rise?','US$2B','flows above US$2B'),
('2026-02','What share of total crypto market capitalization did assets outside the top 10 account for?','approximately 7.1%','accounting for just ~7.1% of total crypto market capitalization'),
('2026-02','What January 2026 level did crypto card usage reach?','US$115M','now reaching US$115M in January 2026'),
('2026-03','What year-to-date return did the N7 Index post?','+3.5%','N7 Index, an equal-weighted basket of NeoFi protocols, returned +3.5% YTD'),
('2026-03','What L2-to-L1 DAU ratio did the report give for February 2026?','1.12','the L2-to-L1 DAU ratio fell to 1.12 in February 2026'),
('2026-04','By what percentage did total crypto market cap edge higher in March?','1.8%','total crypto market cap edged higher by 1.8%'),
('2026-04','To over how many registered agents had ERC-8004 grown since its Ethereum mainnet launch?','over 162,000','162,000 registered agents across 22 networks'),
('2026-05','To what value did the crypto market rise amid the temporary ceasefire?','US$2.6T','crypto market rose more than 8% to US$2.6T'),
('2026-05','How much in crypto exploit losses did April see?','US$635.24M','saw US$635.24M in crypto exploit losses'),
('2026-06','What month-over-month outperformance versus BTC did the quantum-resistance sector deliver?','approximately 59.3%','the sector delivering ~59.3% MoM outperformance vs BTC'),
('2026-06','By roughly what percentage had active tokenised real-world assets grown from early 2025 to June 2026?','589%','tokenised real-world assets grew roughly 589% from early 2025 to June 2026'),
('2026-07','To what total market capitalization did the crypto market fall?','US$2.13T','The crypto market fell 12.7% to US$2.13T'),
('2026-07','What share of overall holdings did Binance equity holders keep in stablecoins?','37%','With 37% of overall holdings in stablecoins'),
('2026-08','To what total market capitalization did the crypto market recover?','US$2.29T','crypto market recovered 8.0% to US$2.29T'),
('2026-08','How many tickers did Binance TradFi-perp coverage expand to?','149','coverage has expanded from 1 ticker in January to 149 today'),
('2026-09','By what percentage did total market cap rise according to the report?','17.6%','Total market cap rose 17.6% to US$2.70T'),
('2026-09','What seven-day BTC run did the report describe as being in the top 1% of weekly moves since 2020?','24.8%','BTC’s 24.8% seven-day run ranked in the top 1% of weekly moves since 2020'),
]

# Retain one or two verified numeric cases per month across the date range.
holdout_specs = [spec for index, spec in enumerate(holdout_specs) if index % 6 != 5]

# Contextual no-answer cases. The nearby quote anchors the relevant report passage;
# the requested metric is absent from the cited report text, as noted explicitly.
holdout_specs += [
('2024-10','What exact percentage of the US$12+B on-chain RWA market was held by BlackRock’s fund?','Not stated in the report.','Total on-chain RWAs are at all-time highs at US$12+B', 'no_answer', {'no_answer_reason':'The cited report gives total RWA value and describes BlackRock as a key driver, but does not quantify its percentage of that market.', 'negative_evidence':'No percentage for BlackRock’s fund share is stated in the extracted report text.'}),
('2026-09','What was the exact August 2026 market capitalization of Binance’s native BNB token?','Not stated in the report.','Total market cap rose 17.6% to US$2.70T', 'no_answer', {'no_answer_reason':'The cited report states the total crypto market-cap figure, not BNB token market capitalization.', 'negative_evidence':'No BNB token market-cap figure is stated in the extracted report text.'}),
('2024-09','What exact USD resistance level for BTC did the September 2024 report set after the August market decline?','Not stated in the report.','the cryptocurrency market experienced a 13.1% drop in total market capitalization', 'no_answer', {'no_answer_reason':'The report describes the August market decline but does not set a BTC resistance price.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2025-02','What exact year-end 2025 SOL price target did the February 2025 report publish?','Not stated in the report.','Currently, there are 47 active filings in the U.S.', 'no_answer', {'no_answer_reason':'The report discusses market trends and ETF applications but provides no SOL year-end price target.', 'negative_evidence':'The entire extracted report was searched for price target; the phrase is absent.'}),
('2025-04','What exact BTC resistance price did the April 2025 report identify after March market weakness?','Not stated in the report.','the crypto market declined by 4.4%', 'no_answer', {'no_answer_reason':'The report quantifies the market decline but does not identify a BTC resistance level.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2025-06','What exact USD resistance level did the June 2025 report assign to Bitcoin?','Not stated in the report.','the cryptocurrency market rose 10.3%', 'no_answer', {'no_answer_reason':'The report states broad market performance rather than an exact BTC resistance level.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2025-08','What exact BTC resistance level did the August 2025 report state after the July market rise?','Not stated in the report.','the cryptocurrency market capitalization rose 13.3%', 'no_answer', {'no_answer_reason':'The report gives a July market-cap change without specifying a BTC resistance level.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2026-02','What exact ETH resistance price did the February 2026 report set following the Fusaka upgrade?','Not stated in the report.','daily transactions climbed to new highs of near ~3M', 'no_answer', {'no_answer_reason':'The source discusses Ethereum network activity but does not set a numeric ETH resistance price.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2026-07','What exact BTC resistance level did the July 2026 report identify after the market fell?','Not stated in the report.','The crypto market fell 12.7% to US$2.13T', 'no_answer', {'no_answer_reason':'The report discusses overall market capitalization, not a BTC resistance level.', 'negative_evidence':'The entire extracted report was searched for resistance; the term is absent.'}),
('2026-03','What exact year-end 2026 Solana price target did the March 2026 report set?','Not stated in the report.','N7 Index, an equal-weighted basket of NeoFi protocols, returned +3.5% YTD', 'no_answer', {'no_answer_reason':'The report includes market narratives but does not publish a year-end SOL price target.', 'negative_evidence':'The entire extracted report was searched for price target; the phrase is absent.'}),
]

# Build and validate each quote against the actual extracted PDF page.
def build(specs, split):
    out=[]
    for n, spec in enumerate(specs, 1):
        month, q, ans, quote, *tail = spec
        typ = tail[0] if tail else 'numeric'
        extra = tail[1] if len(tail) > 1 else {}
        path=OUT/'extracted_text'/f'monthly-market-insights-{month}.txt'
        page=path.read_text(errors='replace').split('\f')[2]
        if clean(quote) not in clean(page):
            raise ValueError(f'evidence quote not found on PDF page 3: {month}: {quote}')
        out.append(item(split,n,month,q,ans,quote,typ,**extra))
    return out

dev=build(dev_specs,'dev')
holdout=build(holdout_specs,'holdout')
assert len(dev)==12 and len(holdout)==50
for name, records in [('dev_questions.jsonl',dev),('holdout_questions.jsonl',holdout)]:
    (OUT/name).write_text(''.join(json.dumps(r, ensure_ascii=False, separators=(',',':'))+'\n' for r in records))
print(json.dumps({'dev':len(dev),'holdout':len(holdout),'no_answer':sum(x['answer_type']=='no_answer' for x in holdout)}))
