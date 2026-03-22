import os
import sys

# Add the project root to sys.path (parent of 'api' directory)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# This entry point is needed for Vercel to find the FastAPI application
# The vercel.json will route /api/(.*) to this file
