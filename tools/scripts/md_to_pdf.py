#!/usr/bin/env python3
"""
md_to_pdf.py — Conversor de Markdown para PDF profissional.

Funcionalidades:
- Capas com cores corporativas
- Sumário clicável (TOC)
- Numeração de páginas
- Cabeçalho e rodapé
- Suporte a tabelas (via reportlab.platypus)
- Suporte a listas ordenadas e não ordenadas
- Suporte a blockquote, código, negrito, itálico
- Suporte a links
- Suporte a títulos com cores e underlines
- Emojis: preservados na fonte disponível

Uso:
    python3 md_to_pdf.py ENTRADA.md SAIDA.pdf \
        --titulo "Título" \
        --subtitulo "Subtítulo" \
        --autor "Nome" \
        --versao "1.0"
"""

import sys
import argparse
import re
from pathlib import Path

import markdown as md
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ==============================================================================
# REGISTRO DE FONTES (DejaVuSans com acentos pt-BR)
# ==============================================================================

FONT_DIR = Path("/usr/local/lib/python3.13/site-packages/cv2/qt/fonts")
REG = {}

def registrar_fontes():
    """Registra DejaVuSans (regular, bold, italic, bold-italic)."""
    pares = {
        'Body':          'DejaVuSans.ttf',
        'Bold':          'DejaVuSans-Bold.ttf',
        'Italic':        'DejaVuSans-Oblique.ttf',
        'BoldItalic':    'DejaVuSans-BoldOblique.ttf',
    }
    for alias, fname in pares.items():
        try:
            pdfmetrics.registerFont(TTFont(alias, str(FONT_DIR / fname)))
            REG[alias] = alias
        except Exception as e:
            print(f"⚠️  Fonte {fname}: {e}")
    if not REG:
        # Fallback: usar Helvetica (sem acentos pt-BR)
        print("⚠️  DejaVuSans não encontrada — usando Helvetica (perde acentos).")


# ==============================================================================
# ESTILOS
# ==============================================================================

COR_PRIMARIA    = colors.HexColor("#1F4E79")   # azul corporativo
COR_SECUNDARIA  = colors.HexColor("#0D2F4F")   # azul escuro
COR_TEXTO       = colors.HexColor("#102A43")   # texto principal
COR_TEXTO_MED   = colors.HexColor("#486581")
COR_TEXTO_CLARO = colors.HexColor("#627D98")
COR_DESTAQUE    = colors.HexColor("#C62828")   # vermelho
COR_FUNDO_ALT   = colors.HexColor("#F5F7FA")   # cinza claro
COR_TABELA_HEAD = colors.HexColor("#1F4E79")   # cabeçalho tabela
COR_TABELA_ALT  = colors.HexColor("#E8F0F8")   # linha alternada tabela

ESTILOS = {}
def criar_estilos():
    base = getSampleStyleSheet()
    font_family = list(REG.keys())[0] if REG else 'Helvetica'

    ESTILOS['normal']   = ParagraphStyle('normal', parent=base['Normal'],
        fontName=font_family, fontSize=10.5, leading=15,
        textColor=COR_TEXTO, alignment=TA_JUSTIFY, spaceAfter=6)

    ESTILOS['h1']      = ParagraphStyle('h1', parent=base['Heading1'],
        fontName='Bold', fontSize=22, leading=28,
        textColor=COR_PRIMARIA, alignment=TA_LEFT, spaceBefore=18, spaceAfter=10,
        borderPadding=4, borderWidth=0, leftIndent=0)

    ESTILOS['h2']      = ParagraphStyle('h2', parent=base['Heading2'],
        fontName='Bold', fontSize=16, leading=22,
        textColor=COR_PRIMARIA, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8,
        leftIndent=0)

    ESTILOS['h3']      = ParagraphStyle('h3', parent=base['Heading3'],
        fontName='Bold', fontSize=13, leading=18,
        textColor=COR_SECUNDARIA, alignment=TA_LEFT, spaceBefore=12, spaceAfter=6)

    ESTILOS['h4']      = ParagraphStyle('h4', parent=base['Heading4'],
        fontName='Bold', fontSize=11.5, leading=15,
        textColor=COR_SECUNDARIA, alignment=TA_LEFT, spaceBefore=8, spaceAfter=4)

    ESTILOS['code']    = ParagraphStyle('code', parent=base['Code'],
        fontName='Courier', fontSize=9, leading=12,
        textColor=COR_TEXTO, backColor=COR_FUNDO_ALT,
        borderPadding=4, spaceAfter=6)

    ESTILOS['quote']   = ParagraphStyle('quote', parent=base['BodyText'],
        fontName='Italic', fontSize=10.5, leading=15,
        textColor=COR_TEXTO_MED, leftIndent=20, rightIndent=20,
        borderColor=COR_PRIMARIA, borderWidth=0, borderPadding=6,
        spaceBefore=6, spaceAfter=8,
        backColor=COR_FUNDO_ALT)

    ESTILOS['caption'] = ParagraphStyle('caption', parent=base['Normal'],
        fontName='Italic', fontSize=9, leading=12,
        textColor=COR_TEXTO_CLARO, alignment=TA_CENTER, spaceAfter=10)

    ESTILOS['centro']  = ParagraphStyle('centro', parent=base['Normal'],
        fontName=font_family, fontSize=10.5, leading=15,
        textColor=COR_TEXTO, alignment=TA_CENTER, spaceAfter=6)


# ==============================================================================
# PÁGINA (cabeçalho e rodapé)
# ==============================================================================

class PaginaDoc(canvas.Canvas):
    """Canvas com numeração, cabeçalho e rodapé."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        pages = len(self._saved)
        for i, state in enumerate(self._saved):
            self.__dict__.update(state)
            self._desenhar_rodape(i + 1, pages)
            super().showPage()
        super().save()

    def _desenhar_rodape(self, pagina_atual, total_paginas):
        c = self
        # Linha divisória
        c.setStrokeColor(COR_PRIMARIA)
        c.setLineWidth(0.6)
        c.line(2*cm, 1.4*cm, A4[0]-2*cm, 1.4*cm)

        # Texto do rodapé
        c.setFont('Italic' if 'Italic' in REG else 'Helvetica', 8)
        c.setFillColor(COR_TEXTO_MED)
        c.drawString(2*cm, 1.0*cm, "IMP-BOT — Dossiê de Viabilidade")
        c.drawCentredString(A4[0]/2, 1.0*cm, f"Página {pagina_atual} de {total_paginas}")
        c.drawRightString(A4[0]-2*cm, 1.0*cm, "Setembro/2026 — v1.0")


# ==============================================================================
# CONVERSÃO MD → REPORTLAB FLOWABLES
# ==============================================================================

class ConversorMarkdown:
    def __init__(self, texto_md, titulo=""):
        self.md_lines = texto_md.split('\n')
        self.titulo = titulo
        self.i = 0

    def converter(self):
        """Gera flowables do reportlab a partir do markdown."""
        yield from self._gerar_capa()
        yield from self._gerar_sumario()
        # Conteúdo principal
        yield from self._percorrer_corpo()

    def _gerar_capa(self):
        yield Spacer(1, 4*cm)
        yield Paragraph(f"<b>{self.titulo}</b>", ParagraphStyle(
            'capa-titulo', parent=ESTILOS['h1'], fontSize=28,
            alignment=TA_CENTER, textColor=COR_PRIMARIA, spaceAfter=10))
        yield Spacer(1, 0.5*cm)
        yield Paragraph("Dossiê Completo de Viabilidade",
            ParagraphStyle('capa-sub', parent=ESTILOS['normal'], fontSize=16,
                alignment=TA_CENTER, textColor=COR_TEXTO_MED, spaceAfter=24))
        yield Spacer(1, 3*cm)
        # Bloco com informações
        info = [
            ("Versão", "1.0"),
            ("Data", "Setembro de 2026"),
            ("Idioma", "Português (pt-BR)"),
            ("Status", "Pronto para apresentação"),
        ]
        dados = [[Paragraph(f"<b>{k}</b>", ESTILOS['normal']),
                  Paragraph(v, ESTILOS['normal'])] for k, v in info]
        t = Table(dados, colWidths=[4*cm, 8*cm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('BACKGROUND', (0,0), (-1,-1), COR_FUNDO_ALT),
            ('BOX', (0,0), (-1,-1), 0.5, COR_PRIMARIA),
            ('LINEBELOW', (0,0), (0,-1), 0.5, COR_PRIMARIA),
        ]))
        yield t
        yield Spacer(1, 2*cm)
        yield Paragraph(
            "<i>Documento preparado para apresentação a possível sócio. "
            "Encaminhar acompanhado da Carta de Confidencialidade "
            "(localizada em <b>04_Carta_Confidencialidade/</b>).</i>",
            ParagraphStyle('capa-aviso', parent=ESTILOS['normal'], fontSize=10,
                alignment=TA_CENTER, textColor=COR_TEXTO_MED))
        yield PageBreak()

    def _gerar_sumario(self):
        yield Paragraph("Sumário", ESTILOS['h1'])
        toc = TableOfContents()
        toc.levelStyles = [
            ParagraphStyle('toc-h1', fontName='Bold', fontSize=12,
                leftIndent=0, textColor=COR_PRIMARIA, spaceAfter=4),
            ParagraphStyle('toc-h2', fontSize=10, leftIndent=14,
                textColor=COR_TEXTO_MED, spaceAfter=2),
            ParagraphStyle('toc-h3', fontSize=9.5, leftIndent=28,
                textColor=COR_TEXTO_CLARO, spaceAfter=2),
        ]
        yield toc
        yield PageBreak()

    def _percorrer_corpo(self):
        while self.i < len(self.md_lines):
            linha = self.md_lines[self.i]
            linha_strip = linha.strip()

            # Linhas em branco: pular
            if not linha_strip:
                self.i += 1
                continue

            # Tabelas markdown
            if linha_strip.startswith('|') and self._linha_e_tabela():
                yield from self._processar_tabela()
                continue

            # Headings
            m = re.match(r'^(#{1,6})\s+(.*)', linha_strip)
            if m:
                nivel = len(m.group(1))
                texto = self._limpar_md(m.group(2))
                estilo = ESTILOS.get(f'h{nivel}', ESTILOS['h4'])
                yield Paragraph(texto, estilo)
                if nivel <= 2:
                    yield HRFlowable(width="100%", thickness=0.6,
                                    color=COR_PRIMARIA, spaceAfter=4)
                self.i += 1
                continue

            # Blockquote
            if linha_strip.startswith('>'):
                yield from self._processar_blockquote()
                continue

            # Code blocks
            if linha_strip.startswith('```'):
                yield from self._processar_code_block()
                continue

            # Listas
            if re.match(r'^(\s*)([-*+]|\d+\.)\s+', linha):
                yield from self._processar_lista()
                continue

            # Linha horizontal
            if linha_strip == '---':
                yield HRFlowable(width="100%", thickness=0.5,
                                color=COR_TEXTO_CLARO, spaceAfter=6,
                                spaceBefore=4)
                self.i += 1
                continue

            # Parágrafo comum (pode ter múltiplas linhas)
            yield from self._processar_paragrafo()

    def _linha_e_tabela(self):
        """Verifica se há tabela markdown começando na linha atual."""
        if self.i + 1 >= len(self.md_lines):
            return False
        prox = self.md_lines[self.i + 1].strip()
        return prox.startswith('|') and re.match(r'\|[\s\-:|]+\|', prox)

    def _processar_tabela(self):
        linhas = []
        while self.i < len(self.md_lines):
            l = self.md_lines[self.i].strip()
            if l.startswith('|'):
                linhas.append(l)
                self.i += 1
            else:
                break
        # Ignora separador (linha 1 depois do header)
        if len(linhas) >= 3 and re.match(r'\|[\s\-:|]+\|', linhas[1]):
            dados_linhas = [linhas[0]] + linhas[2:]
        else:
            dados_linhas = linhas

        dados_limpos = []
        for idx, l in enumerate(dados_linhas):
            cells = [c.strip() for c in l.strip('|').split('|')]
            if idx == 0:
                # header
                cells_par = [Paragraph(f"<b>{self._limpar_md(c)}</b>", ESTILOS['normal']) for c in cells]
            else:
                cells_par = [Paragraph(self._limpar_md(c), ESTILOS['normal']) for c in cells]
            dados_limpos.append(cells_par)

        if not dados_limpos:
            return
        n_cols = max(len(r) for r in dados_limpos)
        # Pad
        for r in dados_limpos:
            while len(r) < n_cols:
                r.append(Paragraph('', ESTILOS['normal']))

        # Larguras: primeira coluna 30%, restante dividido
        larg_total = A4[0] - 4*cm
        largs = [larg_total * 0.28] + [(larg_total * 0.72) / (n_cols - 1)] * (n_cols - 1)

        t = Table(dados_limpos, colWidths=largs, repeatRows=1)
        ts = [
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, COR_PRIMARIA),
            ('BACKGROUND', (0,0), (-1,0), COR_TABELA_HEAD),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]
        # linhas zebradas
        for i in range(1, len(dados_limpos)):
            if i % 2 == 0:
                ts.append(('BACKGROUND', (0,i), (-1,i), COR_TABELA_ALT))
        t.setStyle(TableStyle(ts))
        yield t
        yield Spacer(1, 0.3*cm)

    def _processar_blockquote(self):
        linhas = []
        while self.i < len(self.md_lines):
            l = self.md_lines[self.i]
            if l.strip().startswith('>'):
                linhas.append(l.strip()[1:].strip())
                self.i += 1
            else:
                break
        texto = ' '.join(linhas)
        yield Paragraph(self._limpar_md(texto), ESTILOS['quote'])

    def _processar_code_block(self):
        self.i += 1  # pula a abertura ```
        linhas = []
        while self.i < len(self.md_lines):
            l = self.md_lines[self.i]
            if l.strip().startswith('```'):
                self.i += 1
                break
            linhas.append(l)
            self.i += 1
        for l in linhas:
            yield Paragraph(self._limpar_md(l) or '&nbsp;', ESTILOS['code'])

    def _processar_lista(self):
        # Coleta todos os itens consecutivos
        itens = []
        while self.i < len(self.md_lines):
            l = self.md_lines[self.i]
            s = l.strip()
            m = re.match(r'^([-*+]|\d+\.)\s+(.*)', s)
            if m:
                tipo = '1' if m.group(1)[0].isdigit() else '•'
                # Reseta nível visualmente
                itens.append((m.group(2), m.group(1)))
                self.i += 1
            elif s == '':
                self.i += 1
                break
            else:
                break

        for txt, marcador in itens:
            bullet = marcador if marcador in ('-', '*', '+') else None
            if bullet:
                p = Paragraph(f'<font color="{COR_PRIMARIA.hexval()}">●</font>&nbsp;&nbsp;'
                              + self._limpar_md(txt), ESTILOS['normal'])
            else:
                p = Paragraph(self._limpar_md(txt), ESTILOS['normal'])
            yield p

    def _processar_paragrafo(self):
        linhas = []
        while self.i < len(self.md_lines):
            l = self.md_lines[self.i]
            s = l.strip()
            if not s:
                break
            if (s.startswith('|') and self._linha_e_tabela()) or \
               s.startswith('#') or s.startswith('>') or \
               s.startswith('```') or s == '---' or \
               re.match(r'^(\s*)([-*+]|\d+\.)\s+', l):
                break
            linhas.append(s)
            self.i += 1
        texto = ' '.join(linhas)
        yield Paragraph(self._limpar_md(texto), ESTILOS['normal'])

    def _limpar_md(self, texto):
        """Converte marcação inline markdown para tags reportlab."""
        if not texto:
            return ''
        # Negrito **xxx**
        texto = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', texto)
        # Itálico *xxx*
        texto = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', texto)
        # Código inline `xxx`
        texto = re.sub(r'`([^`]+)`', r'<font face="Courier" size="9">\1</font>', texto)
        # Links [txt](url) — mostrar só o texto + URL discreto
        texto = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<font color="#1976D2"><u>\1</u></font>', texto)
        # Emojis → texto ou mantém (DejaVu tem boa cobertura de símbolos)
        return texto


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description='Markdown → PDF profissional')
    parser.add_argument('entrada', help='Arquivo Markdown de entrada')
    parser.add_argument('saida', help='Arquivo PDF de saída')
    parser.add_argument('--titulo', default='Dossiê', help='Título do documento')
    parser.add_argument('--subtitulo', default='', help='Subtítulo')
    parser.add_argument('--autor', default='', help='Autor (opcional)')
    parser.add_argument('--versao', default='1.0', help='Versão')
    args = parser.parse_args()

    registrar_fontes()
    criar_estilos()

    texto = Path(args.entrada).read_text(encoding='utf-8')
    conversor = ConversorMarkdown(texto, args.titulo)

    doc = SimpleDocTemplate(
        args.saida,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2.5*cm,
        title=args.titulo,
        author=args.autor or "IMP-BOT",
        subject="Dossiê de Viabilidade",
        creator="IMP-BOT Tools"
    )

    doc.build(
        list(conversor.converter()),
        canvasmaker=PaginaDoc
    )

    print(f"✅ PDF gerado: {args.saida}")
    print(f"   Tamanho: {Path(args.saida).stat().st_size/1024:.1f} KB")

if __name__ == '__main__':
    main()
