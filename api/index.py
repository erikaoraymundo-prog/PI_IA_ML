import os
import sys

# Add the project root to sys.path (parent of 'api' directory)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from backend.main import app
