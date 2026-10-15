# Option 2: Cadwyn. Runs only on Python + FastAPI + Pydantic.
# Run: uv run --python 3.12 --with "cadwyn==7.4.0" --with httpx python -W ignore app.py
from typing import Literal

from pydantic import BaseModel
from fastapi.testclient import TestClient
from cadwyn import (
    Cadwyn, HeadVersion, RequestInfo, ResponseInfo, Version, VersionBundle,
    VersionChange, VersionedAPIRouter, convert_request_to_next_version_for,
    convert_response_to_previous_version_for, schema,
)


# ---- HEAD schemas: the only models business code uses -----------------------
class Sender(BaseModel):
    handle: str
    protocol: Literal["imessage", "sms", "whatsapp"]


class SendMessageRequest(BaseModel):
    to: Sender
    text: str


class Message(BaseModel):
    id: str
    sender: Sender
    text: str


# ---- One VersionChange describes the past and converts data -----------------
class StructureTheSender(VersionChange):
    """`sender` is now an object with `handle` and `protocol`. Requests use
    `to` instead of `recipient`."""

    instructions_to_migrate_to_previous_version = (
        schema(Message).field("sender").had(type=str),
        schema(SendMessageRequest).field("to").didnt_exist,
        schema(SendMessageRequest).field("recipient").existed_as(type=str),
    )

    @convert_request_to_next_version_for(SendMessageRequest)
    def recipient_to_structured(request: RequestInfo):
        request.body["to"] = {
            "handle": request.body.pop("recipient"), "protocol": "sms"}

    @convert_response_to_previous_version_for(Message)
    def structured_to_phone(response: ResponseInfo):
        response.body["sender"] = response.body["sender"]["handle"]


versions = VersionBundle(
    HeadVersion(),
    Version("2026-10", StructureTheSender),
    Version("2026-07"),
)

# ---- Business logic: written once, against HEAD ----------------------------
router = VersionedAPIRouter()


@router.post("/v1/messages", response_model=Message)
async def send(req: SendMessageRequest) -> Message:
    return Message(id="msg_1", sender=req.to, text=req.text)


app = Cadwyn(
    versions=versions,
    api_version_parameter_name="Photon-Version",
    api_version_format="string",  # default is ISO dates; Photon uses YYYY-MM
    changelog_url=None,
)
app.generate_and_include_versioned_routers(router)

if __name__ == "__main__":
    c = TestClient(app)
    old = c.post("/v1/messages", headers={"Photon-Version": "2026-07"},
                 json={"recipient": "+15551234567", "text": "Hello"})
    new = c.post("/v1/messages", headers={"Photon-Version": "2026-10"},
                 json={"to": {"handle": "+15551234567", "protocol": "sms"}, "text": "Hello"})
    print("2026-07:", old.status_code, old.json())
    print("2026-10:", new.status_code, new.json())
    bad = c.post("/v1/messages", headers={"Photon-Version": "2026-07"},
                 json={"to": {"handle": "x", "protocol": "sms"}, "text": "Hello"})
    print("2026-07 with a 2026-10 body:", bad.status_code)
    for v in ("2026-07", "2026-10"):
        spec = c.get(f"/openapi.json?version={v}").json()
        props = spec["components"]["schemas"]["Message"]["properties"]["sender"]
        print(f"OpenAPI {v} Message.sender:", props)
