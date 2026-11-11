"""Chromium + frontend + API/Prisma/SQLite reais, em uma base descartável.

Requer Playwright Python, Chromium e API/frontend iniciados conforme docs/RELATORIOS.md.
"""
import datetime
import json
import os
import sqlite3
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DATABASE = Path(os.environ['TEST_DATABASE_PATH']).resolve()
assert DATABASE != (ROOT / 'backend/dev.db').resolve(), 'Use uma base descartável.'
API = os.environ.get('TEST_API_URL', 'http://localhost:3333') + '/api'
FRONTEND = os.environ.get('TEST_FRONTEND_URL', 'http://127.0.0.1:8765')
PRINTS = ROOT / 'docs/prints/relatorios'
PRINTS.mkdir(parents=True, exist_ok=True)
TODAY = datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date().isoformat()


def request(route, body=None, method=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + route, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.load(response)


def contract(student, value, status, date, **overrides):
    return request('/financeiro', {'alunoId': student['id'], 'plano': 'Mensal', 'valor': value,
                   'dataInicio': '2025-01-01', 'dataFim': '2027-12-31', 'situacao': 'Vigente',
                   'statusPagamento': status, 'dataPagamento': date, **overrides})


ana = request('/alunos', {'nome': 'Ana Martins Teste', 'cpf': '52998224725'})
bruno = request('/alunos', {'nome': 'Bruno Renovacao Teste', 'cpf': '11144477735'})
db = sqlite3.connect(DATABASE)
db.execute('UPDATE Aluno SET criadoEm=? WHERE id IN (?,?)', ('2025-01-01T12:00:00.000Z', ana['id'], bruno['id']))
db.commit()
contract(ana, 120, 'Pago', '2026-10-06')
contract(ana, 324, 'Pago', '2026-10-06')
contract(ana, 1152, 'Pendente', None)
old = contract(bruno, 120, 'Pago', '2026-09-01', dataFim='2026-09-30', situacao='Vencido')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1100}, locale='pt-BR')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(FRONTEND + '/')
    page.locator('#usuario').fill('admin')
    page.locator('#senha').fill('admin123')
    page.locator('button[type=submit]').click()
    page.wait_for_url('**/index.html')
    page.goto(FRONTEND + '/modulos/modulo-06-relatorios/index.html')

    def period(start, end=None):
        page.locator('#dataInicio').fill(start)
        page.locator('#dataFim').fill(end or start)
        page.wait_for_timeout(950)  # Respeita a proteção existente contra duplo clique (900 ms).
        with page.expect_response(lambda response: '/relatorios/dashboard?' in response.url):
            page.locator('#btnFiltrar').click()

    period('2026-10-06')
    expect(page.locator('#recebido-periodo')).to_contain_text('444,00')
    expect(page.locator('#pagamentosCorpo tr')).to_have_count(2)
    expect(page.locator('#pagamentos-total')).to_contain_text('444,00')
    expect(page.locator('#pagamentosCorpo')).to_contain_text('529.982.247-25')
    expect(page.locator('#tabelaCorpo')).to_contain_text('Nenhum aluno')
    page.screenshot(path=str(PRINTS / 'com-pagamentos-desktop.png'), full_page=True)
    page.locator('[aria-labelledby=recebimentos-title]').screenshot(path=str(PRINTS / 'detalhamento-soma.png'))

    period('2026-10-07')
    expect(page.locator('#recebido-periodo')).to_contain_text('0,00')
    expect(page.locator('#pagamentosCorpo')).to_contain_text('Nenhum pagamento recebido')
    expect(page.locator('#total-alunos')).to_have_text('2')
    page.screenshot(path=str(PRINTS / 'sem-pagamentos-desktop.png'), full_page=True)

    period('2026-10-06')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Página deve caber na largura do celular.'
    expect(page.locator('#recebido-periodo')).to_contain_text('444,00')
    page.screenshot(path=str(PRINTS / 'com-pagamentos-celular.png'), full_page=True)

    page.set_viewport_size({'width': 1440, 'height': 1100})
    page.goto(FRONTEND + '/modulos/modulo-02-financeiro/index.html')
    row = page.locator('tr[data-student-id="' + bruno['id'] + '"]')
    expect(row).to_contain_text('Vencido')
    row.locator('[data-action=payment]').click()
    page.locator('#status').select_option('Pago')
    page.locator('#dataPagamento').fill(TODAY)
    page.locator('#salvar-financeiro').click()
    expect(page.locator('#feedback')).to_contain_text('Pagamento salvo')
    expect(row).to_contain_text('Vigente')
    saved = request('/financeiro/' + old['id'])
    assert saved['statusPagamento'] == 'Pago' and saved['situacao'] == 'Vigente'
    assert saved['dataFim'] > TODAY
    page.screenshot(path=str(PRINTS / 'apos-renovacao-financeiro.png'), full_page=True)
    page.wait_for_timeout(950)
    page.locator('#salvar-financeiro').click()
    expect(page.locator('#feedback')).to_contain_text('Pagamento salvo')
    assert db.execute('SELECT COUNT(*) FROM Pagamento WHERE contratoId=?', (old['id'],)).fetchone()[0] == 2

    page.goto(FRONTEND + '/modulos/modulo-06-relatorios/index.html')
    period(TODAY)
    expect(page.locator('#recebido-periodo')).to_contain_text('120,00')
    expect(page.locator('#pagamentosCorpo')).to_contain_text('Bruno Renovacao Teste')
    page.screenshot(path=str(PRINTS / 'apos-renovacao-relatorio.png'), full_page=True)
    page.locator('#limparFiltros').click()
    expect(page.locator('#dataInicio')).to_have_value(TODAY[:7] + '-01')
    assert not errors, errors
    browser.close()

print(json.dumps({'browser': 'Chromium', 'persistencia': 'Prisma/SQLite real descartável',
                  'pagamentos_06_10': '120 + 324 = 444', 'pagamentos_07_10': 0,
                  'apos_renovacao': 120, 'historico_bruno': 2, 'page_errors': errors}, ensure_ascii=False))
db.close()
