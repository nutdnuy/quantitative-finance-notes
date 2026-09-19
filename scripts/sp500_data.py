"""Prepare and load the fixed S&P 500 example distributed with arch 8.0.0."""
import csv
from datetime import date, datetime
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/sp500-arch-8.0.0.csv.gz'
SNAPSHOT = ROOT / 'data/sp500-daily.json'
RAW_SHA256 = '1e028cbb9c400cc018c816ccc439b33c919387e726c3ed5ca2c05c82746059de'


def load_sp500():
    data = json.loads(SNAPSHOT.read_text())
    prices = data['prices']
    dates = [row[0] for row in prices[1:]]
    returns = [math.log(current[1] / previous[1])
               for previous, current in zip(prices, prices[1:])]
    return data, dates, returns


def prepare():
    raw = RAW.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == RAW_SHA256, 'Unexpected source snapshot'
    rows = list(csv.DictReader(gzip.decompress(raw).decode().splitlines()))
    prices = [[datetime.strptime(row['Date'], '%m/%d/%Y').date().isoformat(),
               float(row['Close'])] for row in rows]
    assert len(prices) == 5031
    assert prices[0][0] == '1999-01-04' and prices[-1][0] == '2018-12-31'
    assert all(math.isfinite(value) and value > 0 for _, value in prices)
    assert all(date.fromisoformat(day).weekday() < 5 for day, _ in prices)
    assert all(a[0] < b[0] for a, b in zip(prices, prices[1:])), 'Duplicate or unordered dates'
    assert all(row['Close'] == row['Adj Close'] for row in rows)
    data = {
        'schema_version': 1,
        'name': 'S&P 500',
        'symbol': '^GSPC',
        'series_type': 'Daily closing price index; excludes dividends',
        'source': 'Yahoo Finance via the arch 8.0.0 bundled example',
        'source_url': 'https://github.com/bashtage/arch/blob/v8.0.0/arch/data/sp500/sp500.csv.gz',
        'source_download_url': 'https://raw.githubusercontent.com/bashtage/arch/v8.0.0/arch/data/sp500/sp500.csv.gz',
        'source_sha256': RAW_SHA256,
        'retrieved_on': '2026-09-19',
        'price_start': prices[0][0],
        'price_end': prices[-1][0],
        'return_start': prices[1][0],
        'return_end': prices[-1][0],
        'price_count': len(prices),
        'return_count': len(prices) - 1,
        'return_method': 'ln(Close[t] / Close[t-1]); decimal units; consecutive observed trading dates',
        'processing': 'All source rows retained. No filling, winsorizing, rounding or resampling. Date normalized to ISO 8601. First price is a baseline, not a zero return.',
        'prices': prices,
    }
    metadata = json.dumps({k: v for k, v in data.items() if k != 'prices'}, ensure_ascii=False, indent=2)
    price_rows = ',\n'.join('    ' + json.dumps(row) for row in prices)
    SNAPSHOT.write_text(metadata[:-2] + ',\n  "prices": [\n' + price_rows + '\n  ]\n}\n')
    print(f'Prepared {len(prices):,} closes and {len(prices)-1:,} log returns: {prices[0][0]} to {prices[-1][0]}')


if __name__ == '__main__':
    prepare()
