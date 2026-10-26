# Residential IP Checker

Is an IP address residential, mobile, business or datacenter? Paste one, paste a list of up to 50, or open the page to check your own. Every answer comes with the records behind it, and the ones that disagree are marked instead of hidden. Powered by [ipgeolocation.io](https://ipgeolocation.io).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000?logo=nextdotjs)](https://nextjs.org/)
[![Powered by ipgeolocation.io](https://img.shields.io/badge/Powered%20by-ipgeolocation.io-ffd23f)](https://ipgeolocation.io)

<!-- Add a screenshot of the tool running locally at ./public/tool.png and reference it here -->

---

## What It Does

| Input | Example | What you get |
|---|---|---|
| **Nothing** | *leave the box empty* | Your own IP, checked |
| **One address** | `73.162.45.10` | A verdict, the evidence behind it, and what it means for sign-ups, rate limits and blocking |
| **A list** | up to 50, one per line or comma separated | How the list splits up, a table of every address, and a copyable list per kind |

### The kinds of network

| Kind | Meaning |
|---|---|
| **Residential** | A home broadband line: cable, DSL, fibre, fixed wireless or satellite |
| **Mobile** | A cellular carrier, usually shared between many phones |
| **Datacenter** | Hosting or cloud, including CDN edges and anycast services |
| **Business** | Registered to an organisation rather than an ISP, or a business line on an ISP |
| **Education** / **Government** | Campus and agency networks |
| **ISP** | An internet provider whose records don't say which kind of line it is |
| **Unknown** | No network type on record |

---

## Design notes

**Four records, read separately.** The type of the ASN that routes the address, the type of the organisation the address block is assigned to, the connection type, and the reverse DNS name. They come from different places and sometimes disagree: Amazon's own address blocks are typed `BUSINESS` under a `HOSTING` ASN, and 1.1.1.1 is assigned to an `ISP`-typed research block while being announced by Cloudflare as anycast.

**The category comes from fixed rules; agreement is worked out separately.** Hosting and CDN records decide first, then a mobile or home connection type, then the organisation type. Each record is then asked whether it *backs* that answer, merely *fits* it, *disagrees*, or says nothing. That gives four levels: **Clear**, **Probable**, **Mixed** and **Unclear**, and a confident label never hides a disagreement.

**The reverse DNS name is a hint, not a record.** ISPs name their pools after the service (`adsl-…`, `pool-….fios`, `….myvzw.com`), and the matched word is shown. It can support a category but never make one **Clear** on its own. Words that misfire are left out on purpose: Google names crawler infrastructure `rate-limited-proxy-…`, and `tor` is as often Toronto as it is Tor.

**Private and reserved addresses never leave the server.** They belong to no provider, so they are answered locally instead of spending an API call on a guaranteed refusal.

---

## Why ipgeolocation.io

- **[IP Geolocation API](https://ipgeolocation.io/documentation/ip-location-api.html)** with `include=network,hostname` returns everything this tool reads in one call: `asn.type`, `company.type`, `network.connection_type`, `is_anycast`, `is_cdn` and the reverse DNS name. The bulk endpoint checks a list of 50 in one request.
- **Free tier**: all of it works on the free plan, cached for 30 minutes per address.
- **[IP Security API](https://ipgeolocation.io/documentation/ip-security-api.html)** goes further than network type can: it flags VPNs, residential proxies, Tor exits and known attackers.

**[Get your free API key →](https://ipgeolocation.io/signup)**

---

## What this is not

Network type says where traffic comes from, not who sent it. A residential result is not proof of a person: residential proxy services route traffic through ordinary home connections. A datacenter result is not proof of a bot: VPNs, iCloud Private Relay and company proxies all put real people on datacenter addresses.

---

## Features

- **Your own IP by default**, or any address or list you paste
- **Evidence on screen**: each record with whether it backs, fits or disagrees with the verdict
- **Bulk checks** of up to 50 addresses, with a breakdown bar and copyable lists per kind
- **Tor exit and VPN names flagged** from the reverse DNS name
- **Shareable URLs**: every check is a link
- **Works without JavaScript**: everything is server-rendered
- **SEO-ready**: Open Graph tags, meta description, `robots.txt`, `sitemap.xml` and favicon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Language | TypeScript |
| Fonts | Space Grotesk and JetBrains Mono via `next/font` |
| Icons | [lucide-react](https://lucide.dev/) |
| Data | [ipgeolocation.io](https://ipgeolocation.io) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [ipgeolocation.io](https://ipgeolocation.io/signup) API key (the free tier is enough)

### Run It Locally

1. Clone the repo:

```bash
git clone https://github.com/Abdullah-Afzal178/residential-ip-checker.git
cd residential-ip-checker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
IPGEOLOCATION_API_KEY=your_api_key_here
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

> On `localhost` your request has no public IP, so the page asks you to paste one instead.

---

## Tests

The input parser, reverse DNS hints, classifier, record reader, tally and every verdict sentence are pure functions, covered by six test suites:

```bash
npm test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IPGEOLOCATION_API_KEY` | Yes | Your [ipgeolocation.io](https://ipgeolocation.io/signup) API key |
| `NEXT_PUBLIC_SITE_URL` | No | Your production URL if you deploy (used for the sitemap and robots.txt) |

---

## Project Structure

```
residential-ip-checker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Hero, verdict or breakdown, notes
│   ├── opengraph-image.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── check-form.tsx           # GET form, Enter to submit
│   ├── verdict-block.tsx        # The big coloured answer
│   ├── signal-grid.tsx          # Evidence tiles, network facts, guidance
│   ├── bulk-board.tsx           # Breakdown bar, table, copy lists
│   ├── copy-button.tsx
│   └── powered-by-badge.tsx
├── lib/
│   ├── classify.ts              # Category and agreement (pure)
│   ├── hints.ts                 # Reverse DNS name hints (pure)
│   ├── record.ts                # API response reader (pure)
│   ├── input.ts                 # One address or a list (pure)
│   ├── ip.ts                    # IP parsing, canonical form, private ranges (pure)
│   ├── tally.ts                 # Bulk counts (pure)
│   ├── copy.ts                  # Every verdict sentence (pure)
│   ├── lookup.ts                # API calls (server only)
│   └── session-cache.ts
├── .env                         # API key (not committed)
└── README.md
```

---

## Want to Deploy It?

Works out of the box on any platform that supports Next.js:

- **Vercel**: import the repo, add `IPGEOLOCATION_API_KEY`, deploy.
- **Netlify**, **Cloudflare Pages**, **Railway**: a similar process.
- **Self-hosted**: `npm run build && npm start`.

Behind a proxy or CDN, make sure it forwards the visitor's address (`X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`), or every visitor will be checked as the proxy.

---

## License

MIT. See [LICENSE](LICENSE) for details.
