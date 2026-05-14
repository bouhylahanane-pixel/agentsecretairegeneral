def summarize_email(message: str):
    return message[:100]

def classify_email(message: str):
    msg = message.lower()

    if "réunion" in msg:
        return "meeting"
    elif "attestation" in msg:
        return "document"
    elif "salle" in msg:
        return "logistique"

    return "general"

def detect_urgency(message: str):
    return "high" if "urgent" in message.lower() else "normal"

def extract_action(message: str):
    msg = message.lower()

    if "réunion" in msg:
        return {"action": "create_meeting", "parameters": {"date": "demain"}}

    elif "attestation" in msg:
        return {"action": "generate_document", "parameters": {"type": "attestation"}}

    return {"action": "none", "parameters": {}}

def process_email(message: str):

    summary = summarize_email(message)
    category = classify_email(message)
    urgency = detect_urgency(message)
    action_data = extract_action(message)

    return {
        "summary": summary,
        "category": category,
        "urgency": urgency,
        "action_data": action_data
    }