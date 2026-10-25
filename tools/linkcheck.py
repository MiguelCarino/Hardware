#!/usr/bin/env python3
"""Fetch every URL in data/brands/*.json and builds.json and report what came back.

Copied from Law/tools/linkcheck.py (the fleet's reference implementation);
only collect() and the index loading differ. Vendor support portals move and
re-platform often, so run this before any commit that touches data/ or
builds.json, and bump the brand's "updated" once its links are checked.

    python3 tools/linkcheck.py                 # everything
    python3 tools/linkcheck.py dell lenovo     # two brands (builds.json skipped)
    python3 tools/linkcheck.py --slow          # 4 workers instead of 12

Standard library only. Sites that answer an automated request with 401/403/
405/406/429/503 (Akamai, Cloudflare) are reported as BLOCKED, not DEAD, and do
not fail the run; only 404, 410, DNS failure and refused connections do.
"""
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36')
TIMEOUT = 25

# Failing the run on these would mean failing on someone else's WAF policy.
BLOCKED_CODES = {401, 403, 405, 406, 429, 503}
DEAD_CODES = {404, 410}

# A bot wall that answers 200 and redirects to its own interstitial looks like a
# healthy redirect unless you know the destination. These are the ones seen in
# this data set; the link itself is fine in a browser.
WALL_HOSTS = ('validate.perfdrive.com', 'geo.captcha-delivery.com', 'challenges.cloudflare.com',
              '/_Incapsula_Resource', 'imperva', '/distil_r_captcha',
              'unblock.federalregister.gov')

# A server that answers TLS with the wrong SNI name breaks urllib but usually
# serves browsers fine. Report it as its own category rather than as dead.
TLS_HINTS = ('UNRECOGNIZED_NAME', 'CERTIFICATE_VERIFY_FAILED', 'SSLV3', 'WRONG_VERSION_NUMBER')


def collect(ids, with_builds=True):
    """→ [(brand, where, url)] — every fetchable URL in data/brands/ and builds.json."""
    out = []

    def add(tag, where, url):
        if url and str(url).startswith('http'):
            out.append((tag, where, str(url)))

    for bid in ids:
        path = os.path.join(DATA, 'brands', bid + '.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as fh:
            b = json.load(fh)
        add(bid, '%s.url' % bid, b.get('url'))
        for i, link in enumerate(b.get('links') or []):
            if link.get('url') != b.get('url'):
                add(bid, '%s.links[%d]' % (bid, i), link.get('url'))
    builds = os.path.join(ROOT, 'builds.json')
    if with_builds and os.path.exists(builds):
        with open(builds, encoding='utf-8') as fh:
            d = json.load(fh)
        for p in d.get('profiles') or []:
            add('builds', '%s.see' % p.get('id'), (p.get('see') or {}).get('url'))
            for s in p.get('specs') or []:
                for e in s.get('eg') or []:
                    if isinstance(e, dict):
                        add('builds', '%s.eg' % p.get('id'), e.get('link'))
    return out


def fetch(item):
    iso, where, url = item
    ctx = ssl.create_default_context()
    # Some ministries still run expired or mis-chained certs. A cert problem is
    # worth knowing about but it is not a dead link, so it is reported, not fatal.
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en;q=0.9',
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
            final = r.geturl()
            moved = '' if final.rstrip('/') == url.rstrip('/') else final
            return (iso, where, url, r.status, moved, '')
    except urllib.error.HTTPError as e:
        return (iso, where, url, e.code, '', '')
    except urllib.error.URLError as e:
        return (iso, where, url, 0, '', str(e.reason)[:70])
    except Exception as e:                                    # timeouts, resets
        return (iso, where, url, 0, '', type(e).__name__ + ': ' + str(e)[:60])


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    workers = 4 if '--slow' in sys.argv else 12

    with open(os.path.join(DATA, 'index.json'), encoding='utf-8') as fh:
        codes = json.load(fh)['brands']
    if argv:
        codes = argv

    items = collect(codes, with_builds=not argv)
    if not items:
        print('nothing to check — is the data in place?')
        return 1
    print('checking %d urls across %d brands, %d at a time\n' % (len(items), len(codes), workers))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        results = list(ex.map(fetch, items))

    # Second pass, serial and patient. Several of these sites answer in 6-20s
    # when nothing else is competing and time out under 12-way concurrency —
    # calling that "dead" is a false alarm that sends someone hunting for a
    # replacement URL that was never broken.
    retry = [i for i, r in enumerate(results) if not r[3]]
    if retry:
        print('re-checking %d slow/failed urls one at a time...\n' % len(retry))
        global TIMEOUT
        TIMEOUT = 45
        for i in retry:
            results[i] = fetch(items[i])

    ok, blocked, dead, moved, tls = [], [], [], [], []
    for r in results:
        iso, where, url, status, redirect, err = r
        wall = redirect and any(w in redirect for w in WALL_HOSTS)
        if status and 200 <= status < 300:
            if wall:
                blocked.append(r)
            elif redirect:
                moved.append(r)
            else:
                ok.append(r)
        elif status in BLOCKED_CODES:
            blocked.append(r)
        elif not status and any(h in err.upper() for h in TLS_HINTS):
            tls.append(r)
        else:
            dead.append(r)

    def show(title, rows, detail):
        if not rows:
            return
        print('%s (%d)' % (title, len(rows)))
        for iso, where, url, status, redirect, err in rows:
            print('  %-22s %-4s %s' % (where, status or '-', url))
            d = detail(redirect, err)
            if d:
                print('  %-22s      → %s' % ('', d))
        print('')

    print('%d ok   %d redirected   %d blocked   %d tls   %d dead\n'
          % (len(ok), len(moved), len(blocked), len(tls), len(dead)))
    show('REDIRECTED — point the data at the destination', moved, lambda rd, er: rd)
    show('BLOCKED — WAF or bot wall, verify by hand, not a failure', blocked,
         lambda rd, er: rd or er)
    show('TLS — handshake refused by urllib, usually fine in a browser, check by hand', tls,
         lambda rd, er: er)
    show('DEAD — fix or remove these', dead, lambda rd, er: er or 'no response')

    if dead:
        print('%d dead link(s). This fails.' % len(dead))
        return 1
    print('no dead links.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
