"""Aplicação FastAPI — API JSON + interface web leve.

Execução local (a partir de backend/):
    uvicorn app.main:create_app --factory --reload
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.db import SessionLocal, init_db
from app.logging_conf import configurar_logging
from app.routers import auth_router, empresa_router
from app.services.seed import seed_globais

_WEB = Path(__file__).parent / "web"


def create_app(database_url: str | None = None) -> FastAPI:
    configurar_logging()
    init_db(database_url or settings.database_url)
    with SessionLocal() as db:
        seed_globais(db)

    app = FastAPI(
        title="Controle de Gastos Attivare — Análise de Extrato Bancário",
        version="0.1.0",
    )
    app.include_router(auth_router.router)
    app.include_router(empresa_router.router)

    app.mount("/static", StaticFiles(directory=_WEB / "static"), name="static")
    templates = Jinja2Templates(directory=_WEB / "templates")

    paginas = {
        "/": ("dashboard.html", "Visão geral"),
        "/login": ("login.html", "Entrar"),
        "/transacoes": ("transacoes.html", "Transações"),
        "/importar": ("importar.html", "Importar extrato"),
        "/importacoes": ("importacoes.html", "Importações"),
    }

    def _registrar_pagina(caminho: str, template: str, titulo: str):
        @app.get(caminho, include_in_schema=False)
        def pagina(request: Request):
            return templates.TemplateResponse(
                request, template, {"titulo": titulo}
            )

    for caminho, (template, titulo) in paginas.items():
        _registrar_pagina(caminho, template, titulo)

    return app
