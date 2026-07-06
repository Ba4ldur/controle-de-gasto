"""Modelos de dados — seções 6 e 7 da especificação.

Valores monetários são armazenados em centavos (inteiro) para aritmética
exata em qualquer dialeto. A descrição original fica restrita ao banco
(auditoria) e nunca é exposta pela API nem por logs; toda exibição usa a
descrição normalizada, já mascarada na ingestão.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _agora() -> datetime:
    return datetime.now(timezone.utc)


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    nome: Mapped[str] = mapped_column(String(200))
    cnpj_mascarado: Mapped[str | None] = mapped_column(String(30), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(200))
    papel: Mapped[str] = mapped_column(String(20))  # contador | cliente
    senha_hash: Mapped[str] = mapped_column(String(300))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class UsuarioEmpresa(Base):
    """Vínculo N:N — um contador atende várias empresas."""

    __tablename__ = "usuarios_empresas"
    __table_args__ = (UniqueConstraint("usuario_id", "empresa_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    empresa_id: Mapped[str] = mapped_column(ForeignKey("empresas.id"), index=True)


class SessaoToken(Base):
    """Sessões de login: o token circula apenas com o cliente; aqui fica o hash."""

    __tablename__ = "sessoes_token"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class ContaBancaria(Base):
    __tablename__ = "contas_bancarias"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    empresa_id: Mapped[str] = mapped_column(ForeignKey("empresas.id"), index=True)
    banco: Mapped[str] = mapped_column(String(100))
    apelido: Mapped[str] = mapped_column(String(100))
    conta_mascarada: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Categoria(Base):
    """Categorias globais (empresa_id nulo) ou próprias da empresa.

    ``fora_do_resultado`` marca categorias neutras que não entram em
    receita/despesa (transferências, investimentos, estornos). "A classificar"
    é neutra mas permanece NO resultado: dinheiro real não some dos totais
    por falta de classificação — o dashboard destaca o pendente.
    """

    __tablename__ = "categorias"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    nome: Mapped[str] = mapped_column(String(100), index=True)
    tipo: Mapped[str] = mapped_column(String(10))  # receita | despesa | neutra
    fora_do_resultado: Mapped[bool] = mapped_column(Boolean, default=False)
    empresa_id: Mapped[str | None] = mapped_column(
        ForeignKey("empresas.id"), nullable=True, index=True
    )


class RegraCategorizacao(Base):
    """Regra de categorização. Escopo empresa tem precedência sobre global."""

    __tablename__ = "regras_categorizacao"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    empresa_id: Mapped[str | None] = mapped_column(
        ForeignKey("empresas.id"), nullable=True, index=True
    )
    padrao: Mapped[str] = mapped_column(String(200))
    tipo_padrao: Mapped[str] = mapped_column(String(10), default="keyword")  # keyword | regex
    categoria_id: Mapped[str] = mapped_column(ForeignKey("categorias.id"))
    # Quando definido, sobrescreve o tipo inferido pelo sinal do valor
    # (tarifa, imposto, transferencia, investimento, estorno).
    tipo_transacao: Mapped[str | None] = mapped_column(String(20), nullable=True)
    prioridade: Mapped[int] = mapped_column(Integer, default=0)
    confianca: Mapped[float] = mapped_column(Float, default=0.7)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)
    criada_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)

    categoria: Mapped[Categoria] = relationship()


class ArquivoImportado(Base):
    __tablename__ = "arquivos_importados"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    empresa_id: Mapped[str] = mapped_column(ForeignKey("empresas.id"), index=True)
    conta_id: Mapped[str] = mapped_column(ForeignKey("contas_bancarias.id"), index=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    nome_original: Mapped[str] = mapped_column(String(300))
    formato: Mapped[str] = mapped_column(String(10))  # csv | xlsx | ofx
    hash_sha256: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(20), default="concluido")  # concluido | erro
    periodo_inicio: Mapped[Date | None] = mapped_column(Date, nullable=True)
    periodo_fim: Mapped[Date | None] = mapped_column(Date, nullable=True)
    total_linhas: Mapped[int] = mapped_column(Integer, default=0)
    linhas_importadas: Mapped[int] = mapped_column(Integer, default=0)
    linhas_duplicadas: Mapped[int] = mapped_column(Integer, default=0)
    linhas_rejeitadas: Mapped[int] = mapped_column(Integer, default=0)
    # Motivos de rejeição (linha + motivo), sem conteúdo sensível.
    rejeicoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Transacao(Base):
    __tablename__ = "transacoes"
    __table_args__ = (UniqueConstraint("conta_id", "hash_dedup"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    empresa_id: Mapped[str] = mapped_column(ForeignKey("empresas.id"), index=True)
    conta_id: Mapped[str] = mapped_column(ForeignKey("contas_bancarias.id"), index=True)
    arquivo_id: Mapped[str] = mapped_column(ForeignKey("arquivos_importados.id"), index=True)
    linha_origem: Mapped[int] = mapped_column(Integer)
    data_transacao: Mapped[Date] = mapped_column(Date, index=True)
    descricao_original: Mapped[str] = mapped_column(Text)
    descricao_normalizada: Mapped[str] = mapped_column(Text)
    valor_centavos: Mapped[int] = mapped_column(BigInteger)  # negativo = saída
    moeda: Mapped[str] = mapped_column(String(3), default="BRL")
    tipo: Mapped[str] = mapped_column(String(20))
    categoria_id: Mapped[str | None] = mapped_column(ForeignKey("categorias.id"), nullable=True)
    confianca: Mapped[float] = mapped_column(Float, default=0.0)
    metodo_categorizacao: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status_revisao: Mapped[str] = mapped_column(
        String(20), default="automatica", index=True
    )  # automatica | pendente_revisao | revisada
    contraparte_interna: Mapped[bool] = mapped_column(Boolean, default=False)
    possivel_duplicidade: Mapped[bool] = mapped_column(Boolean, default=False)
    saldo_apos_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    hash_dedup: Mapped[str] = mapped_column(String(64), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora, onupdate=_agora
    )

    categoria: Mapped[Categoria | None] = relationship()


class CorrecaoUsuario(Base):
    """Correções manuais — base do aprendizado (regras da empresa)."""

    __tablename__ = "correcoes_usuario"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    transacao_id: Mapped[str] = mapped_column(ForeignKey("transacoes.id"), index=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    categoria_anterior_id: Mapped[str | None] = mapped_column(
        ForeignKey("categorias.id"), nullable=True
    )
    categoria_nova_id: Mapped[str] = mapped_column(ForeignKey("categorias.id"))
    gerou_regra_id: Mapped[str | None] = mapped_column(
        ForeignKey("regras_categorizacao.id"), nullable=True
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class LogAuditoria(Base):
    """Trilha de auditoria append-only. Nunca contém dados sensíveis."""

    __tablename__ = "logs_auditoria"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    usuario_id: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    empresa_id: Mapped[str | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)
    acao: Mapped[str] = mapped_column(String(50))
    entidade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entidade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)
