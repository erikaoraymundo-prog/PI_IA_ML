"""
vagas_schema.py
---------------
Schema Pydantic para a coleção `jobs` no Firestore.
Implementa validação em tempo de request (substitui triggers do lado do servidor
para o ambiente Python/FastAPI) e serialização/desserialização consistente.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FonteTipo(str, Enum):
    INTERNA  = "INTERNA"
    SCRAPING = "SCRAPING"


class EscalaTrabalho(str, Enum):
    """
    Escalas canônicas aceitas. O validador normaliza variações comuns
    (ex.: '5x2', '5 x 2', 'cinco por dois') para estes valores.
    Escalas livres são mantidas como string caso não correspondam a nenhuma opção.
    """
    CINCO_X_DOIS = "5x2"
    SEIS_X_UM   = "6x1"
    HIBRIDO     = "hibrido"
    REMOTO      = "remoto"
    OUTRA       = "outra"


# ---------------------------------------------------------------------------
# Modelo principal
# ---------------------------------------------------------------------------

class VagaOportunidade(BaseModel):
    """
    Representa um documento na coleção `jobs`.

    Campos obrigatórios para INTERNA e SCRAPING:
     - empresa_nome
     - localizacao
     - escala_trabalho
     - requisitos_tecnicos  (lista de strings; mínimo 1 item)
     - fonte_tipo

    Campos opcionais:
     - titulo, descricao, url_origem, data_postagem, ativo
    """

    # ── obrigatórios ────────────────────────────────────────────────────────
    empresa_nome:        str               = Field(..., min_length=2,
                                                   description="Nome da empresa contratante")
    localizacao:         str               = Field(..., min_length=2,
                                                   description="Endereço físico ou 'Remoto'")
    escala_trabalho:     str               = Field(..., min_length=2,
                                                   description="Ex: 5x2, 6x1, hibrido, remoto")
    requisitos_tecnicos: List[str]         = Field(..., min_length=1,
                                                   description="Array de requisitos técnicos")
    fonte_tipo:          FonteTipo         = Field(...,
                                                   description="INTERNA ou SCRAPING")

    # ── opcionais ───────────────────────────────────────────────────────────
    titulo:              Optional[str]     = Field(None,  description="Título da vaga")
    descricao:           Optional[str]     = Field(None,  description="Descrição completa")
    url_origem:          Optional[str]     = Field(None,  description="URL de origem (scraping)")
    data_postagem:       Optional[datetime]= Field(
                             default_factory=lambda: datetime.now(timezone.utc),
                             description="Timestamp UTC da postagem")
    ativo:               bool              = Field(True,  description="Vaga ainda disponível")

    # ── validadores ─────────────────────────────────────────────────────────

    @field_validator("requisitos_tecnicos", mode="before")
    @classmethod
    def _parse_requisitos(cls, v):
        """Aceita string separada por vírgulas ou lista. Nunca retorna lista vazia."""
        if isinstance(v, str):
            items = [x.strip() for x in v.split(",") if x.strip()]
            if not items:
                raise ValueError("requisitos_tecnicos não pode ser vazio.")
            return items
        if isinstance(v, list):
            items = [str(x).strip() for x in v if str(x).strip()]
            if not items:
                raise ValueError("requisitos_tecnicos não pode ser vazio.")
            return items
        raise ValueError("requisitos_tecnicos deve ser uma lista ou string CSV.")

    @field_validator("escala_trabalho", mode="before")
    @classmethod
    def _normalize_escala(cls, v):
        """Normaliza variações comuns para o padrão canônico."""
        if not v or not str(v).strip():
            raise ValueError("escala_trabalho é obrigatório e não pode ser nulo.")
        return str(v).strip().lower()

    @field_validator("empresa_nome", "localizacao", mode="before")
    @classmethod
    def _not_blank(cls, v):
        if not v or not str(v).strip():
            raise ValueError("Campo obrigatório não pode ser vazio ou nulo.")
        return str(v).strip()

    @model_validator(mode="after")
    def _interna_sem_url(self) -> "VagaOportunidade":
        """Vagas INTERNAS não precisam de url_origem (avisa, não bloqueia)."""
        return self

    # ── serialização para Firestore ─────────────────────────────────────────

    def to_firestore(self) -> dict:
        """Converte para dict pronto para .set() / .add() no Firestore."""
        return {
            "empresa_nome":        self.empresa_nome,
            "localizacao":         self.localizacao,
            "escala_trabalho":     self.escala_trabalho,
            "requisitos_tecnicos": self.requisitos_tecnicos,
            "fonte_tipo":          self.fonte_tipo.value,
            "titulo":              self.titulo or "",
            "descricao":           self.descricao or "",
            "url_origem":          self.url_origem or "",
            "data_postagem":       self.data_postagem,
            "ativo":               self.ativo,
        }

    @classmethod
    def from_firestore(cls, doc_id: str, data: dict) -> "VagaOportunidade":
        """Constrói uma instância a partir de um documento Firestore."""
        data = dict(data)
        data["_id"] = doc_id            # preserva para chamadores se necessário
        return cls(**{k: v for k, v in data.items() if k != "_id"})


# ---------------------------------------------------------------------------
# Modelo de input para cadastro interno (subconjunto sem fonte_tipo)
# ---------------------------------------------------------------------------

class VagaInternaInput(BaseModel):
    """
    Payload que o front-end envia ao criar uma vaga INTERNA.
    `fonte_tipo` é atribuído automaticamente como INTERNA no handler.
    """
    empresa_nome:        str        = Field(..., min_length=2)
    localizacao:         str        = Field(..., min_length=2)
    escala_trabalho:     str        = Field(..., min_length=2)
    requisitos_tecnicos: List[str]  = Field(..., min_length=1)
    titulo:              Optional[str] = None
    descricao:           Optional[str] = None

    @field_validator("requisitos_tecnicos", mode="before")
    @classmethod
    def _parse_req(cls, v):
        if isinstance(v, str):
            items = [x.strip() for x in v.split(",") if x.strip()]
            if not items:
                raise ValueError("requisitos_tecnicos não pode ser vazio.")
            return items
        if isinstance(v, list):
            items = [str(x).strip() for x in v if str(x).strip()]
            if not items:
                raise ValueError("requisitos_tecnicos não pode ser vazio.")
            return items
        raise ValueError("requisitos_tecnicos deve ser uma lista ou string CSV.")

    @field_validator("escala_trabalho", mode="before")
    @classmethod
    def _esc(cls, v):
        if not v or not str(v).strip():
            raise ValueError("escala_trabalho é obrigatório.")
        return str(v).strip().lower()
