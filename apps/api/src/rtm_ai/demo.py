"""Demo-only mock response endpoint; it does not call SysAid, ERP, or an LLM."""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/api/demo", tags=["demo"])


class ScreenContext(BaseModel):
    """Small allowlist of visible fields; never accept the full page text."""

    model_config = ConfigDict(extra="forbid")

    ticket_id: str | None = Field(default=None, max_length=80)
    subject: str | None = Field(default=None, max_length=240)
    customer: str | None = Field(default=None, max_length=160)
    support_type: str | None = Field(default=None, max_length=120)
    requester: str | None = Field(default=None, max_length=160)
    priority: str | None = Field(default=None, max_length=80)
    status: str | None = Field(default=None, max_length=80)


class DemoChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=500)
    screen_context: ScreenContext


def _mock_answer(message: str, context: ScreenContext) -> str:
    question = message.casefold()
    if any(term in question for term in ("suporte", "empresa", "título", "titulo")):
        company = context.customer or "não identificado na tela"
        subject = context.subject or "não identificado na tela"
        support_type = context.support_type or "não identificado na tela"
        answer = (
            "Resposta simulada — dados visíveis do chamado:\n"
            f"Empresa Cliente: {company}\n"
            f"Título: {subject}\n"
            f"Tipo de suporte: {support_type}\n"
            "Nível de suporte (mock): Suporte Premium"
        )
    elif "sla" in question or "prazo" in question:
        answer = "Resposta simulada: o SLA prioritário de demonstração é de 4 horas úteis."
    elif "contrato" in question or "produto" in question:
        answer = "Resposta simulada: contrato DEMO-2026-014, cobertura padrão e produto Workplace."
    elif "infra" in question or "servidor" in question:
        answer = "Resposta simulada: serviço de demonstração hospedado no ambiente corporativo."
    else:
        answer = "Resposta simulada: encontrei o contexto visível do chamado. Consulte SLA, contrato ou infraestrutura para ver exemplos."

    ticket = context.ticket_id or "não identificado na tela"
    return f"{answer}\n\nContexto lido da tela: chamado {ticket}."


@router.post("/chat", summary="Responde com dados simulados para a demo")
async def demo_chat(payload: DemoChatRequest) -> StreamingResponse:
    answer = _mock_answer(payload.message, payload.screen_context)

    async def events() -> AsyncIterator[str]:
        for token in answer.split(" "):
            yield f"data: {json.dumps({'type': 'token', 'text': token + ' '}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.025)
        yield 'data: {"type":"done"}\n\n'

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
