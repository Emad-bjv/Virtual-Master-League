import unicodedata
from decimal import Decimal
from .models import Team, Player, TeamGamePlan


def normalize_name(name: str) -> str:
    nfkd = unicodedata.normalize('NFKD', name)
    ascii_name = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return ascii_name.lower().replace('.', ' ').replace('-', ' ').replace("'", "").strip()


FORMATION_PRESETS = {
    # Category 1: 4 Defenders
    '4-5-1 (4-2-3-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 35.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 65.0, 'y': 58.0},
        {'pos': 'LMF', 'x': 18.0, 'y': 38.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'RMF', 'x': 82.0, 'y': 38.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-5-1 (4-1-4-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 60.0},
        {'pos': 'LMF', 'x': 18.0, 'y': 40.0},
        {'pos': 'AMF', 'x': 38.0, 'y': 42.0},
        {'pos': 'AMF', 'x': 62.0, 'y': 42.0},
        {'pos': 'RMF', 'x': 82.0, 'y': 40.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-5-1 (4-3-2-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'CMF', 'x': 28.0, 'y': 55.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 60.0},
        {'pos': 'CMF', 'x': 72.0, 'y': 55.0},
        {'pos': 'AMF', 'x': 36.0, 'y': 35.0},
        {'pos': 'AMF', 'x': 64.0, 'y': 35.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-4-2 (4-2-2-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'CMF', 'x': 35.0, 'y': 56.0},
        {'pos': 'CMF', 'x': 65.0, 'y': 56.0},
        {'pos': 'LMF', 'x': 18.0, 'y': 40.0},
        {'pos': 'RMF', 'x': 82.0, 'y': 40.0},
        {'pos': 'SS', 'x': 38.0, 'y': 22.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
    '4-4-2 (4-3-1-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'CMF', 'x': 30.0, 'y': 50.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 62.0},
        {'pos': 'CMF', 'x': 70.0, 'y': 50.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'SS', 'x': 38.0, 'y': 20.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
    '4-3-3 (4-2-1-3)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 35.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 65.0, 'y': 58.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 38.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 20.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 20.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-3-3 (4-1-2-3)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 60.0},
        {'pos': 'AMF', 'x': 35.0, 'y': 42.0},
        {'pos': 'AMF', 'x': 65.0, 'y': 42.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 20.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 20.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],

    # Category 2: 3 & 5 Defenders
    '3-6-1 (3-2-4-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 58.0},
        {'pos': 'LMF', 'x': 15.0, 'y': 38.0},
        {'pos': 'AMF', 'x': 38.0, 'y': 35.0},
        {'pos': 'AMF', 'x': 62.0, 'y': 35.0},
        {'pos': 'RMF', 'x': 85.0, 'y': 38.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '3-5-2 (3-2-3-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 58.0},
        {'pos': 'LMF', 'x': 15.0, 'y': 40.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'RMF', 'x': 85.0, 'y': 40.0},
        {'pos': 'SS', 'x': 38.0, 'y': 20.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
    '3-5-2 (3-3-2-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'CMF', 'x': 28.0, 'y': 52.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 62.0},
        {'pos': 'CMF', 'x': 72.0, 'y': 52.0},
        {'pos': 'AMF', 'x': 38.0, 'y': 35.0},
        {'pos': 'AMF', 'x': 62.0, 'y': 35.0},
        {'pos': 'SS', 'x': 38.0, 'y': 20.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
    '3-4-3 (3-2-2-3)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'CMF', 'x': 38.0, 'y': 56.0},
        {'pos': 'CMF', 'x': 62.0, 'y': 56.0},
        {'pos': 'LMF', 'x': 16.0, 'y': 40.0},
        {'pos': 'RMF', 'x': 84.0, 'y': 40.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 20.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 20.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '3-3-4 (3-3-4)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 58.0},
        {'pos': 'CMF', 'x': 28.0, 'y': 48.0},
        {'pos': 'CMF', 'x': 72.0, 'y': 48.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 18.0},
        {'pos': 'CF', 'x': 38.0, 'y': 14.0},
        {'pos': 'CF', 'x': 62.0, 'y': 14.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 18.0},
    ],
    '5-4-1 (5-2-2-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 12.0, 'y': 68.0},
        {'pos': 'CB', 'x': 30.0, 'y': 76.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 70.0, 'y': 76.0},
        {'pos': 'RB', 'x': 88.0, 'y': 68.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 54.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 54.0},
        {'pos': 'LMF', 'x': 18.0, 'y': 36.0},
        {'pos': 'RMF', 'x': 82.0, 'y': 36.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '5-3-2 (5-2-1-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 12.0, 'y': 68.0},
        {'pos': 'CB', 'x': 30.0, 'y': 76.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 70.0, 'y': 76.0},
        {'pos': 'RB', 'x': 88.0, 'y': 68.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 54.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 54.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'SS', 'x': 38.0, 'y': 20.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
    '5-3-2 (5-3-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 12.0, 'y': 68.0},
        {'pos': 'CB', 'x': 30.0, 'y': 76.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 70.0, 'y': 76.0},
        {'pos': 'RB', 'x': 88.0, 'y': 68.0},
        {'pos': 'CMF', 'x': 30.0, 'y': 50.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 58.0},
        {'pos': 'CMF', 'x': 70.0, 'y': 50.0},
        {'pos': 'SS', 'x': 38.0, 'y': 20.0},
        {'pos': 'CF', 'x': 62.0, 'y': 16.0},
    ],
}

DEFAULT_TEAM_FORMATIONS = {
    'AC Milan': '4-5-1 (4-2-3-1)',
    'Arsenal': '4-3-3 (4-2-1-3)',
    'Atlético Madrid': '4-4-2 (4-2-2-2)',
    'BVB Borussia Dortmund': '4-5-1 (4-2-3-1)',
    'Chelsea': '4-3-3 (4-2-1-3)',
    'FC Barcelona': '4-3-3 (4-2-1-3)',
    'FC Bayern München': '4-5-1 (4-2-3-1)',
    'Inter': '3-5-2 (3-2-3-2)',
    'Juventus': '4-3-3 (4-2-1-3)',
    'Liverpool': '4-3-3 (4-2-1-3)',
    'Manchester City': '4-3-3 (4-2-1-3)',
    'Manchester United': '4-5-1 (4-2-3-1)',
    'Newcastle United': '4-3-3 (4-2-1-3)',
    'Paris Saint-Germain': '4-3-3 (4-2-1-3)',
    'Real Madrid': '4-3-3 (4-2-1-3)',
    'Tottenham Hotspur': '4-5-1 (4-2-3-1)',
    'AS Roma': '4-5-1 (4-2-3-1)',
    'SSC Napoli': '4-3-3 (4-2-1-3)',
}

PES_DEFAULT_STARTERS = {
    "AC Milan": [
        {
            "name": "M. Maignan",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "A. Saelemaekers",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "M. Gabbia",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "K. De Winter",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "P. Estupiñán",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Y. Fofana",
            "pos": "DMF",
            "loc": "RCDM",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "S. Ricci",
            "pos": "DMF",
            "loc": "LCDM",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "C. Pulisic",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "A. Rabiot",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "Rafael Leão",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "S. Giménez",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "Arsenal": [
        {
            "name": "David Raya",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "B. White",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "W. Saliba",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "Gabriel",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "M. Lewis-Skelly",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "M. Ødegaard",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "D. Rice",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "Zubimendi",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "B. Saka",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "V. Gyökeres",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "E. Eze",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Atlético Madrid": [
        {
            "name": "J. Oblak",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Pubill",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "J. Giménez",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "R. Le Normand",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "D. Hancko",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Marcos Llorente",
            "pos": "RMF",
            "loc": "RM",
            "x": 85.0,
            "y": 45.0
        },
        {
            "name": "Pablo Barrios",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "Álex Baena",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "A. Lookman",
            "pos": "LMF",
            "loc": "LM",
            "x": 15.0,
            "y": 45.0
        },
        {
            "name": "A. Griezmann",
            "pos": "CF",
            "loc": "RST",
            "x": 62.0,
            "y": 18.0
        },
        {
            "name": "A. Sørloth",
            "pos": "CF",
            "loc": "LST",
            "x": 38.0,
            "y": 18.0
        }
    ],
    "BVB Borussia Dortmund": [
        {
            "name": "G. Kobel",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "J. Ryerson",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "N. Schlotterbeck",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "W. Anton",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "D. Svensson",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "F. Nmecha",
            "pos": "DMF",
            "loc": "RCDM",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "M. Sabitzer",
            "pos": "DMF",
            "loc": "LCDM",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "K. Adeyemi",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "J. Brandt",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "C. Chukwuemeka",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "S. Guirassy",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "Chelsea": [
        {
            "name": "Robert Sánchez",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "R. James",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "L. Colwill",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "W. Fofana",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "Marc Cucurella",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "M. Caicedo",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "E. Fernández",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "C. Palmer",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "Pedro Neto",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "João Pedro",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "A. Garnacho",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "FC Bayern München": [
        {
            "name": "M. Neuer",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "J. Kimmich",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "J. Tah",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "D. Upamecano",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "A. Davies",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "A. Pavlović",
            "pos": "DMF",
            "loc": "RCDM",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "L. Goretzka",
            "pos": "DMF",
            "loc": "LCDM",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "M. Olise",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "J. Musiala",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "L. Díaz",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "H. Kane",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "FC Barcelona": [
        {
            "name": "Joan García",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "J. Koundé",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "Pau Cubarsí",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "R. Araujo",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "Balde",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Fermín",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "Pedri",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "Gavi",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "Lamine Yamal",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "R. Lewandowski",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "Raphinha",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Inter": [
        {
            "name": "Y. Sommer",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Y. Bisseck",
            "pos": "CB",
            "loc": "RCB",
            "x": 75.0,
            "y": 75.0
        },
        {
            "name": "A. Bastoni",
            "pos": "CB",
            "loc": "CB",
            "x": 50.0,
            "y": 78.0
        },
        {
            "name": "S. de Vrij",
            "pos": "CB",
            "loc": "LCB",
            "x": 25.0,
            "y": 75.0
        },
        {
            "name": "D. Dumfries",
            "pos": "RMF",
            "loc": "RWB",
            "x": 85.0,
            "y": 45.0
        },
        {
            "name": "N. Barella",
            "pos": "CMF",
            "loc": "RCM",
            "x": 67.0,
            "y": 52.0
        },
        {
            "name": "H. Çalhanoğlu",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 55.0
        },
        {
            "name": "P. Zieliński",
            "pos": "CMF",
            "loc": "LCM",
            "x": 33.0,
            "y": 52.0
        },
        {
            "name": "F. Dimarco",
            "pos": "LMF",
            "loc": "LWB",
            "x": 15.0,
            "y": 45.0
        },
        {
            "name": "L. Martínez",
            "pos": "CF",
            "loc": "RST",
            "x": 62.0,
            "y": 18.0
        },
        {
            "name": "M. Thuram",
            "pos": "CF",
            "loc": "LST",
            "x": 38.0,
            "y": 18.0
        }
    ],
    "Juventus": [
        {
            "name": "M. Di Gregorio",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "A. Cambiaso",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "Bremer",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "P. Kalulu",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "L. Kelly",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "M. Locatelli",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "K. Thuram",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "T. Koopmeiners",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "Francisco Conceição",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "D. Vlahović",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "E. Zhegrova",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Liverpool": [
        {
            "name": "Alisson",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "J. Frimpong",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "I. Konaté",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "V. van Dijk",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "M. Kerkez",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "R. Gravenberch",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "A. Mac Allister",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "D. Szoboszlai",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "M. Salah",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "A. Isak",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "C. Gakpo",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Manchester City": [
        {
            "name": "G. Donnarumma",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "R. Lewis",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "Rúben Dias",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "J. Gvardiol",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "R. Aït-Nouri",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Rodri",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "T. Reijnders",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "P. Foden",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "O. Marmoush",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "E. Haaland",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "J. Doku",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Manchester United": [
        {
            "name": "S. Lammens",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Diogo Dalot",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "M. de Ligt",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "L. Martínez",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "P. Dorgu",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "M. Ugarte",
            "pos": "DMF",
            "loc": "RCDM",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "K. Mainoo",
            "pos": "DMF",
            "loc": "LCDM",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "B. Mbeumo",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "Bruno Fernandes",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "Amad",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "B. Šeško",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "Newcastle United": [
        {
            "name": "N. Pope",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "T. Livramento",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "S. Botman",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "M. Thiaw",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "L. Hall",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Bruno Guimarães",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "S. Tonali",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "J. Willock",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "A. Gordon",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "Y. Wissa",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "H. Barnes",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Paris Saint-Germain": [
        {
            "name": "L. Chevalier",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "A. Hakimi",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "W. Pacho",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "Marquinhos",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "Nuno Mendes",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Vitinha",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "João Neves",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "D. Doué",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "O. Dembélé",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "Gonçalo Ramos",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "K. Kvaratskhelia",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Real Madrid": [
        {
            "name": "T. Courtois",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "T. Alexander-Arnold",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "Éder Militão",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "A. Rüdiger",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "F. Mendy",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "F. Valverde",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 50.0
        },
        {
            "name": "J. Bellingham",
            "pos": "CMF",
            "loc": "CM",
            "x": 50.0,
            "y": 56.0
        },
        {
            "name": "E. Camavinga",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 50.0
        },
        {
            "name": "Rodrygo",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "K. Mbappé",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        },
        {
            "name": "Vini Jr.",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        }
    ],
    "Tottenham Hotspur": [
        {
            "name": "G. Vicario",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Pedro Porro",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "C. Romero",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "M. van de Ven",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "D. Udogie",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "Palhinha",
            "pos": "DMF",
            "loc": "RCDM",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "R. Bentancur",
            "pos": "DMF",
            "loc": "LCDM",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "D. Kulusevski",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "J. Maddison",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "M. Kudus",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "D. Solanke",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "AS Roma": [
        {
            "name": "M. Svilar",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Angeliño",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "E. Ndicka",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "G. Mancini",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "Wesley",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "K. Koné",
            "pos": "DMF",
            "loc": "LDMF",
            "x": 35.0,
            "y": 56.0
        },
        {
            "name": "B. Cristante",
            "pos": "DMF",
            "loc": "RDMF",
            "x": 65.0,
            "y": 56.0
        },
        {
            "name": "S. El Shaarawy",
            "pos": "LWF",
            "loc": "LW",
            "x": 20.0,
            "y": 36.0
        },
        {
            "name": "P. Dybala",
            "pos": "AMF",
            "loc": "CAM",
            "x": 50.0,
            "y": 36.0
        },
        {
            "name": "M. Soulé",
            "pos": "RWF",
            "loc": "RW",
            "x": 80.0,
            "y": 36.0
        },
        {
            "name": "A. Dovbyk",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ],
    "SSC Napoli": [
        {
            "name": "A. Meret",
            "pos": "GK",
            "loc": "GK",
            "x": 50.0,
            "y": 90.0
        },
        {
            "name": "Miguel Gutiérrez",
            "pos": "LB",
            "loc": "LB",
            "x": 15.0,
            "y": 72.0
        },
        {
            "name": "A. Buongiorno",
            "pos": "CB",
            "loc": "LCB",
            "x": 35.0,
            "y": 75.0
        },
        {
            "name": "A. Rrahmani",
            "pos": "CB",
            "loc": "RCB",
            "x": 65.0,
            "y": 75.0
        },
        {
            "name": "G. Di Lorenzo",
            "pos": "RB",
            "loc": "RB",
            "x": 85.0,
            "y": 72.0
        },
        {
            "name": "S. Lobotka",
            "pos": "DMF",
            "loc": "DMF",
            "x": 50.0,
            "y": 60.0
        },
        {
            "name": "A. Zambo Anguissa",
            "pos": "CMF",
            "loc": "LCM",
            "x": 30.0,
            "y": 52.0
        },
        {
            "name": "S. McTominay",
            "pos": "CMF",
            "loc": "RCM",
            "x": 70.0,
            "y": 52.0
        },
        {
            "name": "David Neres",
            "pos": "LWF",
            "loc": "LW",
            "x": 18.0,
            "y": 20.0
        },
        {
            "name": "M. Politano",
            "pos": "RWF",
            "loc": "RW",
            "x": 82.0,
            "y": 20.0
        },
        {
            "name": "R. Lukaku",
            "pos": "CF",
            "loc": "ST",
            "x": 50.0,
            "y": 15.0
        }
    ]
}

POSITION_FALLBACKS = {
    'GK': ['GK'],
    'CB': ['CB', 'LB', 'RB', 'DMF'],
    'LB': ['LB', 'LMF', 'CB', 'RB'],
    'RB': ['RB', 'RMF', 'CB', 'LB'],
    'DMF': ['DMF', 'CMF', 'CB'],
    'CMF': ['CMF', 'AMF', 'DMF', 'LMF', 'RMF'],
    'AMF': ['AMF', 'CMF', 'SS', 'LWF', 'RWF'],
    'LMF': ['LMF', 'LWF', 'CMF', 'LB'],
    'RMF': ['RMF', 'RWF', 'CMF', 'RB'],
    'LWF': ['LWF', 'LMF', 'SS', 'CF', 'AMF'],
    'RWF': ['RWF', 'RMF', 'SS', 'CF', 'AMF'],
    'SS': ['SS', 'CF', 'AMF', 'LWF', 'RWF'],
    'CF': ['CF', 'SS', 'LWF', 'RWF', 'AMF'],
}


def resolve_formation_preset(formation_name: str) -> tuple[str, list]:
    if formation_name in FORMATION_PRESETS:
        return formation_name, FORMATION_PRESETS[formation_name]
    for key, preset in FORMATION_PRESETS.items():
        if key.startswith(formation_name) or formation_name in key:
            return key, preset
    return '4-3-3 (4-3-3)', FORMATION_PRESETS['4-3-3 (4-3-3)']


def auto_assign_team_starting_lineup(team: Team, formation_name: str = None) -> list[Player]:
    """
    Selects 11 starters matching the PES 2021 tactical slots and lineup for the club.
    Assigns is_starting=True and exact pitch coordinates (x_coord, y_coord).
    Assigns remaining squad players to bench and reserves with is_starting=False.
    """
    target_formation = DEFAULT_TEAM_FORMATIONS.get(team.name, '4-3-3 (4-3-3)')
    if formation_name:
        full_formation_key, slots = resolve_formation_preset(formation_name)
    else:
        full_formation_key, slots = resolve_formation_preset(target_formation)
    
    team.default_formation = full_formation_key
    team.save(update_fields=['default_formation'])

    gameplan, _ = TeamGamePlan.objects.get_or_create(team=team)
    gameplan.formation = full_formation_key
    gameplan.save(update_fields=['formation'])

    all_players = list(Player.objects.filter(team=team).order_by('-overall'))
    if not all_players:
        return []

    available = list(all_players)
    assigned_starters = []

    # Check if we have exact PES 2021 starters defined for this team and formation
    pes_starters = PES_DEFAULT_STARTERS.get(team.name)
    if pes_starters and (not formation_name or formation_name == target_formation or formation_name in target_formation):
        # Match exact 11 starters
        for p_def in pes_starters:
            target_norm = normalize_name(p_def['name'])
            match = [p for p in available if normalize_name(p.name) == target_norm]
            if not match:
                match = [p for p in available if target_norm in normalize_name(p.name) or normalize_name(p.name) in target_norm]
            
            if match:
                candidate = match[0]
                available.remove(candidate)
                assigned_starters.append((candidate, {'pos': p_def['pos'], 'x': p_def['x'], 'y': p_def['y']}))

    # If dynamic assignment is needed (or incomplete starters)
    if len(assigned_starters) < 11:
        # Fill remaining slots from formation preset
        remaining_slots = slots[len(assigned_starters):]
        for slot in remaining_slots:
            target_pos = slot['pos']
            candidate = None
            
            # Priority 1: Exact position match
            exact_matches = [p for p in available if p.position == target_pos]
            if exact_matches:
                candidate = max(exact_matches, key=lambda p: p.overall)
            
            # Priority 2: Fallback positions
            if not candidate:
                fallbacks = POSITION_FALLBACKS.get(target_pos, [])
                for fallback_pos in fallbacks:
                    fallback_matches = [p for p in available if p.position == fallback_pos]
                    if fallback_matches:
                        candidate = max(fallback_matches, key=lambda p: p.overall)
                        break
            
            # Priority 3: Best overall
            if not candidate and available:
                candidate = available[0]

            if candidate:
                available.remove(candidate)
                assigned_starters.append((candidate, slot))

    # Persist Starters with exact pitch coordinates and is_starting=True
    starter_ids = set()
    used_numbers = set()

    for idx, (player, slot) in enumerate(assigned_starters):
        player.is_starting = True
        player.x_coord = slot['x']
        player.y_coord = slot['y']
        
        # Shirt numbers: GK gets 1, others 2..11
        if not player.shirt_number or player.shirt_number in used_numbers:
            if slot['pos'] == 'GK':
                num = 1
            else:
                num = idx + 1 if idx + 1 != 1 else 12
            while num in used_numbers:
                num += 1
            player.shirt_number = num
        used_numbers.add(player.shirt_number)
        
        player.save()
        starter_ids.add(player.id)

    # Persist Bench & Reserves with is_starting=False
    sub_num = 12
    for player in all_players:
        if player.id not in starter_ids:
            player.is_starting = False
            if not player.shirt_number or player.shirt_number in used_numbers:
                while sub_num in used_numbers:
                    sub_num += 1
                player.shirt_number = sub_num
                used_numbers.add(sub_num)
                sub_num += 1
            player.save()

    return list(Player.objects.filter(team=team))


def align_all_teams():
    for team in Team.objects.all():
        auto_assign_team_starting_lineup(team)


def auto_replace_ineligible_starters(team, target_match=None):
    """
    Checks all players in the team who are currently marked is_starting=True.
    If any starter is suspended (suspension_matches > 0), injured (is_injured=True),
    or stamina-locked (is_stamina_locked=True / virtual_stamina < 30):
      1. Finds best available eligible substitute (is_starting=False, suspension_matches=0, is_injured=False, stamina >= 30).
      2. Priority:
         - Exact matching position
         - Fallback positions from POSITION_FALLBACKS
         - Highest overall available player (with GK for GK strictly maintained)
      3. Moves suspended player to is_starting=False and gives their coordinates & slot to the replacement.
      4. Persists changes to Player models and MatchGamePlan.players_data if target_match exists.
    """
    if not team:
        return []

    # Get all players
    all_players = list(Player.objects.filter(team=team))
    if not all_players:
        return []

    ineligible_starters = [
        p for p in all_players 
        if p.is_starting and (p.suspension_matches > 0 or p.is_injured or p.is_stamina_locked or (p.virtual_stamina is not None and p.virtual_stamina < 30))
    ]

    if not ineligible_starters:
        return []

    # Available bench substitutes
    available_subs = [
        p for p in all_players
        if not p.is_starting and p.suspension_matches == 0 and not p.is_injured and not p.is_stamina_locked and (p.virtual_stamina is None or p.virtual_stamina >= 30)
    ]
    # Sort available by overall descending
    available_subs.sort(key=lambda p: p.overall, reverse=True)

    replacements_made = []

    for starter in ineligible_starters:
        target_pos = starter.position or 'CMF'
        candidate = None

        if target_pos == 'GK':
            # Must find a GK if possible
            gk_matches = [p for p in available_subs if p.position == 'GK']
            if gk_matches:
                candidate = max(gk_matches, key=lambda p: p.overall)
            elif available_subs:
                candidate = available_subs[0]
        else:
            # Outfield player
            # 1. Exact position (non-GK)
            exact_matches = [p for p in available_subs if p.position == target_pos]
            if exact_matches:
                candidate = max(exact_matches, key=lambda p: p.overall)
            
            # 2. Fallbacks
            if not candidate:
                fallbacks = POSITION_FALLBACKS.get(target_pos, [])
                for fb_pos in fallbacks:
                    fb_matches = [p for p in available_subs if p.position == fb_pos]
                    if fb_matches:
                        candidate = max(fb_matches, key=lambda p: p.overall)
                        break
            
            # 3. Best overall outfield player
            if not candidate:
                outfield = [p for p in available_subs if p.position != 'GK']
                if outfield:
                    candidate = outfield[0]
                elif available_subs:
                    candidate = available_subs[0]

        if candidate:
            available_subs.remove(candidate)
            
            # Swap positions & starting status
            candidate.is_starting = True
            candidate.x_coord = starter.x_coord
            candidate.y_coord = starter.y_coord
            candidate.save(update_fields=['is_starting', 'x_coord', 'y_coord'])

            starter.is_starting = False
            starter.save(update_fields=['is_starting'])

            replacements_made.append({
                'replaced_player': starter,
                'substitute_player': candidate,
                'reason': 'suspension' if starter.suspension_matches > 0 else 'injury' if starter.is_injured else 'stamina',
            })
        else:
            # No eligible sub found, still take ineligible player off starting XI
            starter.is_starting = False
            starter.save(update_fields=['is_starting'])

    # If target_match or next upcoming match has MatchGamePlan, sync players_data
    try:
        from matches.models import Match, MatchGamePlan
        from django.db.models import Q

        if not target_match:
            target_match = Match.objects.filter(
                Q(home_team=team) | Q(away_team=team),
                status__in=['SCHEDULED', 'LIVE']
            ).order_by('date', 'id').first()

        if target_match:
            mgp = MatchGamePlan.objects.filter(match=target_match, team=team).first()
            if mgp and mgp.players_data:
                updated_players_data = []
                current_team_players = {p.id: p for p in Player.objects.filter(team=team)}
                for item in mgp.players_data:
                    pid = item.get('player_id') or item.get('id')
                    if pid in current_team_players:
                        p = current_team_players[pid]
                        updated_players_data.append({
                            'player_id': p.id,
                            'x_coord': p.x_coord,
                            'y_coord': p.y_coord,
                            'position': p.position,
                            'is_starting': p.is_starting,
                        })
                    else:
                        updated_players_data.append(item)
                mgp.players_data = updated_players_data
                mgp.save(update_fields=['players_data'])
    except Exception:
        pass

    return replacements_made
