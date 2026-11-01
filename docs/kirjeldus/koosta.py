# -*- coding: utf-8 -*-
"""QR-digivõti – süsteemi kirjeldus: DOCX + PDF generaator.

Käivitamine:  python3 koosta.py
Vajab: python-docx, Pillow, LibreOffice (soffice + python3-uno sisukorra uuendamiseks ja PDF-iks).
Allikad: ../KONTSEPTSIOON_QR_digivoti.md, ../TEHNILINE_LAHENDUS_digivoti.md, ../ELEKTRI_ULEVAATUS_digivoti.md,
         ../OIGUSLIK_RAAMISTIK_digivoti.md, ../MUUGIPAKETT_digivoti.md (ainult argumendid), ../../digivoti/README.md.
Tulemus: QR-digivoti_susteemi_kirjeldus.docx ja .pdf samas kaustas.
"""
import os, re, subprocess, sys, time, shutil
from PIL import Image, ImageDraw, ImageFont, ImageChops
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SIIN = os.path.dirname(os.path.abspath(__file__))
PILDID = os.path.join(SIIN, "pildid")
NIMI = "QR-digivoti_susteemi_kirjeldus"
DOCX_TOOR = os.path.join(SIIN, "_toor_" + NIMI + ".docx")
DOCX = os.path.join(SIIN, NIMI + ".docx")
PDF = os.path.join(SIIN, NIMI + ".pdf")

SININE = RGBColor(0x14, 0x21, 0x3D)
AKTSENT = RGBColor(0xF2, 0xA5, 0x41)
HALL = RGBColor(0x55, 0x5B, 0x66)
SININE_HEX, AKTSENT_HEX = "14213D", "F2A541"
HELE_HEX, HELE2_HEX = "EEF1F6", "FDF1DF"
FONT = "Calibri"
FONT_PIL = "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"
FONT_PIL_B = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"

# ---------------------------------------------------------------- pildid
def f(sz, b=False):
    return ImageFont.truetype(FONT_PIL_B if b else FONT_PIL, sz)

def kast(d, xy, tekst, taust, joon, varv="#14213D", sz=30, b=False):
    x0, y0, x1, y1 = xy
    d.rounded_rectangle(xy, radius=18, fill=taust, outline=joon, width=4)
    read = tekst.split("\n")
    kor = sz + 8
    y = (y0 + y1) / 2 - kor * len(read) / 2
    for i, r in enumerate(read):
        fb = f(sz, b or i == 0)
        w = d.textlength(r, font=fb)
        d.text(((x0 + x1) / 2 - w / 2, y + i * kor), r, font=fb, fill=varv)

def nool(d, a, b, varv="#14213D", w=5, tekst=None, sz=24, kahesuunaline=False):
    import math
    d.line([a, b], fill=varv, width=w)
    def ots(p, q):
        ang = math.atan2(q[1] - p[1], q[0] - p[0])
        L = 22
        p1 = (q[0] - L * math.cos(ang - 0.4), q[1] - L * math.sin(ang - 0.4))
        p2 = (q[0] - L * math.cos(ang + 0.4), q[1] - L * math.sin(ang + 0.4))
        d.polygon([q, p1, p2], fill=varv)
    ots(a, b)
    if kahesuunaline:
        ots(b, a)
    if tekst:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        d.text((mx + 12, my - sz / 2 - 4), tekst, font=f(sz), fill="#333333")

def skeem_arhitektuur(tee):
    W, H = 2000, 1500
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    tsin, hele, akt, ohu = "#14213D", "#EEF1F6", "#F2A541", "#FDF1DF"
    kast(d, (80, 60, 620, 230), "Töötaja telefon\nveebirakendus (PWA)\nparoolita paigalduseta", hele, tsin)
    kast(d, (1380, 60, 1920, 230), "Haldur\nbrauser: /admin\nlogi, kasutajad, aruanded", hele, tsin)
    kast(d, (560, 360, 1440, 600), "Pilveserver (Cloudflare Worker + Durable Object)\nkasutajad, rühmad, õigused, ajaaknad\nlogi, ostud, sõidupäevik, kuuaruanne\nkäsk releele: ühekordne, aegub", "#FFFFFF", tsin, sz=30)
    nool(d, (350, 230), (700, 360), tekst="HTTPS", kahesuunaline=True)
    nool(d, (1650, 230), (1300, 360), tekst="HTTPS", kahesuunaline=True)
    kast(d, (1500, 700, 1920, 880), "Raamatupidamine\nkuuaruanne CSV\n(kinnipidamised, päevik)", hele, tsin)
    nool(d, (1440, 560), (1650, 700))
    kast(d, (560, 720, 1440, 880), "Kohalik võrk\nkaabel / PoE, siseustel Wi-Fi, objektil 4G\neraldi VLAN, ainult väljaminevad ühendused", hele, tsin, sz=28)
    nool(d, (1000, 720), (1000, 600), tekst="relee küsib käske ise", kahesuunaline=True)
    kast(d, (120, 1000, 640, 1180), "Ukse relee / kontroller\nShelly või ESP32\n+ vaherelee (CO)", "#FFFFFF", tsin, sz=28)
    kast(d, (740, 1000, 1260, 1180), "Automaat\nMDB cashless-liides\nvõi relee / ainult logi", "#FFFFFF", tsin, sz=28)
    kast(d, (1360, 1000, 1880, 1180), "Seade / auto / tööriist\nkleebis + kasutuse logi\nvõtmekapp elektrilukuga", "#FFFFFF", tsin, sz=28)
    nool(d, (800, 880), (380, 1000)); nool(d, (1000, 880), (1000, 1000)); nool(d, (1200, 880), (1620, 1000))
    kast(d, (120, 1290, 640, 1440), "Lukk\nvastuplaat / magnetlukk\n/ mootorlukk", "#FFFFFF", tsin, sz=28)
    nool(d, (380, 1180), (380, 1290))
    # ohutusahel
    kast(d, (760, 1260, 1880, 1460), "OHUTUSAHEL RIISTVARAS (ei sõltu tarkvarast ega võrgust)\nATS-i vaherelee + 2-pooluseline avariinupp\njadamisi luku toites; seest mehaaniline väljumine", ohu, akt, sz=28)
    nool(d, (760, 1365), (640, 1365), varv="#C0392B", w=6)
    im.save(tee)

def skeem_reziimid(tee):
    W, H = 2000, 900
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    tsin, hele, akt = "#14213D", "#EEF1F6", "#F2A541"
    d.text((60, 30), "A. Telefon skannib objekti QR-i", font=f(44, True), fill=tsin)
    d.text((1060, 30), "B. Lugeja skannib telefoni QR-i", font=f(44, True), fill=tsin)
    d.line([(1000, 20), (1000, 880)], fill="#BBBBBB", width=4)
    kast(d, (60, 130, 440, 330), "Objekti QR\nkleebis või ekraan\n(muutub iga 30 s)", hele, tsin, sz=28)
    kast(d, (540, 130, 940, 330), "Telefon\nsisse logitud,\nvajab internetti", hele, tsin, sz=28)
    nool(d, (540, 230), (440, 230), tekst="")
    kast(d, (300, 430, 700, 600), "Server\nõigus + logi", "#FFFFFF", tsin, sz=30)
    nool(d, (740, 330), (600, 430))
    kast(d, (60, 700, 440, 860), "Võrgurelee\n→ lukk / automaat", "#FFFFFF", tsin, sz=28)
    nool(d, (400, 600), (250, 700))
    d.text((480, 720), "Odav: relee 20–60 €\nEi tööta ilma võrguta\nStaatilist kleebist saab\npildistada → muutuv QR", font=f(28), fill="#333333", spacing=8)
    kast(d, (1060, 130, 1460, 330), "Telefon\nnäitab muutuvat QR-i\n(TOTP, 30 s)", hele, tsin, sz=28)
    kast(d, (1540, 130, 1940, 330), "QR-lugeja\nukse juures\n(Wiegand / OSDP)", hele, tsin, sz=28)
    nool(d, (1460, 230), (1540, 230))
    kast(d, (1540, 430, 1940, 600), "Kontroller\nkohalik nimekiri", "#FFFFFF", tsin, sz=30)
    nool(d, (1740, 330), (1740, 430))
    kast(d, (1540, 700, 1940, 860), "Lukk", "#FFFFFF", tsin, sz=30)
    nool(d, (1740, 600), (1740, 700))
    d.text((1060, 450), "Töötab ka ilma\ninternetita (telefon ja\nkontroller)\nKallim: lugeja 25–500 €\n+ kontroller\nSobib välisuksele", font=f(28), fill="#333333", spacing=8)
    im.save(tee)

def skeem_teekond(tee):
    W, H = 2000, 520
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    tsin, hele, akt = "#14213D", "#EEF1F6", "#F2A541"
    sammud = ["1. Haldur loob\nkasutaja ja\nkutse-QR", "2. Töötaja skännib\nkutse, valib PIN-i;\ntelefon jääb sisse", "3. Skänn uksel →\nõigus → logi →\nrelee avab",
              "4. Automaat: toode\n→ kinnitus → ost\nkuu summasse", "5. Haldur:\n„Töösuhe lõppes“\n→ kõik kinni", "6. Kuu lõpp: CSV;\nnõusolek kinni-\npidamiseks (plaan)"]
    w = 300; g = 30; x = 30
    for i, s in enumerate(sammud):
        taust = "#FDF1DF" if i == 4 else hele
        kast(d, (x, 120, x + w, 400), s, taust, akt if i == 4 else tsin, sz=28)
        if i < len(sammud) - 1:
            nool(d, (x + w + 2, 260), (x + w + g - 2, 260), w=4)
        x += w + g
    d.text((30, 30), "Sihtteekond (näidises sammud 1–5; samm 6 osaliselt)", font=f(40, True), fill=tsin)
    d.text((30, 440), "Sama telefon ja sama andmebaas kõigil sammudel; iga samm logitakse.", font=f(28), fill="#333333")
    im.save(tee)

def karbi(src, dst, max_h=None):
    im = Image.open(src).convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((im.width - 1, im.height - 1)))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 18 else 0)
    bb = diff.getbbox()
    if bb:
        x0, y0, x1, y1 = bb
        pad = 16
        im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    if max_h and im.height > max_h:
        im = im.crop((0, 0, im.width, max_h))
    im.save(dst)
    return dst

# ---------------------------------------------------------------- docx abid
doc = Document()
TAB_NR = [0]; JOON_NR = [0]

def set_cell_bg(cell, hexv):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), hexv)
    tcPr.append(shd)

def set_cell_margins(table, top=50, bottom=50, left=80, right=80):
    tblPr = table._tbl.tblPr
    m = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement("w:" + k); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); m.append(e)
    tblPr.append(m)

def set_borders(table, color="B8C0CC", sz=4):
    tblPr = table._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for k in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement("w:" + k); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), str(sz)); e.set(qn("w:color"), color); b.append(e)
    tblPr.append(b)

def rida_omadus(row, header=False):
    trPr = row._tr.get_or_add_trPr()
    c = OxmlElement("w:cantSplit"); trPr.append(c)
    if header:
        h = OxmlElement("w:tblHeader"); trPr.append(h)

def fikseeri_laiused(t, laiused):
    tw = int(sum(laiused) * 567)
    tblPr = t._tbl.tblPr
    for e in tblPr.findall(qn("w:tblW")): tblPr.remove(e)
    w = OxmlElement("w:tblW"); w.set(qn("w:w"), str(tw)); w.set(qn("w:type"), "dxa"); tblPr.append(w)
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
    grid = t._tbl.tblGrid
    for i, gc in enumerate(grid.findall(qn("w:gridCol"))):
        gc.set(qn("w:w"), str(int(laiused[i] * 567)))
    for row in t.rows:
        for i, c in enumerate(row.cells):
            c.width = Cm(laiused[i])

def keep_next(par):
    par.paragraph_format.keep_with_next = True

RX = re.compile(r"(\*\*[^*]+\*\*|\[KONTROLLIMATA[^\]]*\]|\[HINNANG[^\]]*\]|\[__[^\]]*\])")

def lisa_tekst(par, tekst, sz=None, varv=None, bold=False, italic=False):
    for osa in RX.split(tekst):
        if not osa:
            continue
        if osa.startswith("**") and osa.endswith("**"):
            r = par.add_run(osa[2:-2]); r.bold = True
        elif osa.startswith("[KONTROLLIMATA") or osa.startswith("[HINNANG"):
            r = par.add_run(osa); r.italic = True; r.font.color.rgb = RGBColor(0x9A, 0x5B, 0x00)
        elif osa.startswith("[__"):
            r = par.add_run(osa); r.bold = True; r.font.color.rgb = RGBColor(0xB0, 0x30, 0x30)
        else:
            r = par.add_run(osa)
            if bold: r.bold = True
        if italic: r.italic = True
        if sz: r.font.size = Pt(sz)
        if varv is not None and not (osa.startswith("[")): r.font.color.rgb = varv
    return par

def P(tekst, stiil=None, sz=None, varv=None, align=None, after=None, bold=False, italic=False):
    par = doc.add_paragraph(style=stiil)
    lisa_tekst(par, tekst, sz=sz, varv=varv, bold=bold, italic=italic)
    if align: par.alignment = align
    if after is not None: par.paragraph_format.space_after = Pt(after)
    return par

def H1(t):
    par = doc.add_heading(t, level=1)
    return par
def H2(t):
    return doc.add_heading(t, level=2)
def H3(t):
    return doc.add_heading(t, level=3)

def B(items, stiil="List Bullet", sz=None):
    for it in items:
        par = doc.add_paragraph(style=stiil)
        lisa_tekst(par, it, sz=sz)
        par.paragraph_format.space_after = Pt(2)

def N(items):
    for i, it in enumerate(items, 1):
        par = doc.add_paragraph()
        pf = par.paragraph_format
        pf.left_indent = Cm(0.8); pf.first_line_indent = Cm(-0.6); pf.space_after = Pt(2)
        r = par.add_run(f"{i}. "); r.bold = True; r.font.color.rgb = SININE
        lisa_tekst(par, it)

def T(pais, read, laiused=None, pealkiri=None, sz=9, esimene_bold=False, rohuta=None):
    if pealkiri:
        TAB_NR[0] += 1
        cp = P(f"Tabel {TAB_NR[0]}. {pealkiri}", stiil="Caption")
        keep_next(cp)
    t = doc.add_table(rows=1, cols=len(pais))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    set_borders(t); set_cell_margins(t)
    hdr = t.rows[0]; rida_omadus(hdr, header=True)
    for i, h in enumerate(pais):
        c = hdr.cells[i]; set_cell_bg(c, SININE_HEX)
        par = c.paragraphs[0]; r = par.add_run(h); r.bold = True; r.font.size = Pt(sz); r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        par.paragraph_format.space_after = Pt(0)
        keep_next(par)
    for ri, rr in enumerate(read):
        row = t.add_row(); rida_omadus(row)
        kokku = isinstance(rr[0], str) and rr[0].startswith("**") and ("Kokku" in rr[0] or "kokku" in rr[0])
        for i, v in enumerate(rr):
            c = row.cells[i]
            if kokku: set_cell_bg(c, HELE2_HEX)
            elif ri % 2 == 1: set_cell_bg(c, HELE_HEX)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            par = c.paragraphs[0]; par.paragraph_format.space_after = Pt(0)
            lisa_tekst(par, str(v), sz=sz, bold=(esimene_bold and i == 0))
    if not laiused:
        laiused = [16.6 / len(pais)] * len(pais)
    fikseeri_laiused(t, laiused)
    sp = doc.add_paragraph(); sp.paragraph_format.space_after = Pt(4)
    return t

def KAST(tekst, pealkiri=None, taust=HELE2_HEX):
    t = doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_borders(t, color=AKTSENT_HEX, sz=8); set_cell_margins(t, 100, 100, 160, 160)
    c = t.rows[0].cells[0]; set_cell_bg(c, taust); fikseeri_laiused(t, [16.4])
    rida_omadus(t.rows[0])
    par = c.paragraphs[0]
    if pealkiri:
        r = par.add_run(pealkiri + "\n"); r.bold = True; r.font.color.rgb = SININE; r.font.size = Pt(10.5)
    lisa_tekst(par, tekst, sz=10)
    par.paragraph_format.space_after = Pt(0)
    sp = doc.add_paragraph(); sp.paragraph_format.space_after = Pt(2)

def J(tee, laius_cm, allkiri):
    par = doc.add_paragraph(); par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.add_run().add_picture(tee, width=Cm(laius_cm))
    keep_next(par)
    JOON_NR[0] += 1
    cp = P(f"Joonis {JOON_NR[0]}. {allkiri}", stiil="Caption", align=WD_ALIGN_PARAGRAPH.CENTER)
    return cp

def J2(tee1, tee2, k1, k2, allkiri):
    """Kaks pilti kõrvuti (tabel ilma joonteta)."""
    t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    rida_omadus(t.rows[0]); fikseeri_laiused(t, [8.3, 8.3])
    for c, tee, k in ((t.rows[0].cells[0], tee1, k1), (t.rows[0].cells[1], tee2, k2)):
        c.width = Cm(8.2)
        par = c.paragraphs[0]; par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        im = Image.open(tee); kõrgus = k
        par.add_run().add_picture(tee, height=Cm(kõrgus))
    JOON_NR[0] += 1
    P(f"Joonis {JOON_NR[0]}. {allkiri}", stiil="Caption", align=WD_ALIGN_PARAGRAPH.CENTER)

def lehevahetus():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

def vali_field(par, instr, kuva="1"):
    r = par.add_run(); fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "begin"); r._r.append(fc)
    r = par.add_run(); it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr; r._r.append(it)
    r = par.add_run(); fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "separate"); r._r.append(fc)
    r = par.add_run(kuva)
    r = par.add_run(); fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "end"); r._r.append(fc)

# ---------------------------------------------------------------- stiilid
def stiilid():
    st = doc.styles
    n = st["Normal"]; n.font.name = FONT; n.font.size = Pt(10.5)
    n.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    n.paragraph_format.space_after = Pt(6); n.paragraph_format.line_spacing = 1.12
    for nimi, sz, varv, before, after in (("Heading 1", 18, SININE, 6, 10), ("Heading 2", 13.5, SININE, 14, 6), ("Heading 3", 11.5, SININE, 10, 4)):
        s = st[nimi]; s.font.name = FONT; s.font.size = Pt(sz); s.font.bold = True; s.font.color.rgb = varv
        rpr = s.element.get_or_add_rPr(); rf = rpr.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts"); rpr.append(rf)
        for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rf.set(qn(a), FONT)
        for a in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
            if rf.get(qn(a)) is not None:
                del rf.attrib[qn(a)]
        s.paragraph_format.space_before = Pt(before); s.paragraph_format.space_after = Pt(after)
        s.paragraph_format.keep_with_next = True
    h1 = st["Heading 1"]
    h1.paragraph_format.page_break_before = True
    # alumine aktsentjoon H1 all
    pPr = h1.element.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr"); bt = OxmlElement("w:bottom")
    bt.set(qn("w:val"), "single"); bt.set(qn("w:sz"), "12"); bt.set(qn("w:space"), "4"); bt.set(qn("w:color"), AKTSENT_HEX)
    bdr.append(bt); pPr.append(bdr)
    c = st["Caption"]; c.font.name = FONT; c.font.size = Pt(9); c.font.italic = True; c.font.bold = False; c.font.color.rgb = HALL
    c.paragraph_format.space_after = Pt(4); c.paragraph_format.space_before = Pt(2)
    for nm in ("List Bullet",):
        s = st[nm]; s.font.name = FONT; s.font.size = Pt(10.5)
    for lvl in (1, 2):
        try:
            s = st[f"TOC {lvl}"] if f"TOC {lvl}" in [x.name for x in st] else None
        except KeyError:
            s = None

def lehekülg():
    s = doc.sections[0]
    s.page_height = Cm(29.7); s.page_width = Cm(21.0)
    s.left_margin = s.right_margin = Cm(2.2); s.top_margin = Cm(2.2); s.bottom_margin = Cm(2.0)
    s.header_distance = Cm(1.0); s.footer_distance = Cm(1.0)
    s.different_first_page_header_footer = True
    hp = s.header.paragraphs[0]
    lisa_tekst(hp, "QR-digivõti – süsteemi kirjeldus", sz=8.5, varv=HALL)
    hp.add_run("\t\t")
    r = hp.add_run("v1.1 mustand · 01.11.2026"); r.font.size = Pt(8.5); r.font.color.rgb = HALL
    hp.paragraph_format.tab_stops.add_tab_stop(Cm(16.6), alignment=2)
    fp = s.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("[ettevõtte nimi] · Margo Pädam · lk "); r.font.size = Pt(8.5); r.font.color.rgb = HALL
    vali_field(fp, "PAGE")
    for r in fp.runs[-3:]:
        r.font.size = Pt(8.5)

# ================================================================ SISU
def kaas():
    for _ in range(5):
        doc.add_paragraph()
    P("QR-digivõti", sz=40, varv=SININE, bold=True, after=0)
    P("Süsteemi kirjeldus", sz=24, varv=SININE, after=4)
    t = doc.add_table(rows=1, cols=1); c = t.rows[0].cells[0]; set_cell_bg(c, AKTSENT_HEX); c.width = Cm(16.6)
    c.paragraphs[0].add_run(" ").font.size = Pt(3)
    doc.add_paragraph()
    P("Üks telefon ja üks andmebaas uste, automaatide, tööautode, tööriistade ja seadmete jaoks: "
      "ligipääs, kasutuse logi ja kuu lõpu aruanne raamatupidamisse.", sz=13, varv=HALL, after=30)
    for _ in range(6):
        doc.add_paragraph()
    for rida in ("[ettevõtte nimi]", "Koostaja: Margo Pädam, ehitusinsener", "Kuupäev: 01.11.2026", "Versioon: 1.1 (mustand)"):
        P(rida, sz=12, varv=SININE, after=2)
    doc.add_paragraph()
    P("Dokument koondab kontseptsiooni, tehnilise analüüsi, elektrianalüüsi, õigusanalüüsi ja töötava näidise seisu. "
      "Hinnad on hinnangud, mitte pakkumised. Märge [HINNANG] tähistab hinnangut või turuhinna suurusjärku, [KONTROLLIMATA] väidet, "
      "mida ei ole veel algallikast kinnitatud, ja [__] kohta, mis tuleb täita enne dokumendi üleandmist.", sz=9, varv=HALL)
    lehevahetus()
    KAST("Tehniline, elektri- ja õigusanalüüs on koostatud tehisintellekti abil Margo Pädami juhtimisel; neid ei ole allkirjastanud "
         "pädev elektriinsener ega advokaat. „Sõltumatu kontroll“ tähendab eraldi AI-ülevaatust, mitte kolmanda osapoole auditit. "
         "Tarkvara turvaülevaatus on samuti sisemine (eraldi AI-ülevaatus); kolmanda osapoole läbistustesti ei ole tehtud.",
         "Kuidas analüüsid on koostatud")
    P("Kuidas seda dokumenti lugeda", sz=14, varv=SININE, bold=True, after=4)
    T(["Lugeja", "Peatükid", "Miks"],
      [["Klient", "1, 4, 9, 11", "mida süsteem teeb, moodulid, eelised ja puudused, mida klient võidab"],
       ["Investor või partner", "1, 2, 7, 9, 11, 12", "probleem, kulud ja tasuvus, ausad piirangud, miks meie, tegevuskava"],
       ["Paigaldaja", "6, lisa C", "lukud, evakuatsioon, toide, kaabeldus, kasutuselevõtu kontrollnimekiri"]],
      laiused=[3.6, 3.6, 9.4], sz=9.5, esimene_bold=True)
    P("Kogu dokumendis on eristatud **„näidises tehtud“** (töötav tarkvara 01.11.2026) ja **„tootmisetapis kavandatud“** "
      "(veel tegemata). Kavandatud osa ei ole lubadus, vaid plaan.", sz=10)
    lehevahetus()
    P("Sisukord", sz=18, varv=SININE, bold=True, after=6)
    par = doc.add_paragraph()
    vali_field(par, 'TOC \\o "1-2" \\h \\z \\u', "Sisukord uueneb dokumendi avamisel (paremklõps → Uuenda välja).")

def ptk1():
    H1("1. Lühikokkuvõte")
    KAST("Väikese ja keskmise ettevõtte ligipääs ja kasutus on tavaliselt viies eri kohas: uksed (võtmed või kaardid), tööriistad "
         "(paber või Excel), tööautod (võtmed ja sõidupäevik), kohvi- ja snäkiautomaat (kohvikassa) ning arvutid ja printerid. "
         "Töösuhte lõpus tuleb kõik käsitsi kokku korjata ja kuu lõpus käsitsi raamatupidamisse viia.", "Probleem")
    KAST("Üks kasutajate andmebaas ja üks telefoni veebirakendus (paigaldust pole vaja). Iga objekt – uks, automaat, auto, tööriist, "
         "arvuti, printer – on andmebaasi kirje ja kannab QR-koodi. Töötaja tuvastab end telefoniga, server otsustab õiguse, logib "
         "sündmuse ja vajadusel annab võrgureleele käsu (uks avaneb, automaat väljastab). Haldur lõpetab töösuhte **ühe nupuga** ja "
         "laeb kuu lõpus aruande raamatupidamisse.", "Lahendus")
    H3("Kasu kliendile")
    B(["**Töösuhte lõpp ühe klõpsuga:** kõik digivõtmega juhitud uksed, autod, automaadid ja seadmed suletakse korraga. Alles jäävad "
       "mehaanilised võtmed ja kaardid (nt varuvõti, välisuks) tuleb endiselt tagasi nõuda.",
       "**Vähem kaarte:** põhikandja on töötaja telefon. Töötajale, kes telefoni ei kasuta, on vaja alternatiivi (kaart, PIN või prinditud QR).",
       "**Odavam siseuks:** lugejat pole vaja; relee ise maksab 20–60 €, kuid siseuks koos luku, toite, kaabelduse ja paigaldusega "
       "≈ 550–700 € [HINNANG]. Tööriistal piisab kleebisest.",
       "**Üks süsteem viie asemel:** läbipääs, tööriistad, autod, automaadid ja seadmed ühes logis.",
       "**Kuu lõpu aruanne:** ostud töötaja kaupa, sõidupäevik, läbipääsu- ja seadmelogi CSV-failina raamatupidamisse (näidises tehtud; "
       "töötaja nõusolek kinnipidamiseks tootmisetapis).",
       "**Ohutus disainis:** kavandatud nii, et väljapääs ei sõltu telefonist, tarkvarast ega võrgust; tulekahju korral vabastab luku "
       "riistvara. Nõuetekohase paigalduse tagavad paigaldaja ja hoone valdaja."], sz=9.5)
    H3("Kulu suurusjärk (näidisettevõte 50 töötajat, kontor + ladu) [HINNANG]")
    T(["Kulu", "Suurusjärk", "Kus täpsemalt"],
      [["Ühekordne: seadmed + paigaldus (4 ust, kohv, snäkk, 3 printerit, 5 autot)", "≈ 8 800 €; töökindluse lisadega ≈ 9 460–9 540 €", "ptk 7.1"],
       ["Aastane ülalpidamine (litsents, hooldus, sisemine haldus)", "≈ 4 600–6 200 €/a", "ptk 7.2"],
       ["Investorinäidise demolaud", "≈ 2 500 €; lisadega ≈ 2 710 €", "ptk 7.1"],
       ["Tasuvus", "pilootandmeteta ei väideta; sõltub tööriistakadudest ning kaartide ja lukuvahetuse kulust", "ptk 7.3"]],
      laiused=[6.2, 6.6, 3.8], sz=9)
    H3("Seis 01.11.2026")
    B(["**Näidises tehtud:** töötav tarkvara – kasutajad ja kutsed, uks (ka muutuva QR-iga), automaat koos ostuga, seade ja auto koos "
       "sõidupäevikuga, töösuhte lõpp, kuuaruanne. **22 automaattesti läbivad.** Eraldi AI-turvaülevaatus leidis 4 viga, kõik parandatud "
       "ja testidega kaetud; kolmanda osapoole läbistustesti ei ole tehtud.",
       "Tööriistade register töötab. Tehniline, elektri- ja õigusanalüüs on koostatud (AI abil, vt lk 2).",
       "**Tootmisetapis kavandatud (veel ei ole):** riistvara proov päris lukuga, pilootklient [__], tootmisküps sideviis (WebSocket/MQTT), "
       "lugeja-režiim (B), kinnipidamise nõusolek rakenduses, automaatne andmete kustutamine."], sz=9.5)

def ptk2():
    H1("2. Probleem ja võimalus")
    H2("2.1 Mis täna valutab")
    P("Kontseptsiooni lähtekoht on ehitus- ja tootmisettevõtte igapäev. Ligipääs ja kasutus on killustunud:")
    T(["Valdkond", "Kuidas tavaliselt", "Mis läheb kaduma"],
      [["Uksed", "mehaanilised võtmed või kaardisüsteem", "kaartide ost ja kadumine; töösuhte lõpus tagastamata võtmed; kaardisüsteem katab ainult uksi"],
       ["Tööriistad ja inventar", "paber, Excel või mälu", "ei ole näha, kelle käes tööriist on; kaod ja otsimise aeg (ka üks kadunud mõõteseade on 500–3 000 € [HINNANG])"],
       ["Tööautod", "võtmed sahtlis, käsitsi sõidupäevik", "broneeringud segased, odomeetri näidud puudu; käibemaksu tõend nõrk"],
       ["Kohvi- ja snäkiautomaat", "kohvikassa, käsitsi nimekiri", "raamatupidaja aeg (hinnanguliselt 2–4 h kuus), võlad töösuhte lõpus"],
       ["Arvuti ja printer", "eraldi kontod ja loendurid", "kulu ei jõua projekti ega osakonna peale"]],
      laiused=[3.4, 5.0, 8.2], pealkiri="Killustunud ligipääs ja kasutus VKE-s")
    P("Töösuhte lõpp toob kõik kokku: tuleb meeles pidada iga ust, kappi, autot ja automaati. Iga unustatud koht on turva- "
      "või rahaline risk.")
    H2("2.2 Võimalus")
    B(["Nutitelefon on töötajal tavaliselt kaasas; telefoni veebileht (PWA) ei vaja paigaldust.",
       "Võrgureleed (Shelly, ESP32) on odavad ja levinud; sisemisele uksele ei ole vaja eraldi lugejat.",
       "Pilveplatvorm (Cloudflare Workers) võimaldab väikese püsikuluga serverit.",
       "QR-ligipääs ise ei ole uus (külaliste süsteemid, coworking'ud, mobiilivõtmed). **Uus on kombinatsioon:** VKE-le odav ühine "
       "platvorm uksest snäkini koos palgast kinnipidamise ja kuuaruandega."])
    H2("2.3 Sihtrühm")
    P("Sihtrühm on **20–250 töötajaga ettevõtted**, eelkõige ehitus- ja paigaldusettevõtted (tööriistad, objekti konteinerid, alltöövõtjad, "
      "tööautod). Kontseptsiooni järgi on Eestis ligi 160 000 majandusüksust, enamik alla 10 töötaja, ja 50–249 töötajaga ettevõtteid "
      "umbes 1 150 (Statistikaamet) [KONTROLLIMATA: aasta ja arv kontrollida]. 20–49 töötajaga ettevõtete arvu ega turu suurust eurodes "
      "ei ole hinnatud [__]. Segmendid ja tegevuskava on peatükis 12.")

def ptk3():
    H1("3. Kuidas süsteem töötab")
    H2("3.1 Põhimõte")
    N(["Kõigil objektidel on **üks kasutajate andmebaas** ja **üks rakendus** (telefoni veebileht).",
       "Iga objekt on andmebaasi kirje: tüüp (uks, automaat, seade, auto), 12-märgine kood, QR-kood, lubatud rühmad ja valikuline ajaaken.",
       "Töötaja skännib QR-i sisse logitud telefoniga. **Server** kontrollib õigust (rühm, ajaaken, kas töösuhe kehtib) ja **logib** sündmuse.",
       "Kui objekt on elektriline (uks, automaat), paneb server releele **ühekordse käsu** („ava 5 s“, „väljasta“). Relee küsib käske ise; "
       "võetud käsk kustutatakse ja 20 s vanust käsku ei täideta.",
       "Ostud, kasutused ja sõidud kogutakse kuuaruandesse."])
    J(os.path.join(PILDID, "skeem_arhitektuur.png"), 16.0, "Süsteemi plokkskeem. Ohutusahel (all paremal) on riistvaras ega sõltu serverist.")
    H2("3.2 Kaks QR-režiimi")
    P("QR-i suund valitakse objekti järgi. Mõlemad režiimid kasutavad sama andmebaasi.")
    J(os.path.join(PILDID, "skeem_reziimid.png"), 16.0, "Režiim A (telefon skannib) ja režiim B (lugeja skannib telefoni).")
    T(["", "A. Telefon skannib objekti QR-i", "B. Objekt skannib telefoni QR-i"],
      [["Kuidas", "QR on objekti peal (kleebis või väike ekraan). Sisse logitud telefon saadab päringu, server lülitab võrgureleed.",
        "Telefon näitab iga 30 s muutuvat QR-i (TOTP). Ukse juures QR-lugeja ja kontroller."],
       ["Riistvara objekti juures", "võrgurelee 20–60 €", "QR-lugeja 25–500 € + kontroller"],
       ["Interneti katkestus", "**ei tööta** (käsk tuleb serverist); varuks mehaaniline võti, PIN või kaart halduritele",
        "kavandatud: kontroller kontrollib koodi kohaliku nimekirja järgi; **teostatavus tõendamata** [HINNANG] – tavaline kontroller TOTP-d ei kontrolli ja Wiegand 26 bitti koodi ei mahuta; vaja oma püsivara (nt ESP32) või varuvariant kaart/PIN"],
       ["Õiguse äravõtt", "kohe", "offline ajal jõuab kontrollerisse ühenduse taastudes → nimekirja kehtivus lühike (nt 24 h) [HINNANG]"],
       ["Sobib", "sisemised uksed, automaadid, autod, tööriistad, arvutid", "välisuksed, ehitusobjekt, kus telefonil ei pruugi olla internetti"],
       ["Näidises", "**tehtud** (staatiline ja muutuv QR)", "tootmisetapis kavandatud; tarkvaras ja riistvaras tegemata"]],
      laiused=[3.2, 6.7, 6.7], pealkiri="Režiimide võrdlus", esimene_bold=True)
    H2("3.3 Muutuv QR ja fotorünnak")
    P("Staatilisest kleebisest saab teha foto ja ust hiljem kaugelt avada (kui fotoga inimesel on õigus). Seepärast on uksel "
      "valikuline **muutuva QR-i režiim**: ukse juures olev ekraan näitab iga 30 sekundi järel uut koodi, mis on arvutatud objekti "
      "saladusest ja ajaaknast (HMAC-SHA256, TOTP põhimõttel). Server lubab praegust ja eelmist akent ning staatilise koodiga sellist "
      "ust ei ava. Näidises on testitud, et 2 minutit vana foto ust ei ava.")
    KAST("**Muutuva QR-i ekraanifoto kehtib kuni 60 sekundit** ja kood ei ole ühekordne. Selle aja jooksul saab ekraani foto saata "
         "kolleegile, kellel on sama ukse õigus, ja tema saab ukse avada eemalt. Maandus tootmises: kood muudetakse ühekordseks ja "
         "ekraan uueneb kohe pärast kasutust; lisaks kohaloleku kontroll (kontori Wi-Fi/IP, Bluetoothi lähedusmärk, NFC); välisustel "
         "režiim B. Kuni selleni sobib muutuv QR sisemistele ja madala riskiga ustele.", "Teadaolev piirang (aus)")
    H2("3.4 Ohutuse põhimõte")
    P("**Väljapääsuahelas ei ole ühtegi tarkvara, raadiot ega võrku.** Pilv ja kontroller annavad ainult *loa lukustada*. "
      "Evakuatsiooniteel avaneb uks seest mehaaniliselt (käepide või paanikapulk) või vabastab luku riistvaraline ahel: tulekahju-"
      "signalisatsiooni (ATS) vaherelee ja kahepooluseline roheline avariinupp katkestavad luku toite otse. Pilv ei saa vabastust "
      "tühistada. See on kavandatud põhimõte; nõuetekohase paigalduse tagavad paigaldaja ja hoone valdaja. Täpsem kirjeldus on peatükis 6.2.")

def ptk4():
    H1("4. Moodulid")
    P("Moodulid kasutavad sama kasutajat, õigusi ja logi. Klient võib alustada ühest moodulist (nt uksed ja tööriistad) ja lisada teised hiljem.")
    T(["Moodul", "Mida teeb", "Riistvara", "Näidises"],
      [["Kasutajad ja rollid", "töötaja, haldur; plaanis külaline/alltöövõtja (ajaliselt piiratud link) ja raamatupidaja (ainult aruanded); õigused rühmade kaupa (nt Ladu, Kontor)", "–", "töötaja ja haldur tehtud"],
       ["Uksed", "õigus + ajaaken (nt E–R 07–19), logi kes/mis/millal; muutuv QR; tulekahjusignaal vabastab riistvaras", "relee, lukk, toiteplokk; välisuksel lugeja", "õigus, ajaaken, muutuv QR tehtud (demolukk); tulekahjusignaali liides ja lugeja (režiim B) tegemata"],
       ["Automaadid", "QR → tootevalik telefonis → kinnitus → väljastus; summa kuu kinnipidamistesse", "snäkiautomaadil MDB cashless-liides; kohvimasinal liides, relee või ainult logi", "ost tehtud (demoautomaat); MDB-liides ja nõusolek tegemata"],
       ["Tööautod", "broneering, võtmine, odomeetri näit ja eesmärk → sõidupäevik", "võtmekapp elektrilukkudega; valikuliselt OBD-II/telemaatika", "kasutus + odomeeter tehtud; broneering ja võtmekapp mitte"],
       ["Tööriistad ja inventar", "kelle käes, võtmine/tagastus, logi", "kleebis (~0,1 €)", "olemas (qrwork)"],
       ["Arvuti ja printer", "kasutusaja logi; arvutil paroolivaba sisselogimine (Entra ID / FIDO2) või QR; printeril turvaprintimine", "tarkvara; printeri tootja lahendus või PaperCut-tüüpi tarkvara", "seadme kasutuse logi tehtud"],
       ["Aruanded ja liidesed", "kinnipidamised töötaja kaupa, ostud, sõidupäevik, läbipääsu- ja seadmelogi; kulud objekti/projekti kaupa", "–", "CSV tehtud; XLSX ja Meriti/Directo formaat mitte"]],
      laiused=[2.8, 6.4, 4.3, 3.1], pealkiri="Moodulid", sz=8.5, esimene_bold=True)
    H2("4.1 Uksed")
    P("Uksel on lubatud rühmad ja valikuline ajaaken Eesti aja järgi (ka suve- ja talveaeg). Iga katse logitakse, ka keeld. "
      "Uksekontakt annab sündmused „uks avati“, „uks avati ilma loata“ (sundavamine) ja „uks jäi lahti“ (lahti üle 30–60 s → summer ja "
      "teade haldurile). Lukutüübi valik sõltub sellest, kas uks on evakuatsiooniteel või tuletõkkeuks (ptk 6.2).")
    H2("4.2 Automaadid")
    T(["Viis", "Kuidas", "Pluss", "Miinus"],
      [["a) MDB / maksesüsteemi liides", "digivõti esineb automaadile cashless-makseseadmena (MDB/ICP 4.2–4.3)", "täpne: mis toode, mis hind", "automaat peab MDB-d toetama"],
       ["b) Relee „kasutusluba“", "relee masina maksesisendil (mitte toitel)", "lihtne, odav", "ei tea, mis jooki valiti (üks hind)"],
       ["c) Telemeetria", "masina loendurid + kinnitus telefonis", "masinasse ei sekkuta", "ausa kasutaja põhimõte; tootja liides tasuline"],
       ["d) Ainult logi", "QR → telefonis „võtsin kohvi“", "0 € riistvara", "ainult usaldus"]],
      laiused=[3.4, 5.6, 3.6, 4.0], pealkiri="Kohvi- ja snäkiautomaadi ühendamise viisid", sz=8.5)
    P("Demos ja väikekontoris sobib d) või b), suuremas kontoris a) [HINNANG]. Näidises on ost tehtud nii, et kui automaat käsku 20 s "
      "jooksul ei võta (võrgust väljas) või töösuhe lõpetatakse enne väljastamist, ost tühistatakse ja palgast ei peeta kinni.")
    H2("4.3 Tööautod ja sõidupäevik")
    P("Auto või võtmekapi QR → broneering → võtmine → odomeetri näit ja eesmärk alguses ja lõpus. Näit ei saa olla väiksem eelmisest. "
      "Võtmekapp on metallkapp elektrilukustatud lahtritega (valmistoode 1 500–5 000 €, isetehtud materjal 450–600 € [HINNANG]). "
      "Näidises on kasutuse algus/lõpp, odomeeter ja eesmärk; broneering ja võtmekapp on tootmisetapis.")
    P("Sisendkäibemaksu 100 % mahaarvamise alus on auto kasutamine **eranditult ettevõtluse tarbeks** (KMS § 30 lg 4 p 5). Sõidupäevik on "
      "**üks tõend** selle kohta; MTA ootab praktikas päevikut [KONTROLLIMATA]. Täielikum tõend on päevik koos võtmekapiga (iga võtmevõtt "
      "logitud); näidises sisestab odomeetri kasutaja ise. Sõidupäevik **ei vähenda** sõiduauto erisoodustust: kui erakasutus on lubatud, "
      "tekib erisoodustus kogu ulatuses (ptk 8.3).")
    H2("4.4 Kasutaja ja halduri teekond")
    J(os.path.join(PILDID, "skeem_teekond.png"), 16.4, "Sihtteekond kutsest kuu lõpu aruandeni. Näidises on sammud 1–5 ja kuuaruande CSV; kuu lõpu kinnitus on tootmisetapis.")
    T(["Samm", "Kasutaja (töötaja)", "Haldur (kontori- või personalijuht)"],
      [["Algus", "saab kutselingi/QR-i (kehtib 7 päeva, ühekordne), valib PIN-i või parooli (≥ 6 märki); telefon jääb sisse logituks", "loob kasutaja (nimi, telefon, rühmad), prindib objektide QR-sildid"],
       ["Igapäev", "skännib uksel, automaadil, autol või tööriistal; avalehel näeb oma kuu ostude summat, pooleli kasutusi ja ligipääse", "näeb logi reaalajas, muudab õigusi ja ajaaknaid"],
       ["Kadunud telefon", "saab uue kutse", "saadab uue kutse; vanad sessioonid muutuvad kohe kehtetuks"],
       ["Kuu lõpp", "tootmisetapis: kinnitab rakenduses kuu ostude summa kinnipidamise või maksab arve (näidises puudub)", "laeb alla kuuaruande CSV-na ja annab raamatupidajale (näidises tehtud)"],
       ["Töösuhte lõpp", "telefon logitakse välja, sisse ei saa; ükski objekt ei avane", "vajutab „Töösuhe lõppes“: kasutaja peatatakse, sessioonid ja kutsed tühistatakse, ootel releekäsud tühistatakse, pooleli kasutused lõpetatakse"]],
      laiused=[2.6, 7.0, 7.0], pealkiri="Kasutaja ja halduri ülesanded", sz=8.5, esimene_bold=True)

def ptk5():
    H1("5. Töötav näidis")
    P("Näidis (qrwork/digivoti) on eraldi projekt: Cloudflare Worker ja Durable Object, välist koodi ega npm-sõltuvusi ei ole "
      "(QR-generaator ja jsQR on kopeeritud koos litsentsimärkega, MIT ja Apache-2.0). Riistvara asemel on demolukk ja demoautomaat "
      "veebilehed, mis kasutavad **sama releeliidest** nagu päris Shelly/ESP32.")
    H2("5.1 Mida näidis teeb")
    N(["**Kasutajad ja rühmad:** kutselink/QR (7 päeva, ühekordne; token URL-i #-osas, ei jõua serveri logidesse), PIN/parool, telefon jääb sisse 180 päeva.",
       "**Objektid:** uks, automaat, seade, auto; kood, QR, lubatud rühmad, ajaaken.",
       "**Uks:** skänn → õigus → logi → releele ühekordne käsk; relee küsib käske seadmetokeniga.",
       "**Muutuv QR:** ukse ekraan näitab iga 30 s uut koodi; staatiline kood sellist ust ei ava.",
       "**Automaat:** tootevalik → kinnitus → ost (hind sentides, fikseeritakse ostuhetkel) → väljastus; ebaõnnestunud väljastus tühistab ostu. "
       "**Nõusoleku küsimist näidises veel pole:** kuuaruanne arvutab kinnipidamise summa ilma nõusolekuta; demoandmetega päris kinnipidamist ei tehta.",
       "**Seade ja auto:** „Alusta kasutust“ / „Lõpeta“; autol odomeeter ja eesmärk.",
       "**Töösuhte lõpp:** üks nupp sulgeb kõik.",
       "**Kuuaruanne:** kinnipidamised, ostud, sõidupäevik, läbipääsulogi, seadmete kasutus – CSV Exceli jaoks (valemi süstimise kaitsega).",
       "**Haldus:** reaalajas logi, kasutajad, objektid (QR-sildi print), tooted, aruanded, demoandmed.",
       "**Kasutaja avaleht:** kuu ostud, pooleli kasutused, ligipääsud, QR-skanner."])
    H2("5.2 Ekraanipildid")
    P("Ekraanipildid on näidise brauseritestist (Playwright). Nimed ja telefoninumbrid on väljamõeldud demoandmed.", sz=9.5, varv=HALL)
    J(os.path.join(PILDID, "k_01_admin_demo.png"), 13.5, "Haldusvaade: demoandmed, seadmete aknad ja kasutajate kutse-QR-id.")
    J2(os.path.join(PILDID, "k_05_tel_uks_avatud.png"), os.path.join(PILDID, "k_06_demolukk_avatud.png"), 8.0, 6.2,
       "Vasakul telefon pärast ukse QR-i skännimist, paremal demolukk (sama releeliides, mida kasutab päris relee).")
    J2(os.path.join(PILDID, "k_02_ekraan_muutuv_qr.png"), os.path.join(PILDID, "k_07_tel_automaat_kinnitus.png"), 7.0, 9.0,
       "Vasakul lao ukse ekraan muutuva QR-iga (uueneb iga 30 s), paremal kohviautomaadi tootevalik ja kinnitus telefonis.")
    J(os.path.join(PILDID, "k_12_admin_kuuaruanne.png"), 14.0, "Kuuaruanne: kinnipidamised töötaja kaupa ja CSV-failid raamatupidamisse.")
    J2(os.path.join(PILDID, "k_13_admin_toosuhe_lopp.png"), os.path.join(PILDID, "k_15_tel_sisselogimine_keelatud.png"), 4.6, 6.4,
       "Töösuhte lõpp: haldur vajutab üht nuppu (vasakul); töötaja telefon ei saa enam sisse (paremal).")
    H2("5.3 Mis on testitud")
    T(["Testirühm", "Mida kontrollitakse"],
      [["Õigused ja ajaaken", "rühmaga avab, ilma rühmata keelatud ja keeld logitakse; E–R 07–19 Eesti aja järgi (suve- ja talveaeg); laupäeval lao uks ei avane"],
       ["Muutuv QR", "kehtiv kood avab, eelmine aken kehtib, vanem ja staatiline keelatud"],
       ["Relee", "käsk on ühekordne, vajab seadmetokenit, aegub"],
       ["Töösuhte lõpp", "peatatud kasutaja ei ava midagi, vanad sessioonid kehtetud"],
       ["Ost ja aruanne", "summa sentides, kinnipidamine töötaja kaupa, CSV; seade ja auto, odomeeter, sõidupäevik"],
       ["Turvalisus", "CSRF-päis, halduse token, kutse ühekordsus, CSP nonce, CSV valemikaitse, XSS, IDOR, hinna võltsimine, võltsitud IP-räsi"],
       ["Turvaülevaatuse parandused (4)", "samaaegsed sisselogimised ei pääse piirangust mööda; kutse ühekordne ka samaaegsel kasutusel; uus kutse tühistab vana telefoni sessiooni kohe; väljastamata ost tühistatakse"]],
      laiused=[4.4, 12.2], pealkiri="Automaattestid (22 testi, kõik läbivad 01.11.2026; turvaülevaatus = eraldi AI-ülevaatus, mitte kolmanda osapoole test)", sz=8.5, esimene_bold=True)
    P("Turvapõhimõtted: välist koodi ei laeta (CSP nonce'iga), küpsis HttpOnly + Secure + SameSite, paroolid PBKDF2-SHA256, sessiooni-, "
      "kutse- ja seadmetokenid hoitakse ainult räsina, IP ainult soolatud räsina, vigaste katsete piirangud.")
    H2("5.4 Mis on veel tegemata või kontrollimata")
    B(["**Riistvara:** Shelly skript ja päris relee/lukk on proovimata. Elektrianalüüsi järgi vajab Shelly 1 (ainult NO-kontakt) magnetluku "
       "puhul vahereleed (ptk 6.2).",
       "**Sideviis:** relee küsib käske iga 1 s, mis teeb ~86 400 päringut ööpäevas seadme kohta; Cloudflare'i tasuta plaani piir (100 000/päev) "
       "kannab ainult üht seadet. Tootmises WebSocket või MQTT [KONTROLLIMATA: hind ja piirangud].",
       "**Avaldamine:** wrangler dev ja deploy ei ole proovitud (testitud Node'i testide ja kohaliku serveriga).",
       "**Puuduvad funktsioonid:** kasutaja ise parooli taastus, külalise ajutine link, raamatupidaja roll, broneeringud, MDB-liides, XLSX ja "
       "Meriti/Directo formaat, mitme firma tugi, tulekahjusignaali ühendus, režiim B (lugeja), kuu lõpu kinnituse vorm, arestimisvaba osa arvutus.",
       "**Teadaolevad väiksemad puudused** (tootmisetapi töö): muutuv QR ei ole ühekordne; relee ja ukseekraan kasutavad sama seadmetokenit; "
       "vigaste katsete loendurid on mälus; sama IP taga olev ründaja võib halduri või relee 15 min lukustada; ajaaken üle kesköö ei ole toetatud; "
       "logid kasvavad piiramatult; seadme „väljastatud“ kinnitust automaadilt ei küsita; seadme „viimati nähtud“ (heartbeat) puudub.",
       "**Skaleeruvus testimata:** näidis loeb sessioonid tervikuna ja logid kasvavad piiramatult; sadade töötajate ja seadmetega ei ole "
       "proovitud. Koormustest on tootmisetapi töö."])

def ptk6():
    H1("6. Tehniline ülesehitus")
    P("Peatükk koondab tehnilise analüüsi ja elektrianalüüsi. Kus elektrianalüüs parandas tehnilise analüüsi "
      "väidet, on siin parandatud versioon. Standardite olek on kontrollitud evs.ee-st 01.11.2026, kuid **standardite teksti ei ole loetud**; "
      "standardi sisu kohta käivad väited on [KONTROLLIMATA].", sz=10)
    H2("6.1 Arhitektuur ja side")
    T(["Lõik", "Protokoll", "Märkus"],
      [["Telefon → server", "HTTPS (TLS), veebirakendus (PWA)", "telefon ei räägi kunagi otse releega"],
       ["Server ↔ relee/kontroller", "tootmises MQTT üle TLS (port 8883) või WebSocket; kontroller hoiab ühendust ise väljapoole", "NAT/tulemüür ei vaja sissetulevat porti; latentsus < 1 s [HINNANG]; Cloudflare Workeril pole sisseehitatud MQTT brokerit"],
       ["Varuna", "HTTPS-pollimine 2–5 s", "lihtsam, aga viivitus ja rohkem päringuid (näidis: 1 s)"],
       ["Lugeja → kontroller", "Wiegand 26/34 bit", "krüpteerimata, ühesuunaline; tüüpiline piir ~150 m 0,5 mm² juhiga [KONTROLLIMATA]"],
       ["Lugeja → kontroller", "OSDP v2 üle RS-485 (EVS-EN IEC 60839-11-5:2020)", "kahesuunaline, krüpteeritud (Secure Channel), lugeja eemaldus annab häire — **välisuksel eelistada**"],
       ["Kontroller → lukk", "potentsiaalivaba kontakt", "lukk oma toiteplokist; relee ei toida lukku läbi oma elektroonika"],
       ["Automaat", "MDB/ICP 4.2–4.3, cashless-seade", "automaadil peab olema MDB [KONTROLLIMATA käskude nimed]"]],
      laiused=[3.4, 6.0, 7.2], pealkiri="Sideprotokollid", sz=8.5, esimene_bold=True)
    P("**Näidises:** käsk on ühekordne, aegub 20 s ja relee autentib seadmetokeniga. **Tootmise eesmärk:** käsud lisaks allkirjastatud, "
      "relee ja ukseekraan eraldi tokenitega, IoT-seadmed eraldi VLAN-is, kohalik HTTP-liides parooliga või välja lülitatud, tootja pilv ja "
      "Bluetooth välja [HINNANG].")
    H2("6.2 Lukud ja evakuatsioon")
    T(["Lukk", "Toite kadumisel", "Sobib", "Märkus"],
      [["Elektriline vastuplaat fail-secure", "lukus; seest avatakse mehaaniliselt", "sise- ja välisuksed, kus seest avamine on mehaaniline", "Shelly NO-kontakt avab otse (pinge all = lahti)"],
       ["Elektriline vastuplaat fail-safe", "lahti", "evakuatsiooniteel, kui seest pole mehaanilist avamist", "toite kadu = uks lahti"],
       ["Magnetlukk (alati fail-safe)", "lahti", "siseuksed, klaasuksed", "voolutarve pidev; tuletõkkeuksel ainult ukse tootja loal [KONTROLLIMATA]; vajab vahereleed"],
       ["Mootorlukk", "tavaliselt lukus, seest käepide avab", "välisuks, kõrgem turvaklass", "kallim; voolutipp 1–2 A [HINNANG]"],
       ["Paanikasulus (EN 1125) / avariisulus (EN 179) elektrilise juhtimisega", "seest alati avatav", "evakuatsiooniteel", "EN 1125 võõrastele/rahvahulgale, EN 179 hoonet tundvatele töötajatele"]],
      laiused=[3.8, 3.4, 4.6, 4.8], pealkiri="Lukutüübid", sz=8.5, esimene_bold=True)
    H3("Valikureegel")
    N(["Evakuatsiooniteel avaneb uks seest **ühe liigutusega, ilma võtme ja telefonita** – eelistatult mehaaniliselt (link, EN 179 või EN 1125) "
       "ja väljast elektriline vastuplaat fail-secure. Siis ei sõltu väljapääs elektrist, võrgust ega serverist.",
       "Kui seest mehaanilist avamist pole (magnetlukk, fail-safe vastuplaat), on vaja **EN 13637 tüüpi süsteemi**: väljumisnupp, roheline "
       "avariinupp, ATS-vabastus, toite kadumisel lahti, juhtseadme rikkel lahti. Magnetlukk ainult siis, kui mehaaniline lahendus ei sobi (klaasuks).",
       "Kõrgema turvaga välisuksel mootorlukk ja OSDP-lugeja (režiim B)."])
    H3("Tulekahju korral avab ukse riistvara")
    P("**Põhimõte: tulekahjusignaal vabastab luku ja kaabli katkemine ei tohi jätta evakuatsiooniust lukku.** Vabastus toimub "
      "riistvaras: ATS-i keskseadme väljund juhib vahereleed, mille kontakt on jadamisi luku toites. Kas luku ahelas on vaherelee NO- või "
      "NC-kontakt, **sõltub ATS-i keskseadme väljundi tüübist** (tavaolekus pinge all olev väljund või häirel pingestuv järelevalvega "
      "väljund). Ühte kindlat skeemi siin ei anta: variandi valib ATS-ettevõtja, see märgitakse ühendusskeemile ja katsetatakse "
      "kasutuselevõtul (häire, lõhe, lühis). Kui valitud väljund kaabli katkemisel lukku ei vabasta, peab keskseade katkemise kohe "
      "rikkena näitama ja väljapääs seest olema mehaaniline. Vaherelee paigaldatakse ukse lähedale. (Tehnilise analüüsi skeem andis ühe "
      "kontaktitüübi; elektrianalüüsi v2 ja selle AI-ülevaatus näitasid, et õige tüüp sõltub väljundist.) Sama ahelasse jadamisi:")
    B(["**roheline avariinupp, 2-pooluseline:** üks poolus katkestab luku toite, teine annab kontrollerile häiresisendi; kui on vaja katkestada "
       "mõlemad toitejuhtmed ja anda ka häire, on vaja 3 kontakti [HINNANG];",
       "**digivõtme relee** ainult kui „luba lukustada“; kontroller loeb ATS-i ja avariinupu olekut ainult logiks; pilv ei saa vabastust tühistada;",
       "**väljumisnupp** kontrolleri sisendis ja soovitavalt otse luku ahelas (kontrolleri rikke korral peab väljumine toimima)."])
    P("Fail-secure lukuga uksel ATS-vabastus ei aita (pingevaba = lukus), seal peab väljapääs seest olema mehaaniline. ATS-iga ühendamise "
      "teeb ainult majandustegevusteate esitanud ATS-ettevõtja (ptk 8.4).")
    KAST("Shelly 1 seeria väljund on ainult NO-kontakt. Käsk „sulge kontakt 5 s“ avab fail-secure vastuplaadi, aga **magnetluku puhul "
         "tähendab sama käsk „lukusta 5 s“**. Magnetluku ahelas on seepärast alati vaherelee (CO-kontaktiga, pistikupesas vahetatav) ja "
         "ATS/avariinupp jadamisi. Shelly 1 + magnetlukk ilma vahereleeta ja riistvaralise vabastuseta **ei sobi evakuatsiooniteele**. "
         "Tootmislahenduses lülitab Shelly ainult vaherelee mähist; lukku otse lülitab ta ainult demolaual fail-secure vastuplaadi puhul [HINNANG].",
         "Elektrianalüüsi parandus: relee ja magnetlukk")
    H3("Tuletõkkeuks")
    B(["Tuletõkkeukse klass (nt EI 30, S_a, S_200) kehtib ainult katsetatud konfiguratsioonis (EVS-EN 13501-2:2023, EVS-EN 16034:2014). "
       "Uue luku freesimine või puurimine võib klassi kaotada.",
       "Kasutatakse ainult **ukse tootja lubatud** elektrilukku või vastuplaati; tootja kirjalik kinnitus säilitatakse ukse dokumentidega.",
       "Elektrilukk ei tohi takistada isesulgumist ega riivistumist; märgistusplaati ei kaeta.",
       "Lahtihoidmismagnetit ei juhi digivõtme relee üksi: ATS-i vaherelee ja käsinupp jadamisi magneti toites, digivõtme relee võib olla "
       "lisaks jadamisi (tema avanemine saab ukse ainult sulgeda – ohutu suund)."])
    H2("6.3 Toide ja aku")
    B(["**Pinge:** 12 V DC väikestel ustel ja demol, **24 V DC** pikkadel kaablitel ja mootorlukkudel. 24 V juures väheneb sama võimsuse korral "
       "pingelang voltides poole võrra ja protsendina neljandikuni (elektrianalüüsi täpsustus).",
       "**Toiteplokk akuga** (13,8 V või 27,6 V) võrgu ja aku rikke väljunditega, sügavtühjenemise kaitsega, vajadusel temperatuurikompensatsiooniga "
       "(EVS-EN 50131-6 analoogia, tüüp A) [KONTROLLIMATA sisu].",
       "**Luku pingevahemik:** akuga toiteploki pinge kõigub ~10,5 V (aku tühjenemise lõpp) kuni 13,8 V (ootelaadimine). Vali lukk, mille lubatud "
       "vahemik katab selle, või 24 V lukk, või stabiliseeritud DC/DC. (Tehnilise analüüsi arvutuses ületas 13,8 V toitel lukk 13 V ülapiiri.)",
       "**Temperatuurikompensatsioon ja lukk:** külmas tõstab kompensatsiooniga laadija siini pinge ~14,5 V-ni. See ei tohi jõuda "
       "lukule üle luku lubatud piiri: **lukk stabiliseeritud toitelt** (DC/DC) või lukk laia vahemikuga (10,5…14,6 V), või toiteplokk, mille "
       "kompensatsioon toimib ainult akuharus. Kütetud kontoris kompensatsiooni pole vaja; küsimus on konteineris.",
       "**Elektroonika DC/DC kaudu:** Shelly, ESP32 ja lugeja 9–36 V → 12 V muundurilt, et luku sisselülitusvool ega aku pingekõikumine ei "
       "taaskäivitaks kontrollerit. Shelly 1 Gen4 „stabiliseeritud 12 V“ toide ei pruugi aku vahemikku taluda [KONTROLLIMATA, tootja].",
       "**230 V toide** eraldi grupist (B6/B10), märgistatud „Läbipääs, mitte välja lülitada“."])
    T(["Juhtum", "Koormus", "Aku", "Varuaeg"],
      [["Uks magnetlukuga (fail-safe)", "0,85 A", "7 Ah", "6,6 h"],
       ["Uks vastuplaadiga (fail-secure)", "0,35 A", "7,2 Ah", "16,5 h (7 Ah akuga ~16 h)"],
       ["Kontor, 2 ust ühe ploki taga", "0,95 A", "17 Ah", "**14,3 h** — 24 h jaoks on vaja **~28,5 Ah** (nt 33 Ah), mitte 17 või 26 Ah; toiteplokk koos aku laadimisega **≥ 6 A**"],
       ["Ehituskonteiner −25 °C (k = 0,48)", "0,65 A", "26 Ah", "19,2 h; 72 h nõuab ~100 Ah"]],
      laiused=[5.4, 2.6, 2.4, 6.2], pealkiri="Aku varuaeg t = C·k/I, k = 0,8 (külmas 0,48) [HINNANG]", sz=9)
    P("**UPS võrguseadmetele:** 650 VA UPS kestab tavaliselt 40–90 min [KONTROLLIMATA, tootja], lukuaku aga 14–24 h. Kui ruuter kustub enne lukku, "
      "ei tööta režiim A. Lahendus: eraldi DC-UPS võrguseadmetele või ühine aku, mis arvestab ka ruuteri ja kommutaatori voolu – siis on 24 h "
      "jaoks vaja ≈ 54–69 Ah [HINNANG]. (28,5 Ah arvutus kehtib ainult lukkude, lugejate ja kontrolleri kohta.)")
    H2("6.4 Kaabeldus ja pingelang")
    P("Pingelang ΔU = 2·L·I·ρ/A (ρ = 0,0225 Ω·mm²/m). Kriteerium on luku lubatud pingevahemik **halvimas olekus** (aku tühjenemise lõpp ~10,5 V), "
      "mitte 230 V paigaldise 3–5 % piir.")
    T(["Juhtum", "ΔU", "Pinge lukul"],
      [["Magnetlukk 0,5 A, 0,75 mm², 20 m", "0,60 V (5,0 %)", "11,40 V võrgul"],
       ["Magnetlukk 0,5 A, 0,22 mm² (häirekaabel), 20 m", "2,05 V (17 %)", "9,95 V — **häirekaabli soont ei kasutata luku toiteks**"],
       ["Vastuplaat 1,3 A, 1,5 mm², 20 m, aku lõpp 10,5 V", "0,78 V", "9,72 V — alla 11 V"],
       ["Sama 24 V lukuga 0,65 A", "0,39 V (1,6 %)", "23,6 V"]],
      laiused=[7.4, 3.6, 5.6], pealkiri="Pingelang (elektrianalüüs, arvutus E1)", sz=9)
    B(["**Üle 20 m või üle 1 A → 24 V lukk või toiteplokk ukse juurde.**",
       "Luku toide LiYY 2×1,5 või 4×1,0; signaalid LiYY 6×0,22; OSDP keerdpaar 120 Ω; Wiegand ekraanitud LiYCY [HINNANG].",
       "**Iga luku ja lugeja haru eraldi kaitse** (T1A…T2A) toiteploki juures ja **aku kaitse aku klemmi juures**.",
       "Nõrkvoolukaabel lahus 230 V kaablitest; ekraanid maandatakse ühest otsast; RS-485 liini otstes 120 Ω terminaatorid.",
       "Välistel kaablitel (lugeja väljas, värav, konteinerid, 4G antenn) liigpingekaitse (SPD)."])
    H2("6.5 Töökindlus")
    T(["Teema", "Lahendus"],
      [["Induktiivne koormus", "kaitse luku mähise klemmidel: DC-l diood (magnetlukul diood + Zener/TVS kiiremaks vabanemiseks), AC-l varistor/RC"],
       ["Relee kulumine", "200 avamist päevas = 73 000 tsüklit aastas; 100 000-tsükliline relee kestaks nimikoormusel ~1,4 a [KONTROLLIMATA, tootja]. Lukku lülitab DIN-vaherelee pistikupesas, Shelly lülitab ainult vaherelee mähist; tsüklite loendur"],
       ["Taaskäivitus", "relee algolek „Off“ (lukk kinni/turvaline), skript käivitub automaatselt; kontroller ei anna käivitudes impulssi"],
       ["Heartbeat", "server märgib seadme „viimati nähtud“ ja teavitab haldurit, kui seade pole 60 s küsinud; telefon näitab „Uks ei vasta“, mitte „Uks on avatud“ (ettepanek, näidises veel mitte)"],
       ["Võrk", "välisuksel kaabel/PoE, siseustel Wi-Fi; kahe WAN-iga ruuter (kaabel + 4G)"],
       ["Seire", "uksekontakt, luku olekuandur, voolumõõtmine releel, aku ja toiteploki rikkeväljundid kontrollerisse"],
       ["Häirekindlus", "tööstuslikul objektil tööstuskeskkonna EMÜ-ga seadmed (EVS-EN IEC 61000-6-2); Shelly on olme-/kontoriseade"]],
      laiused=[3.4, 13.2], pealkiri="Töökindluse meetmed (elektrianalüüs)", sz=8.5, esimene_bold=True)
    H2("6.6 Offline-töö")
    P("Režiim A vajab võrku (otsus tehakse pilves). Režiim B on **kavandatud** nii, et kontroller kontrollib koodi kohaliku, lühikese kehtivusega nimekirja järgi ja "
      "puhverdab sündmused (≥ 1 000) hiljem saatmiseks; kellaaeg NTP + RTC, sest muutuv kood vajab kella täpsust ± 30 s. Seepärast soovitus: "
      "**välisuksel ja ehitusobjektil režiim B, siseustel režiim A** koos muutuva QR-iga; haldurile mehaaniline varuvõti. "
      "Lisavõimalus on kohapealne edge-koopia (Raspberry Pi vms: kohalik nimekiri, logipuhver) 100–250 €/objekt [HINNANG]. "
      "**Teostatavus on tõendamata** [HINNANG]: tavaline läbipääsukontroller muutuvat koodi ei kontrolli ja Wiegand 26 bitti seda ei mahuta, "
      "seega on vaja oma püsivara (nt ESP32) või varuvariandina kaart/PIN.")
    H2("6.7 Ehitusobjekt")
    B(["Lugeja väljas vähemalt IP65, karp IP66, konteineri sees IP54; vandalismikindel kate IK10 [KONTROLLIMATA: EN 62262 olek].",
       "**Külm:** Shelly 1 Gen4 töövahemik −20…+40 °C ei sobi kütmata konteinerisse (ka suvel võib karbis olla üle +40 °C); tööstusruuter "
       "−40…+75 °C sobib karbis; plii-AGM aku mahtuvus külmas ~50–60 %; LiFePO4 ei tohi laadida alla 0 °C ilma küttega; tühjenenud pliiaku "
       "elektrolüüt võib külmuda juba −5…−10 °C juures [KONTROLLIMATA, tootja]. Temperatuurikompensatsiooniga laadija on vajalik, kuid lukk "
       "toidetakse stabiliseeritud toitelt (ptk 6.3).",
       "**Kondensaat:** küttekeha termostaadiga, membraanventiil, kaablid altpoolt, klemmid karbi ülaossa, aku põhja.",
       "**Toide** ehitusplatsi kilbist rikkevoolukaitsega (EVS-HD 60364-7-704:2018), kaabel H07RN-F kaitstult; 4G ruuter välisantenniga "
       "(metallkonteiner varjestab).",
       "Komplekt kolib objektilt objektile; ümberpaigaldus ≈ 12–16 h [HINNANG]."])
    H2("6.8 Hooldus")
    T(["Mida", "Kui tihti [HINNANG]"],
      [["Avariinupp, väljumisnupp, „uks jäi lahti“", "kord kuus (haldur)"],
       ["ATS-vabastus (kõik evakuatsiooniteel olevad elektrilukud vabanevad)", "ATS-i hoolduse graafikus; juhitavate seadmete kontroll vähemalt kord aastas (SiM m 1 § 27 lg 2 p 4)"],
       ["Lukud, vastuplaadid; pinge lukul koormusega, laadimispinge, rikkeväljundid", "kord kvartalis (objektil kord kuus)"],
       ["Tuletõkkeuks: sulgur, tihendid, riivistumine", "kord poolaastas / tootja järgi"],
       ["Akud: sisetakistus või varuaja test; vahetus", "kord aastas; vahetus 3–5 a (soojas või konteineris 2–3 a)"],
       ["Lugejad, ekraanid, kella täpsus", "kord kvartalis (objektil kord kuus)"],
       ["Püsivara, sertifikaadid, võtmed", "kord kuus kontroll, kriitiline uuendus kohe; võtmete roteerimine kord aastas"],
       ["Offline-režiimi test", "kord poolaastas"],
       ["SPD näidikud, klemmid, kondensaat, karbi küte", "kord kvartalis ja pärast äikest"]],
      laiused=[9.0, 7.6], pealkiri="Hooldusgraafik (tehniline ja elektrianalüüs koos)", sz=8.5)
    KAST("Elektrianalüüsi eraldi AI-ülevaatus (mitte pädeva elektriinseneri allkiri): v0.1 hinne 7/10, v2 pärast parandusi 9/10. "
         "Selles peatükis on arvestatud v2 järeldused (ATS-vaherelee põhimõte, luku pingevahemik külmas, aku ~28,5 Ah ja toiteplokk ≥ 6 A). "
         "Ülevaatuse väike leid kasutuselevõtu protokolli kohta (lõhe ATS-liinil ei vabasta lukku igas variandis) on lisas C arvestatud. "
         "Enne paigaldusjuhendit vaatab lahenduse üle ja kinnitab pädev elektriinsener [__].", "Elektrianalüüsi staatus")

def ptk7():
    H1("7. Seadmed ja kulud")
    P("Kõik summad on [HINNANG]: käibemaksuga turuhinna suurusjärk (kuulutused ja müüjalehed 11.2026), paigaldustöö 45 €/h; mitte pakkumised. "
      "Tootjanimed on näited, mitte soovitused.", sz=10)
    H2("7.1 Kolm konfiguratsiooni")
    P("Varasem kontseptsiooni hinnang 3 000–8 000 € oli alumises osas liiga madal, kui välisuks ja tuletõkkeuks vajavad uusi "
      "sertifitseeritud komponente.", sz=10)
    T(["Konfiguratsioon", "Seadmed €", "Töö h", "Töö €", "Kokku € (tehniline analüüs)", "Elektrianalüüsi lisad €", "Kokku koos lisadega €"],
      [["a) Investorinäidis (demolaud)", "1 628", "20", "900", "2 528", "≈ +180", "≈ 2 710"],
       ["b) Kontor + ladu, 50 töötajat", "5 908", "64", "2 880", "8 788", "≈ +670…750", "≈ 9 460–9 540"],
       ["c) Ehitusobjekt (2 konteinerit, tööriistakapp, värav)", "3 409", "31", "1 395", "4 804", "≈ +790…840", "≈ 5 590–5 640"]],
      laiused=[4.4, 1.8, 1.3, 1.6, 2.6, 2.4, 2.5], pealkiri="Ühekordne kulu kolmele konfiguratsioonile [HINNANG]", sz=8.5, esimene_bold=True)
    P("Konfiguratsioon b: välisuks (režiim B, mootorlukk), laouks evakuatsiooniteel (režiim B, EN 179 käepide + fail-secure vastuplaat, "
      "võimalik tuletõkkeuks), 2 siseust (režiim A, muutuv QR, vastuplaat), snäkiautomaadi MDB-liides, kohvimasina liides, 3 printeri "
      "QR-vabastus, võtmekapp 5 autole. Isetehtud võtmekapiga (≈ 550 €) ≈ 7 840 €; kui välisuksel on juba ühilduv mootorlukk ja laouksel EN 179 sulus (ei osteta uut), ≈ 7 170 € "
      "(tehnilise analüüsi hinnangud ilma elektrianalüüsi lisadeta).")
    T(["Rühm", "Peamised read", "≈ €"],
      [["Uksed ja lukud", "2-ukse OSDP-kontroller, 2 välislugejat IP65, mootorlukk, tuletõkkeukse vastuplaat, 2 siseukse vastuplaati, EN 179 käepide, 2 releed, 2 muutuva QR-i ekraani", "1 880"],
       ["Toide ja ohutus", "2 toiteplokki akuga, akud, väljumis- ja avariinupud, uksekontaktid, ATS-liidese releed + ATS-ettevõtja töö", "848"],
       ["Võrk ja kaabeldus", "PoE-kommutaator + UPS, kaabel ja paigaldusmaterjal", "630"],
       ["Automaadid, printerid, autod", "MDB-liides, kohvimasina liides, 3 printeri QR-vabastus, võtmekapp", "2 450"],
       ["Muu", "kleebised, plakatid", "100"],
       ["**Seadmed kokku**", "", "**5 908**"],
       ["Paigaldustöö", "4 ust × 7 h, ATS-liides 6 h, MDB 4 h, kohv 3 h, printerid 4 h, võtmekapp 6 h, võrk 3 h, kasutuselevõtt ja koolitus 10 h = 64 h", "2 880"],
       ["**Kokku (b)**", "", "**8 788**"]],
      laiused=[3.6, 10.6, 2.4], pealkiri="Konfiguratsiooni b kokkuvõte (tehnilise analüüsi BOM 6.b, ridade rühmad)", sz=8.5)
    P("**Režiim B arendus:** BOM-is on lugeja ja kontroller, kuid muutuva koodi kohalik kontroll vajab oma püsivara arendust (hind [__], "
      "teostatavus tõendamata) või varuvariandina kaarti/PIN-i.", sz=10)
    H3("Elektrianalüüsi lisad (olulisemad)")
    B(["vaherelee pistikupesaga (CO-kontakt) + diood/varistor igale lukule;",
       "DC/DC 9–36 V → 12 V elektroonikale;",
       "kontoris aku 2 × 17 Ah → 2 × 33 Ah (≥ 28,5 Ah ploki kohta, 24 h varuaeg) ja toiteplokk 5 A → ≥ 6 A; demolaual toiteplokk 3 A → 5 A;",
       "UPS asemel 12/24 V DC-toitega ruuter/kommutaator akutoiteplokil (siis aku ≈ 54–69 Ah) või eraldi DC-UPS;",
       "harukaitsmed ja aku kaitse; ehitusobjektil liigpingekaitse, temperatuurikompensatsiooniga toiteplokk (lukk stabiliseeritud toitelt), temperatuuri- ja niiskusandur;",
       "voolumõõtmisega relee, luku olekuandur, mõõtmised ja protokoll kasutuselevõtul."])
    P("Kui raha on vähe, on kõige olulisemad: vaherelee, DC/DC, aku, kaitsmed ja konteineril liigpingekaitse.")
    H2("7.2 Ülalpidamine aastas")
    T(["Rida", "a) demolaud", "b) kontor + ladu", "c) ehitusobjekt"],
      [["Hooldustöö (45 €/h)", "180 €", "720 €", "720 €"],
       ["Asendused (akud, lukud, ~10 % riistvarast)", "100 €", "590 €", "590 €"],
       ["Side (SIM)", "0 €", "0 € (kliendi võrk)", "60 €"],
       ["**Riistvara hooldus kokku**", "**≈ 280 €**", "**≈ 1 300 €**", "**≈ 1 370 €**"]],
      laiused=[6.2, 3.2, 3.6, 3.6], pealkiri="Riistvara hooldus aastas (tehniline analüüs) [HINNANG]", sz=9)
    T(["Rida (konfiguratsioon b, 50 töötajat, 4 ust)", "€/a", "Allikas"],
      [["Tarkvara litsents (SaaS), nt 3 €/kasutaja/kuu + 5 €/uks/kuu", "≈ 2 000", "kontseptsioon p 5 (näidishind)"],
       ["Pilv, side, teavitused", "0–300 (sees litsentsis)", "kontseptsioon p 5"],
       ["Riistvara hooldus partneri poolt", "≈ 1 300", "tehniline analüüs p 7"],
       ["Sisemine haldus (kontorijuht 1–2 h/näd, ~25 €/h)", "1 300–2 600", "kontseptsioon p 5"],
       ["**Kokku**", "**≈ 4 600–6 200 €/a (≈ 90–125 €/töötaja)**", "liidetud selles dokumendis"],
       ["Lisaks võimalik: printerite QR-vabastuse litsents", "aastatasu [__]", "tehniline analüüs, BOM 6.b"],
       ["Lisaks: Cloudflare'i tasuline plaan tootmises (tasuta plaan kannab ühe pollitava seadme)", "nt 5 $/kuu [KONTROLLIMATA]", "kontseptsioon p 3, näidise README"]],
      laiused=[8.0, 4.6, 4.0], pealkiri="Aastane ülalpidamine kokku [HINNANG]", sz=9)
    P("Kontseptsiooni hinnang 3 500–5 500 €/a eeldas riistvara hoolduseks 300–700 €, mis kehtib, kui tööd teeb kliendi haldur; partneri "
      "hooldusena lisandub töö. Kokkuhoiu poolel: kaartide ost ja kadumine, kohvikassa ja käsitsi nimekirjad (raamatupidaja 2–4 h kuus), "
      "automaatne sõidupäevik, väiksemad tööriistakaod. Kokkuhoidu ei ole pilootkliendi andmetega mõõdetud [__].")
    H2("7.3 Tasuvus")
    P("Tasuvust ei saa ilma pilootandmeteta väita. Allpool on stsenaariumid [HINNANG], mis näitavad, millest tasuvus sõltub. "
      "Aastakulu (konfiguratsioon b): ühekordne ≈ 9 500 € jaotatuna 5 aastale [HINNANG eluiga] ≈ 1 900 €/a + ülalpidamine 4 600–6 200 €/a "
      "= **≈ 6 500–8 100 €/a**. Sinna kuulub ka sisemine haldus (1 300–2 600 €/a), mis osaliselt asendab praegust võtmete ja nimekirjade "
      "haldust – seda osa ei ole mõõdetud.")
    T(["Kokkuhoiu allikas", "Madal", "Keskmine", "Kõrge", "Alus"],
      [["Raamatupidaja aeg (kohvikassa, nimekirjad) 2–4 h/kuu × ~25 €/h", "600 €", "900 €", "1 200 €", "kontseptsioon p 5; tunnihind kontseptsiooni sisemise töö järgi"],
       ["Ära hoitud tööriistakaod (mõõteseade 500–3 000 €/tk)", "1 × 500 €", "3 × 1 500 €", "5 × 3 000 €", "stsenaarium [HINNANG]"],
       ["Kaartide ost ja kadumine, lukuvahetus kaotatud võtme tõttu", "[__]", "[__]", "[__]", "kliendi andmed puuduvad"],
       ["**Kokku (ilma kaartide ja lukkudeta)**", "**≈ 1 100 €/a**", "**≈ 5 400 €/a**", "**≈ 16 200 €/a**", ""],
       ["Võrdlus aastakuluga ≈ 6 500–8 100 €/a", "ei tasu", "ei tasu või piiri peal", "tasub", ""]],
      laiused=[5.4, 2.0, 2.3, 2.3, 4.6], pealkiri="Tasuvuse stsenaariumid, konfiguratsioon b [HINNANG]", sz=8.5, esimene_bold=True)
    P("Järeldus: tasuvus sõltub peamiselt **tööriistakadudest** ning **kaartide ja lukuvahetuse kulust**; arvestamata on ka alternatiivi kulu "
      "(nt kaardisüsteem, mida klient muidu ostaks) ja turvaväärtus. Pilootkliendi andmetega [__] arvutatakse tasuvus uuesti. Kuni selleni "
      "ei esitata kliendile tasuvusväidet.")
    H2("7.4 Kes mida teeb")
    T(["Tase", "Kes", "Mida teeb"],
      [["Platvorm", "tarnija [ettevõtte nimi]", "server, uuendused, turvalisus, varukoopiad, tugi; volitatud töötleja leping"],
       ["Kliendi haldur", "kontori- või personalijuht", "kasutajad, rühmad, õigused, töösuhte lõpp; igakuine avariinupu ja ukse kontroll"],
       ["Raamatupidaja", "kliendi raamatupidaja", "kuuaruande kinnitamine ja import; arestimisvaba osa arvestus"],
       ["Paigaldus ja riistvara", "partner: elektri- või turvafirma", "lukud, releed, toiteplokid, kaabeldus, hooldus; 230 V töö pädev isik"],
       ["ATS-ühendus", "majandustegevusteate esitanud ATS-ettevõtja", "keskseadme väljund, vaherelee, katsetus ja protokoll, iga-aastane kontroll"],
       ["Tuletõkkeuks", "ukse tootja + projekteerija", "lubatud lukk ja kirjalik kinnitus; vajadusel ehitusprojekt"],
       ["IT", "kliendi IT-partner", "arvutite ja printerite liides, Wi-Fi, VLAN"]],
      laiused=[3.2, 4.8, 8.6], pealkiri="Rollid ja vastutus", sz=8.5, esimene_bold=True)

def ptk8():
    H1("8. Õiguslik raamistik")
    P("Peatükk põhineb õigusanalüüsil (seis 01.11.2026, Riigi Teataja kehtivad tervikteksted; RT viited lisas D). GDPR-i artiklid ja "
      "Andmekaitse Inspektsiooni juhendid ei olnud kontrollimisel kättesaadavad ja on märgitud [KONTROLLIMATA]. **See ei ole õigusabi "
      "advokaadi tähenduses**; lepingupõhjad ja müügimaterjal vaadatakse enne kasutamist juristiga üle.", sz=10)
    H2("8.1 Kokkuvõte")
    T(["Nõue", "Kohustuslik?", "Mida toode peab tegema", "Näidises", "Risk, kui ei tee"],
      [["Evakuatsiooniuks avaneb ilma telefoni ja serverita (SiM m 17 § 48 lg 1 p 3, § 55 lg 2)", "**Jah**, ka olemasolevas hoones", "mehaaniline väljapääs või riistvaraline vabastus; QR ainult sissepääsuks", "ei kohaldu (demolukk on veebileht)", "kõrge: elu ja tervis, ettekirjutus, tootevastutus"],
       ["ATS-iga ühendamine ainult ATS-ettevõtja kaudu (TuOS § 33; SiM m 1 § 20 lg 5, § 27)", "**Jah**", "sõltumatu kontakt, sündmuse logi, iga-aastane katsetus", "puudub", "kõrge"],
       ["EVS-EN 179 / 1125 / 13637", "hea tava ja eeldus, mitte õigusaktiga kohustuslik", "paigaldaja kasutab sertifitseeritud sulgureid", "ei kohaldu", "keskmine: vaidluses tõendamine analüüsiga"],
       ["GDPR: alus, teavitus, säilitusajad, DPIA (art 6, 13, 35 [KONTROLLIMATA]; TLS § 28 lg 2 p 11, § 41)", "**Jah**", "teavitus, DPIA põhi, „Minu andmed“, automaatne kustutamine", "osaliselt: IP ainult räsina; teavitus, DPIA, „Minu andmed“, kustutamine puuduvad", "kõrge: trahv kuni 10 M € / 2 % käibest (IKS § 62)"],
       ["Volitatud töötleja leping, EL-i andmeasukoht (art 28, 44 [KONTROLLIMATA])", "**Jah**", "DPA, alamtöötlejate loend", "puudub; andmeasukoht kontrollimata", "kõrge: B2B ja avalik sektor nõuavad"],
       ["Palgast kinnipidamine (TLS § 78; TMS § 132)", "**Jah**", "kuu lõpu nõusolek või limiit, arestimisvaba osa, vaikimisi kohene makse", "puudub: summa arvutatakse ilma nõusoleku, limiidi ja arestimisvaba osata", "keskmine: ette antud nõusolek tühine"],
       ["Erisoodustus (TuMS § 48), käibemaks (KMS § 30)", "**Jah**", "turuhind, erisoodustuse veerg; sõidupäevik üks tõend ettevõtluskasutuse kohta", "sõidupäevik CSV olemas; erisoodustuse veerg ja „ainult töö“ režiim puuduvad", "keskmine"],
       ["Säilitamine 7 a (RPS § 12; MKS § 58)", "**Jah**", "ostu- ja päevikuandmeid ei kustutata enne", "andmeid ei kustutata üldse (automaatset kustutamist pole)", "madal kuni keskmine"],
       ["Töötaja oma telefon (TLS § 40 lg 1; VÕS § 628 lg 2)", "kokkulepe", "alternatiiv ilma telefonita", "puudub (telefon ainus kandja)", "keskmine"],
       ["Turvategevus (TurvaTS § 7, § 11)", "ainult häireedastusega süsteemil", "valvekeskuse liides ainult turvafirma kaudu", "ei kohaldu", "madal"],
       ["Elektritööd (SeOS § 7, 13; MTM m 74 § 3–4)", "**Jah**, üle 50 V AC", "12/24 V SELV komplekt; 230 V teeb elektrik", "ei kohaldu", "keskmine"],
       ["Tootevastutus ja küberkerksus (VÕS § 1061–1067; EL 2024/2853, 2024/2847 [KONTROLLIMATA])", "**Jah**", "kindlustus, haavatavuste käsitlus, CE kord", "puudub", "kõrge riistvarakomplekti müügil"],
       ["IP selgus (AutÕS § 28, § 32 lg 5, § 49 lg 1)", "müügi eeldus", "õigused ühel OÜ-l, kirjalikud üleandmised", "litsentsimärked olemas; üleandmised tegemata [__]", "kõrge: ebaselge omandi eest ei maksta"]],
      laiused=[4.3, 2.3, 3.8, 3.4, 2.8], pealkiri="Õiguslike nõuete kokkuvõte (õigusanalüüs): mida toode peab tegema ja mis on näidises", sz=7.5)
    H2("8.2 Isikuandmed ja töötaja jälgimine")
    B(["Süsteem on lubatud. **Tööandja on vastutav töötleja, tarnija volitatud töötleja.** Igal andmeliigil peab olema eesmärk.",
       "Õiguslik alus: leping (ostud, kinnipidamine, sõidupäevik), juriidiline kohustus (raamatupidamine, maks), õigustatud huvi (ukse- ja "
       "turvalogi). **Nõusolek ei sobi töösuhtes põhialuseks** [KONTROLLIMATA: GDPR art 6, EDPB juhend 05/2020].",
       "**Mõjuhinnang (DPIA) tuleb teha**, sest jälgimine on süstemaatiline ja andmeid ühendatakse (uks + ost + auto). Tarnija koostab põhja (tegemata).",
       "Jälgimine peab olema proportsionaalne (TLS § 28 lg 2 p 11); logisid ei kasutata salajaseks tööaja- ega käitumisjälgimiseks. Kui ukselogi "
       "hakatakse kasutama tööaja arvestuseks, on see uus eesmärk ja töötajat teavitatakse enne.",
       "Töötajal on õigus oma andmetega tutvuda (TLS § 41) → rakenduses „Minu andmed“ ja eksport (tootmisetapis; näidises puudub).",
       "Asukoha kontroll (Wi-Fi/IP, Bluetooth) ainult sündmusepõhiselt, mitte pidevalt; GPS-rada vaikimisi ei koguta."])
    T(["Andmed", "Säilitamine", "Alus"],
      [["Ostud, kinnipidamised, kuuaruanne", "7 a majandusaasta lõpust", "RPS § 12 lg 1–2; MKS § 58"],
       ["Sõidupäevik ja erisoodustuse arvestus", "7 a", "MKS § 58"],
       ["Ukse- ja seadmelogi", "seadusega määramata; soovitus 3–12 kuud, intsidendi korral menetluse lõpuni", "säilitamise piirang [KONTROLLIMATA: GDPR art 5]"],
       ["Töösuhte lõpp", "ligipääs kaob kohe (näidises tehtud); logid kustuvad tähtaja lõpus automaatselt (tootmisetapis)", "[KONTROLLIMATA: GDPR art 5, 17]"]],
      laiused=[5.2, 6.0, 5.4], pealkiri="Säilitustähtajad (sihtseaded; näidises automaatset kustutamist veel pole)", sz=9)
    H2("8.3 Palgast kinnipidamine ja maksud")
    P("**Kinnipidamine on lubatud ainult töötaja kirjalikku taasesitamist võimaldavas vormis nõusolekul (TLS § 78 lg 1).** Enne tasaarvestamise "
      "õiguse tekkimist antud nõusolek (nt töölepingus „kõik ostud peetakse palgast kinni“) on tühine (TLS § 78 lg 2). Näidises nõusoleku "
      "küsimist veel pole. Tootmises:")
    N(["**Põhilahendus:** kuu lõpus kinnitab töötaja rakenduses kuu ostude summa kinnipidamise – nõue on siis juba olemas. Näidistekst on lisas B.",
       "**Limiidi lahendus:** tööandja kannab ostud kuni limiidini (nt 30 €/kuu) ja töötaja annab ette nõusoleku ainult limiiti ületava osa "
       "kinnipidamiseks. Seaduse erand käib „tööandja arvel tehtavate kulude kokkulepitud limiidi“ kohta; selle kasutamine kohvi ja snäkkide "
       "puhul on tõlgendus [tõlgendus]. Limiidini kaetud osa on erisoodustus.",
       "**Lihtsaim:** töötaja maksab kohe rakenduses (kaart, pangalink); siis TLS § 78 ei kohaldu. Soovitus: vaikimisi kohene makse, kinnipidamine lisavõimalus.",
       "Kui töötaja kinnitust ei anna, summat kinni ei peeta, vaid esitatakse arve."])
    P("**Arestimisvaba osa** (TLS § 78 lg 4 → TMS § 132): kuupalga alammäära (alates 01.04.2026 946 €/kuu, VV m 36) ulatuses ei arestita; iga ülalpeetava "
      "kohta suureneb 1/3 alammäära võrra. Kas arvestada neto või bruto, ei selgu sättest otse; konservatiivne on neto ja arvestus jääb "
      "raamatupidajale [tõlgendus]. Töösuhte lõpus sisse nõudmata jäänud võlg on erisoodustus (TuMS § 48 lg 4 p 9).")
    T(["Olukord", "Tagajärg", "Mida toode teeb"],
      [["Kohv või snäkk tasuta või alla turuhinna", "erisoodustus (TuMS § 48 lg 4 p 7): tulumaks 22/78 ja sotsiaalmaks 33 %; TSD lisa 4", "kuuaruandes erisoodustuse veerg"],
       ["Täishinnaga müük", "erisoodustust ei teki; müük on käive (KMS § 4)", "hinnakirjas turuhind ja ajalugu"],
       ["Kõigile tasuta kontori kohv, tee, vesi", "MTA praktika järgi tavaliselt mitte erisoodustus [KONTROLLIMATA]", "tasuta kategooria, tarbimist isikuga ei seota"],
       ["Sõiduauto erakasutuse võimaldamine", "erisoodustus 1,96 €/kW kuus (üle 5 a autol 1,47 €/kW), **kilomeetrite järgi ei arvutata** (TuMS § 48 lg 8)", "**sõidupäevik ei vähenda erisoodustust**; „ainult töö“ autodel keelatakse tööajaväline broneering"],
       ["Sõiduauto sisendkäibemaks", "50 %; 100 % ainult eranditult ettevõtluse tarbeks (KMS § 30 lg 3, lg 4 p 5)", "sõidupäevik on **üks tõend** eranditult ettevõtluskasutuse kohta (MTA ootab seda praktikas [KONTROLLIMATA]); täielikum koos võtmekapiga"]],
      laiused=[4.4, 6.6, 5.6], pealkiri="Maksud", sz=8.5, esimene_bold=True)
    H2("8.4 Tuleohutus")
    B(["Evakuatsiooniteel olev uks on **pidevalt hõlpsasti avatav kõikidele kasutajatele** (SiM m 17 § 48 lg 1 p 3). Väljumiseks ei tohi vaja "
       "olla telefoni, QR-i, võtit ega võrku. Nõue kehtib ka olemasolevates hoonetes (§ 55 lg 2) ja kogu kasutusaja (§ 3 lg 3).",
       "**Tulekahju korral avab ukse riistvara, mitte tarkvara:** ATS-i vaherelee ja kahepooluseline avariinupp jadamisi luku toites; "
       "evakuatsioonil mehaaniline väljumine seest.",
       "EVS-EN 179, 1125 ja 13637 ei ole õigusaktiga kohustuslikud, kuid nende järgimine on hea tava ja lihtsaim tõend; muidu tuleb vastavust "
       "tõendada analüütiliselt (SiM m 17 § 3 lg 4).",
       "ATS-iga ühendamine on ATS-i ehitamine: teeb **majandustegevusteate esitanud ATS-ettevõtja** (TuOS § 33), sõltumatu kontaktiga "
       "(SiM m 1 § 20 lg 5), katsetus ja protokoll, iga-aastane kontroll.",
       "Evakuatsiooniukse elektriline vabastussüsteem võib olla tuleohutuspaigaldis (TuOS § 30 lg 1 p 9) → omaniku hoolduskohustus.",
       "Elektriluku lisamine tuletõkke- või evakuatsiooniuksele, mis muudab ukse omadusi (lukustusloogika, ATS-vabastus), on tõenäoliselt "
       "tehnosüsteemi ümberehitamine: mitteelamus **ehitusteatis ja ehitusprojekt** (EhS lisa 1) [tõlgendus]. Klassi säilimist kinnitab ukse tootja."])
    H2("8.5 Paigaldus: load ja pädevus")
    B(["**Kontseptsiooni eeldus „tegevusluba“ oli ebatäpne.** Tegevusluba on vaja ainult turvamiseks (TurvaTS § 11 lg 1).",
       "Valveseadmestiku paigaldus ja hooldus nõuab **majandustegevusteadet ja kutsega töötajat** (TurvaTS § 11 lg 2, § 7 lg 3 ja 5). "
       "Valveseadmestik on süsteem, mis edastab automaatse häireteate turvaettevõtjale (TurvaTS § 7 lg 1).",
       "Puhas läbipääsusüsteem ilma häireedastuseta turvafirmale **tõenäoliselt ei ole valveseadmestik** [tõlgendus; PPA seisukohta ei kontrollitud].",
       "12/24 V SELV-luku ja relee ühendamine on lubatud ka tavaisikule (MTM m 74 § 4); **230 V ühendused** (toiteplokk, Shelly 230 V, kilp) on "
       "elektritöö, mida teeb pädev isik; ettevõtja esitab majandustegevusteate (SeOS § 13)."])
    H2("8.6 Tarnija vastutus")
    B(["Volitatud töötleja leping (DPA), alamtöötlejate loend (nt Cloudflare), turvameetmed, rikkumisest teavitamine [KONTROLLIMATA: GDPR art 28, 32–33].",
       "Cloudflare on USA ettevõte: kasutatakse EL-i andmeasukohta ja SCC/DPF alust [KONTROLLIMATA]. **Müügis ei väideta „andmed ainult EL-is“ enne kontrolli.**",
       "Tootja vastutab puudusega toote põhjustatud kahju eest ja **toode on ka tarkvara** (VÕS § 1061, 1063); seda vastutust ei saa lepinguga "
       "piirata (VÕS § 1067). Komplekti oma nime all müües on tarnija tootja. Vajalik: vastutuskindlustus [__] ja disain, kus väljapääs ei sõltu tarkvarast.",
       "Uus EL-i tootevastutuse direktiiv ja küberkerksuse määrus (digielementidega tooted) [KONTROLLIMATA: tähtajad]; isetehtud ESP32 plaat on uus toode, "
       "mille vastavushindamine on tarnija kohustus.",
       "Küberturvalisuse seadus väikest tarnijat otse ei puuduta, kuid KOV ja avalik-õiguslikud kliendid nõuavad tarneahela turvanõudeid (KüTS § 3).",
       "Korteriühistu on B2B klient; kui korteriomanik maksab otse tarnijale, on ta tarbija (VÕS § 52 jj)."])
    H2("8.7 Intellektuaalne omand")
    B(["Kood on kaitstud autoriõigusega kui kirjandusteos, registreerimata (AutÕS § 4 lg 3 p 3, § 7). **Idee, kontseptsioon ja funktsionaalsus ei ole kaitstud** "
       "(AutÕS § 5 p 1 ja 8) – „QR + relee + kuuaruanne“ äriideed võib igaüks kasutada.",
       "Autor on füüsiline isik; OÜ saab varalised õigused ainult kirjaliku lepinguga (AutÕS § 28, § 49 lg 1). Töötaja loodud programmi puhul on "
       "tööandjal ainulitsents (§ 32 lg 5); töövõtjalt tuleb õigused kirjalikult üle võtta.",
       "AI abil loodud kood: kaitstud on osa, kus inimene tegi loomingulisi valikuid (arhitektuur, kohandamine, ülevaatus) [KONTROLLIMATA: kohtupraktika]. "
       "Margo panus dokumenteeritakse (nõuded, disain, ülevaatus, Giti ajalugu).",
       "Ärisaladus kaitseb ainult siis, kui salajasuse hoidmiseks on võetud meetmed: NDA, privaatne repo, ligipääsu piiramine (EKTÄKS § 5 lg 2).",
       "Kolmandate osapoolte avatud lähtekood (jsQR Apache-2.0, QR-generaator MIT) – litsentsimärked jäävad alles.",
       "Soovitus: IP koondatakse enne läbirääkimisi ühe OÜ nimele [__ OÜ nimi]."])

def ptk9():
    H1("9. Eelised ja puudused")
    P("Võrdlus kahe tavapärase alternatiiviga: (1) kaardisüsteem ustele ja (2) võtmed + Excel + kohvikassa. Kaardisüsteemi kohta on siin ainult "
      "allikates olevad üldised väited; konkreetse tootja võrdlust ei ole tehtud.", sz=10)
    T(["#", "Eelis", "QR-digivõti", "Kaardisüsteem", "Võtmed + Excel + kassa"],
      [["1", "Töösuhte lõpp", "üks klõps sulgeb digivõtmega juhitud uksed, autod, automaadid, seadmed", "kaart tuleb blokeerida; muud süsteemid eraldi", "võtmed tagasi nõuda, nimekirjad käsitsi"],
       ["2", "Kandja", "töötaja telefon; alternatiiv (kaart, PIN) neile, kes telefoni ei kasuta", "kaardi ost, kadumine, väljastamine", "võtmed, lukkude vahetus kadumisel"],
       ["3", "Riistvara uksel", "siseuksel relee 20–60 € ilma lugejata (uks kokku ≈ 550–700 € [HINNANG])", "lugeja ja kontroller igal uksel", "mehaaniline lukk"],
       ["4", "Ulatus", "uksed, tööriistad, autod, automaadid, printerid ühes logis", "katab uksi", "eri kohtades, osaliselt mälus"],
       ["5", "Automaadid ja kinnipidamine", "kuu summa töötaja kaupa (näidises); nõusoleku vorm lisas B, rakenduses tootmisetapis", "–", "kohvikassa, käsitsi nimekiri"],
       ["6", "Sõidupäevik", "odomeeter ja eesmärk igal sõidul; üks tõend käibemaksu jaoks", "–", "paber, sageli puudulik"],
       ["7", "Inventari vastutus", "näha, kelle käes tööriist on", "–", "Excel, kui seda peetakse"],
       ["8", "Ajutine ligipääs", "plaanis: alltöövõtja/külalise link kokkulepitud ajaks", "ajutine kaart", "võtme üleandmine"],
       ["9", "Kulud õigesse kohta", "printer, auto, seade objekti/projekti kaupa", "–", "käsitsi"],
       ["10", "Juurutus ja laiendus", "uus kleebisega objekt (tööriist, seade) minutitega; elektrilukuga uks vajab paigaldust ≈ 7 h [HINNANG]", "paigaldaja töö iga uksega", "uus võti"]],
      laiused=[0.7, 2.8, 4.8, 4.0, 4.3], pealkiri="10 eelist võrreldes alternatiividega", sz=8)
    P("Kontseptsiooni väitel on kaardisüsteem 4 uksele (kontroller, lugejad, tarkvara, paigaldus) samas või kõrgemas hinnasuurusjärgus "
      "kui digivõti, kuid katab ainult uksi; pakkumisi ega hinnaandmeid selle kohta ei ole kogutud [KONTROLLIMATA]. Välisuksel ja kõrge turvatasemega ruumis võib kaart jääda – digivõti saab seda täiendada.")
    H2("9.1 Puudused ja piirangud")
    T(["Puudus", "Mõju", "Mida teha"],
      [["Vajab nutitelefoni; režiim A vajab internetti", "võrgukatkestusel siseuks ei avane", "režiim B välisuksel, varuvõti/PIN halduritele, DC-UPS võrguseadmetele"],
       ["Töötaja oma telefon", "kulu hüvitamise nõue (TLS § 40 lg 1); töötajate vastuseis", "kokkulepe, alternatiiv (prinditud QR, kontori tahvel, kaart või PIN)"],
       ["Muutuva QR-i ekraanifoto kehtib kuni 60 s", "foto saab saata kolleegile, kes avab eemalt", "ühekordne kood, kohaloleku kontroll, režiim B"],
       ["Staatilist kleebist saab pildistada", "kaugavamine fotoga", "muutuv QR või ainult madala riskiga uksed"],
       ["Riistvara päris lukuga proovimata", "tundmatud ühilduvusvead", "demolaud (BOM a) ja piloot enne müüki"],
       ["Pollimine ei skaleeru", "tasuta plaan kannab ühe seadme", "WebSocket/MQTT tootmises"],
       ["Skaleeruvus testimata", "sadade töötajate ja seadmetega pole proovitud", "koormustest ja andmemudeli täiendus tootmisetapis"],
       ["Kõrge turvatasemega uksel jääb kaart/biomeetria", "digivõti ei asenda kõike", "täiendav kasutus"],
       ["QR-ligipääs ise ei ole uus", "konkurents uste osas", "eristumine kombinatsiooniga (automaat, auto, tööriist, aruanne)"],
       ["Väike tarnija", "kliendi sõltuvus ühest inimesest", "dokumentatsioon, testid, tavapärane platvorm; partner [__]"],
       ["Ebaselge IP AI-koodi osas", "investori due diligence", "dokumenteeritud inimpanus, IP ühe OÜ nimele"]],
      laiused=[4.8, 5.2, 6.6], pealkiri="Puudused ja piirangud", sz=8.5, esimene_bold=True)
    H2("9.2 Millal see süsteem EI sobi")
    B(["Kõrge turvatasemega ruum, kus nõutakse kaarti, biomeetriat või sertifitseeritud läbipääsusüsteemi – siis digivõti ainult täiendusena.",
       "Evakuatsiooniuks, kuhu ei saa paigaldada mehaanilist väljapääsu ega EN 13637 tüüpi riistvaralist vabastust.",
       "Kui töötajad ei soovi telefoni kasutada ja alternatiivi (kaart, PIN, prinditud QR) ei pakuta.",
       "Kui on vaja ainult uksi ja töötav kaardisüsteem on olemas – lisaväärtus tuleb siis teistest moodulitest.",
       "Väga väike ettevõte: alla sihtrühma (20 töötajat) võib paigaldus- ja halduskulu ületada kasu [HINNANG].",
       "Objektil puudub püsiv toide ja levi ning režiim B koos suure akuga ei õigusta kulu."])

def ptk10():
    H1("10. Riskid ja maandus")
    T(["Risk", "Mehhanism", "Tagajärg", "Maandus"],
      [["Evakuatsiooni takistamine", "tarkvara hoiab ust lukus, ATS-liides puudub", "inimeste oht, tootevastutus", "mehaaniline väljumine seest või EN 13637 süsteem; ATS katkestab toite otse; avariinupp; kasutuselevõtu test"],
       ["Vale relee/luku loogika", "Shelly NO-kontakt magnetlukuga", "uks lukustub avamise asemel", "vaherelee CO-kontaktiga; dokumenteeritud ühendusskeem"],
       ["Tuletõkkeukse klassi kadumine", "vale lukk, freesimine, sertifitseerimata magnetlukk", "tuli ja suits levivad", "ainult ukse tootja lubatud komponent, kirjalik kinnitus"],
       ["Toitekatkestus", "võrk maas, aku tühi", "fail-safe uks lahti / fail-secure lukus", "aku arvutus eesmärgi järgi (24 h kontor, 72 h objekt), DC-UPS võrgule, varuvõti, aku madala pinge teavitus"],
       ["Võrgu või pilve katkestus", "internet või server maas", "režiim A ei tööta", "režiim B välisustel, offline-nimekiri lühikese kehtivusega, varuvõti/PIN, heartbeat-häire"],
       ["Muutuva QR-i edastus (≤ 60 s)", "ekraani foto saadetakse kohe edasi", "eemalt avamine sama õigusega kasutaja poolt", "ühekordne kood + ekraani kohene uuendus; Wi-Fi/IP või BLE kohalolu; välisustel režiim B"],
       ["Küberrünne", "vale käsk, varastatud võti, kordusrünne", "volitamata avamine", "näidises: ühekordne, aeguv käsk ja seadmetoken; tootmisetapis: allkirjastatud käsk, eraldi VLAN, eraldi tokenid relee ja ekraani jaoks; ohutusfunktsioon riistvaras"],
       ["Vandalism ja külm", "lugeja lõhkumine, −25 °C", "uks ei avane", "IK10 kate, kontroller turvalisel poolel, OSDP järelevalve, kütetud IP66 karp, õige aku"],
       ["Isikuandmete rikkumine või kaebus", "liigne jälgimine, puuduv DPIA", "trahv, mainekahju", "DPIA, teavitus, minimeerimine, säilitusajad, DPA"],
       ["Kinnipidamine ilma kehtiva nõusolekuta", "ette antud üldnõusolek", "töötaja nõuab raha tagasi", "kuu lõpu kinnitus või limiit; vaikimisi kohene makse"],
       ["Andmete asukoht", "USA pilveteenus", "avaliku sektori ja B2B müügi takistus", "EL-i andmeasukoht, DPA kontroll enne väidet [KONTROLLIMATA]"],
       ["Nõudlus tõendamata", "pilootklienti pole", "investor ei usu", "Mom Test vestlused, LOI-d, piloot [__]"],
       ["IP ebaselge", "mitu autorit, AI-kood", "ostja ei maksa", "kirjalikud üleandmised, IP ühe OÜ nimele, NDA"]],
      laiused=[3.2, 3.8, 3.4, 6.2], pealkiri="Riskid ja maandus", sz=8)

def ptk11():
    H1("11. Miks osta meilt")
    P("Selles peatükis on ainult väited, mida toetavad lähtefailid. Puuduvad andmed on kohatäitena [__] ja tuleb enne üleandmist täita.", sz=10, varv=HALL)
    H2("11.1 Kliendile")
    T(["Mida klient võidab", "Millise riski see maandab"],
      [["Üks süsteem uksest snäkini, üks logi ja üks töösuhte lõpu nupp", "unustatud ligipääs pärast töösuhte lõppu; viies kohas käsitsi korjamine"],
       ["Asutaja (ehitusinsener) valdkonnateadmine: ehitusobjektid, tööriistad, alltöövõtjad, tuleohutus", "lahendus, mis ei sobi objekti tingimustesse (külm, tolm, konteiner, värav)"],
       ["Ohutus disainis: kavandatud nii, et väljapääs ei sõltu telefonist, tarkvarast ega võrgust; nõuetekohase paigalduse tagavad paigaldaja ja valdaja", "evakuatsiooni takistamine, tuletõkkeukse klassi kadu, Päästeameti ettekirjutus"],
       ["Õigusanalüüs ja näidistekstid (nõusolek lisas B, säilitusajad); DPIA põhi, töötaja teavitus ja erisoodustuse veerg tootmisetapis", "tühine kinnipidamine, GDPR-kaebus, erisoodustuse viga"],
       ["Töötav ja testitud tarkvara (22 testi, eraldi AI-turvaülevaatus; läbistustest tegemata)", "„paber-toode“, mis ei tööta"],
       ["Odav algus: sisemine uks relee + kleebis; laiendus moodulite kaupa", "suur ühekordne investeering enne kasu nägemist"],
       ["Paigaldus koos registreeritud partneritega (elekter, ATS, vajadusel turvafirma) [__ partnerid]", "lubadeta paigaldus, vastutuse hägusus"]],
      laiused=[8.6, 8.0], pealkiri="Väärtus kliendile", sz=9)
    H2("11.2 Investorile või partnerile")
    B(["**Asutaja:** Margo Pädam, ehitusinsener, ehitusjärelevalve taust [__ aastat ehitusjärelevalves], tunneb ehitusplatsi, tööriistade "
       "kadu ja alltöövõtjate ligipääsu seestpoolt.",
       "**Olemasolev kood:** qrwork (tööriistade register, töötab) ja digivoti (uks, muutuv QR, relee, automaat, auto, töösuhte lõpp, "
       "kuuaruanne); 22 automaattesti, eraldi AI-turvaülevaatus, 4 leitud viga parandatud; kolmanda osapoole läbistustesti pole.",
       "**Analüüs olemas:** tehniline analüüs koos BOM-iga kolmele konfiguratsioonile, elektrianalüüs ja õigusanalüüs koos RT viidetega – "
       "koostatud AI abil Margo Pädami juhtimisel, pädev elektriinsener ega advokaat pole neid allkirjastanud.",
       "**Valdkonnateadmine:** rannapea on ehitus- ja paigaldusettevõtted 20–250 töötajat (tööriistad, konteinerid, alltöövõtjad, tööautod).",
       "**Mida veel ei ole:** pilootklient ja LOI-d [__ arv], riistvara proov, tootmisküps sideviis. Need on järgmise etapi eesmärgid (ptk 12)."])
    H3("Ise tegemine vs ostmine (build vs buy)")
    T(["Rida", "Tunnid", "Kulu €"],
      [["Nõuded, ärianalüüs, kasutusjuhud", "40–80", "2 000–6 400"],
       ["Tagaserver + kasutaja- ja haldusliides, õigusreeglid, ajaaken, logi", "250–400", "12 500–32 000"],
       ["Muutuv QR, releekäsud, töösuhte lõpu loogika, testid", "60–120", "3 000–9 600"],
       ["Riistvara integratsioon ja proovid", "80–160", "4 000–12 800"],
       ["Kuuaruanne raamatupidamisse, formaadid", "30–60", "1 500–4 800"],
       ["Sõltumatu turvaülevaatus", "30–60", "2 100–6 000"],
       ["Õiguslik analüüs (GDPR, kinnipidamine, erisoodustus, tuleohutus, turvategevus)", "25–50", "3 000–10 000"],
       ["Dokumentatsioon, demo-komplekt, koolitus", "30–60", "1 500–4 800"],
       ["**Kokku ilma AI-ta**", "≈ 545–990", "≈ 29 600–86 400"],
       ["**Kokku AI-abiga** (tagaserver, liides, QR-loogika −40 %)", "", "≈ 23 000–70 000"]],
      laiused=[10.0, 2.6, 4.0], pealkiri="Asendamiskulu (müügipaketi hinnang, tunnihind 50–80 €, õigus 120–200 €) [HINNANG]", sz=8.5)
    P("Lisaks rahale kulub ise tegemisel **4–8 kuud kalendriaega** (piloot, riistvara tarne, õiguslik kooskõlastus). AI teeb koodi kirjutamise "
      "odavaks, kuid ei anna pilootkliente, läbiproovitud releed ukse juures, ehitusplatsi kogemust ega õiguslikku paketti. Tabelist välja jäävad "
      "riskid – vale lukuvalik evakuatsiooniteel, GDPR-kaebus, nõusolekuta kinnipidamine, relee ei tööta objekti Wi-Fi-s – on ostja tegelik kulu.")

def ptk12():
    H1("12. Kliendisegmendid ja tegevuskava")
    H2("12.1 Kümme segmenti")
    T(["#", "Segment", "Kus", "Põhivajadus"],
      [["1", "Ehitusettevõte 50–200 töötajat, mitu objekti", "Tallinn, Tartu, Pärnu", "tööriistad, objekti konteinerid, alltöövõtjate ajutine ligipääs, tööautod"],
       ["2", "Tootmisettevõte (puit, metall, toit), vahetused", "Pärnumaa, Võrumaa, Viljandimaa, Ida-Virumaa", "uksed, tööriistakapid, söökla/automaadid kinnipidamisega"],
       ["3", "Logistika- ja laokeskus", "Rae vald, Muuga", "laoväravad, tõstukite kasutusõigus koolitatud juhile, skännerid"],
       ["4", "Ülikooli või TA-asutuse labor", "TalTech, Tartu Ülikool, EMÜ", "seadmete broneering, kasutusaeg ja arveldus projekti kaupa"],
       ["5", "Kutsekool", "Tallinn, Tartu, Rakvere, Kuressaare", "töökodade ja masinate kasutusõigus koolituse järgi, inventar"],
       ["6", "Kinnisvarahaldur / korteriühistu", "Tallinna ja Tartu uusarendused", "trepikoda, panipaigad, pesuruum, saun, parkla, tasu kasutuse järgi"],
       ["7", "Coworking / büroohoone", "Ülemiste City, Tartu kesklinn", "külaliste QR, koosolekuruumid, printer ja kohv arvega"],
       ["8", "Hotell, hostel, spa", "Pärnu, Kuressaare, Otepää", "töötajate ligipääs, minibaar/automaadid, ruumide võti"],
       ["9", "Kohalik omavalitsus ja allasutused", "väikevallad", "külamajad, spordisaalid, kogukonnaköök: broneering + avamine ilma võtmeta"],
       ["10", "Autorent, ühiskasutusautod, autopark", "üle Eesti", "võtmekapp, broneering, sõidupäevik, kahjufoto"]],
      laiused=[0.7, 4.6, 4.4, 6.9], pealkiri="Kliendisegmendid (kontseptsioon)", sz=8.5)
    P("Esimene pilootklient, kus võit on kiireim: **ehitusettevõte** (segment 1, qrwork on olemas) või **ladu** (segment 3). Avaliku sektori "
      "klientidel (KOV, ülikool) lisanduvad küberturvalisuse seaduse tarneahela nõuded; korteriühistus otsustab üldkoosolek.")
    H2("12.2 Tegevuskava")
    T(["Etapp", "Tegevus", "Valmis, kui"],
      [["1. Alus (nädal 1–2)", "IP omaniku otsus ja koondamine OÜ-le [__]; õigusanalüüsi [KONTROLLIMATA] viidete lõppkontroll (GDPR, AKI, MTA); elektrianalüüsi ülevaatus pädeva elektriinseneri poolt [__] (eraldi AI-ülevaatus on juba tehtud)", "IP leping allkirjastatud; viited kontrollitud"],
       ["2. Demolaud (nädal 2–4)", "BOM a riistvara koos töökindluse lisadega (vaherelee, toiteplokk); Shelly skript päris lukuga; 2-min video", "demolukk ja automaat töötavad päris releega"],
       ["3. Kliendivestlused (nädal 2–5)", "10 vestlust ehitus- ja paigaldusettevõtetega (minevik, valu, raha – mitte „kas idee on hea“)", "≥ 6 vestlust, ≥ 1 LOI"],
       ["4. Piloodi eeltingimused (nädal 3–5)", "avaldamine (deploy) ja domeen (Margo otsus); sideviis väikese seadmearvu jaoks või WebSocket; heartbeat; eraldi seadmetokenid; DPA, töötaja teavitus, pilootleping", "pilootkeskkond töötab, dokumendid allkirjastatud"],
       ["5. Piloot (nädal 4–10)", "ainult siseuksed (mitte evakuatsiooni- ega tuletõkkeuksed, mis vajavad projekti ja ATS-ettevõtjat), tööriistad ja automaat **ilma palgast kinnipidamiseta** (kohene makse või ainult logi)", "≥ 30 päeva logi; pilootkliendi tagasiside [__]"],
       ["6. Tootmisküpsus", "WebSocket/MQTT, ühekordne muutuv QR, režiim B (teostatavus enne tõendada), kuu lõpu nõusolek, arestimisvaba osa, automaatne kustutamine, „Minu andmed“, XLSX/Merit, külalise link, raamatupidaja roll, EL-i andmeasukoht, koormustest", "turvaülevaatus uuesti läbitud; soovitavalt kolmanda osapoole test"],
       ["7. Paigaldusjuhend", "ühendusskeemid (vaherelee, ATS, avariinupp), kasutuselevõtu protokoll (lisa C), partnerite valik", "pädev elektri- ja ehitusinsener kinnitanud"],
       ["Ressurss", "Margo + AI-arendus; elektritöö partner; ATS-ettevõtja (hiljem); jurist lepingutele [__ tunnid/eelarve]", "—"],
       ["Varuplaan", "kui pilootklienti 10. nädalaks pole: demolaud + video investoritele, rannapea muutmine (ladu/logistika), vestlused uuesti", "—"]],
      laiused=[3.4, 9.2, 4.0], pealkiri="Tegevuskava", sz=8.5, esimene_bold=True)
    P("Müügivestluste mõõdikud 6 nädala jooksul: 10 pilootkliendi vestlust, 3 LOI-d, 6 kohtumist, 2 NDA-d. Kui 6 nädala järel pole ühtegi LOI-d, "
      "muudetakse rannapead (nt ladu/logistika) ja korratakse vestlusi.")

def lisa_a():
    H1("Lisa A. Sõnastik")
    T(["Termin", "Selgitus"],
      [["ATS", "automaatne tulekahjusignalisatsioonisüsteem (TSS): andurid ja keskseade, mis tuvastab tulekahju ja juhib teisi seadmeid (nt vabastab lukud)."],
       ["Avariinupp (roheline)", "ukse juures olev kaanega nupp, mis katkestab luku toite otse; 2-pooluseline = üks kontakt katkestab toite, teine annab häire."],
       ["BOM", "seadmete ja materjalide loetelu koos koguste ja hindadega (ingl bill of materials)."],
       ["Cashless (MDB)", "automaadi sularahata makseseade; digivõti esineb automaadile sellisena."],
       ["CE, DoP", "CE-märk näitab toote vastavust EL-i nõuetele; toimivusdeklaratsioon (DoP) on ehitustoote omaduste dokument."],
       ["CO-kontakt", "releekontakt, millel on nii NO- kui ka NC-pool (ümberlülituv)."],
       ["CSV", "lihtne tabelifail (väärtused eraldatud semikooloniga), avaneb Excelis ja raamatupidamisprogrammis."],
       ["DC/DC-muundur", "seade, mis teeb kõikuvast alalispingest (nt aku 10,5–14,4 V) stabiilse pinge elektroonikale."],
       ["DPA", "volitatud töötleja leping: tarnija töötleb kliendi isikuandmeid ainult kliendi juhiste järgi."],
       ["DPIA", "andmekaitsealane mõjuhinnang: dokument, mis hindab isikuandmete töötlemise riske ja meetmeid enne kasutuselevõttu."],
       ["Durable Object, Worker", "Cloudflare'i pilveplatvormi osad: Worker täidab koodi, Durable Object hoiab andmeid ja olekut."],
       ["Erisoodustus", "tööandja poolt töötajale antud mitterahaline hüve (nt tasuta snäkk, auto erakasutus), millelt tööandja maksab tulu- ja sotsiaalmaksu."],
       ["Fail-safe", "toite kadumisel ohutu-avatud: lukk vabaneb, kui pinge kaob (nt magnetlukk)."],
       ["Fail-secure", "toite kadumisel lukus: lukk jääb kinni, kui pinge kaob; seest avatakse mehaaniliselt."],
       ["Heartbeat", "seadme regulaarne „elusolekusignaal“ serverile; kui see kaob, saab haldur teate."],
       ["IP / IK", "IP-klass näitab kaitset tolmu ja vee eest (nt IP65), IK-klass löögikindlust (nt IK10)."],
       ["LOI", "kavatsuste kiri (letter of intent): kliendi kirjalik huvi pilootida või osta, tavaliselt tingimustega."],
       ["Magnetlukk", "elektromagnet, mis hoiab ust kinni ainult pinge all (alati fail-safe)."],
       ["MDB", "automaatide sisesiin (Multi-Drop Bus, NAMA/EVA standard), mille kaudu automaat suhtleb makseseadmetega."],
       ["MQTT, WebSocket", "püsiühenduse protokollid, millega server saab seadmele käsu kohe saata ilma pideva päringuta."],
       ["NO / NC", "releekontakt: NO (normally open) on rahuolekus avatud, NC (normally closed) rahuolekus suletud."],
       ["OSDP", "krüpteeritud ja järelevalvega lugeja-kontrolleri protokoll üle RS-485 (EVS-EN IEC 60839-11-5)."],
       ["PoE", "toide üle võrgukaabli (Power over Ethernet): üks kaabel annab side ja toite."],
       ["Pollimine", "seade küsib serverilt korduvalt „kas mulle on käsk?“; lihtne, kuid tekitab palju päringuid."],
       ["PWA", "veebirakendus, mis töötab telefoni brauseris nagu äpp, ilma poest paigaldamata."],
       ["QR-kood", "ruudukujuline kood, mida telefoni kaamera loeb; digivõtmes sisaldab objekti aadressi ja koodi."],
       ["Relee, vaherelee", "elektriliselt juhitav lüliti; vaherelee eraldab juhtahela (nt Shelly) jõuahelast (lukk) ja on vahetatav."],
       ["Režiim A / B", "A: telefon skannib objekti QR-i; B: ukse lugeja skannib telefoni muutuvat QR-i."],
       ["SELV / PELV", "ohutu väikepinge (nt 12/24 V) toiteallikast, mis on võrgust eraldatud; PELV on maandatud variant."],
       ["Shelly, ESP32", "levinud võrgureleed ja mikrokontrollerid, mida saab juhtida üle Wi-Fi või kaabli."],
       ["SPD", "liigpingekaitse (surge protective device): kaitseb seadmeid pikse ja lülitusimpulsside eest."],
       ["Tasaarvestus", "töötaja võla ja töötasu nõude vastastikune lõpetamine (palgast kinnipidamine), TLS § 78."],
       ["TOTP / muutuv QR", "ajapõhine ühekordse koodi meetod: kood arvutatakse ühisest saladusest ja kellaajast ning vahetub iga 30 s."],
       ["Turvaprintimine", "prinditöö ootab serveris ja vabastatakse printeri juures (siin QR-iga)."],
       ["UPS, DC-UPS", "katkematu toiteallikas; DC-UPS annab akust otse alalispinget ruuterile ja kommutaatorile."],
       ["Vastuplaat", "ukse lengis olev elektriline riivi vastuosa, mis vabastab riivi pinge all (fail-secure) või pingeta (fail-safe)."],
       ["VLAN", "loogiliselt eraldatud võrguosa; IoT-seadmed eraldi kontori arvutitest."],
       ["Wiegand", "vana, krüpteerimata ühesuunaline lugeja-kontrolleri liides."]],
      laiused=[3.6, 13.0], sz=8.5, esimene_bold=True)

def lisa_b():
    H1("Lisa B. Nõusoleku näidistekst")
    P("Allikas: õigusanalüüs p 2 (TLS § 78; TMS § 132). Nõusolek antakse **kuu lõpus**, kui nõue on juba olemas. Vorm: kirjalikku "
      "taasesitamist võimaldav (rakenduse kinnitus, e-kiri või Smart-ID). Enne kasutamist vaatab teksti üle jurist.", sz=10)
    KAST("Mina, [ees- ja perekonnanimi], olen tutvunud oma [kuu/aasta] ostude loeteluga (lisatud, [N] ostu, kokku [summa] €, sh käibemaks).\n\n"
         "Nõustun, et [tööandja nimi] tasaarvestab selle summa minu [kuu] töötasu nõudega ja peab selle töötasust kinni.\n\n"
         "Tean, et kinnipidamine ei vähenda minu töötasu alla täitemenetluse seadustiku § 132 järgse arestimisvaba osa. Kinni pidamata jäänud "
         "osa tasun arve alusel.\n\n"
         "Võin selle nõusoleku andmata jätta. Sel juhul saan arve ja maksan selle 14 päeva jooksul.\n\n"
         "Kuupäev, kellaaeg, kinnitus [rakenduse kinnitusnupp / Smart-ID / e-kiri], kinnituse ID.",
         "Nõusolek tasaarvestuseks (töölepingu seaduse § 78 lg 1)", taust="FFFFFF")
    H2("Limiidi variant: lisa töölepingule")
    P("Ette antud nõusolek on lubatud ainult tööandja arvel tehtavate kulude kokkulepitud limiiti ületava summa kohta (TLS § 78 lg 2).")
    KAST("Tööandja kannab töötaja töökohal tehtavate toidu- ja joogiostude kulud kuni [X] € kalendrikuus. Töötaja nõustub, et limiiti ületava "
         "summa võib tööandja tasaarvestada töötaja töötasu nõudega (TLS § 78 lg 2), arvestades TMS § 132 piiranguid.",
         "Lisa töölepingule", taust="FFFFFF")
    P("Märkus: limiidini kaetud summa on erisoodustus, kui see ei ole kõigile töökohal pakutav kohv või tee [KONTROLLIMATA: MTA praktika].", sz=9.5, varv=HALL)

def lisa_c():
    H1("Lisa C. Kasutuselevõtu ja hoolduse kontrollnimekiri")
    H2("C.1 Enne paigaldust (organisatoorne)")
    B(["☐ Õigustatud huvi analüüs ja DPIA tehtud; töötajate andmekaitseteatis antud; säilitusajad seadistatud.",
       "☐ Volitatud töötleja leping (DPA) ja alamtöötlejate loend allkirjastatud; andmeasukoht kontrollitud.",
       "☐ Töötaja telefoni kasutuse kokkulepe ja alternatiiv (kaart, PIN, prinditud QR) olemas.",
       "☐ Kinnipidamise viis valitud (kohene makse / kuu lõpu nõusolek / limiit); raamatupidajaga kokku lepitud arestimisvaba osa arvestus.",
       "☐ Autod märgitud „ainult töö“ või erakasutusega; erisoodustuse kord teada.",
       "☐ Evakuatsiooni- ja tuletõkkeuksed tuvastatud; lukutüüp valitud (mehaaniline väljapääs või EN 13637 süsteem); ukse tootja kinnitus.",
       "☐ Vajadusel ehitusteatis ja ehitusprojekt (tehnosüsteemi muutmine); ATS-ettevõtja kaasatud.",
       "☐ Paigaldajad: 230 V töö pädev isik; turvafirma ainult valvekeskuse liidese korral."])
    H2("C.2 Kasutuselevõtt (kõik ✓, protokoll objekti dokumentidesse)")
    N(["Skeem (ühendus- ja kaablitabel) vastab tegelikule; kaablid märgistatud.",
       "Iga haru kaitse paigas ja märgistatud; aku kaitse aku juures.",
       "Lukk: diood/varistor paigas; pinge koormusega võrgul ja akul mõõdetud.",
       "Relee algolek „Off“, skript käivitub automaatselt; toite katkestuse test.",
       "ATS-vabastus (ATS-ettevõtjaga; valitud variant märgitud skeemile), lõhe/lühis test, avariinupp, väljumisnupp.",
       "Uksekontakt, „uks jäi lahti“, sundavamise häire.",
       "Heartbeat: seade lahti → haldur saab teate ≤ 60 s.",
       "Võrgukatkestus, 4G ümberlülitus, offline (režiim B).",
       "Isolatsioon ja rikkeahela impedants 230 V grupil, SPD olekunäidikud.",
       "Haldurile mehaaniline varuvõti ja juhend; dokumentatsioon (skeem, andmelehed, tootja kinnitus tuletõkkeuksele, protokoll)."])
    T(["Mõõtmine", "Kus", "Kriteerium [HINNANG / standard KONTROLLIMATA]"],
      [["Isolatsioonitakistus 500 V DC", "230 V grupp", "≥ 1 MΩ (SELV-ahelad lahti)"],
       ["Rikkeahela impedants / RCD", "230 V grupp", "Zs ≤ Zs_max; RCD ≤ 300 ms"],
       ["Pinge lukul koormusega, võrgu- ja akutoitel", "iga lukk", "tootja vahemikus ka akul ~11 V juures"],
       ["Ootelaadimispinge", "toiteplokk", "13,65–13,8 V ± kompensatsioon"],
       ["Aku varuaeg või sisetakistus", "toiteplokk", "≥ projekteeritud (24 h / 72 h)"],
       ["Luku vabanemine ATS-i / avariinupuga", "evakuatsiooniuksed", "uks avaneb kohe (nt < 1 s)"],
       ["Lõhe ja lühis ATS-liinil", "ATS-ettevõtjaga", "keskseade näitab riket; lukk vaba lõhel ainult variandis, kus väljund on tavaolekus pinge all"],
       ["Pinge lukul külmas (kompensatsiooniga laadija)", "konteiner", "luku lubatud vahemikus"],
       ["Toitekatkestus + taaskäivitus", "kõik releed", "algolek lukus (fail-secure) / vaba (ATS); käivitusel ei avane"]],
      laiused=[6.0, 3.6, 7.0], pealkiri="Mõõtmised kasutuselevõtul (elektrianalüüs p 4.2)", sz=8.5)
    H2("C.3 Hooldus")
    P("Hooldusgraafik on peatükis 6.8. Iga hoolduse tulemus kantakse protokolli; ATS-vabastuse kontroll kantakse ATS-i päevikusse.")

def lisa_d():
    H1("Lisa D. Allikad")
    H2("D.1 Lähtefailid (repo qrwork)")
    T(["Fail", "Autor / roll", "Kasutatud"],
      [["docs/KONTSEPTSIOON_QR_digivoti.md", "kontseptsioon (mustand 01.11.2026)", "põhiidee, moodulid, segmendid, 10 eelist; kulu ja õiguse osas parandatud hilisemate failidega"],
       ["docs/TEHNILINE_LAHENDUS_digivoti.md v0.1", "tehniline analüüs (AI)", "arhitektuur, lukud, ATS, toide, kaabeldus, BOM, hooldus, riskid"],
       ["docs/ELEKTRI_ULEVAATUS_digivoti.md v2", "elektrianalüüs (AI)", "parandused (ATS-vaherelee, pingevahemik, Shelly + magnetlukk, aku ja toiteplokk), töökindlus, BOM-i lisad"],
       ["docs/ELEKTRI_KONTROLL_digivoti.md", "elektrianalüüsi eraldi AI-ülevaatus", "v0.1 7/10, v2 9/10 „rahul“; 1 väike leid"],
       ["docs/OIGUSLIK_RAAMISTIK_digivoti.md", "õigusanalüüs (AI)", "isikuandmed, kinnipidamine, maksud, tuleohutus, turvategevus, vastutus, IP"],
       ["docs/kirjeldus/KONTROLL_kirjeldus.md", "kirjelduse v1.0 eraldi AI-ülevaatus", "12 ERROR, 14 MINOR; parandused v1.1-s (D.4)"],
       ["docs/MUUGIPAKETT_digivoti.md", "müügipakett", "ainult „miks osta meilt“ argumendid ja ise tegemise kulu; hinnad ja tehingustruktuur välja jäetud"],
       ["digivoti/README.md", "näidise kirjeldus", "funktsioonid, testid, kontrolli tähelepanekud"]],
      laiused=[5.4, 3.4, 7.8], sz=8.5)
    H2("D.2 Õigusaktid (kehtiv redaktsioon 01.11.2026, õigusanalüüsi kontroll)")
    T(["Lühend", "Akt", "RT viide"],
      [["TLS", "Töölepingu seadus", "RT I, 03.07.2026, 35"],
       ["IKS", "Isikuandmete kaitse seadus", "RT I, 30.06.2026, 52"],
       ["RPS", "Raamatupidamise seadus", "RT I, 10.07.2025, 3"],
       ["MKS", "Maksukorralduse seadus", "RT I, 16.10.2026, 11"],
       ["TuMS", "Tulumaksuseadus", "RT I, 09.07.2026, 66"],
       ["SMS", "Sotsiaalmaksuseadus", "RT I, 16.10.2026, 14"],
       ["KMS", "Käibemaksuseadus", "RT I, 30.06.2026, 129"],
       ["TMS", "Täitemenetluse seadustik", "RT I, 11.07.2026, 97"],
       ["VV m 36", "Töötasu alammäära kehtestamine", "RT I, 24.03.2026, 5"],
       ["TuOS", "Tuleohutuse seadus", "RT I, 29.06.2024, 7"],
       ["SiM m 17", "Ehitisele esitatavad tuleohutusnõuded", "RT I, 23.02.2021, 13"],
       ["SiM m 1", "Tulekahjusignalisatsioonisüsteem, teate edastamine Häirekeskusesse", "RT I, 07.11.2025, 7"],
       ["EhS", "Ehitusseadustik", "RT I, 11.07.2026, 33"],
       ["TurvaTS", "Turvategevuse seadus", "RT I, 09.07.2026, 65"],
       ["SeOS", "Seadme ohutuse seadus", "RT I, 30.04.2024, 12"],
       ["MTM m 74", "Elektripaigaldise käidule ja elektritööle esitatavad nõuded", "RT I, 05.01.2024, 10"],
       ["KüTS", "Küberturvalisuse seadus", "RT I, 06.10.2026, 2"],
       ["VÕS", "Võlaõigusseadus", "RT I, 20.06.2026, 18"],
       ["AutÕS", "Autoriõiguse seadus", "RT I, 12.07.2025, 9"],
       ["EKTÄKS", "Ebaausa konkurentsi takistamise ja ärisaladuse kaitse seadus", "RT I, 07.12.2018, 2"],
       ["GDPR", "Isikuandmete kaitse üldmäärus (EL) 2016/679", "[KONTROLLIMATA: EUR-Lex polnud kättesaadav]"]],
      laiused=[2.4, 9.4, 4.8], sz=8.5)
    H2("D.3 Peamised standardid (olek evs.ee 01.11.2026; teksti ei ole loetud)")
    T(["Tähis", "Teema"],
      [["EVS-EN 13637:2015", "elektriliselt juhitavad väljapääsusüsteemid evakuatsiooniteel"],
       ["EVS-EN 179:2008 / EVS-EN 1125:2008", "avariiväljapääsu sulused / paanikasulused"],
       ["EVS-EN 14846:2008, EVS-EN 12209:2025", "elektromehaanilised ja mehaanilised lukud ja vastuplaadid"],
       ["EVS-EN 16034:2014, EVS-EN 13501-2:2023", "tuletõkkeuste tootestandard; tulepüsivuse klassifikatsioon"],
       ["EVS-EN 1154:1999, EVS-EN 1155:1999", "uksesulgurid; elektrilised kinnihoidjad"],
       ["EVS 871:2017, EVS 812-7:2018", "tuletõkke- ja evakuatsiooniuste kasutamine; tuleohutuse tüüplahendused"],
       ["EVS-EN 54-2:1999, EVS-EN 54-4:1999", "ATS keskseade; toiteseadmed"],
       ["EVS-EN 60839-11-1:2013, EVS-EN IEC 60839-11-5:2020", "läbipääsusüsteemid: nõuded; OSDP"],
       ["EVS-EN 50131-6:2017+A1:2021", "valvesüsteemide toiteallikad (analoogia)"],
       ["EVS-HD 60364-4-41, -4-43, -5-52, -6, -7-704", "elektripaigaldis: elektrilöögikaitse, liigvoolukaitse, juhistik, kontroll, ehitusplats"],
       ["EVS-EN 60529:2001+A2:2014", "IP-kaitseastmed"],
       ["EVS-EN 12453:2017+A1:2021", "jõuajamiga väravate kasutusohutus"],
       ["MDB/ICP 4.2–4.3 (NAMA/EVA)", "automaadi ja makseseadme siin (tööstusstandard)"]],
      laiused=[6.6, 10.0], sz=8.5)

# ================================================================ koostamine
def lisa_d_muudatused():
    H2("D.4 Muudatused versioonis 1.1 (eraldi AI-ülevaatuse järgi, KONTROLL_kirjeldus.md)")
    B(["Kaanele avaldus: analüüsid on koostatud AI abil Margo Pädami juhtimisel, pole pädeva elektriinseneri ega advokaadi allkirjaga; "
       "„sõltumatu kontroll“ = eraldi AI-ülevaatus. Rollid „tehniline analüüs“, „elektrianalüüs“, „õigusanalüüs“. Lisatud „Kuidas seda dokumenti lugeda“.",
       "Kõikjal eristatud „näidises tehtud“ ja „tootmisetapis kavandatud“: õiguslike nõuete tabelis veerg „Näidises“, säilitusajad on "
       "sihtseaded, kuu lõpu nõusolek ja „Minu andmed“ tootmisetapis, teekond on sihtteekond.",
       "Sõidupäevik: üks tõend eranditult ettevõtluskasutuse kohta, mitte iseenesest 100 % mahaarvamise alus.",
       "Režiim B offline-kontroll: kavandatud, teostatavus tõendamata; BOM-i juurde arendusrida ja varuvariant kaart/PIN.",
       "Toide: ühine aku koos võrguseadmetega ≈ 54–69 Ah või eraldi DC-UPS.",
       "Kasu sõnastus: siseuks kokku ≈ 550–700 €, alles jäävad võtmed/kaardid, alternatiiv telefonita töötajale; evakuatsiooni kohta "
       "„kavandatud nii, et…“, mitte absoluutne lubadus.",
       "Uus ptk 7.3 „Tasuvus“ (stsenaariumid, tasuvust pilootandmeteta ei väideta); endine 7.3 on nüüd 7.4.",
       "Tegevuskava: piloot nädalad 4–10 ainult siseuste, tööriistade ja automaadiga ilma kinnipidamiseta; eeltingimused, ressurss, varuplaan.",
       "Väiksemad: allkirjastatud käsud ja eraldi tokenid kui tootmise eesmärk; Shelly lülitab tootmises ainult vahereleed; ptk 4 tabelis "
       "tegemata osad; limiidi erandi tõlgendus ja sätte sõnastus; alammäära kehtivus; 7 170 € eeldused; printeri litsents ja tasuline "
       "pilveplaan; kaardisüsteemi hinnaväide [KONTROLLIMATA]; uue ukse paigaldus ≈ 7 h; 20–49 töötajaga turg [__]; skaleeruvus testimata; "
       "sisefailide viited ja koodimärgid lühikokkuvõttest eemaldatud."])

def ehita_docx():
    skeem_arhitektuur(os.path.join(PILDID, "skeem_arhitektuur.png"))
    skeem_reziimid(os.path.join(PILDID, "skeem_reziimid.png"))
    skeem_teekond(os.path.join(PILDID, "skeem_teekond.png"))
    for nimi, mh in (("01_admin_demo", None), ("02_ekraan_muutuv_qr", None), ("05_tel_uks_avatud", 900), ("06_demolukk_avatud", None),
                     ("07_tel_automaat_kinnitus", None), ("12_admin_kuuaruanne", None), ("13_admin_toosuhe_lopp", None),
                     ("15_tel_sisselogimine_keelatud", None)):
        karbi(os.path.join(PILDID, f"digivoti_{nimi}.png"), os.path.join(PILDID, f"k_{nimi}.png"), mh)
    stiilid(); lehekülg()
    kaas()
    for fn in (ptk1, ptk2, ptk3, ptk4, ptk5, ptk6, ptk7, ptk8, ptk9, ptk10, ptk11, ptk12, lisa_a, lisa_b, lisa_c, lisa_d, lisa_d_muudatused):
        fn()
    cp = doc.core_properties
    cp.title = "QR-digivõti – süsteemi kirjeldus"; cp.author = "Margo Pädam"; cp.subject = "Süsteemi kirjeldus, v1.1 mustand"
    doc.save(DOCX_TOOR)

UNO_SKRIPT = r'''
import sys, time, uno
from com.sun.star.beans import PropertyValue
def pv(n, v):
    p = PropertyValue(); p.Name = n; p.Value = v; return p
src, docx, pdf, port = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
ctx = uno.getComponentContext()
res = ctx.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", ctx)
for i in range(60):
    try:
        c = res.resolve("uno:socket,host=127.0.0.1,port=%s;urp;StarOffice.ComponentContext" % port); break
    except Exception:
        time.sleep(0.5)
desk = c.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", c)
d = desk.loadComponentFromURL(uno.systemPathToFileUrl(src), "_blank", 0, (pv("Hidden", True),))
idx = d.getDocumentIndexes()
for i in range(idx.getCount()):
    idx.getByIndex(i).update()
d.refresh()
idx = d.getDocumentIndexes()
for i in range(idx.getCount()):
    idx.getByIndex(i).update()
d.storeToURL(uno.systemPathToFileUrl(docx), (pv("FilterName", "MS Word 2007 XML"),))
d.storeToURL(uno.systemPathToFileUrl(pdf), (pv("FilterName", "writer_pdf_Export"),))
d.close(True)
try:
    desk.terminate()
except Exception:
    pass
'''

def uno_valmis():
    port = "2093"
    prof = "/tmp/lo_profiil_kirjeldus"
    p = subprocess.Popen(["soffice", f"-env:UserInstallation=file://{prof}", "--headless", "--invisible", "--nologo", "--norestore",
                          f"--accept=socket,host=127.0.0.1,port={port};urp;"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    us = os.path.join(SIIN, "_uno_tmp.py")
    with open(us, "w") as fh:
        fh.write(UNO_SKRIPT)
    try:
        subprocess.run([sys.executable, us, DOCX_TOOR, DOCX, PDF, port], check=True, timeout=300)
    finally:
        os.remove(us)
        try:
            p.wait(timeout=20)
        except Exception:
            p.kill()

if __name__ == "__main__":
    ehita_docx()
    uno_valmis()
    os.remove(DOCX_TOOR)
    print("Valmis:", DOCX, PDF)
