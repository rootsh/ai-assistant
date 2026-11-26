"""Demo-only mock response endpoint; it does not call SysAid, ERP, or an LLM."""

from __future__ import annotations

import asyncio
import hashlib
import json
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/api/demo", tags=["demo"])


class ScreenContext(BaseModel):
    """Only the ticket identifier is accepted from the browser."""

    model_config = ConfigDict(extra="forbid")

    ticket_id: str | None = Field(default=None, max_length=80)


class DemoChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=500)
    screen_context: ScreenContext


def _mock_answer(message: str, context: ScreenContext) -> str:
    question = message.casefold()
    if "nível de suporte" in question or "nivel de suporte" in question:
        answer = "Resposta simulada — nível de suporte contratado: Suporte Premium."
    elif any(term in question for term in ("empresa", "solicitante", "título", "titulo", "assunto", "tipo de suporte")):
        companies = ("Aurora Tecnologia (mock)", "Horizonte Logística (mock)", "Nuvem Sul (mock)", "Grupo Ipê (mock)")
        requesters = ("Marina Costa (mock)", "Rafael Lima (mock)", "Camila Nunes (mock)", "Bruno Alves (mock)")
        seed = hashlib.sha256((context.ticket_id or "demo").encode()).digest()
        company = companies[seed[0] % len(companies)]
        requester = requesters[seed[1] % len(requesters)]
        ticket = context.ticket_id or "não identificado"
        answer = (
            "Resposta simulada — dados fictícios para demonstração:\n"
            f"Empresa Cliente: {company}\n"
            f"Solicitante: {requester}\n"
            f"Título e tipo de suporte: seriam consultados no SysAid pelo chamado {ticket}."
        )
    elif "sla" in question or "prazo" in question:
        answer = "Resposta simulada: o SLA prioritário de demonstração é de 4 horas úteis."
    elif "contrato" in question or "produto" in question:
        answer = "Resposta simulada: contrato DEMO-2026-014 com os produtos Cloudlink, RSFN e RCS."
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
