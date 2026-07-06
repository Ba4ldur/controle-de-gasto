"""Autenticação e isolamento multiempresa.

Senhas: scrypt (stdlib), com salt individual. Sessões: token aleatório
entregue ao cliente (cookie httpOnly ou header Bearer); no banco fica apenas
o SHA-256 do token, com expiração.

Isolamento: toda rota de dados exige ``require_empresa``, que confirma o
vínculo usuário↔empresa. Recursos de outra empresa respondem 404 — a
existência não é revelada.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Empresa, SessaoToken, Usuario, UsuarioEmpresa

_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1


def hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    chave = hashlib.scrypt(
        senha.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${chave.hex()}"


def verificar_senha(senha: str, armazenada: str) -> bool:
    try:
        _, n, r, p, salt_hex, chave_hex = armazenada.split("$")
        chave = hashlib.scrypt(
            senha.encode(), salt=bytes.fromhex(salt_hex), n=int(n), r=int(r), p=int(p)
        )
        return hmac.compare_digest(chave.hex(), chave_hex)
    except (ValueError, TypeError):
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def criar_sessao(db: Session, usuario: Usuario) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        SessaoToken(
            usuario_id=usuario.id,
            token_hash=_hash_token(token),
            expira_em=datetime.now(timezone.utc)
            + timedelta(hours=settings.sessao_ttl_horas),
        )
    )
    db.commit()
    return token


def encerrar_sessao(db: Session, token: str) -> None:
    sessao = (
        db.query(SessaoToken).filter_by(token_hash=_hash_token(token)).one_or_none()
    )
    if sessao:
        db.delete(sessao)
        db.commit()


def _extrair_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.cookies.get("sessao")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Usuario:
    token = _extrair_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    sessao = (
        db.query(SessaoToken).filter_by(token_hash=_hash_token(token)).one_or_none()
    )
    if sessao is None:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    expira = sessao.expira_em
    if expira.tzinfo is None:  # SQLite devolve naive
        expira = expira.replace(tzinfo=timezone.utc)
    if expira < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    usuario = db.get(Usuario, sessao.usuario_id)
    if usuario is None or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário inativo")
    return usuario


def require_empresa(
    empresa_id: str,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Empresa:
    vinculo = (
        db.query(UsuarioEmpresa)
        .filter_by(usuario_id=usuario.id, empresa_id=empresa_id)
        .one_or_none()
    )
    if vinculo is None:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return db.get(Empresa, empresa_id)


def criar_usuario(
    db: Session, email: str, nome: str, senha: str, papel: str = "contador"
) -> Usuario:
    usuario = Usuario(email=email, nome=nome, papel=papel, senha_hash=hash_senha(senha))
    db.add(usuario)
    db.commit()
    return usuario


def vincular_usuario_empresa(db: Session, usuario: Usuario, empresa: Empresa) -> None:
    db.add(UsuarioEmpresa(usuario_id=usuario.id, empresa_id=empresa.id))
    db.commit()
