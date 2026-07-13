# Carino Hardware

A client-side hardware reference → **[hardware.carino.systems](https://hardware.carino.systems)**

One page for three everyday hardware questions: *what is this MAC address?*, *where do
I get support/warranty for this brand?*, and *what specs should this machine actually
have?* Everything runs in the browser — nothing is uploaded.

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

Feature-first recommendations for eight profiles — *Budget, Business/Office, Gaming,
Content Creation, Enthusiast, Home Lab/Server, Local AI/LLM* — organised around the
**features that matter** (cores vs clock, VRAM, ECC, NVMe generation, PSU headroom)
rather than brands. Example models are optional pointers, and the **key spec** for each
use case is highlighted (e.g. VRAM for AI, ECC for servers). A glossary explains each
term and when it's worth paying for more.

## Design

Single self-contained `index.html` (inline CSS/JS), no build step, no runtime
dependencies (Google Fonts are progressive-enhancement only). Shares the Carino navbar
(`carino-navbar.js` + `carino-clock.js`) and branding with the rest of carino.systems.

## Notes

- Educational / reference tool, not a diagnostic or inventory system.
- Warranty status must be confirmed on the manufacturer's official site; deep-links may
  change over time.
- Build prices are rough new-build ballparks and move constantly.
