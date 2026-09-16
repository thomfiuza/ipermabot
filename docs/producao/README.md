# 📚 Documentação de Produção — Ipermabot v1.0.1

[🇧🇷 Português](#-português) · [🇺🇸 English](#-english)

---

## 🇧🇷 Português

Esta pasta contém o **Esquemático de Produção** completo do protótipo R1 do
robô aplicador de impermeabilizante Ipermabot, em **dois idiomas** (PT-BR e EN-US).

### Conteúdo

```
docs/producao/
├── index.html         ← seletor bilíngue (entrada principal)
├── pt/
│   ├── ESQUEMATICO_PRODUCAO.md   ← doc markdown em pt-BR (530 linhas)
│   ├── index.html                ← HTML standalone em pt-BR (com seletor PT/EN)
│   └── assets/                   ← imagens modelo (PCB, 3D, wiring, explodida)
├── en/
│   ├── PRODUCTION_SCHEMATIC.md   ← markdown translation
│   ├── index.html                ← standalone HTML in English (with PT/EN switcher)
│   └── assets/                   ← shared images (reused from pt/)
└── README.md                     ← este arquivo (bilíngue)
```

### Como abrir

```bash
# Forma 1 — abrir diretamente o seletor
python3 -m http.server 8765 --bind 0.0.0.0
# Abrir http://localhost:8765/docs/producao/

# Forma 2 — abrir via Markdown
xdg-open pt/ESQUEMATICO_PRODUCAO.md
# ou
open pt/ESQUEMATICO_PRODUCAO.md
```

### Sincronização PT/EN

Ao **editar qualquer arquivo em uma versão**, você deve replicar a
mudança no outro idioma. As listas de traduções estão documentadas em
`tools/scripts/translate2.py` (caso precise refazer).

**Status de sincronização**: ✅ PT/EN em paridade (v1.0.1).
Cobertura verificada em revisão.

---

## 🇺🇸 English

This folder contains the complete **Production Schematic** for the
Ipermabot R1 prototype, a waterproofing applicator robot, in **two
languages** (PT-BR and EN-US).

### Contents

```
docs/producao/
├── index.html         ← bilingual selector (main entry)
├── pt/
│   ├── ESQUEMATICO_PRODUCAO.md   ← markdown doc in pt-BR (530 lines)
│   ├── index.html                ← standalone HTML in pt-BR (with PT/EN switcher)
│   └── assets/                   ← model images (PCB, 3D, wiring, exploded)
├── en/
│   ├── PRODUCTION_SCHEMATIC.md   ← markdown translation
│   ├── index.html                ← standalone HTML in English (with PT/EN switcher)
│   └── assets/                   ← shared images (reused from pt/)
└── README.md                     ← this file (bilingual)
```

### How to open

```bash
# Method 1 — open the bilingual selector directly
python3 -m http.server 8765 --bind 0.0.0.0
# Browse to http://localhost:8765/docs/producao/

# Method 2 — open via Markdown
xdg-open en/PRODUCTION_SCHEMATIC.md
# or
open en/PRODUCTION_SCHEMATIC.md
```

### PT/EN synchronization

When **editing any file in one version**, you must replicate the change
in the other language. The replacement dictionaries used by our
translator are documented in `tools/scripts/translate2.py`.

**Sync status**: ✅ PT/EN in parity (v1.0.1).
Coverage verified on review.

---

## 📊 Same content in two languages

Both `pt/` and `en/` include:

| Section | Description |
|---|---|
| **1. Visão geral / Overview** | Architecture diagram (SVG, inline) |
| **2. Lista de Materiais / BOM** | 41 items with costs in R$ |
| **3. Vista 3D / 3D View** | Mechanical exploded view + render |
| **4. Esquemático elétrico / Schematic** | All subsystems with pinout |
| **5. PCB custom** | 100×80mm, 2-layer, FR4 |
| **6. Conflitos / Conflicts** | PCN-001..004 (V1.1 roadmap) |
| **7. Critérios de Aceitação** | Electrical, functional, field, env. tests |
| **8. Bancada de Teste** | Bench diagram |
| **9. Custos / Costs** | R$ 3,510 suggested retail price |
| **10. Anexos / Annexes** | References and supplementary docs |

Both versions share the same **4 model images** rendered by
`image_generation` (PCB top-view, 3D robot render, wiring diagram,
exploded chassis view).
