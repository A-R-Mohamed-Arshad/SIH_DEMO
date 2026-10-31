#!/usr/bin/env python3
"""Extra recordings for the detailed demo: every page the first film did not show, as real interaction with the
running app (synthetic data). Reuses the recorder library and helpers; each scene is independent and a failure in
one scene is logged and does not stop the others.

  .venv/bin/python APAAR-VIDEO/tour/record_tour.py [--only n_add,...]
Output: APAAR-VIDEO/tour/rec/<clip>.mp4 + .json (clicks, element boxes and beats in clip time)
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "scripts" / "recorder"))
import record_all as R  # noqa: E402
from lib import Clip, new_page  # noqa: E402

OUT = HERE / "rec"
R.SHOTS = OUT / "stills"


def btn(page, name, exact=False):
    loc = page.get_by_role("button", name=name, exact=exact)
    return loc.first


def start(page, name):
    return Clip(page, name, OUT).start()


# ───────────────────────── institution
def n_login(b, res):
    p = new_page(b)
    p.goto(f"{R.BASE}/#/login"); p.wait_for_load_state("load"); p.wait_for_timeout(800)
    c = start(p, "n_login")
    c.box("about", p.locator("section.card", has_text="About the register").first)
    c.move_to(p.locator("section.card", has_text="About the register").first, .5, .3)
    c.hold(700)
    c.box("accounts", p.locator(".acct-grid"))
    c.move_to(p.locator(".acct-grid"), .3, .2); c.hold(600)
    c.click(p.get_by_title("Text size A+"), "text size A+", hold=900)
    c.click(p.get_by_title("Text size A", exact=True), "text size A", hold=500)
    c.click(p.get_by_text("kaveri.staff@demo.local", exact=True), "Kaveri staff", hold=300)
    p.wait_for_selector("text=Sign out"); p.wait_for_timeout(900)
    c.beat("signed_in"); c.hold(600)
    R.finish(c, res)


def n_dash(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.staff@demo.local"); R.go(p, "/inst", ".figs")
    c = start(p, "n_dash")
    c.box("figures", p.locator(".figs").first); c.move_to(p.locator(".figs").first, .2, .5); c.hold(500)
    c.move_to(p.locator(".figs .fig").nth(2), .5, .5); c.hold(400)
    strip = p.locator(".seatstrip").first
    c.box("strip", strip); c.move_to(strip, .3, .5); c.hold(500); c.move_to(strip, .85, .5); c.hold(400)
    c.scroll(520)
    c.box("uploads", p.locator("section.card", has_text="Recent uploads").first)
    c.move_to(p.locator("section.card", has_text="Recent uploads").first, .5, .4); c.hold(500)
    c.box("flags", p.locator("section.card", has_text="Open flags").first)
    c.move_to(p.locator("section.card", has_text="Open flags").first, .5, .4); c.hold(700)
    R.finish(c, res)


def n_add(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.staff@demo.local"); R.go(p, "/inst/add", "text=Add a student")
    c = start(p, "n_add")
    c.box("form", p.locator("form").first)
    c.type(R.field(p, "APAAR ID (12 digits)"), "938712406615", label="APAAR ID", delay=30)
    c.type(R.field(p, "Roll number"), "KIT26CSE950", label="Roll number", delay=30)
    c.type(R.field(p, "Full name"), "Divya Menon", label="Full name", delay=35)
    dob = R.field(p, "Date of birth")
    c.click(dob, "Date of birth", hold=150); dob.fill("2009-02-14"); c.hold(300)
    cons = p.get_by_text("Guardian consent recorded", exact=False).first
    c.box("consent", cons); c.move_to(cons, .2, .5); c.hold(900)
    soc = p.get_by_text("Social category (optional, sensitive)", exact=False).first
    c.box("sensitive", soc); c.move_to(soc, .3, .5); c.hold(800)
    c.move_to(btn(p, "Save"), .5, .5); c.hold(500)
    c.beat("ready")
    R.finish(c, res)


def n_records(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.staff@demo.local"); R.go(p, "/records", "text=Student records")
    c = start(p, "n_records")
    c.box("table", p.locator("table").first)
    c.click(btn(p, "Name"), "sort by name", hold=600, sound="toggle")
    c.click(btn(p, "Programme"), "sort by programme", hold=600, sound="toggle")
    s = p.get_by_placeholder("Name, roll number or full APAAR ID")
    c.type(s, "Ananya", label="search", delay=60)
    p.keyboard.press("Enter"); p.wait_for_timeout(900)
    c.beat("results")
    c.box("masked", p.locator("table tbody tr").first)
    c.move_to(p.locator("table tbody tr").first, .5, .5); c.hold(700)
    c.click(p.locator("table tbody tr a").first, "open record", hold=900)
    p.wait_for_selector("text=History"); p.wait_for_timeout(500); R.settle_rules(p)
    c.beat("opened"); c.hold(600)
    R.finish(c, res)


def n_record_detail(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.staff@demo.local"); R.go(p, "/records", "text=Student records")
    s = p.get_by_placeholder("Name, roll number or full APAAR ID"); s.fill("Ananya"); p.keyboard.press("Enter"); p.wait_for_timeout(800)
    p.locator("table tbody tr a").first.click(); p.wait_for_selector("text=History"); p.wait_for_timeout(600)
    c = start(p, "n_record_detail")
    c.box("student", p.locator("section.card").first); c.move_to(p.locator("section.card").first, .4, .4); c.hold(500)
    c.click(btn(p, "Correct this record"), "Correct this record", hold=700)
    c.box("correct", p.locator("section.card", has_text="Correct this record").first)
    rs = p.get_by_label("Reason for the change (kept in the history)")
    c.type(rs, "Name spelling confirmed with the student", label="reason", delay=25)
    c.click(p.get_by_role("button", name="Cancel").last, "Cancel", hold=500)
    cs = btn(p, "Change status")
    if cs.count():
        c.click(cs, "Change status", hold=700)
        c.box("status", p.locator("section.card", has_text="Change enrolment status").first)
        c.click(p.get_by_role("button", name="Cancel").last, "Cancel", hold=400)
    tab = p.get_by_role("tab", name="Signed records")
    if tab.count():
        c.click(tab.first, "Signed records tab", hold=700, sound="toggle")
        c.box("signed", p.locator("section.card", has_text="Signed records").first); c.hold(600)
    hist = p.get_by_role("tab", name="History")
    if hist.count():
        c.click(hist.first, "History tab", hold=600, sound="toggle")
    c.box("history", p.locator("section.card", has_text="History").last); c.move_to(p.locator("section.card", has_text="History").last, .5, .3); c.hold(800)
    R.finish(c, res)


def n_student_correction(b, res):
    p = new_page(b); R.sign_in(p, "student.ananya@demo.local"); R.go(p, "/me", "text=My details")
    c = start(p, "n_student_correction")
    c.box("details", p.locator("section.card", has_text="My details").first); c.move_to(p.locator("section.card", has_text="My details").first, .4, .3); c.hold(600)
    sec = p.locator("section.card", has_text="Ask for a correction").first
    sec.scroll_into_view_if_needed(); p.wait_for_timeout(400)
    c.box("ask", sec)
    c.select(sec.get_by_label("What is wrong"), "full_name", label="What is wrong")
    c.type(sec.get_by_label("Correct value"), "Ananya R. Iyer", label="Correct value", delay=35)
    c.type(sec.get_by_label("Explanation (at least 10 characters)"), "My middle initial is missing on the record.", label="Explanation", delay=18)
    c.click(sec.get_by_role("button", name="Send correction request"), "Send correction request", hold=1000)
    c.beat("sent"); c.hold(500)
    R.finish(c, res)


def n_corrections(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.admin@demo.local"); R.go(p, "/corrections", "text=Student correction requests")
    c = start(p, "n_corrections")
    c.box("list", p.locator("table, section.card").first); c.move_to(p.locator("table, section.card").first, .5, .3); c.hold(700)
    rej = btn(p, "Reject")
    if rej.count():
        c.move_to(rej, .5, .5); c.hold(500)
    acc = btn(p, "Accept and open correction form")
    if acc.count():
        c.click(acc, "Accept and open correction form", hold=1100)
        c.beat("accepted"); c.hold(800)
    R.finish(c, res)


def n_reports_access(b, res):
    p = new_page(b); R.sign_in(p, "kaveri.admin@demo.local"); R.go(p, "/reports", "text=Reports")
    c = start(p, "n_reports")
    c.box("reports", p.locator("section.card").first); c.move_to(p.locator("section.card").nth(0), .5, .4); c.hold(400)
    c.move_to(p.locator("section.card").nth(1), .5, .4); c.hold(400)
    first = p.locator("section.card button").first
    c.click(first, "Download report", hold=900)
    R.finish(c, res)
    R.go(p, "/inst/system-access", "text=System access")
    c = start(p, "n_access")
    sec = p.locator("h2", has_text="Create a key").first.locator("xpath=..")
    c.box("create", sec)
    nm = sec.get_by_role("textbox").first
    c.type(nm, "Kaveri admission ERP", label="key name", delay=30)
    sc = p.locator("label", has_text="seat:check").first
    if sc.count() and sc.is_visible(): c.move_to(sc, .5, .5); c.hold(600)
    ex = p.locator("h2", has_text="How a system calls the register").first.locator("xpath=..")
    ex.scroll_into_view_if_needed(); p.wait_for_timeout(300)
    c.box("example", ex); c.move_to(ex, .4, .5); c.hold(900)
    R.finish(c, res)


# ───────────────────────── AICTE
def n_national_more(b, res):
    p = new_page(b); R.sign_in(p, "aicte.admin@demo.local"); R.go(p, "/aicte", ".figs")
    c = start(p, "n_national_more")
    c.box("figures", p.locator(".figs").first); c.move_to(p.locator(".figs").first, .1, .5); c.hold(300); c.move_to(p.locator(".figs").first, .9, .5); c.hold(300)
    c.scroll(560)
    st = p.locator("section.card", has_text="By state").first
    c.box("state", st); c.move_to(st, .5, .4); c.hold(500)
    c.scroll(420)
    cov = p.locator("section.card", has_text="APAAR coverage").first
    if cov.count(): c.box("coverage", cov); c.move_to(cov, .5, .4); c.hold(500)
    fl = p.locator("section.card", has_text="Open flags by rule").first
    if fl.count(): c.box("byrule", fl); c.move_to(fl, .5, .4); c.hold(600)
    c.scroll(-2000)
    tabs = p.locator("[role=tab]")
    c.click(tabs.filter(has_text="Programmes").first, "Programmes tab", hold=900, sound="toggle")
    c.click(tabs.filter(has_text="Submission status").first, "Submission status tab", hold=900, sound="toggle")
    c.box("submission", p.locator("table").first)
    sel = p.get_by_label("State")
    if sel.count():
        c.click(sel.first, "State filter", hold=300, sound="toggle")
        opts = sel.first.locator("option");
        if opts.count() > 1: sel.first.select_option(index=1); p.wait_for_timeout(800)
    c.beat("filtered"); c.hold(700)
    R.finish(c, res)


def n_queue(b, res):
    p = new_page(b); R.sign_in(p, "aicte.admin@demo.local"); R.go(p, "/issues", "table")
    c = start(p, "n_queue")
    c.box("queue", p.locator("table").first); c.move_to(p.locator("table tbody tr").nth(0), .5, .5); c.hold(400)
    c.move_to(p.locator("table tbody tr").nth(2), .5, .5); c.hold(400)
    lk = p.locator("table tbody tr a[href*='#/issues/']").nth(2); href = lk.get_attribute("href")
    c.click(lk, "open flag", hold=900)
    try:
        p.wait_for_selector("h2:text-is('History')", timeout=4000)
    except Exception:  # noqa: BLE001
        p.goto(f"{R.BASE}/{href}"); p.wait_for_selector("h2:text-is('History')"); p.wait_for_timeout(500); R.settle_rules(p)
    ev = p.locator("h2", has_text="Evidence").first.locator("xpath=..")
    if ev.count(): c.box("evidence", ev); c.move_to(ev, .5, .4); c.hold(700)
    act = p.locator("h2", has_text="Take action").first.locator("xpath=..")
    c.box("action", act); c.move_to(act, .5, .4); c.hold(600)
    R.finish(c, res)


def n_intake(b, res):
    p = new_page(b); R.sign_in(p, "aicte.admin@demo.local"); R.go(p, "/aicte/intakes", "text=Intake and caps")
    c = start(p, "n_intake")
    c.box("table", p.locator("table").first); c.move_to(p.locator("table tbody tr").first, .5, .5); c.hold(500)
    ed = p.locator("table tbody tr").first.get_by_role("button").first
    c.click(ed, "Edit intake", hold=700)
    inp = p.get_by_label("Approved intake").first
    if inp.count():
        c.box("edit", p.locator("table tbody tr").first)
        c.move_to(inp, .5, .5); c.hold(500)
        c.move_to(p.get_by_label("Approval reference").first, .5, .5); c.hold(600)
        c.click(p.locator("table tbody tr").first.get_by_role("button", name="Cancel"), "Cancel", hold=500)
    R.finish(c, res)


def n_identity(b, res):
    p = new_page(b); R.sign_in(p, "aicte.admin@demo.local"); R.go(p, "/aicte/identity", "text=Identity candidates")
    c = start(p, "n_identity")
    card = p.locator("section.card").nth(1)
    c.box("candidate", card); c.move_to(card, .3, .3); c.hold(600)
    why = p.get_by_text("Why we think these match").first
    if why.count(): c.box("why", why.locator("xpath=..")); c.move_to(why, .3, .5); c.hold(900)
    c.move_to(btn(p, "Same person"), .5, .5); c.hold(500)
    c.move_to(btn(p, "Different people"), .5, .5); c.hold(700)
    R.finish(c, res)


def n_rules_integrations(b, res):
    p = new_page(b); R.sign_in(p, "aicte.admin@demo.local"); R.go(p, "/aicte/rules", "table")
    c = start(p, "n_rules")
    c.box("rules", p.locator("table").first); c.move_to(p.locator("table tbody tr").first, .3, .5); c.hold(500)
    c.scroll(700); c.hold(300); c.scroll(700); c.hold(500)
    R.finish(c, res)
    R.go(p, "/aicte/integrations", "text=Integrations")
    c = start(p, "n_integrations")
    c.box("integrations", p.locator("main").first)
    for i in range(3):
        row = p.locator("main section.card, main tr").nth(i)
        if row.count(): c.move_to(row, .5, .5); c.hold(500)
    c.hold(600)
    R.finish(c, res)


SCENES = [n_login, n_dash, n_add, n_records, n_record_detail, n_student_correction, n_corrections, n_reports_access,
          n_national_more, n_queue, n_intake, n_identity, n_rules_integrations]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only", default=""); args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True); R.SHOTS.mkdir(parents=True, exist_ok=True)
    only = {x for x in args.only.split(",") if x}
    res, failed = {}, []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=R.CHROME if Path(R.CHROME).exists() else None, headless=True)
        for sc in [s for s in SCENES if not only or s.__name__ in only]:
            print("scene", sc.__name__, flush=True)
            try:
                sc(b, res)
            except Exception:  # noqa: BLE001
                failed.append(sc.__name__); traceback.print_exc()
            for ctx in list(b.contexts):
                ctx.close()
        b.close()
    idx = OUT / "index.json"
    merged = json.loads(idx.read_text()) if idx.exists() else {}
    merged.update(res); idx.write_text(json.dumps(merged, indent=1))
    print("FAILED:", failed or "none", flush=True)


if __name__ == "__main__":
    main()
