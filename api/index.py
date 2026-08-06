import sys
import os

# Ensure backend directory is in sys.path for Vercel Serverless environment
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from app.main import fastapi_app as app
except Exception as exc:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_trace = traceback.format_exc()
    print("CRITICAL DEPLOYMENT INITIALIZATION ERROR:")
    print(err_trace)

    # Fallback diagnostic FastAPI app
    app = FastAPI(title="Bid2Ride Vercel Diagnostic Mode")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def vercel_error_diagnostic_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "code": "VERCEL_FUNCTION_INITIALIZATION_FAILED",
                "message": "FastAPI backend failed to initialize during serverless import.",
                "details": str(exc),
                "traceback": err_trace.splitlines()
            }
        )
