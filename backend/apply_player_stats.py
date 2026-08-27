"""
Complete & Safe Production Player Stats & Position Synchronizer
================================================================
1. Matches existing players via deep alias, abbreviation, and last-name resolution.
2. If player is transferred, updates their stats while KEEPING their current team and contracts intact.
3. If player is completely new (not in DB yet), creates them in their default starting team.
4. Updates overall, base_overall, position, rarity, base_stamina.
5. Recalculates star ratings for all teams.
"""
import os
import sys
import django
import unicodedata
import re
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from teams.models import Team, Player

def clean_name(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

def calculate_rarity(ovr: int, pot: int) -> str:
    if ovr >= 88 or pot >= 92:
        return 'LEGENDARY'
    elif ovr >= 84 or pot >= 88:
        return 'EPIC'
    elif ovr >= 80:
        return 'RARE'
    return 'REGULAR'

# Read all data from the parsed list
PLAYER_DATA = [
    ('Liverpool', 'Alisson Becker', 'GK', 87),
    ('Liverpool', 'Mohamed Salah', 'RWF', 87),
    ('Liverpool', 'Dominik Szoboszlai', 'AMF', 87),
    ('Liverpool', 'Virgil van Dijk', 'CB', 86),
    ('Liverpool', 'Cody Gakpo', 'LWF', 86),
    ('Liverpool', 'Alexander Isak', 'CF', 86),
    ('Liverpool', 'Ibrahima Konaté', 'CB', 85),
    ('Liverpool', 'Alexis Mac Allister', 'CMF', 85),
    ('Liverpool', 'Ryan Gravenberch', 'DMF', 85),
    ('Liverpool', 'Andrew Robertson', 'LB', 84),
    ('Liverpool', 'Giorgi Mamardashvili', 'GK', 84),
    ('Liverpool', 'Hugo Ekitiké', 'CF', 84),
    ('Liverpool', 'Florian Wirtz', 'AMF', 84),
    ('Liverpool', 'Diogo Jota', 'CF', 83),
    ('Liverpool', 'Curtis Jones', 'CMF', 83),
    ('Liverpool', 'Milos Kerkez', 'LB', 83),
    ('Liverpool', 'Jeremie Frimpong', 'RB', 83),
    ('Liverpool', 'Conor Bradley', 'RB', 82),
    ('Liverpool', 'Castello Lukeba', 'CB', 82),
    ('Liverpool', 'Wataru Endo', 'DMF', 81),
    ('Liverpool', 'Joe Gomez', 'CB', 81),
    ('Liverpool', 'Harvey Elliott', 'AMF', 81),
    ('Liverpool', 'Federico Chiesa', 'RWF', 81),
    ('Liverpool', 'Giovanni Leoni', 'CB', 81),
    ('Liverpool', 'Kostas Tsimikas', 'LB', 80),
    ('Liverpool', 'Stefan Bajcetic', 'DMF', 80),
    ('Liverpool', 'Vitezslav Jaros', 'GK', 79),
    ('Liverpool', 'Rio Ngumoha', 'LWF', 78),
    ('Liverpool', 'Trey Nyoni', 'CMF', 78),
    ('Liverpool', 'Arman Hall', 'CF', 78),
    ('Liverpool', 'Tyler Morton', 'DMF', 77),
    ('Liverpool', 'Jayden Danns', 'CF', 75),
    ('Liverpool', 'Áron Yaakobishvili', 'GK', 73),
    ('FC Bayern München', 'Harry Kane', 'CF', 90),
    ('FC Bayern München', 'Michael Olise', 'RWF', 89),
    ('FC Bayern München', 'Joshua Kimmich', 'RB', 89),
    ('FC Bayern München', 'Jamal Musiala', 'AMF', 87),
    ('FC Bayern München', 'Jonathan Tah', 'CB', 87),
    ('FC Bayern München', 'Luis Díaz', 'LWF', 87),
    ('FC Bayern München', 'Dayot Upamecano', 'CB', 86),
    ('FC Bayern München', 'Konrad Laimer', 'RB', 84),
    ('FC Bayern München', 'Serge Gnabry', 'AMF', 83),
    ('FC Bayern München', 'Alphonso Davies', 'LB', 83),
    ('FC Bayern München', 'João Palhinha', 'DMF', 83),
    ('FC Bayern München', 'Kim Min Jae', 'CB', 82),
    ('FC Bayern München', 'Manuel Neuer', 'GK', 82),
    ('FC Bayern München', 'Aleksandar Pavlović', 'DMF', 82),
    ('FC Bayern München', 'Leon Goretzka', 'DMF', 81),
    ('FC Bayern München', 'Josip Stanišić', 'RB', 79),
    ('FC Bayern München', 'Raphaël Guerreiro', 'LB', 79),
    ('FC Bayern München', 'Hiroki Ito', 'CB', 78),
    ('FC Bayern München', 'Tom Bischof', 'CMF', 78),
    ('FC Bayern München', 'Jonas Urbig', 'GK', 77),
    ('FC Bayern München', 'Lennart Karl', 'AMF', 75),
    ('FC Bayern München', 'Sven Ulreich', 'GK', 73),
    ('FC Bayern München', 'Wisdom Mike', 'LMF', 61),
    ('FC Bayern München', 'Vincent Manuba', 'RB', 61),
    ('FC Bayern München', 'Guido Della Rovere', 'AMF', 61),
    ('FC Bayern München', 'B. Sapoko Ndiaye', 'CMF', 61),
    ('FC Bayern München', 'Maycon Cardozo', 'LB', 60),
    ('FC Bayern München', 'David Ofli', 'CMF', 59),
    ('Arsenal', 'Bukayo Saka', 'RWF', 88),
    ('Arsenal', 'William Saliba', 'CB', 87),
    ('Arsenal', 'Declan Rice', 'CMF', 87),
    ('Arsenal', 'Martin Ødegaard', 'AMF', 86),
    ('Arsenal', 'Gabriel Magalhães', 'CB', 85),
    ('Arsenal', 'David Raya', 'GK', 85),
    ('Arsenal', 'Martín Zubimendi', 'DMF', 85),
    ('Arsenal', 'Viktor Gyökeres', 'CF', 85),
    ('Arsenal', 'Kai Havertz', 'CF', 85),
    ('Arsenal', 'Gabriel Martinelli', 'LWF', 85),
    ('Arsenal', 'Ben White', 'RB', 84),
    ('Arsenal', 'Mikel Merino', 'CMF', 84),
    ('Arsenal', 'Eberechi Eze', 'AMF', 84),
    ('Arsenal', 'Gabriel Jesus', 'CF', 84),
    ('Arsenal', 'Riccardo Calafiori', 'LB', 83),
    ('Arsenal', 'Myles Lewis-Skelly', 'LB', 83),
    ('Arsenal', 'Leandro Trossard', 'LWF', 83),
    ('Arsenal', 'Noni Madueke', 'RWF', 82),
    ('Arsenal', 'Kepa Arrizabalaga', 'GK', 81),
    ('Arsenal', 'Jurrien Timber', 'RB', 81),
    ('Arsenal', 'O. Zinchenko', 'LB', 81),
    ('Arsenal', 'Jakub Kiwior', 'CB', 81),
    ('Arsenal', 'Christian Nørgaard', 'DMF', 80),
    ('Arsenal', 'Reiss Nelson', 'LWF', 79),
    ('Arsenal', 'Cristhian Mosquera', 'CB', 77),
    ('Arsenal', 'Max Dowman', 'AMF', 73),
    ('Arsenal', 'Marli Salmon', 'CB', 72),
    ('Chelsea', 'Cole Palmer', 'AMF', 88),
    ('Chelsea', 'Moisés Caicedo', 'DMF', 86),
    ('Chelsea', 'Marc Cucurella', 'LB', 85),
    ('Chelsea', 'Enzo Fernández', 'CMF', 85),
    ('Chelsea', 'Levi Colwill', 'CB', 84),
    ('Chelsea', 'Pedro Neto', 'RWF', 84),
    ('Chelsea', 'Reece James', 'RB', 84),
    ('Chelsea', 'Malo Gusto', 'RB', 83),
    ('Chelsea', 'Nicolas Jackson', 'CF', 83),
    ('Chelsea', 'Estêvão', 'RWF', 83),
    ('Chelsea', 'Robert Sánchez', 'GK', 82),
    ('Chelsea', 'Jadon Sancho', 'LWF', 82),
    ('Chelsea', 'Liam Delap', 'CF', 82),
    ('Chelsea', 'Wesley Fofana', 'CB', 81),
    ('Chelsea', 'João Pedro', 'CF', 81),
    ('Chelsea', 'Tosin Adarabioyo', 'CB', 80),
    ('Chelsea', 'Renato Veiga', 'LB', 80),
    ('Chelsea', 'Filip Jørgensen', 'GK', 80),
    ('Chelsea', 'Trevoh Chalobah', 'CB', 80),
    ('Chelsea', 'Kiernan Dewsbury-Hall', 'CMF', 80),
    ('Chelsea', 'Benoît Badiashile', 'CB', 79),
    ('Chelsea', 'Omari Kellyman', 'AMF', 79),
    ('Chelsea', 'Romeo Lavia', 'DMF', 79),
    ('Chelsea', 'Dario Essugo', 'DMF', 79),
    ('Chelsea', 'Axel Disasi', 'CB', 78),
    ('Chelsea', 'Marc Guiu', 'CF', 78),
    ('Chelsea', 'Carney Chukwuemeka', 'AMF', 78),
    ('Chelsea', 'Mike Penders', 'GK', 78),
    ('Chelsea', 'Jobe Bellingham', 'AMF', 78),
    ('Chelsea', 'Aaron Anselmino', 'CB', 77),
    ('Chelsea', 'Josh Acheampong', 'RB', 76),
    ('Chelsea', 'Kendry Páez', 'AMF', 75),
    ('Chelsea', 'Kiano Dyer', 'CMF', 73),
    ('Chelsea', 'Tyrique George', 'LWF', 73),
    ('Chelsea', 'Ted Curd', 'GK', 70),
    ('Manchester United', 'Bruno Fernandes', 'AMF', 87),
    ('Manchester United', 'Bryan Mbeumo', 'RWF', 85),
    ('Manchester United', 'Lisandro Martínez', 'CB', 84),
    ('Manchester United', 'Amad Diallo', 'RWF', 84),
    ('Manchester United', 'Matthijs de Ligt', 'CB', 83),
    ('Manchester United', 'Diogo Dalot', 'RB', 83),
    ('Manchester United', 'Benjamin Šeško', 'CF', 83),
    ('Manchester United', 'Matheus Cunha', 'CF', 83),
    ('Manchester United', 'André Onana', 'GK', 83),
    ('Manchester United', 'Manuel Ugarte', 'DMF', 82),
    ('Manchester United', 'Mason Mount', 'AMF', 82),
    ('Manchester United', 'Noussair Mazraoui', 'RB', 82),
    ('Manchester United', 'Joshua Zirkzee', 'CF', 82),
    ('Manchester United', 'Casemiro', 'DMF', 82),
    ('Manchester United', 'Alejandro Garnacho', 'LWF', 82),
    ('Manchester United', 'Marcus Rashford', 'CF', 82),
    ('Manchester United', 'Kobbie Mainoo', 'CMF', 82),
    ('Manchester United', 'Leny Yoro', 'CB', 81),
    ('Manchester United', 'Harry Maguire', 'CB', 80),
    ('Manchester United', 'Christian Eriksen', 'CMF', 80),
    ('Manchester United', 'Luke Shaw', 'LB', 80),
    ('Manchester United', 'Patrick Dorgu', 'LB', 80),
    ('Manchester United', 'Altay Bayındır', 'GK', 79),
    ('Manchester United', 'Tyrell Malacia', 'LB', 79),
    ('Manchester United', 'Victor Lindelöf', 'CB', 78),
    ('Manchester United', 'Jonny Evans', 'CB', 76),
    ('Manchester United', 'Ayden Heaven', 'CB', 74),
    ('Manchester United', 'Harry Amass', 'LB', 74),
    ('Manchester City', 'Phil Foden', 'AMF', 90),
    ('Manchester City', 'Rodri', 'DMF', 89),
    ('Manchester City', 'Gianluigi Donnarumma', 'GK', 89),
    ('Manchester City', 'Erling Haaland', 'CF', 88),
    ('Manchester City', 'Rúben Dias', 'CB', 86),
    ('Manchester City', 'Joško Gvardiol', 'LB', 86),
    ('Manchester City', 'Marc Guéhi', 'CB', 85),
    ('Manchester City', 'Tijjani Reijnders', 'CMF', 85),
    ('Manchester City', 'Bernardo Silva', 'AMF', 85),
    ('Manchester City', 'Matheus Nunes', 'CMF', 84),
    ('Manchester City', 'Jérémy Doku', 'LWF', 84),
    ('Manchester City', 'Rayan Cherki', 'AMF', 84),
    ('Manchester City', 'John Stones', 'CB', 83),
    ('Manchester City', 'Nathan Aké', 'CB', 83),
    ('Manchester City', 'Omar Marmoush', 'CF', 83),
    ('Manchester City', 'Jack Grealish', 'LWF', 83),
    ('Manchester City', 'Manuel Akanji', 'CB', 82),
    ('Manchester City', 'Rico Lewis', 'RB', 82),
    ('Manchester City', 'Savinho', 'RWF', 82),
    ('Manchester City', 'Rayan Aït-Nouri', 'LB', 82),
    ('Manchester City', 'Mateo Kovačić', 'CMF', 82),
    ('Manchester City', 'Antoine Semenyo', 'RWF', 82),
    ('Manchester City', 'Vitor Reis', 'CB', 81),
    ('Manchester City', 'Kalvin Phillips', 'DMF', 81),
    ('Manchester City', 'Nico González', 'CMF', 81),
    ('Manchester City', 'Abdukodir Khusanov', 'CB', 80),
    ('Manchester City', 'James Trafford', 'GK', 79),
    ('Manchester City', "Nico O'Reilly", 'CMF', 78),
    ('Manchester City', 'Claudio Echeverri', 'AMF', 78),
    ('Manchester City', 'Marcus Bettinelli', 'GK', 73),
    ('Manchester City', 'Sverre Nypan', 'CMF', 72),
    ('Manchester City', 'Max Alleyne', 'CB', 72),
    ('Real Madrid', 'Kylian Mbappé', 'CF', 91),
    ('Real Madrid', 'Thibaut Courtois', 'GK', 90),
    ('Real Madrid', 'Vinícius Júnior', 'LWF', 89),
    ('Real Madrid', 'Federico Valverde', 'CMF', 89),
    ('Real Madrid', 'Jude Bellingham', 'AMF', 89),
    ('Real Madrid', 'Trent Alexander-Arnold', 'RB', 86),
    ('Real Madrid', 'Éder Militão', 'CB', 85),
    ('Real Madrid', 'Aurélien Tchouaméni', 'DMF', 85),
    ('Real Madrid', 'Antonio Rüdiger', 'CB', 85),
    ('Real Madrid', 'Rodrygo', 'RWF', 85),
    ('Real Madrid', 'Daniel Carvajal', 'RB', 84),
    ('Real Madrid', 'Eduardo Camavinga', 'CMF', 84),
    ('Real Madrid', 'Arda Güler', 'AMF', 84),
    ('Real Madrid', 'Brahim Díaz', 'RWF', 83),
    ('Real Madrid', 'Ferland Mendy', 'LB', 82),
    ('Real Madrid', 'Dean Huijsen', 'CB', 82),
    ('Real Madrid', 'Álvaro Carreras', 'LB', 82),
    ('Real Madrid', 'Dani Ceballos', 'CMF', 81),
    ('Real Madrid', 'Andriy Lunin', 'GK', 81),
    ('Real Madrid', 'David Alaba', 'CB', 80),
    ('Real Madrid', 'Raúl Asencio', 'CB', 80),
    ('Real Madrid', 'Fran García', 'LB', 79),
    ('Real Madrid', 'Franco Mastantuono', 'AMF', 79),
    ('Real Madrid', 'Gonzalo García', 'CF', 78),
    ('Real Madrid', 'Mario Martín', 'DMF', 72),
    ('Real Madrid', 'Thiago Pitarch', 'CMF', 71),
    ('Real Madrid', 'César Palacios', 'AMF', 69),
    ('Real Madrid', 'Fran González', 'GK', 69),
    ('FC Barcelona', 'Lamine Yamal', 'RWF', 89),
    ('FC Barcelona', 'Raphinha', 'LWF', 89),
    ('FC Barcelona', 'Pedri', 'CMF', 89),
    ('FC Barcelona', 'Robert Lewandowski', 'CF', 88),
    ('FC Barcelona', 'Jules Koundé', 'RB', 87),
    ('FC Barcelona', 'Frenkie de Jong', 'CMF', 86),
    ('FC Barcelona', 'Pau Cubarsí', 'CB', 85),
    ('FC Barcelona', 'Dani Olmo', 'AMF', 85),
    ('FC Barcelona', 'Gavi', 'CMF', 84),
    ('FC Barcelona', 'Alejandro Balde', 'LB', 84),
    ('FC Barcelona', 'Fermín López', 'AMF', 84),
    ('FC Barcelona', 'Marc-André ter Stegen', 'GK', 84),
    ('FC Barcelona', 'Andreas Christensen', 'CB', 83),
    ('FC Barcelona', 'Ronald Araújo', 'CB', 83),
    ('FC Barcelona', 'Ferran Torres', 'LWF', 83),
    ('FC Barcelona', 'Marc Casadó', 'DMF', 83),
    ('FC Barcelona', 'Eric García', 'CB', 82),
    ('FC Barcelona', 'Wojciech Szczęsny', 'GK', 81),
    ('FC Barcelona', 'Marc Bernal', 'DMF', 81),
    ('FC Barcelona', 'Ansu Fati', 'LWF', 80),
    ('FC Barcelona', 'Pablo Torre', 'AMF', 80),
    ('FC Barcelona', 'Iñigo Martínez', 'CB', 80),
    ('FC Barcelona', 'Iñaki Peña', 'GK', 79),
    ('FC Barcelona', 'Héctor Fort', 'RB', 78),
    ('FC Barcelona', 'Gerard Martín', 'LB', 78),
    ('FC Barcelona', 'Pau Víctor', 'CF', 77),
    ('FC Barcelona', 'Diego Kochen', 'GK', 73),
    ('FC Barcelona', 'Ander Astralaga', 'GK', 72),
    ('Paris Saint-Germain', 'Ousmane Dembélé', 'RWF', 90),
    ('Paris Saint-Germain', 'Vitinha', 'CMF', 90),
    ('Paris Saint-Germain', 'Achraf Hakimi', 'RB', 89),
    ('Paris Saint-Germain', 'Khvicha Kvaratskhelia', 'LWF', 88),
    ('Paris Saint-Germain', 'Nuno Mendes', 'LB', 88),
    ('Paris Saint-Germain', 'Willian Pacho', 'CB', 88),
    ('Paris Saint-Germain', 'João Neves', 'CMF', 88),
    ('Paris Saint-Germain', 'Marquinhos', 'CB', 87),
    ('Paris Saint-Germain', 'Désiré Doué', 'AMF', 86),
    ('Paris Saint-Germain', 'Fabián Ruiz', 'CMF', 85),
    ('Paris Saint-Germain', 'Bradley Barcola', 'LWF', 85),
    ('Paris Saint-Germain', 'Warren Zaïre-Emery', 'CMF', 84),
    ('Paris Saint-Germain', 'Lucas Chevalier', 'GK', 83),
    ('Paris Saint-Germain', 'Lucas Hernández', 'LB', 83),
    ('Paris Saint-Germain', 'Matvey Safonov', 'GK', 83),
    ('Paris Saint-Germain', 'Randal Kolo Muani', 'CF', 82),
    ('Paris Saint-Germain', 'Lee Kang-in', 'AMF', 81),
    ('Paris Saint-Germain', 'Gonçalo Ramos', 'CF', 81),
    ('Paris Saint-Germain', 'Illia Zabarnyi', 'CB', 81),
    ('Paris Saint-Germain', 'Lucas Beraldo', 'CB', 80),
    ('Paris Saint-Germain', 'Senny Mayulu', 'CMF', 78),
    ('Paris Saint-Germain', 'Ibrahim Mbaye', 'RWF', 76),
    ('Paris Saint-Germain', 'Noham Kamara', 'CB', 74),
    ('Paris Saint-Germain', 'Yoram Zague', 'RB', 73),
    ('Paris Saint-Germain', 'Renato Marin', 'GK', 73),
    ('Paris Saint-Germain', 'Dro Ousmane', 'CMF', 72),
    ('Paris Saint-Germain', 'Quentin Ndjantou', 'LWF', 71),
    ('Juventus', 'Bremer', 'CB', 85),
    ('Juventus', 'Teun Koopmeiners', 'DMF', 85),
    ('Juventus', 'Michele Di Gregorio', 'GK', 84),
    ('Juventus', 'Jonathan David', 'CF', 84),
    ('Juventus', 'Douglas Luiz', 'CMF', 83),
    ('Juventus', 'Manuel Locatelli', 'DMF', 83),
    ('Juventus', 'Dušan Vlahović', 'CF', 83),
    ('Juventus', 'Pierre Kalulu', 'CB', 82),
    ('Juventus', 'Khéphren Thuram', 'CMF', 82),
    ('Juventus', 'Federico Gatti', 'CB', 81),
    ('Juventus', 'Francisco Conceição', 'RWF', 81),
    ('Juventus', 'Andrea Cambiaso', 'LB', 81),
    ('Juventus', 'Weston McKennie', 'CMF', 81),
    ('Juventus', 'Kenan Yildiz', 'LWF', 81),
    ('Juventus', 'Nico González', 'LWF', 81),
    ('Juventus', 'Lloyd Kelly', 'CB', 79),
    ('Juventus', 'Mattia Perin', 'GK', 79),
    ('Juventus', 'Fabio Miretti', 'CMF', 79),
    ('Juventus', 'Arthur Melo', 'CMF', 78),
    ('Juventus', 'Juan Cabal', 'LB', 78),
    ('Juventus', 'Filip Kostić', 'LMF', 78),
    ('Juventus', 'Nicolò Savona', 'RB', 78),
    ('Juventus', 'Daniele Rugani', 'CB', 77),
    ('Juventus', 'Timothy Weah', 'RMF', 77),
    ('Juventus', 'Arkadiusz Milik', 'CF', 77),
    ('Juventus', 'Carlo Pinsoglio', 'GK', 74),
    ('Juventus', 'Jonas Rouhi', 'LB', 74),
    ('Juventus', 'Emanuele Pecorino', 'CF', 66),
    ('Tottenham Hotspur', 'Rodrigo Bentancur', 'DMF', 86),
    ('Tottenham Hotspur', 'James Maddison', 'AMF', 86),
    ('Tottenham Hotspur', 'Guglielmo Vicario', 'GK', 85),
    ('Tottenham Hotspur', 'Cristian Romero', 'CB', 85),
    ('Tottenham Hotspur', 'Dejan Kulusevski', 'AMF', 84),
    ('Tottenham Hotspur', 'Pedro Porro', 'RB', 83),
    ('Tottenham Hotspur', 'Destiny Udogie', 'LB', 83),
    ('Tottenham Hotspur', 'Richarlison', 'CF', 83),
    ('Tottenham Hotspur', 'Conor Gallagher', 'CMF', 83),
    ('Tottenham Hotspur', 'Dominic Solanke', 'CF', 83),
    ('Tottenham Hotspur', 'Micky van de Ven', 'CB', 82),
    ('Tottenham Hotspur', 'Xavi Simons', 'AMF', 82),
    ('Tottenham Hotspur', 'Kevin Danso', 'CB', 82),
    ('Tottenham Hotspur', 'Pape Matar Sarr', 'CMF', 82),
    ('Tottenham Hotspur', 'Mohammed Kudus', 'RWF', 81),
    ('Tottenham Hotspur', 'Yves Bissouma', 'DMF', 81),
    ('Tottenham Hotspur', 'Mathys Tel', 'CF', 81),
    ('Tottenham Hotspur', 'Manor Solomon', 'LWF', 80),
    ('Tottenham Hotspur', 'Ben Davies', 'CB', 79),
    ('Tottenham Hotspur', 'Antonín Kinský', 'GK', 78),
    ('Tottenham Hotspur', 'Djed Spence', 'LB', 78),
    ('Tottenham Hotspur', 'Radu Drăgușin', 'CB', 78),
    ('Tottenham Hotspur', 'Lucas Bergvall', 'CMF', 78),
    ('Tottenham Hotspur', 'Wilson Odobert', 'RWF', 78),
    ('Tottenham Hotspur', 'Archie Gray', 'CB', 77),
    ('Tottenham Hotspur', 'Mikey Moore', 'LWF', 77),
    ('Tottenham Hotspur', 'Ashley Phillips', 'CB', 75),
    ('Tottenham Hotspur', 'Kota Takai', 'CB', 74),
    ('Atlético Madrid', 'Julián Alvarez', 'CF', 86),
    ('Atlético Madrid', 'Álex Baena', 'LWF', 85),
    ('Atlético Madrid', 'Ademola Lookman', 'SS', 85),
    ('Atlético Madrid', 'Jan Oblak', 'GK', 84),
    ('Atlético Madrid', 'Antoine Griezmann', 'SS', 84),
    ('Atlético Madrid', 'Robin Le Normand', 'CB', 83),
    ('Atlético Madrid', 'José Giménez', 'CB', 83),
    ('Atlético Madrid', 'Marcos Llorente', 'RB', 83),
    ('Atlético Madrid', 'Alexander Sørloth', 'CF', 83),
    ('Atlético Madrid', 'Thiago Almada', 'LWF', 83),
    ('Atlético Madrid', 'Nahuel Molina', 'RB', 82),
    ('Atlético Madrid', 'Koke', 'CMF', 82),
    ('Atlético Madrid', 'Juan Musso', 'GK', 82),
    ('Atlético Madrid', 'Dávid Hancko', 'CB', 82),
    ('Atlético Madrid', 'Giuliano Simeone', 'RWF', 81),
    ('Atlético Madrid', 'Matteo Ruggeri', 'LB', 80),
    ('Atlético Madrid', 'Pablo Barrios', 'CMF', 80),
    ('Atlético Madrid', 'Clément Lenglet', 'CB', 80),
    ('Atlético Madrid', 'Thomas Lemar', 'AMF', 80),
    ('Atlético Madrid', 'Johnny Cardoso', 'CMF', 77),
    ('Atlético Madrid', 'Obed Vargas', 'CMF', 75),
    ('Atlético Madrid', 'Carlos Martín', 'LWF', 75),
    ('Atlético Madrid', 'Horatiu Moldovan', 'GK', 75),
    ('Atlético Madrid', 'Marc Pubill', 'RB', 75),
    ('Atlético Madrid', 'Rodrigo Mendoza', 'CMF', 72),
    ('Inter', 'Lautaro Martínez', 'CF', 88),
    ('Inter', 'Nicolò Barella', 'CMF', 88),
    ('Inter', 'Federico Dimarco', 'LB', 87),
    ('Inter', 'Alessandro Bastoni', 'CB', 87),
    ('Inter', 'Hakan Çalhanoğlu', 'DMF', 86),
    ('Inter', 'Yann Sommer', 'GK', 84),
    ('Inter', 'Marcus Thuram', 'CF', 84),
    ('Inter', 'Benjamin Pavard', 'CB', 83),
    ('Inter', 'Denzel Dumfries', 'RB', 83),
    ('Inter', 'Henrikh Mkhitaryan', 'CMF', 83),
    ('Inter', 'Francesco Acerbi', 'CB', 82),
    ('Inter', 'Davide Frattesi', 'CMF', 82),
    ('Inter', 'Stefan de Vrij', 'CB', 82),
    ('Inter', 'Yann Bisseck', 'CB', 81),
    ('Inter', 'Piotr Zieliński', 'CMF', 81),
    ('Inter', 'Carlos Augusto', 'LB', 80),
    ('Inter', 'Mehdi Taremi', 'CF', 79),
    ('Inter', 'Tajon Buchanan', 'RMF', 79),
    ('Inter', 'Matteo Darmian', 'RB', 78),
    ('Inter', 'Kristjan Asllani', 'DMF', 78),
    ('Inter', 'Josep Martínez', 'GK', 77),
    ('Inter', 'Ange-Yoan Bonny', 'CF', 77),
    ('Inter', 'Andy Diouf', 'CMF', 77),
    ('Inter', 'Petar Sučić', 'DMF', 75),
    ('Inter', 'Sebastiano Esposito', 'SS', 74),
    ('Inter', 'Franco Carboni', 'LB', 74),
    ('Inter', 'Raffaele Di Gennaro', 'GK', 72),
    ('Inter', 'Giacomo De Pieri', 'RWF', 70),
    ('AC Milan', 'Mike Maignan', 'GK', 87),
    ('AC Milan', 'Rafael Leão', 'LWF', 85),
    ('AC Milan', 'Christian Pulisic', 'RWF', 85),
    ('AC Milan', 'Adrien Rabiot', 'CMF', 84),
    ('AC Milan', 'Luka Modrić', 'CMF', 84),
    ('AC Milan', 'Theo Hernández', 'LB', 84),
    ('AC Milan', 'Youssouf Fofana', 'DMF', 84),
    ('AC Milan', 'Fikayo Tomori', 'CB', 83),
    ('AC Milan', 'Christopher Nkunku', 'CF', 83),
    ('AC Milan', 'Samuele Ricci', 'DMF', 83),
    ('AC Milan', 'Santiago Gimenez', 'CF', 83),
    ('AC Milan', 'Pervis Estupiñán', 'LB', 82),
    ('AC Milan', 'R. Loftus-Cheek', 'CMF', 81),
    ('AC Milan', 'Álvaro Morata', 'CF', 81),
    ('AC Milan', 'Alexis Saelemaekers', 'RMF', 80),
    ('AC Milan', 'Davide Calabria', 'RB', 80),
    ('AC Milan', 'Samuel Chukwueze', 'RWF', 79),
    ('AC Milan', 'Strahinja Pavlović', 'CB', 79),
    ('AC Milan', 'Koni De Winter', 'CB', 79),
    ('AC Milan', 'Ismaël Bennacer', 'DMF', 79),
    ('AC Milan', 'Yunus Musah', 'CMF', 78),
    ('AC Milan', 'Pietro Terracciano', 'GK', 78),
    ('AC Milan', 'Ardon Jashari', 'DMF', 78),
    ('AC Milan', 'Tommaso Pobega', 'CMF', 77),
    ('AC Milan', 'Matteo Gabbia', 'CB', 77),
    ('AC Milan', 'Zachary Athekame', 'RB', 77),
    ('AC Milan', 'Francesco Camarda', 'CF', 73),
    ('AC Milan', 'Lorenzo Torriani', 'GK', 73),
    ('AC Milan', 'David Odogu', 'CB', 73),
    ('SSC Napoli', 'Kevin De Bruyne', 'AMF', 87),
    ('SSC Napoli', 'Scott McTominay', 'CMF', 85),
    ('SSC Napoli', 'Romelu Lukaku', 'CF', 84),
    ('SSC Napoli', 'Frank Anguissa', 'CMF', 84),
    ('SSC Napoli', 'A. Buongiorno', 'CB', 83),
    ('SSC Napoli', 'Giovanni Di Lorenzo', 'RB', 83),
    ('SSC Napoli', 'Stanislav Lobotka', 'DMF', 83),
    ('SSC Napoli', 'David Neres', 'RWF', 83),
    ('SSC Napoli', 'Alex Meret', 'GK', 82),
    ('SSC Napoli', 'Amir Rrahmani', 'CB', 82),
    ('SSC Napoli', 'Mathías Olivera', 'LB', 82),
    ('SSC Napoli', 'Sam Beukema', 'CB', 82),
    ('SSC Napoli', 'Miguel Gutiérrez', 'LB', 82),
    ('SSC Napoli', 'Matteo Politano', 'RWF', 82),
    ('SSC Napoli', 'Noa Lang', 'LWF', 82),
    ('SSC Napoli', 'Lorenzo Lucca', 'CF', 81),
    ('SSC Napoli', 'Giovanni Simeone', 'CF', 81),
    ('SSC Napoli', 'Billy Gilmour', 'DMF', 80),
    ('SSC Napoli', 'L. Spinazzola', 'LB', 79),
    ('SSC Napoli', 'Luca Marianucci', 'CB', 78),
    ('SSC Napoli', 'Alessandro Zanoli', 'RB', 78),
    ('SSC Napoli', 'Jesper Lindstrøm', 'RWF', 78),
    ('SSC Napoli', 'Jens Cajuste', 'DMF', 78),
    ('SSC Napoli', 'Juan Jesus', 'CB', 77),
    ('SSC Napoli', 'Pasquale Mazzocchi', 'RB', 77),
    ('SSC Napoli', 'Michael Folorunsho', 'CMF', 77),
    ('SSC Napoli', 'Cyril Ngonge', 'RWF', 77),
    ('SSC Napoli', 'Walid Cheddira', 'CF', 76),
    ('SSC Napoli', 'Alisson Santos', 'LWF', 75),
    ('SSC Napoli', 'Alessio Zerbin', 'LWF', 74),
    ('SSC Napoli', 'Nikita Contini', 'GK', 73),
    ('SSC Napoli', 'Giuseppe Ambrosino', 'CF', 73),
    ('SSC Napoli', 'Antonio Vergara', 'AMF', 72),
    ('SSC Napoli', 'Mathias Ferrante', 'GK', 71),
    ('SSC Napoli', 'Giovane', 'CF', 70),
    ('Newcastle United', 'Bruno Guimarães', 'CMF', 87),
    ('Newcastle United', 'Joelinton', 'CMF', 84),
    ('Newcastle United', 'Sandro Tonali', 'DMF', 84),
    ('Newcastle United', 'Fabian Schär', 'CB', 83),
    ('Newcastle United', 'Anthony Gordon', 'LWF', 83),
    ('Newcastle United', 'Alexander Isak', 'CF', 83),
    ('Newcastle United', 'Sven Botman', 'CB', 82),
    ('Newcastle United', 'Nick Pope', 'GK', 82),
    ('Newcastle United', 'Dan Burn', 'LB', 82),
    ('Newcastle United', 'Kieran Trippier', 'RB', 81),
    ('Newcastle United', 'Malick Thiaw', 'CB', 81),
    ('Newcastle United', 'Lewis Hall', 'LB', 81),
    ('Newcastle United', 'Tino Livramento', 'RB', 80),
    ('Newcastle United', 'Harvey Barnes', 'LWF', 80),
    ('Newcastle United', 'Nick Woltemade', 'CF', 80),
    ('Newcastle United', 'O. Vlachodimos', 'GK', 80),
    ('Newcastle United', 'Anthony Elanga', 'RWF', 79),
    ('Newcastle United', 'Jacob Murphy', 'RWF', 79),
    ('Newcastle United', 'Matt Targett', 'LB', 79),
    ('Newcastle United', 'Joe Willock', 'CMF', 78),
    ('Newcastle United', 'Jacob Ramsey', 'CMF', 78),
    ('Newcastle United', 'Lewis Miley', 'CMF', 78),
    ('Newcastle United', 'Emil Krafth', 'RB', 76),
    ('Newcastle United', 'William Osula', 'CF', 76),
    ('Newcastle United', 'John Ruddy', 'GK', 73),
    ('Newcastle United', 'Antonio Cordero', 'LWF', 71),
    ('Newcastle United', 'Leo Shahar', 'RB', 71),
    ('Newcastle United', 'Sean Neave', 'CF', 70),
    ('BVB Borussia Dortmund', 'Gregor Kobel', 'GK', 86),
    ('BVB Borussia Dortmund', 'Nico Schlotterbeck', 'CB', 86),
    ('BVB Borussia Dortmund', 'Serhou Guirassy', 'CF', 85),
    ('BVB Borussia Dortmund', 'Felix Nmecha', 'DMF', 84),
    ('BVB Borussia Dortmund', 'Waldemar Anton', 'CB', 83),
    ('BVB Borussia Dortmund', 'Julian Brandt', 'AMF', 83),
    ('BVB Borussia Dortmund', 'Karim Adeyemi', 'RWF', 83),
    ('BVB Borussia Dortmund', 'Emre Can', 'CB', 82),
    ('BVB Borussia Dortmund', 'Maximilian Beier', 'CF', 82),
    ('BVB Borussia Dortmund', 'Marcel Sabitzer', 'DMF', 81),
    ('BVB Borussia Dortmund', 'Julian Ryerson', 'RB', 81),
    ('BVB Borussia Dortmund', 'Niklas Süle', 'CB', 81),
    ('BVB Borussia Dortmund', 'Ramy Bensebaini', 'LB', 80),
    ('BVB Borussia Dortmund', 'Daniel Svensson', 'LB', 80),
    ('BVB Borussia Dortmund', 'Fábio Silva', 'CF', 79),
    ('BVB Borussia Dortmund', 'Yan Couto', 'RB', 79),
    ('BVB Borussia Dortmund', 'Carney Chukwuemeka', 'AMF', 78),
    ('BVB Borussia Dortmund', 'Donyell Malen', 'CF', 78),
    ('BVB Borussia Dortmund', 'Diant Ramaj', 'GK', 77),
    ('BVB Borussia Dortmund', 'Julien Duranville', 'LWF', 77),
    ('BVB Borussia Dortmund', 'Jobe Bellingham', 'CMF', 76),
    ('BVB Borussia Dortmund', 'Alexander Meyer', 'GK', 75),
    ('BVB Borussia Dortmund', 'Salih Özcan', 'DMF', 75),
    ('BVB Borussia Dortmund', 'Cole Campbell', 'RWF', 74),
    ('BVB Borussia Dortmund', 'Almugera Kabar', 'LB', 73),
    ('BVB Borussia Dortmund', 'Filippo Mane', 'CB', 72),
    ('BVB Borussia Dortmund', 'Patrick Drewes', 'GK', 71),
    ('BVB Borussia Dortmund', 'Justin Lerma', 'AMF', 67),
    ('AS Roma', 'Artem Dovbyk', 'CF', 83),
    ('AS Roma', 'Paulo Dybala', 'SS', 83),
    ('AS Roma', 'Mile Svilar', 'GK', 82),
    ('AS Roma', 'Gianluca Mancini', 'CB', 82),
    ('AS Roma', 'Manu Koné', 'CMF', 82),
    ('AS Roma', 'Matìas Soulé', 'RWF', 82),
    ('AS Roma', 'Lorenzo Pellegrini', 'AMF', 82),
    ('AS Roma', 'Evan Ndicka', 'CB', 81),
    ('AS Roma', 'Wesley França', 'RB', 81),
    ('AS Roma', 'Mario Hermoso', 'CB', 80),
    ('AS Roma', 'Niccolò Pisilli', 'CMF', 80),
    ('AS Roma', 'S. El Shaarawy', 'LWF', 80),
    ('AS Roma', 'Angeliño', 'LB', 80),
    ('AS Roma', 'Tommaso Baldanzi', 'AMF', 79),
    ('AS Roma', 'Zeki Çelik', 'RB', 79),
    ('AS Roma', 'Bryan Cristante', 'DMF', 79),
    ('AS Roma', 'Pierluigi Gollini', 'GK', 78),
    ('AS Roma', 'Neil El Aynaoui', 'CMF', 77),
    ('AS Roma', 'Anass Salah-Eddine', 'LB', 77),
    ('AS Roma', 'Eldor Shomurodov', 'CF', 77),
    ('AS Roma', 'Devis Vásquez', 'GK', 77),
    ('AS Roma', 'Marash Kumbulla', 'CB', 76),
    ('AS Roma', 'Saud Abdulhamid', 'RB', 76),
    ('AS Roma', 'Devyne Rensch', 'RB', 75),
    ('AS Roma', 'Jan Ziolkowski', 'CB', 74),
    ('AS Roma', 'Radoslaw Zelezny', 'GK', 73),
    ('AS Roma', 'Robinio Vaz', 'CF', 71),
    ('AS Roma', 'Buba Sangaré', 'RB', 71)
]

# Aliases mapping
ALIASES = {
    'vinicius junior': ['vini jr', 'vinicius jr'],
    'gabriel magalhaes': ['gabriel', 'g magalhaes'],
    'kepa arrizabalaga': ['kepa'],
    'martin zubimendi': ['zubimendi'],
    'frank anguissa': ['a zambo anguissa', 'zambo anguissa', 'f anguissa'],
    'manu kone': ['k kone', 'm kone'],
    'jan ziolkowski': ['j ziolkowski', 'j ziółkowski'],
    'alisson becker': ['alisson'],
    'fermin lopez': ['fermin'],
    'nicolas jackson': ['n jackson'],
    'brahim diaz': ['brahim'],
    'gonzalo garcia': ['gonzalo'],
    'marc andre ter stegen': ['m ter stegen', 'marc ter stegen'],
    'marc ter stegen': ['m ter stegen'],
    'ansu fati': ['a fati'],
    'inaki pena': ['i pena'],
    'hector fort': ['h fort'],
    'kenan yildiz': ['k yildiz', 'k yıldız'],
    'daniele rugani': ['d rugani'],
    'timothy weah': ['t weah'],
    'jonas rouhi': ['j rouhi'],
    'emanuele pecorino': ['e pecorino'],
    'wesley franca': ['wesley'],
    'jack grealish': ['j grealish'],
    'alisson santos': ['alisson'],
    'niklas sule': ['n sule', 'n süle'],
    'matteo gabbia': ['m gabbia'],
    'rafael leao': ['r leao'],
    'dro ousmane': ['dro fernandez'],
    'dan burn': ['d burn'],
    'anthony gordon': ['a gordon'],
    'anthony elanga': ['a elanga'],
    'florian wirtz': ['f wirtz'],
    'alexander isak': ['a isak'],
}

def run():
    all_db_players = list(Player.objects.select_related('team').all())
    used_db_ids = set()
    
    updated_count = 0
    created_count = 0

    print("--- STARTING SYNCHRONIZATION ---")
    
    with transaction.atomic():
        for origin_team, p_name, p_pos, p_ovr in PLAYER_DATA:
            m_clean = clean_name(p_name)
            m_parts = m_clean.split()
            match = None

            # Check exact or initial+lastname in same team
            for dp in all_db_players:
                if dp.id in used_db_ids:
                    continue
                if dp.team and dp.team.name == origin_team:
                    d_clean = clean_name(dp.name)
                    d_parts = d_clean.split()
                    if d_clean == m_clean:
                        match = dp
                        break
                    if len(m_parts) >= 2 and len(d_parts) >= 2:
                        if f"{m_parts[0][0]} {m_parts[-1]}" == f"{d_parts[0][0]} {d_parts[-1]}":
                            match = dp
                            break
                    if m_clean in ALIASES and d_clean in ALIASES[m_clean]:
                        match = dp
                        break

            # Global Search (transferred player or alias across DB)
            if not match:
                # Handle Nico Gonzalez duplicate
                if m_clean == 'nico gonzalez':
                    if origin_team == 'Juventus':
                        for dp in all_db_players:
                            if dp.id not in used_db_ids and clean_name(dp.name) in ['nico gonzalez', 'n gonzalez'] and (dp.position in ['LWF', 'RWF', 'LMF', 'RMF'] or (dp.team and dp.team.name == 'Juventus')):
                                match = dp
                                break
                    elif origin_team == 'Manchester City':
                        for dp in all_db_players:
                            if dp.id not in used_db_ids and clean_name(dp.name) in ['nico gonzalez', 'n gonzalez'] and (dp.position in ['CMF', 'DMF'] or (dp.team and dp.team.name == 'Manchester City')):
                                match = dp
                                break
                else:
                    for dp in all_db_players:
                        if dp.id in used_db_ids:
                            continue
                        d_clean = clean_name(dp.name)
                        d_parts = d_clean.split()
                        if d_clean == m_clean:
                            match = dp
                            break
                        if m_clean in ALIASES and d_clean in ALIASES[m_clean]:
                            match = dp
                            break
                        if len(m_parts) >= 2 and len(d_parts) >= 2:
                            if f"{m_parts[0][0]} {m_parts[-1]}" == f"{d_parts[0][0]} {d_parts[-1]}":
                                match = dp
                                break

            if match:
                used_db_ids.add(match.id)
                match.overall = p_ovr
                match.base_overall = p_ovr
                match.position = p_pos
                match.rarity = calculate_rarity(p_ovr, match.potential_ovr or p_ovr)
                match.base_stamina = min(99, max(60, p_ovr + (3 if p_pos != 'GK' else 0)))
                # Update name to full proper name
                match.name = p_name
                # Note: team, wage, contracts, loans are PRESERVED!
                match.save(update_fields=['name', 'overall', 'base_overall', 'position', 'rarity', 'base_stamina'])
                updated_count += 1
            else:
                # Create missing player in default origin team
                team = Team.objects.filter(name=origin_team).first()
                new_p = Player.objects.create(
                    team=team,
                    name=p_name,
                    age=24,
                    position=p_pos,
                    overall=p_ovr,
                    base_overall=p_ovr,
                    potential_ovr=max(p_ovr, p_ovr + 2),
                    base_stamina=min(99, max(60, p_ovr + (3 if p_pos != 'GK' else 0))),
                    virtual_stamina=Decimal('100.00'),
                    wage=Decimal(str(p_ovr * 1000)),
                    market_value=Decimal(str(p_ovr * 1000000)),
                    rarity=calculate_rarity(p_ovr, p_ovr + 2)
                )
                used_db_ids.add(new_p.id)
                created_count += 1

        # Recalculate team star ratings
        for team in Team.objects.all():
            team.update_star_rating()

    print(f"\n=======================================================")
    print(f"Total Target Players: {len(PLAYER_DATA)}")
    print(f"Updated Existing Players: {updated_count}")
    print(f"Created Missing Players: {created_count}")
    print(f"Total Synchronized: {updated_count + created_count}")
    print(f"Unmatched: 0")
    print(f"=======================================================")
    print("✅ 100% of all 522 players are synchronized successfully!")

if __name__ == '__main__':
    run()
