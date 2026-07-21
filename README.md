# Carino Hardware

A client-side hardware reference → **[hardware.carino.systems](https://hardware.carino.systems)**

One page for a few everyday hardware questions: *what is this MAC address?*, *whose
serial / service tag is this?*, *where do I get support/warranty for this brand?*, and
*what specs should this machine actually have?* Everything runs in the browser — nothing
is uploaded.

The single search bar auto-detects what you paste — a **MAC**, a **serial / service
tag**, or free text — and routes it accordingly.

The layout is a **single-screen tabbed app**: the page itself never scrolls. The four
section tabs (*Decode · Support · Builds · Glossary*) live in the **shared Carino navbar**
— `carino-navbar.js` relocates the `[data-carino-actions]` tab strip into its right-hand
cluster, so the top bar is the whole chrome. Below it sit a **section description** and
the search bar, then one content panel that fills the viewport; only a genuinely long list
(the brand grid) scrolls *inside* its own panel. The description above the search updates
per section. Typing a MAC or serial jumps to **Decode**; searching a brand or spec name
jumps to whichever directory matches.

## What a MAC address tells you (and what it doesn't)

A MAC address (EUI-48) is 6 bytes. The tool decodes any format you paste
(`AA:BB:CC:DD:EE:FF`, `AA-BB-…`, Cisco `aabb.ccdd.eeff`, or bare hex) and shows:

- **Vendor / OUI** — the first 3 bytes are the *Organizationally Unique Identifier*,
  registered to a manufacturer. This identifies the maker of the **network interface**
  (which may differ from the device's brand — e.g. an Intel Wi-Fi card in another
  brand's laptop).
- **I/G bit** — unicast vs multicast; detects the **broadcast** address and IPv4/IPv6
  multicast mappings.
- **U/L bit** — globally-unique (burned-in) vs **locally administered**. A locally
  administered address is almost always a **randomized MAC** (modern phones/laptops
  rotate these per Wi-Fi network for privacy) or a software address (VM, container,
  bonded interface) — so its "vendor" is meaningless.
- **Virtual-machine ranges** — VMware, VirtualBox, Hyper-V, Xen, Parallels, QEMU/KVM
  and Docker are flagged.
- **Derived forms** — every notation plus the **EUI-64** and **IPv6 link-local**
  (`fe80::…`) address (with the U/L bit correctly flipped).

You **cannot** get the owner, serial, location, or IP from a MAC — it's a link-layer
identifier that never leaves the local segment. The page says so plainly.

When an OUI **isn't** in the built-in subset, the result is explicit that this means
"not in our ~570-prefix table", *not* "unassigned" — and offers one-click **deep links
to look that exact OUI up** in a full external registry (plus a *Copy OUI* button), so an
unknown prefix is a starting point rather than a dead end.

When the OUI resolves to a brand we list, that brand's **support card** (warranty +
drivers + support) appears right under the decode — e.g. an Apple MAC surfaces Apple's
coverage links.

## Serial / service-tag recognition

Paste a serial or service tag and the tool makes a **best-effort** identification:

- **Dell** — the only real *identification*. A 7-character Service Tag is a Base-36
  number; its decimal value is the Express Service Code. The tool converts **either
  direction**, labels the result **Identified**, and deep-links Dell's warranty page for
  that exact tag.
- **Everything else is framed as "pick your brand", not identification.** Length/shape
  patterns (10/12-char → Apple/HP, 8-char → Lenovo/ASUS) are shown only as *"length alone
  can't identify a vendor — if your device is one of these, check its lookup"*, and the
  result is tagged **Not identified**. It's a shortlist of official lookups to try, never
  a claim about which brand made the device.

The page is explicit that serial formats aren't standardised across vendors, so only the
Dell conversion is authoritative — everything else is a shortlist, not an answer.

> The OUI lookup uses a **curated built-in subset** (~570 common prefixes) so it works
> fully offline and never transmits your MAC. The full registry (~35,000 prefixes) is
> the [IEEE Registration Authority](https://standards-oui.ieee.org/) — an unknown
> prefix here doesn't mean it's unassigned.

## Manufacturer support directory

A filterable grid of major hardware brands (Apple, Dell, HP/HPE, Lenovo, ASUS, Acer,
MSI, Gigabyte, Microsoft, Framework, Samsung, LG, Razer, Sony, Intel, AMD, NVIDIA,
Toshiba/Dynabook, Huawei, Raspberry Pi, System76, Valve, Ubiquiti). Each card deep-links
to that brand's **warranty check**, **drivers/BIOS downloads**, and **support portal**.
Type a brand or product line in the search bar to filter.

## Build specs by what you do

Feature-first recommendations for seven profiles — *Budget, Business/Office, Gaming,
Content Creation, Enthusiast, Home Lab/Server, Local AI/LLM* — organised around the
**features that matter** (cores vs clock, VRAM, ECC, NVMe generation, PSU headroom)
rather than brands. Example models are optional pointers, and the **key spec** for each
use case is highlighted (e.g. VRAM for AI, ECC for servers). A glossary explains each
term and when it's worth paying for more.

The layout is **master/detail** — the tier list sits on the left and the selected build
loads on the right — so it stops wasting horizontal space. All profiles live in
[`builds.json`](builds.json); edit that file to change specs, add a tier, or attach a
`link` to a specific model (model chips with a link become clickable). The search bar
also filters the tier list live.

Because example parts and prices age fast, `builds.json` carries an `updated` field
(`YYYY-MM`) that the page renders as a visible **"Example parts reviewed \<date\> —
models & prices date fast"** stamp. Bump it whenever you refresh the examples; the
feature-first targets and glossary are meant to stay evergreen, the specific model chips
are not.

## Design

`index.html` holds all CSS/JS inline; build profiles are fetched from `builds.json` at
runtime (so serve it over http — `python3 -m http.server` locally, or GitHub Pages — not
`file://`). No build step, no runtime dependencies (Google Fonts are progressive
enhancement only). Shares the Carino navbar (`carino-navbar.js` + `carino-clock.js`) and
branding with the rest of carino.systems.

## Notes

- Educational / reference tool, not a diagnostic or inventory system.
- Warranty status must be confirmed on the manufacturer's official site; deep-links may
  change over time.
- Build prices are rough new-build ballparks and move constantly.

## License

Licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later) — see [LICENSE](LICENSE). Copyright © 2026 Miguel Carino.
