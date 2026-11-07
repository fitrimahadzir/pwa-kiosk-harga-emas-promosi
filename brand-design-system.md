# Gold Reserve — Brand Color & Font Reference

Design tokens untuk syarikat Gold Reserve. Guna panduan ini bila bina sistem baru supaya visual kekal konsisten dengan Daily Task GR.

---

## Warna Utama (Core Palette)

| Token | Hex | Guna untuk |
|---|---|---|
| `maroon-deep` | `#3b0707` | Background paling gelap, teks atas permukaan cerah |
| `maroon` | `#5d0d0d` | Background utama brand |
| `maroon-soft` | `#6a1a17` | Card / layer sedikit lebih cerah dari maroon |
| `gold` | `#d4a13a` | Aksen utama, butang CTA |
| `gold-soft` | `#d8be8a` | Teks emas yang lebih lembut, badge |
| `gold-deep` | `#8a5f14` | Emas gelap — untuk permukaan cerah (light bg) |
| `cream` | `#ece2d0` | Teks utama atas background gelap |
| `cream-light` | `#f5f0e8` | Heading / highlight atas background gelap |
| `cream-page` | `#f4efe9` | Background halaman admin (light surface) |
| `line` | `#7a2a18` | Border dan divider |
| `success` | `#7fc39a` | Status siap / berjaya |
| `warm` | `#e0a96d` | Prioriti tinggi / amaran |

---

## Warna Tambahan (Off-Palette)

Nilai ini digunakan dalam komponen sedia ada — wajar ditambah sebagai token jika sistem baru perlukan.

| Hex | Guna untuk |
|---|---|
| `#fbf6ef` | Background kad cerah (light card) |
| `#fffdf9` | Near-white — permukaan paling cerah |
| `#170303` | Overlay dialog (gelap sekali) |
| `#481010` | Gradient stop — panel struktur |
| `#7c2727` | Butang destructive (padam) |
| `#8f2e2e` | Hover butang destructive |
| `#9a3b2a` | Border / bg ralat (error) |
| `#6d2417` | Background ralat gelap |
| `#a34a26` | Teks padam / danger (light surface) |
| `#b78429` | Status "sedang buat" — atas background cerah |
| `#9c6d1f` | Teks status "sedang buat" — atas background cerah |
| `#4f9d6e` | Status selesai — atas background cerah |
| `#3f835b` | Teks status selesai — atas background cerah |
| `#b4552e` | Prioriti tinggi — atas background cerah |

---

## Gredien Background Utama

Background `body` menggunakan gabungan tiga lapisan:

```css
background-color: #5d0d0d;
background-image:
  radial-gradient(1100px 520px at 88% -8%, rgba(212, 161, 58, 0.1), transparent 65%),
  radial-gradient(900px 600px at -5% 105%, rgba(59, 7, 7, 0.92), transparent 60%),
  linear-gradient(160deg, #5d0d0d 0%, #4b0b0b 55%, #3b0707 100%);
background-attachment: fixed;
```

> Gredien ini adalah identiti visual utama Gold Reserve — gelap maroon dengan renjisan emas halus.

---

## Warna PWA / Browser Chrome

| Guna untuk | Nilai |
|---|---|
| `meta theme-color` | `#5d0d0d` |
| Toast background | `#3b0707` |
| Toast border | `rgba(122, 42, 24, 0.75)` |
| Toast teks | `#ece2d0` |

---

## Font

### 1. The Seasons — Font Display / Heading

Font eksklusif brand. Self-hosted, perlu sertakan fail `.ttf`.

| Weight | Style | Fail |
|---|---|---|
| 300 | Normal | `The Seasons Light.ttf` |
| 300 | Italic | `The Seasons Light Italic.ttf` |
| 400 | Normal | `The Seasons Regular.ttf` |
| 400 | Italic | `The Seasons Italic.ttf` |
| 700 | Normal | `The Seasons Bold.ttf` |
| 700 | Italic | `The Seasons Bold Italic.ttf` |

**Font stack:** `'The Seasons', 'Times New Roman', Georgia, serif`

**Guna untuk:** Tajuk utama, nama syarikat, elemen branding, display text yang perlu rasa premium / klasik.

```css
@font-face {
  font-family: 'The Seasons';
  src: url('/font/The Seasons/The Seasons Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* Ulangi untuk semua weight dan style */
```

---

### 2. Poppins — Font UI / Body

Dimuatkan dari Google Fonts.

**Weights:** 400 · 500 · 600 · 700

**Font stack:** `'Poppins', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`

**Guna untuk:** Semua teks antara muka — label, butang, input, teks badan, navigasi.

```html
<!-- Dalam <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

## Peraturan Guna Font

| Situasi | Font | Weight |
|---|---|---|
| Nama syarikat / logo | The Seasons | 400 atau 700 |
| Tajuk halaman utama | The Seasons | 400 |
| Sub-tajuk / heading seksyen | Poppins | 600–700 |
| Label navigasi | Poppins | 500 |
| Teks badan / deskripsi | Poppins | 400 |
| Butang | Poppins | 500–600 |
| Badge / kicker label | Poppins | 600 (huruf besar, tracking lebar) |

---

## CSS Variables (Tailwind v4 / Custom Properties)

Kalau projek guna Tailwind v4, letak dalam `@theme`:

```css
@theme {
  --font-sans: 'Poppins', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-heading: 'The Seasons', 'Times New Roman', Georgia, serif;

  --color-maroon-deep:  #3b0707;
  --color-maroon:       #5d0d0d;
  --color-maroon-soft:  #6a1a17;
  --color-gold:         #d4a13a;
  --color-gold-soft:    #d8be8a;
  --color-gold-deep:    #8a5f14;
  --color-cream:        #ece2d0;
  --color-cream-light:  #f5f0e8;
  --color-cream-page:   #f4efe9;
  --color-line:         #7a2a18;
  --color-success:      #7fc39a;
  --color-warm:         #e0a96d;
}
```

Kalau projek lain (plain CSS, SCSS, Flutter, dll.), guna nilai hex terus dari jadual atas.

---

*Dokumen ini dijana dari kod sumber Daily Task GR — v1.0.0*
