import json
import os
from typing import Dict, Any, List, Optional

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "surveyjs_definition.json")

def load_schema() -> Dict[str, Any]:
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading schema: {e}")
        return {}

SURVEY_SCHEMA = load_schema()

def resolve_reference(ref: str) -> Dict[str, Any]:
    """
    Resolves a reference string (e.g., "#page", "#panel") to the actual schema definition.
    """
    if not SURVEY_SCHEMA:
        return {"error": "Schema not loaded"}
    
    if not ref.startswith("#"):
        return {"error": f"Invalid reference format: {ref}. Must start with '#'"}
    
    key = ref[1:] # Remove '#'
    
    # Check in definitions
    definitions = SURVEY_SCHEMA.get("definitions", {})
    if key in definitions:
        return definitions[key]
    
    # Check in properties (sometimes refs point to top-level properties?)
    # Based on standard JSON schema, refs usually point to definitions, but let's be robust.
    properties = SURVEY_SCHEMA.get("properties", {})
    if key in properties:
        return properties[key]
        
    return {"error": f"Reference '{ref}' not found in schema definitions."}

def get_schema_elements() -> str:
    """
    Returns a summary of available elements (questions, panels, etc.) from the schema.
    It looks into the 'questions' definition or similar to find available types.
    """
    if not SURVEY_SCHEMA:
        return "Error: Schema not loaded"
        
    # In SurveyJS schema, 'panelbase' usually contains the 'questions' list which lists all available question types.
    # Let's try to find where the list of elements is defined.
    
    elements_summary = []
    
    # Strategy 1: Look for 'panelbase' -> 'questions' -> 'items'
    definitions = SURVEY_SCHEMA.get("definitions", {})
    panelbase = definitions.get("panelbase", {})
    questions_prop = panelbase.get("properties", {}).get("questions", {})
    
    items = questions_prop.get("items", [])
    if not items:
         # Fallback: maybe it's under 'page' -> 'elements'
         page = definitions.get("page", {})
         # page has 'allOff' usually, need to dig deeper.
         # Let's stick to 'panelbase' as it was seen in the file view earlier.
         pass

    if items:
        elements_summary.append("Available Question/Element Types:")
        for item in items:
            # item is like {"$href": "#text"} or {"$ref": "#text"}
            ref = item.get("$href") or item.get("$ref")
            if ref:
                element_name = ref.replace("#", "")
                elements_summary.append(f"- {element_name}")
                
    # Also look for 'properties' in the root to give global settings
    root_props = SURVEY_SCHEMA.get("properties", {}).keys()
    elements_summary.append("\nGlobal Survey Properties (Top-Level):")
    elements_summary.append(", ".join(list(root_props)[:20]) + "...") # List first 20
    
    return "\n".join(elements_summary)

def get_element_definition(element_name: str) -> str:
    """
    Returns the full definition of a specific element, resolving refs if needed.
    """
    # Try resolving as a ref first
    ref = f"#{element_name}"
    definition = resolve_reference(ref)
    
    if "error" not in definition:
        return json.dumps(definition, indent=2)
        
    # If not found as a direct ref, maybe it's a property in definitions
    # This is a bit of a guess, but useful for robustness.
    return json.dumps(definition, indent=2)
