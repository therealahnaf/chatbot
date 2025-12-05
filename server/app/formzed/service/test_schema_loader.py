import sys
import os
import json

# Add server directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up 4 levels: service -> formzed -> app -> server
server_dir = os.path.abspath(os.path.join(current_dir, "../../../"))
sys.path.append(server_dir)

from app.formzed.service.schema_loader import get_schema_elements, resolve_reference

def test_loader():
    print("Testing get_schema_elements()...")
    elements = get_schema_elements()
    print(f"Elements summary length: {len(elements)}")
    print("First 500 chars of elements summary:")
    print(elements[:500])
    
    print("\nTesting resolve_reference('#text')...")
    text_def = resolve_reference("#text")
    if "error" in text_def:
        print(f"Error resolving #text: {text_def['error']}")
    else:
        print("Successfully resolved #text")
        print(json.dumps(text_def, indent=2)[:500])

    print("\nTesting resolve_reference('#page')...")
    page_def = resolve_reference("#page")
    if "error" in page_def:
        print(f"Error resolving #page: {page_def['error']}")
    else:
        print("Successfully resolved #page")

if __name__ == "__main__":
    test_loader()
