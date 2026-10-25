#!/usr/bin/env python3
"""Schema + vocabulary check over data/brands/*.json and builds.json.

Modelled on Law/tools/validate.py. The page renders these files straight into
the DOM, so a missing key is a blank card, a stray "kinds" value is a chip
that filters to nothing, and a brand without a url or an updated month is an
entry without its source — which a Reference page never shows.

    python3 tools/validate.py            # every brand in data/index.json + builds.json
    python3 tools/validate.py dell hp    # two brands

Exit 0 clean, 1 if anything failed. Warnings do not fail the run.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

BRAND_KEYS = ['id', 'name', 'cat', 'kinds', 'color', 'keywords', 'url', 'links', 'updated']
# index.html maps these to chip labels; anything else would be an unlabelled chip.
KINDS = {'laptop', 'desktop', 'server', 'network', 'phone', 'printer', 'components',
         'peripheral', 'console', 'sbc'}
MONTH = re.compile(r'^20\d\d-(0[1-9]|1[0-2])$')
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')


def check_brand(bid, errs, warns):
    path = os.path.join(DATA, 'brands', bid + '.json')
    if not os.path.exists(path):
        errs.append('%s: data/brands/%s.json is listed in index.json but missing' % (bid, bid))
        return
    try:
        with open(path, encoding='utf-8') as fh:
            b = json.load(fh)
    except ValueError as e:
        errs.append('%s: not valid JSON (%s)' % (bid, e))
        return
    for k in BRAND_KEYS:
        if k not in b:
            errs.append('%s missing key "%s"' % (bid, k))
    for k in b:
        if k not in BRAND_KEYS:
            warns.append('%s has extra key "%s"' % (bid, k))
    if b.get('id') != bid:
        errs.append('%s: id %r does not match the file name' % (bid, b.get('id')))
    if not str(b.get('url') or '').startswith('https://'):
        errs.append('%s: url is not an https URL: %r' % (bid, b.get('url')))
    if not MONTH.match(str(b.get('updated') or '')):
        errs.append('%s: updated must be YYYY-MM, got %r' % (bid, b.get('updated')))
    if not HEX.match(str(b.get('color') or '')):
        errs.append('%s: color must be #rrggbb, got %r' % (bid, b.get('color')))
    kinds = b.get('kinds') or []
    if not kinds:
        errs.append('%s: kinds is empty, so no chip would ever show it' % bid)
    for k in kinds:
        if k not in KINDS:
            errs.append('%s: kind %r not in the vocabulary' % (bid, k))
    if not b.get('keywords'):
        warns.append('%s: no keywords, so the decoder cannot match it from a vendor name' % bid)
    links = b.get('links') or []
    if not links:
        errs.append('%s: no links' % bid)
    for i, link in enumerate(links):
        if not link.get('label'):
            errs.append('%s.links[%d] has no label' % (bid, i))
        if not str(link.get('url') or '').startswith('https://'):
            errs.append('%s.links[%d] url is not https: %r' % (bid, i, link.get('url')))
        for k in link:
            if k not in ('label', 'url', 'warranty'):
                warns.append('%s.links[%d] has extra key "%s"' % (bid, i, k))


def check_builds(errs, warns):
    path = os.path.join(ROOT, 'builds.json')
    try:
        with open(path, encoding='utf-8') as fh:
            d = json.load(fh)
    except (OSError, ValueError) as e:
        errs.append('builds.json: %s' % e)
        return 0
    if not MONTH.match(str(d.get('updated') or '')):
        errs.append('builds.json: updated must be YYYY-MM')
    seen = set()
    for p in d.get('profiles') or []:
        pid = p.get('id')
        where = 'builds.json/%s' % pid
        if not pid or pid in seen:
            errs.append('%s: missing or duplicate id' % where)
        seen.add(pid)
        for k in ('icon', 'name', 'price', 'tagline', 'specs'):
            if not p.get(k):
                errs.append('%s missing "%s"' % (where, k))
        for s in p.get('specs') or []:
            if not s.get('k') or not s.get('v'):
                errs.append('%s: a spec without k/v' % where)
            for e in s.get('eg') or []:
                if isinstance(e, dict):
                    if not e.get('t'):
                        errs.append('%s: an example without t' % where)
                    if e.get('link') and not str(e['link']).startswith('https://'):
                        errs.append('%s: example link is not https: %r' % (where, e['link']))
        see = p.get('see')
        if see and not str(see.get('url') or '').startswith('http'):
            errs.append('%s: see.url is not a URL' % where)
    for g in d.get('glossary') or []:
        if not (isinstance(g, list) and len(g) == 2 and g[0] and g[1]):
            errs.append('builds.json glossary entry is not [term, text]: %r' % (g,))
    return len(d.get('profiles') or [])


def main():
    errs, warns = [], []
    with open(os.path.join(DATA, 'index.json'), encoding='utf-8') as fh:
        idx = json.load(fh)
    if not MONTH.match(str(idx.get('updated') or '')):
        errs.append('index.json: updated must be YYYY-MM')
    ids = idx.get('brands') or []
    if len(set(ids)) != len(ids):
        errs.append('index.json lists a brand twice')
    on_disk = {f[:-5] for f in os.listdir(os.path.join(DATA, 'brands')) if f.endswith('.json')}
    for orphan in sorted(on_disk - set(ids)):
        warns.append('data/brands/%s.json is not listed in index.json, so the page never shows it' % orphan)
    only = sys.argv[1:]
    for bid in (only or ids):
        check_brand(bid, errs, warns)
    n_builds = 0 if only else check_builds(errs, warns)

    for w in warns:
        print('warn  ' + w)
    for e in errs:
        print('FAIL  ' + e)
    print('%d brands, %d build profiles\n' % (len(only or ids), n_builds))
    if errs:
        print('%d error(s).' % len(errs))
        return 1
    print('schema OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
