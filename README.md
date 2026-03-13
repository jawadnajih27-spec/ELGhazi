# ELGhazi_Blog

> *A quiet space for reflections on humanity, faith, and dignity.*

A minimal, elegant digital blog platform focused on humanitarian stories, ethical reflections, and spiritual meditations. Visually inspired by Jerusalem stone, olive groves, and the warm light of ancient sacred places.

---

## Project Structure

```
ELGhazi_Blog/
├── index.html    ← Main blog interface (homepage + article reader)
├── admin.html    ← Admin control panel (add / edit / delete posts)
├── data.json     ← Blog posts database (plain JSON)
└── README.md     ← This file
```

**Four files. No frameworks. No build tools. Pure HTML + CSS + JavaScript.**

---

## Features

### Blog (`index.html`)
- Full-screen hero with animated entrance
- Article cards dynamically loaded from `data.json`
- Category filter bar (auto-generated from post categories)
- In-page article reader with drop-cap typography
- Fully responsive (mobile, tablet, desktop)
- Lightweight grain texture and dome silhouette visual atmosphere
- Keyboard accessible (ESC to close article)

### Admin Panel (`admin.html`)
- Sidebar listing all articles
- Rich text form to create, edit, and delete articles
- Export updated `data.json` with one click
- Toast notifications for all actions
- Delete confirmation modal

---

## Getting Started

### Option 1 — Open Locally
Simply open `index.html` in any modern browser.

> ⚠️ Note: Loading `data.json` requires a local server if you experience CORS issues in Chrome. Use Option 2 below.

### Option 2 — Local Server (Recommended)

**Python:**
```bash
python3 -m http.server 8080
# Then open http://localhost:8080
```

**Node.js (npx):**
```bash
npx serve .
```

**VS Code:**
Install the *Live Server* extension and click "Go Live".

---

## Managing Posts

### Via Admin Panel
1. Open `admin.html` in your browser
2. Create, edit, or delete articles using the form
3. Click **⬇ Export JSON** to download the updated `data.json`
4. Replace the existing `data.json` in your project folder

### Manually Editing `data.json`
Each post follows this structure:

```json
{
  "id": 6,
  "title": "Your Title Here",
  "author": "ELGhazi",
  "date": "2026-03-15",
  "category": "Humanity",
  "image": "",
  "excerpt": "A short, evocative line shown on the card.",
  "content": "Full article text here.\n\nUse double newlines to separate paragraphs."
}
```

**Available categories:** `Humanity` · `Reflection` · `Spirituality` · `Ethics` · `Nature & Spirit` · `Stories` · `Faith`

---

## Design Philosophy

| Element | Choice |
|---------|--------|
| Typography | Cinzel (display) + Cormorant Garamond + EB Garamond |
| Colors | Stone beige · Olive green · Soft gold · Deep charcoal |
| Atmosphere | Jerusalem stone textures · Dome silhouette · Grain overlay |
| Tone | Calm · Reflective · Dignified · Non-political |
| Framework | None — pure HTML/CSS/JS |

---

## Deployment

This blog works on **any static hosting platform**:

- **GitHub Pages** — push to a repo, enable Pages in Settings
- **Netlify** — drag-and-drop the folder
- **Vercel** — `vercel deploy`
- **Cloudflare Pages** — connect your repository

No server required. No database. No dependencies.

---

## Adding Images

Set the `"image"` field in a post to any URL or local path:

```json
"image": "https://your-domain.com/olive-grove.jpg"
```

Or place images alongside the HTML files and reference them:
```json
"image": "images/olive_tree.jpg"
```

If left empty (`""`), a beautiful ambient gradient placeholder is shown automatically.

---

## License

This project is personal and non-commercial. Share with kindness.

---

*"In the quiet between hardship and hope, faith reveals itself — not as escape, but as foundation."*

