from fastapi import APIRouter

from recyclic_api.api.api_v2.endpoints.exploitation import router as exploitation_router

api_v2_router = APIRouter()
api_v2_router.include_router(exploitation_router, prefix="/exploitation", tags=["exploitation"])
