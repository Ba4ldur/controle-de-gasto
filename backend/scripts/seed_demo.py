"""Cria dados de demonstração para desenvolvimento local.

Uso (a partir de backend/):
    python -m scripts.seed_demo

Cria a empresa "Padaria Estrela LTDA" com um contador e um cliente PJ, duas
contas bancárias e as categorias/regras globais. Senhas apenas para ambiente
local de desenvolvimento.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import criar_usuario, vincular_usuario_empresa  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.models import ContaBancaria, Empresa, Usuario  # noqa: E402
from app.services.seed import seed_globais  # noqa: E402


def main():
    init_db(settings.database_url)
    with SessionLocal() as db:
        seed_globais(db)

        if db.query(Usuario).filter_by(email="contador@attivare.com.br").first():
            print("Dados de demonstração já existem.")
            return

        empresa = Empresa(nome="Padaria Estrela LTDA", cnpj_mascarado="**.***.***/0001-**")
        db.add(empresa)
        db.commit()

        contador = criar_usuario(
            db, "contador@attivare.com.br", "Contador Attivare", "attivare-dev", "contador"
        )
        cliente = criar_usuario(
            db, "cliente@padariaestrela.com.br", "Cliente Padaria Estrela", "cliente-dev", "cliente"
        )
        vincular_usuario_empresa(db, contador, empresa)
        vincular_usuario_empresa(db, cliente, empresa)

        db.add_all(
            [
                ContaBancaria(
                    empresa_id=empresa.id,
                    banco="Banco do Brasil",
                    apelido="Conta movimento",
                    conta_mascarada="ag. ****/cc ****-3",
                ),
                ContaBancaria(
                    empresa_id=empresa.id,
                    banco="Itaú",
                    apelido="Conta reserva",
                    conta_mascarada="ag. ****/cc ****-7",
                ),
            ]
        )
        db.commit()

        print("Dados de demonstração criados.")
        print("  contador@attivare.com.br / attivare-dev")
        print("  cliente@padariaestrela.com.br / cliente-dev")
        print("Extratos de exemplo em backend/samples/.")


if __name__ == "__main__":
    main()
