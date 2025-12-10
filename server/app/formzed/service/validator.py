import json
import os
import jsonschema
from jsonschema import validate

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "surveyjs_definition.json")

def load_schema():
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading schema: {e}")
        return None

SURVEY_SCHEMA = load_schema()

def validate_json(json_data: dict) -> str:
    """
    Validates the given JSON object against the SurveyJS schema.
    Returns "Valid" if successful, or an error message string if failed.
    """
    if not SURVEY_SCHEMA:
        return "Error: Schema not loaded."
    
    try:
        validate(instance=json_data, schema=SURVEY_SCHEMA)
        return "Valid"
    except jsonschema.exceptions.ValidationError as e:
        # Return a concise error message
        return f"Validation Error: {e.message} at path: {list(e.path)}"
    except Exception as e:
        return f"Unexpected Error: {e}"

if __name__ == "__main__":
    # Test with a simple valid/invalid json
    test_json = {
        "pages": [
            {
                "name": "page1",
                "elements": [
                    {
                        "type": "text",
                        "name": "q1"
                    }
                ]
            }
        ]
    }
    print(validate_json(test_json))
