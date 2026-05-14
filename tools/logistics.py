def reserve_room(params):
    return f"Salle {params.get('salle')} réservée"

def check_equipment(params):
    return f"{params.get('item')} disponible"