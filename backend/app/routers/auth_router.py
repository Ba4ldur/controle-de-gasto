"""Login/logout e identidade do usuário autenticado."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import (
    criar_sessao,
    encerrar_sessao,
    get_current_user,
    verificar_senha,
)
from app.config import settings
from app.db import get_db
from app.models import Empresa, Usuario, UsuarioEmpresa
from app.services import audit

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    senha: str


def _empresas_do_usuario(db: Session, usuario: Usuario) -> list[dict]:
    empresas = (
        db.query(Empresa)
        .join(UsuarioEmpresa, UsuarioEmpresa.empresa_id == Empresa.id)
        .filter(UsuarioEmpresa.usuario_id == usuario.id)
        .all()
    )
    return [{"id": e.id, "nome": e.nome} for e in empresas]


@router.post("/login")
def login(dados: LoginIn, response: Response, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter_by(email=dados.email.lower().strip()).one_or_none()
    if usuario is None or not usuario.ativo or not verificar_senha(
        dados.senha, usuario.senha_hash
    ):
        # Mensagem única: não revela se o e-mail existe.
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = criar_sessao(db, usuario)
    response.set_cookie(
        "sessao",
        token,
        httponly=True,
        samesite="lax",
        max_age=settings.sessao_ttl_horas * 3600,
    )
    audit.registrar(db, "login", usuario.id)
    return {
        "token": token,
        "usuario": {"id": usuario.id, "nome": usuario.nome, "papel": usuario.papel},
        "empresas": _empresas_do_usuario(db, usuario),
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("sessao")
    if token:
        encerrar_sessao(db, token)
    response.delete_cookie("sessao")
    return {"ok": True}


@router.get("/me")
def me(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "usuario": {"id": usuario.id, "nome": usuario.nome, "papel": usuario.papel},
        "empresas": _empresas_do_usuario(db, usuario),
    }
