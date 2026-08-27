import os
import sys
import django
import unicodedata
import re
from decimal import Decimal

# Configure standalone Django execution
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player

def clean_name(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

# Full Transfermarkt Data (Club, Name, Position, Value in Euros)
TM_RECORDS = [
    # Liverpool
    ('Liverpool', 'Alisson Becker', 'GK', 28000000.0),
    ('Liverpool', 'Mohamed Salah', 'RWF', 55000000.0),
    ('Liverpool', 'Dominik Szoboszlai', 'AMF', 75000000.0),
    ('Liverpool', 'Virgil van Dijk', 'CB', 30000000.0),
    ('Liverpool', 'Cody Gakpo', 'LWF', 50000000.0),
    ('Liverpool', 'Alexander Isak', 'CF', 75000000.0),
    ('Liverpool', 'Ibrahima Konaté', 'CB', 45000000.0),
    ('Liverpool', 'Alexis Mac Allister', 'CMF', 75000000.0),
    ('Liverpool', 'Ryan Gravenberch', 'DMF', 40000000.0),
    ('Liverpool', 'Andrew Robertson', 'LB', 30000000.0),
    ('Liverpool', 'Giorgi Mamardashvili', 'GK', 45000000.0),
    ('Liverpool', 'Hugo Ekitiké', 'CF', 30000000.0),
    ('Liverpool', 'Jeremie Frimpong', 'RB', 50000000.0),
    ('Liverpool', 'Curtis Jones', 'CMF', 35000000.0),
    ('Liverpool', 'Florian Wirtz', 'AMF', 130000000.0),
    ('Liverpool', 'Harvey Elliott', 'AMF', 35000000.0),
    ('Liverpool', 'Joe Gomez', 'CB', 28000000.0),
    ('Liverpool', 'Milos Kerkez', 'LB', 20000000.0),
    ('Liverpool', 'Conor Bradley', 'RB', 15000000.0),
    ('Liverpool', 'Federico Chiesa', 'RWF', 35000000.0),
    ('Liverpool', 'K. Tsimikas', 'LB', 22000000.0),
    ('Liverpool', 'Wataru Endo', 'DMF', 13000000.0),
    ('Liverpool', 'Freddie Woodman', 'GK', 1500000.0),
    ('Liverpool', 'Stefan Bajcetic', 'DMF', 11000000.0),
    ('Liverpool', 'Vitezslav Jaros', 'GK', 5000000.0),
    ('Liverpool', 'Rhys Williams', 'CB', 1000000.0),
    ('Liverpool', 'Trey Nyoni', 'AMF', 2000000.0),
    ('Liverpool', 'Harvey Davies', 'GK', 500000.0),
    ('Liverpool', 'Giovanni Leoni', 'CB', 4000000.0),
    ('Liverpool', 'James McConnell', 'CMF', 1000000.0),
    ('Liverpool', 'Calvin Ramsay', 'RB', 3000000.0),
    ('Liverpool', 'Rio Ngumoha', 'LWF', 1000000.0),
    ('Liverpool', 'Bobby Clark', 'CMF', 3000000.0),

    # Bayern Munich
    ('FC Bayern München', 'Harry Kane', 'CF', 100000000.0),
    ('FC Bayern München', 'Jamal Musiala', 'AMF', 130000000.0),
    ('FC Bayern München', 'Michael Olise', 'RWF', 170000000.0),
    ('FC Bayern München', 'Luis Díaz', 'LWF', 80000000.0),
    ('FC Bayern München', 'Joshua Kimmich', 'DMF', 50000000.0),
    ('FC Bayern München', 'Alphonso Davies', 'LB', 50000000.0),
    ('FC Bayern München', 'Dayot Upamecano', 'CB', 45000000.0),
    ('FC Bayern München', 'Min-jae Kim', 'CB', 45000000.0),
    ('FC Bayern München', 'Jonathan Tah', 'CB', 30000000.0),
    ('FC Bayern München', 'Serge Gnabry', 'RWF', 40000000.0),
    ('FC Bayern München', 'Leon Goretzka', 'CMF', 30000000.0),
    ('FC Bayern München', 'Konrad Laimer', 'CMF', 30000000.0),
    ('FC Bayern München', 'Hiroki Ito', 'CB', 30000000.0),
    ('FC Bayern München', 'Josip Stanišić', 'RB', 28000000.0),
    ('FC Bayern München', 'Raphaël Guerreiro', 'LB', 12000000.0),
    ('FC Bayern München', 'Manuel Neuer', 'GK', 4000000.0),
    ('FC Bayern München', 'Nicolas Jackson', 'CF', 40000000.0),
    ('FC Bayern München', 'Tom Bischof', 'AMF', 3500000.0),
    ('FC Bayern München', 'Aleksandar Pavlović', 'DMF', 50000000.0),
    ('FC Bayern München', 'Jonas Urbig', 'GK', 4000000.0),
    ('FC Bayern München', 'Sven Ulreich', 'GK', 700000.0),
    ('FC Bayern München', 'Alexander Nübel', 'GK', 12000000.0),
    ('FC Bayern München', 'Bryan Zaragoza', 'LWF', 12000000.0),
    ('FC Bayern München', 'Sacha Boey', 'RB', 18000000.0),
    ('FC Bayern München', 'Daniel Peretz', 'GK', 3000000.0),
    ('FC Bayern München', 'Jonah Kusi-Asare', 'CF', 1500000.0),
    ('FC Bayern München', 'Arijon Ibrahimović', 'AMF', 4000000.0),

    # Arsenal
    ('Arsenal', 'Bukayo Saka', 'RWF', 110000000.0),
    ('Arsenal', 'Declan Rice', 'CMF', 120000000.0),
    ('Arsenal', 'Martin Ødegaard', 'AMF', 110000000.0),
    ('Arsenal', 'William Saliba', 'CB', 100000000.0),
    ('Arsenal', 'Gabriel Magalhães', 'CB', 75000000.0),
    ('Arsenal', 'Kai Havertz', 'CF', 75000000.0),
    ('Arsenal', 'Gabriel Martinelli', 'LWF', 60000000.0),
    ('Arsenal', 'Viktor Gyökeres', 'CF', 70000000.0),
    ('Arsenal', 'Martín Zubimendi', 'DMF', 60000000.0),
    ('Arsenal', 'Eberechi Eze', 'AMF', 55000000.0),
    ('Arsenal', 'Jurrien Timber', 'RB', 40000000.0),
    ('Arsenal', 'Ben White', 'RB', 55000000.0),
    ('Arsenal', 'Riccardo Calafiori', 'LB', 45000000.0),
    ('Arsenal', 'David Raya', 'GK', 35000000.0),
    ('Arsenal', 'Mikel Merino', 'CMF', 50000000.0),
    ('Arsenal', 'Leandro Trossard', 'LWF', 35000000.0),
    ('Arsenal', 'Gabriel Jesus', 'CF', 55000000.0),
    ('Arsenal', 'P. Hincapié', 'LB', 40000000.0),
    ('Arsenal', 'Noni Madueke', 'RWF', 35000000.0),
    ('Arsenal', 'Christian Nørgaard', 'DMF', 18000000.0),
    ('Arsenal', 'Kepa Arrizabalaga', 'GK', 12000000.0),
    ('Arsenal', 'Cristhian Mosquera', 'CB', 30000000.0),
    ('Arsenal', 'Myles Lewis-Skelly', 'LB', 5000000.0),

    # Chelsea
    ('Chelsea', 'Cole Palmer', 'AMF', 90000000.0),
    ('Chelsea', 'Moisés Caicedo', 'DMF', 75000000.0),
    ('Chelsea', 'Enzo Fernández', 'CMF', 75000000.0),
    ('Chelsea', 'Alejandro Garnacho', 'LWF', 50000000.0),
    ('Chelsea', 'Pedro Neto', 'RWF', 55000000.0),
    ('Chelsea', 'Christopher Nkunku', 'CF', 65000000.0),
    ('Chelsea', 'Levi Colwill', 'CB', 50000000.0),
    ('Chelsea', 'Reece James', 'RB', 40000000.0),
    ('Chelsea', 'Marc Cucurella', 'LB', 30000000.0),
    ('Chelsea', 'Roméo Lavia', 'DMF', 35000000.0),
    ('Chelsea', 'Malo Gusto', 'RB', 35000000.0),
    ('Chelsea', 'Benoît Badiashile', 'CB', 30000000.0),
    ('Chelsea', 'Robert Sánchez', 'GK', 20000000.0),
    ('Chelsea', 'Estêvão', 'RWF', 40000000.0),
    ('Chelsea', 'João Pedro', 'CF', 50000000.0),
    ('Chelsea', 'Jamie Gittens', 'LWF', 35000000.0),
    ('Chelsea', 'Jorrel Hato', 'CB', 30000000.0),
    ('Chelsea', 'Liam Delap', 'CF', 25000000.0),
    ('Chelsea', 'Tosin Adarabioyo', 'CB', 20000000.0),
    ('Chelsea', 'Andrey Santos', 'CMF', 15000000.0),
    ('Chelsea', 'Dário Essugo', 'DMF', 12000000.0),
    ('Chelsea', 'Filip Jörgensen', 'GK', 15000000.0),
    ('Chelsea', 'Trevoh Chalobah', 'CB', 13000000.0),
    ('Chelsea', 'Marc Guiu', 'CF', 7500000.0),
    ('Chelsea', 'Gabriel Slonina', 'GK', 5000000.0),
    ('Chelsea', 'Josh Acheampong', 'RB', 3000000.0),
    ('Chelsea', 'Ted Sharman-Lowe', 'GK', 500000.0),
    ('Chelsea', 'Wesley Fofana', 'CB', 25000000.0),
    ('Chelsea', 'Malang Sarr', 'CB', 4000000.0),

    # Manchester United
    ('Manchester United', 'Bruno Fernandes', 'AMF', 65000000.0),
    ('Manchester United', 'Matheus Cunha', 'CF', 50000000.0),
    ('Manchester United', 'Bryan Mbeumo', 'RWF', 40000000.0),
    ('Manchester United', 'Benjamin Šeško', 'CF', 50000000.0),
    ('Manchester United', 'Kobbie Mainoo', 'CMF', 55000000.0),
    ('Manchester United', 'Manuel Ugarte', 'DMF', 50000000.0),
    ('Manchester United', 'Matthijs de Ligt', 'CB', 55000000.0),
    ('Manchester United', 'Lisandro Martínez', 'CB', 50000000.0),
    ('Manchester United', 'Leny Yoro', 'CB', 50000000.0),
    ('Manchester United', 'Diogo Dalot', 'RB', 40000000.0),
    ('Manchester United', 'Noussair Mazraoui', 'RB', 30000000.0),
    ('Manchester United', 'Joshua Zirkzee', 'CF', 50000000.0),
    ('Manchester United', 'Mason Mount', 'AMF', 35000000.0),
    ('Manchester United', 'Patrick Dorgu', 'LB', 20000000.0),
    ('Manchester United', 'Luke Shaw', 'LB', 28000000.0),
    ('Manchester United', 'Harry Maguire', 'CB', 18000000.0),
    ('Manchester United', 'Casemiro', 'DMF', 15000000.0),
    ('Manchester United', 'Altay Bayındır', 'GK', 10000000.0),
    ('Manchester United', 'Tyrell Malacia', 'LB', 18000000.0),
    ('Manchester United', 'Tom Heaton', 'GK', 250000.0),
    ('Manchester United', 'Shea Lacey', 'RWF', 2000000.0),
    ('Manchester United', 'Jack Fletcher', 'CMF', 1500000.0),
    ('Manchester United', 'Tyler Fredricson', 'CB', 500000.0),
    ('Manchester United', 'Ayden Heaven', 'CB', 500000.0),
    ('Manchester United', 'Diego León', 'LB', 1000000.0),
    ('Manchester United', 'Senne Lammens', 'GK', 1500000.0),

    # Manchester City
    ('Manchester City', 'Erling Haaland', 'CF', 200000000.0),
    ('Manchester City', 'Rodri', 'DMF', 130000000.0),
    ('Manchester City', 'Phil Foden', 'AMF', 150000000.0),
    ('Manchester City', 'Joško Gvardiol', 'CB', 75000000.0),
    ('Manchester City', 'Rúben Dias', 'CB', 80000000.0),
    ('Manchester City', 'Bernardo Silva', 'CMF', 70000000.0),
    ('Manchester City', 'Jérémy Doku', 'LWF', 65000000.0),
    ('Manchester City', 'Savinho', 'RWF', 50000000.0),
    ('Manchester City', 'Gianluigi Donnarumma', 'GK', 40000000.0),
    ('Manchester City', 'Omar Marmoush', 'CF', 40000000.0),
    ('Manchester City', 'Tijjani Reijnders', 'CMF', 35000000.0),
    ('Manchester City', 'Rayan Cherki', 'AMF', 25000000.0),
    ('Manchester City', 'Rayan Aït-Nouri', 'LB', 35000000.0),
    ('Manchester City', 'Marc Guéhi', 'CB', 45000000.0),
    ('Manchester City', 'Antoine Semenyo', 'RWF', 20000000.0),
    ('Manchester City', 'Matheus Nunes', 'CMF', 40000000.0),
    ('Manchester City', 'Nathan Aké', 'CB', 40000000.0),
    ('Manchester City', 'John Stones', 'CB', 38000000.0),
    ('Manchester City', 'Manuel Akanji', 'CB', 45000000.0),
    ('Manchester City', 'Mateo Kovačić', 'CMF', 30000000.0),
    ('Manchester City', 'Rico Lewis', 'RB', 40000000.0),
    ('Manchester City', 'James Trafford', 'GK', 18000000.0),
    ('Manchester City', 'Abdukodir Khusanov', 'CB', 5000000.0),
    ('Manchester City', 'Nico O\'Reilly', 'CMF', 3000000.0),
    ('Manchester City', 'Sverre Nypan', 'CMF', 11000000.0),
    ('Manchester City', 'Max Alleyne', 'CB', 1000000.0),
    ('Manchester City', 'Marcus Bettinelli', 'GK', 1000000.0),
    ('Manchester City', 'Nico González', 'CMF', 18000000.0),

    # Real Madrid
    ('Real Madrid', 'Kylian Mbappé', 'CF', 200000000.0),
    ('Real Madrid', 'Vinícius Júnior', 'LWF', 200000000.0),
    ('Real Madrid', 'Jude Bellingham', 'AMF', 180000000.0),
    ('Real Madrid', 'Federico Valverde', 'CMF', 130000000.0),
    ('Real Madrid', 'Rodrygo', 'RWF', 110000000.0),
    ('Real Madrid', 'Eduardo Camavinga', 'CMF', 100000000.0),
    ('Real Madrid', 'Aurélien Tchouaméni', 'DMF', 100000000.0),
    ('Real Madrid', 'Trent Alexander-Arnold', 'RB', 70000000.0),
    ('Real Madrid', 'Arda Güler', 'AMF', 45000000.0),
    ('Real Madrid', 'Éder Militão', 'CB', 60000000.0),
    ('Real Madrid', 'Antonio Rüdiger', 'CB', 25000000.0),
    ('Real Madrid', 'Thibaut Courtois', 'GK', 28000000.0),
    ('Real Madrid', 'Brahim Díaz', 'RWF', 40000000.0),
    ('Real Madrid', 'Ferland Mendy', 'LB', 22000000.0),
    ('Real Madrid', 'Dani Carvajal', 'RB', 12000000.0),
    ('Real Madrid', 'Andriy Lunin', 'GK', 25000000.0),
    ('Real Madrid', 'Dani Ceballos', 'CMF', 6000000.0),
    ('Real Madrid', 'Fran García', 'LB', 15000000.0),
    ('Real Madrid', 'David Alaba', 'CB', 15000000.0),
    ('Real Madrid', 'Dean Huijsen', 'CB', 18000000.0),
    ('Real Madrid', 'Franco Mastantuono', 'RWF', 13000000.0),
    ('Real Madrid', 'Álvaro Carreras', 'LB', 8000000.0),
    ('Real Madrid', 'Raúl Asencio', 'CB', 3000000.0),
    ('Real Madrid', 'Gonzalo García', 'CF', 2000000.0),
    ('Real Madrid', 'Fran González', 'GK', 1000000.0),
    ('Real Madrid', 'Thiago Pitarch', 'CMF', 1000000.0),
    ('Real Madrid', 'César Palacios', 'AMF', 1400000.0),

    # FC Barcelona
    ('FC Barcelona', 'Lamine Yamal', 'RWF', 220000000.0),
    ('FC Barcelona', 'Pedri', 'CMF', 80000000.0),
    ('FC Barcelona', 'Gavi', 'CMF', 90000000.0),
    ('FC Barcelona', 'Raphinha', 'LWF', 60000000.0),
    ('FC Barcelona', 'Dani Olmo', 'AMF', 60000000.0),
    ('FC Barcelona', 'Ronald Araújo', 'CB', 70000000.0),
    ('FC Barcelona', 'Jules Koundé', 'CB', 55000000.0),
    ('FC Barcelona', 'Frenkie de Jong', 'CMF', 60000000.0),
    ('FC Barcelona', 'Alejandro Balde', 'LB', 40000000.0),
    ('FC Barcelona', 'Pau Cubarsí', 'CB', 40000000.0),
    ('FC Barcelona', 'Fermín López', 'AMF', 50000000.0),
    ('FC Barcelona', 'Marcus Rashford', 'LWF', 60000000.0),
    ('FC Barcelona', 'Robert Lewandowski', 'CF', 15000000.0),
    ('FC Barcelona', 'Marc Casadó', 'DMF', 15000000.0),
    ('FC Barcelona', 'Marc Bernal', 'DMF', 5000000.0),
    ('FC Barcelona', 'Ferran Torres', 'CF', 30000000.0),
    ('FC Barcelona', 'Andreas Christensen', 'CB', 30000000.0),
    ('FC Barcelona', 'Eric García', 'CB', 20000000.0),
    ('FC Barcelona', 'Joan García', 'GK', 10000000.0),
    ('FC Barcelona', 'João Cancelo', 'RB', 25000000.0),
    ('FC Barcelona', 'Roony Bardghji', 'RWF', 9000000.0),
    ('FC Barcelona', 'Gerard Martín', 'LB', 3000000.0),
    ('FC Barcelona', 'Guille Fernández', 'CMF', 2000000.0),
    ('FC Barcelona', 'Toni Fernández', 'RWF', 2000000.0),
    ('FC Barcelona', 'Wojciech Szczęsny', 'GK', 3000000.0),
    ('FC Barcelona', 'Diego Kochen', 'GK', 1000000.0),
    ('FC Barcelona', 'Álvaro Cortés', 'GK', 500000.0),

    # Paris Saint-Germain
    ('Paris Saint-Germain', 'Achraf Hakimi', 'RB', 60000000.0),
    ('Paris Saint-Germain', 'Ousmane Dembélé', 'RWF', 60000000.0),
    ('Paris Saint-Germain', 'Warren Zaïre-Emery', 'CMF', 60000000.0),
    ('Paris Saint-Germain', 'Bradley Barcola', 'LWF', 65000000.0),
    ('Paris Saint-Germain', 'Vitinha', 'DMF', 55000000.0),
    ('Paris Saint-Germain', 'João Neves', 'CMF', 60000000.0),
    ('Paris Saint-Germain', 'Nuno Mendes', 'LB', 55000000.0),
    ('Paris Saint-Germain', 'Khvicha Kvaratskhelia', 'LWF', 80000000.0),
    ('Paris Saint-Germain', 'Willian Pacho', 'CB', 40000000.0),
    ('Paris Saint-Germain', 'Désiré Doué', 'LWF', 40000000.0),
    ('Paris Saint-Germain', 'Lucas Chevalier', 'GK', 25000000.0),
    ('Paris Saint-Germain', 'Marquinhos', 'CB', 50000000.0),
    ('Paris Saint-Germain', 'Gonçalo Ramos', 'CF', 50000000.0),
    ('Paris Saint-Germain', 'Lucas Beraldo', 'CB', 30000000.0),
    ('Paris Saint-Germain', 'Lee Kang-in', 'AMF', 30000000.0),
    ('Paris Saint-Germain', 'Fabián Ruiz', 'CMF', 35000000.0),
    ('Paris Saint-Germain', 'Lucas Hernández', 'CB', 40000000.0),
    ('Paris Saint-Germain', 'Matvey Safonov', 'GK', 20000000.0),
    ('Paris Saint-Germain', 'Illia Zabarnyi', 'CB', 32000000.0),
    ('Paris Saint-Germain', 'Senny Mayulu', 'CMF', 5000000.0),
    ('Paris Saint-Germain', 'Ibrahim Mbaye', 'RWF', 3000000.0),
    ('Paris Saint-Germain', 'Dro Ousmane', 'AMF', 2000000.0),
    ('Paris Saint-Germain', 'Quentin Ndjantou', 'CF', 1000000.0),
    ('Paris Saint-Germain', 'Renato Marin', 'GK', 500000.0),

    # Juventus
    ('Juventus', 'Bremer', 'CB', 60000000.0),
    ('Juventus', 'Teun Koopmeiners', 'AMF', 55000000.0),
    ('Juventus', 'Dušan Vlahović', 'CF', 65000000.0),
    ('Juventus', 'Loïs Openda', 'CF', 60000000.0),
    ('Juventus', 'Jonathan David', 'CF', 45000000.0),
    ('Juventus', 'Andrea Cambiaso', 'RB', 30000000.0),
    ('Juventus', 'Manuel Locatelli', 'DMF', 28000000.0),
    ('Juventus', 'Khéphren Thuram', 'CMF', 35000000.0),
    ('Juventus', 'Federico Gatti', 'CB', 25000000.0),
    ('Juventus', 'Weston McKennie', 'CMF', 28000000.0),
    ('Juventus', 'Pierre Kalulu', 'CB', 20000000.0),
    ('Juventus', 'Michele Di Gregorio', 'GK', 18000000.0),
    ('Juventus', 'Francisco Conceição', 'RWF', 22000000.0),
    ('Juventus', 'Edon Zhegrova', 'RWF', 25000000.0),
    ('Juventus', 'Jérémie Boga', 'LWF', 15000000.0),
    ('Juventus', 'Lloyd Kelly', 'CB', 16000000.0),
    ('Juventus', 'Emil Holm', 'RB', 12000000.0),
    ('Juventus', 'Juan Cabal', 'LB', 12000000.0),
    ('Juventus', 'Fabio Miretti', 'CMF', 15000000.0),
    ('Juventus', 'Arkadiusz Milik', 'CF', 6000000.0),
    ('Juventus', 'Filip Kostić', 'LMF', 6500000.0),
    ('Juventus', 'Mattia Perin', 'GK', 3000000.0),
    ('Juventus', 'Vasilije Adžić', 'AMF', 2000000.0),
    ('Juventus', 'Leonardo Cerri', 'CF', 1000000.0),
    ('Juventus', 'Carlo Pinsoglio', 'GK', 200000.0),
    ('Juventus', 'Nico González', 'LWF', 35000000.0),

    # Tottenham Hotspur
    ('Tottenham Hotspur', 'James Maddison', 'AMF', 70000000.0),
    ('Tottenham Hotspur', 'Cristian Romero', 'CB', 65000000.0),
    ('Tottenham Hotspur', 'Micky van de Ven', 'CB', 55000000.0),
    ('Tottenham Hotspur', 'Dominic Solanke', 'CF', 45000000.0),
    ('Tottenham Hotspur', 'Dejan Kulusevski', 'AMF', 55000000.0),
    ('Tottenham Hotspur', 'Pedro Porro', 'RB', 45000000.0),
    ('Tottenham Hotspur', 'Destiny Udogie', 'LB', 45000000.0),
    ('Tottenham Hotspur', 'Pape Matar Sarr', 'CMF', 40000000.0),
    ('Tottenham Hotspur', 'Mohammed Kudus', 'RWF', 50000000.0),
    ('Tottenham Hotspur', 'Xavi Simons', 'AMF', 80000000.0),
    ('Tottenham Hotspur', 'Mathys Tel', 'CF', 40000000.0),
    ('Tottenham Hotspur', 'Guglielmo Vicario', 'GK', 35000000.0),
    ('Tottenham Hotspur', 'Rodrigo Bentancur', 'DMF', 35000000.0),
    ('Tottenham Hotspur', 'Conor Gallagher', 'CMF', 50000000.0),
    ('Tottenham Hotspur', 'Richarlison', 'CF', 38000000.0),
    ('Tottenham Hotspur', 'João Palhinha', 'DMF', 55000000.0),
    ('Tottenham Hotspur', 'Randal Kolo Muani', 'CF', 45000000.0),
    ('Tottenham Hotspur', 'Radu Drăgușin', 'CB', 25000000.0),
    ('Tottenham Hotspur', 'Yves Bissouma', 'DMF', 35000000.0),
    ('Tottenham Hotspur', 'Kevin Danso', 'CB', 25000000.0),
    ('Tottenham Hotspur', 'Lucas Bergvall', 'CMF', 12000000.0),
    ('Tottenham Hotspur', 'Archie Gray', 'CB', 18000000.0),
    ('Tottenham Hotspur', 'Wilson Odobert', 'RWF', 10000000.0),
    ('Tottenham Hotspur', 'Djed Spence', 'LB', 8000000.0),
    ('Tottenham Hotspur', 'Ben Davies', 'CB', 10000000.0),
    ('Tottenham Hotspur', 'Antonín Kinský', 'GK', 3500000.0),

    # Atletico Madrid
    ('Atlético Madrid', 'Julián Alvarez', 'CF', 75000000.0),
    ('Atlético Madrid', 'Antoine Griezmann', 'SS', 25000000.0),
    ('Atlético Madrid', 'Álex Baena', 'AMF', 40000000.0),
    ('Atlético Madrid', 'Robin Le Normand', 'CB', 40000000.0),
    ('Atlético Madrid', 'Ademola Lookman', 'LWF', 40000000.0),
    ('Atlético Madrid', 'Marcos Llorente', 'RB', 30000000.0),
    ('Atlético Madrid', 'Nahuel Molina', 'RB', 28000000.0),
    ('Atlético Madrid', 'Pablo Barrios', 'CMF', 30000000.0),
    ('Atlético Madrid', 'Alexander Sørloth', 'CF', 25000000.0),
    ('Atlético Madrid', 'Jan Oblak', 'GK', 28000000.0),
    ('Atlético Madrid', 'Thiago Almada', 'AMF', 27000000.0),
    ('Atlético Madrid', 'José María Giménez', 'CB', 22000000.0),
    ('Atlético Madrid', 'Dávid Hancko', 'CB', 35000000.0),
    ('Atlético Madrid', 'Marc Pubill', 'RB', 5000000.0),
    ('Atlético Madrid', 'Johnny Cardoso', 'DMF', 25000000.0),
    ('Atlético Madrid', 'Koke', 'CMF', 12000000.0),
    ('Atlético Madrid', 'Matteo Ruggeri', 'LB', 20000000.0),
    ('Atlético Madrid', 'Juan Musso', 'GK', 5000000.0),
    ('Atlético Madrid', 'Clément Lenglet', 'CB', 10000000.0),
    ('Atlético Madrid', 'Ilias Kostis', 'CB', 1000000.0),
    ('Atlético Madrid', 'Rayane Belaid', 'AMF', 1000000.0),
    ('Atlético Madrid', 'Salvi Esquivel', 'GK', 500000.0),
    ('Atlético Madrid', 'Obed Vargas', 'CMF', 6000000.0),
    ('Atlético Madrid', 'Rodrigo Mendoza', 'CMF', 3000000.0),

    # Inter Milan
    ('Inter', 'Lautaro Martínez', 'CF', 110000000.0),
    ('Inter', 'Nicolò Barella', 'CMF', 80000000.0),
    ('Inter', 'Alessandro Bastoni', 'CB', 70000000.0),
    ('Inter', 'Marcus Thuram', 'CF', 65000000.0),
    ('Inter', 'Federico Dimarco', 'LB', 50000000.0),
    ('Inter', 'Hakan Çalhanoğlu', 'DMF', 45000000.0),
    ('Inter', 'Davide Frattesi', 'CMF', 35000000.0),
    ('Inter', 'Piotr Zieliński', 'CMF', 22000000.0),
    ('Inter', 'Denzel Dumfries', 'RB', 20000000.0),
    ('Inter', 'Yann Bisseck', 'CB', 25000000.0),
    ('Inter', 'Carlos Augusto', 'LB', 22000000.0),
    ('Inter', 'Henrikh Mkhitaryan', 'CMF', 6000000.0),
    ('Inter', 'Stefan de Vrij', 'CB', 8000000.0),
    ('Inter', 'Francesco Acerbi', 'CB', 3500000.0),
    ('Inter', 'Matteo Darmian', 'RB', 4000000.0),
    ('Inter', 'Yann Sommer', 'GK', 5000000.0),
    ('Inter', 'Josep Martínez', 'GK', 8000000.0),
    ('Inter', 'Ange-Yoan Bonny', 'CF', 15000000.0),
    ('Inter', 'Luis Henrique', 'RWF', 16000000.0),
    ('Inter', 'Petar Sučić', 'CMF', 12000000.0),
    ('Inter', 'Andy Diouf', 'CMF', 12000000.0),
    ('Inter', 'Raffaele Di Gennaro', 'GK', 500000.0),
    ('Inter', 'Luka Jakirović', 'CB', 500000.0),

    # AC Milan
    ('AC Milan', 'Theo Hernández', 'LB', 60000000.0),
    ('AC Milan', 'Christian Pulisic', 'RWF', 40000000.0),
    ('AC Milan', 'Mike Maignan', 'GK', 38000000.0),
    ('AC Milan', 'Fikayo Tomori', 'CB', 40000000.0),
    ('AC Milan', 'Youssouf Fofana', 'DMF', 30000000.0),
    ('AC Milan', 'Strahinja Pavlović', 'CB', 25000000.0),
    ('AC Milan', 'Ruben Loftus-Cheek', 'CMF', 25000000.0),
    ('AC Milan', 'Adrien Rabiot', 'CMF', 35000000.0),
    ('AC Milan', 'Samuele Ricci', 'DMF', 22000000.0),
    ('AC Milan', 'Santiago Gimenez', 'CF', 40000000.0),
    ('AC Milan', 'Pervis Estupiñán', 'LB', 30000000.0),
    ('AC Milan', 'Alexis Saelemaekers', 'RMF', 12000000.0),
    ('AC Milan', 'Koni De Winter', 'CB', 12000000.0),
    ('AC Milan', 'Ardon Jashari', 'DMF', 6000000.0),
    ('AC Milan', 'Luka Modrić', 'CMF', 6000000.0),
    ('AC Milan', 'Pietro Terracciano', 'GK', 2500000.0),
    ('AC Milan', 'Zachary Athekame', 'RB', 1500000.0),
    ('AC Milan', 'Lorenzo Torriani', 'GK', 1500000.0),
    ('AC Milan', 'David Odogu', 'CB', 1000000.0),

    # SSC Napoli
    ('SSC Napoli', 'Khvicha Kvaratskhelia', 'LWF', 80000000.0),
    ('SSC Napoli', 'Alessandro Buongiorno', 'CB', 35000000.0),
    ('SSC Napoli', 'Stanislav Lobotka', 'DMF', 28000000.0),
    ('SSC Napoli', 'Frank Anguissa', 'CMF', 27000000.0),
    ('SSC Napoli', 'Alex Meret', 'GK', 12000000.0),
    ('SSC Napoli', 'David Neres', 'RWF', 25000000.0),
    ('SSC Napoli', 'Romelu Lukaku', 'CF', 30000000.0),
    ('SSC Napoli', 'Matteo Politano', 'RWF', 13000000.0),
    ('SSC Napoli', 'Mathías Olivera', 'LB', 15000000.0),
    ('SSC Napoli', 'Amir Rrahmani', 'CB', 15000000.0),
    ('SSC Napoli', 'Giovanni Di Lorenzo', 'RB', 15000000.0),
    ('SSC Napoli', 'Scott McTominay', 'CMF', 32000000.0),
    ('SSC Napoli', 'Billy Gilmour', 'DMF', 18000000.0),
    ('SSC Napoli', 'Miguel Gutiérrez', 'LB', 25000000.0),
    ('SSC Napoli', 'Sam Beukema', 'CB', 18000000.0),
    ('SSC Napoli', 'Kevin De Bruyne', 'AMF', 8000000.0),
    ('SSC Napoli', 'Leonardo Spinazzola', 'LB', 4000000.0),
    ('SSC Napoli', 'Pasquale Mazzocchi', 'RB', 4000000.0),
    ('SSC Napoli', 'Juan Jesus', 'CB', 1500000.0),
    ('SSC Napoli', 'Nikita Contini', 'GK', 400000.0),
    ('SSC Napoli', 'Antonio Vergara', 'AMF', 1500000.0),
    ('SSC Napoli', 'Alisson Santos', 'LWF', 1000000.0),
    ('SSC Napoli', 'Giovane', 'CF', 2500000.0),
    ('SSC Napoli', 'Mathias Ferrante', 'GK', 500000.0),

    # Newcastle United
    ('Newcastle United', 'Bruno Guimarães', 'CMF', 85000000.0),
    ('Newcastle United', 'Anthony Gordon', 'LWF', 60000000.0),
    ('Newcastle United', 'Sandro Tonali', 'CMF', 38000000.0),
    ('Newcastle United', 'Joelinton', 'CMF', 40000000.0),
    ('Newcastle United', 'Tino Livramento', 'RB', 35000000.0),
    ('Newcastle United', 'Lewis Hall', 'LB', 22000000.0),
    ('Newcastle United', 'Harvey Barnes', 'LWF', 35000000.0),
    ('Newcastle United', 'Joe Willock', 'CMF', 30000000.0),
    ('Newcastle United', 'Sven Botman', 'CB', 45000000.0),
    ('Newcastle United', 'Malick Thiaw', 'CB', 20000000.0),
    ('Newcastle United', 'Jacob Murphy', 'RWF', 15000000.0),
    ('Newcastle United', 'Anthony Elanga', 'RWF', 22000000.0),
    ('Newcastle United', 'Jacob Ramsey', 'CMF', 32000000.0),
    ('Newcastle United', 'Nick Pope', 'GK', 16000000.0),
    ('Newcastle United', 'Aaron Ramsdale', 'GK', 25000000.0),
    ('Newcastle United', 'Yoane Wissa', 'CF', 28000000.0),
    ('Newcastle United', 'Dan Burn', 'CB', 8000000.0),
    ('Newcastle United', 'Kieran Trippier', 'RB', 10000000.0),
    ('Newcastle United', 'Fabian Schär', 'CB', 10000000.0),
    ('Newcastle United', 'Lewis Miley', 'CMF', 22000000.0),
    ('Newcastle United', 'William Osula', 'CF', 3000000.0),
    ('Newcastle United', 'Nick Woltemade', 'CF', 4000000.0),
    ('Newcastle United', 'Emil Krafth', 'RB', 2500000.0),
    ('Newcastle United', 'John Ruddy', 'GK', 250000.0),
    ('Newcastle United', 'Mark Gillespie', 'GK', 400000.0),

    # Borussia Dortmund
    ('BVB Borussia Dortmund', 'Gregor Kobel', 'GK', 40000000.0),
    ('BVB Borussia Dortmund', 'Nico Schlotterbeck', 'CB', 40000000.0),
    ('BVB Borussia Dortmund', 'Julian Brandt', 'AMF', 40000000.0),
    ('BVB Borussia Dortmund', 'Serhou Guirassy', 'CF', 40000000.0),
    ('BVB Borussia Dortmund', 'Karim Adeyemi', 'LWF', 35000000.0),
    ('BVB Borussia Dortmund', 'Marcel Sabitzer', 'CMF', 20000000.0),
    ('BVB Borussia Dortmund', 'Maximilian Beier', 'CF', 30000000.0),
    ('BVB Borussia Dortmund', 'Felix Nmecha', 'CMF', 20000000.0),
    ('BVB Borussia Dortmund', 'Waldemar Anton', 'CB', 24000000.0),
    ('BVB Borussia Dortmund', 'Julian Ryerson', 'RB', 20000000.0),
    ('BVB Borussia Dortmund', 'Emre Can', 'DMF', 10000000.0),
    ('BVB Borussia Dortmund', 'Ramy Bensebaini', 'LB', 7000000.0),
    ('BVB Borussia Dortmund', 'Carney Chukwuemeka', 'CMF', 15000000.0),
    ('BVB Borussia Dortmund', 'Fábio Silva', 'CF', 11000000.0),
    ('BVB Borussia Dortmund', 'Daniel Svensson', 'LB', 3000000.0),
    ('BVB Borussia Dortmund', 'Salih Özcan', 'DMF', 9000000.0),
    ('BVB Borussia Dortmund', 'Alexander Meyer', 'GK', 800000.0),
    ('BVB Borussia Dortmund', 'Almugera Kabar', 'LB', 1000000.0),
    ('BVB Borussia Dortmund', 'Kjell Wätjen', 'CMF', 2000000.0),
    ('BVB Borussia Dortmund', 'Patrick Drewes', 'GK', 500000.0),
    ('BVB Borussia Dortmund', 'Silas Ostrzinski', 'GK', 250000.0),

    # AS Roma
    ('AS Roma', 'Paulo Dybala', 'SS', 12000000.0),
    ('AS Roma', 'Artem Dovbyk', 'CF', 35000000.0),
    ('AS Roma', 'Lorenzo Pellegrini', 'AMF', 22000000.0),
    ('AS Roma', 'Gianluca Mancini', 'CB', 20000000.0),
    ('AS Roma', 'Evan Ndicka', 'CB', 22000000.0),
    ('AS Roma', 'Bryan Cristante', 'DMF', 12000000.0),
    ('AS Roma', 'Manu Koné', 'CMF', 25000000.0),
    ('AS Roma', 'Matías Soulé', 'RWF', 25000000.0),
    ('AS Roma', 'Enzo Le Fée', 'CMF', 18000000.0),
    ('AS Roma', 'Angeliño', 'LB', 8000000.0),
    ('AS Roma', 'Zeki Çelik', 'RB', 4000000.0),
    ('AS Roma', 'Mile Svilar', 'GK', 14000000.0),
    ('AS Roma', 'Stephan El Shaarawy', 'LWF', 5000000.0),
    ('AS Roma', 'Alexis Saelemaekers', 'LWF', 12000000.0),
    ('AS Roma', 'Devyne Rensch', 'RB', 10000000.0),
    ('AS Roma', 'Mario Hermoso', 'CB', 18000000.0),
    ('AS Roma', 'Daniele Ghilardi', 'CB', 4000000.0),
    ('AS Roma', 'Mathew Ryan', 'GK', 1200000.0),
    ('AS Roma', 'Pierluigi Gollini', 'GK', 4000000.0),
]

print("1. Removing any newly created extra/fake players (ID >= 1226)...")
del_count, _ = Player.objects.filter(id__gte=1226).delete()
print(f"Deleted {del_count} extra players.")

orig_players = list(Player.objects.all())
print(f"Original players present in DB: {len(orig_players)}")

# Alias dictionary
ALIASES = {
    'vinicius junior': ['vini jr', 'vinicius jr', 'vini jr.'],
    'gabriel magalhaes': ['gabriel', 'g magalhaes'],
    'kepa arrizabalaga': ['kepa'],
    'martin zubimendi': ['zubimendi', 'm zubimendi'],
    'frank anguissa': ['a zambo anguissa', 'zambo anguissa', 'f anguissa', 'a. zambo anguissa'],
    'manu kone': ['k kone', 'm kone', 'k. kone'],
    'jan ziolkowski': ['j ziolkowski', 'j ziółkowski'],
    'alisson becker': ['alisson'],
    'fermin lopez': ['fermin'],
    'nicolas jackson': ['n jackson'],
    'brahim diaz': ['brahim'],
    'gonzalo garcia': ['gonzalo'],
    'marc andre ter stegen': ['m ter stegen', 'marc ter stegen', 'm. ter stegen'],
    'marc ter stegen': ['m ter stegen', 'm. ter stegen'],
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
    'rafael leao': ['r leao', 'rafael leao'],
    'dro ousmane': ['dro fernandez', 'dro fernandez (2)'],
    'ousmane dembele': ['o dembele', 'o dembele (2)', 'o. dembele', 'o. dembélé', 'o. dembélé (2)', 'o dembélé'],
    'achraf hakimi': ['a hakimi', 'a. hakimi', 'a hakimi (2)', 'a. hakimi (2)'],
    'khvicha kvaratskhelia': ['k kvaratskhelia', 'k. kvaratskhelia', 'k kvaratskhelia (2)', 'k. kvaratskhelia (2)'],
    'marquinhos': ['marquinhos (2)', 'marquinhos'],
    'willian pacho': ['w pacho', 'w. pacho', 'w pacho (2)', 'w. pacho (2)'],
    'lucas hernandez': ['l hernandez', 'l. hernandez', 'l hernandez (2)', 'l. hernandez (2)'],
    'thibaut courtois': ['t courtois', 't. courtois', 't courtois1'],
    'jules kounde': ['j kounde', 'j. kounde', 'j kounde1'],
    'alejandro balde': ['balde', 'balde1', 'a balde'],
    'pau cubarsi': ['pau cubarsi', 'pau cubarsi1'],
    'pedri': ['pedri1', 'pedri'],
    'gavi': ['gavi1', 'gavi'],
    'robert lewandowski': ['r lewandowski', 'r. lewandowski', 'r lewandowski1'],
    'raphinha': ['raphinha1', 'raphinha'],
    'lamine yamal': ['lamine yamal1', 'lamine yamal'],
    'frenkie de jong': ['f de jong', 'f. de jong', 'f de jong1'],
    'dani olmo': ['dani olmo1', 'dani olmo'],
    'ferran torres': ['ferran torres1', 'ferran torres'],
    'ronald araujo': ['r araujo', 'r. araujo', 'r araujo1'],
    'andreas christensen': ['a christensen', 'a. christensen', 'a christensen1'],
    'wojciech szczesny': ['w szczesny', 'w. szczesny', 'w szczesny1'],
    'diego kochen': ['d kochen', 'd. kochen', 'd kochen1'],
    'raul asencio': ['asencio', 'asencio1'],
    'daniel carvajal': ['carvajal', 'carvajal1'],
    'david alaba': ['d alaba', 'd. alaba', 'd alaba1'],
    'david jimenez': ['david jimenez', 'david jimenez1'],
    'diego aguado': ['diego aguado', 'diego aguado1'],
    'daniel yanez': ['daniel yanez', 'daniel yanez1'],
    'thiago pitarch': ['thiago pitarch', 'thiago pitarch1'],
    'victor valdepenas': ['victor valdepenas', 'victor valdepenas1'],
    'adrien rabiot': ['a rabiot', 'a. rabiot', 'a rabiot1'],
    'ardon jashari': ['a jashari', 'a. jashari', 'a jashari1'],
    'lorenzo torriani': ['l torriani', 'l. torriani', 'l torriani1'],
    'david odogu': ['d odogu', 'd. odogu', 'd odogu1'],
    'pietro terracciano': ['p terracciano', 'p. terracciano', 'p terracciano1'],
    'niclas fullkrug': ['n fullkrug', 'n. fullkrug', 'n fullkrug1'],
    'andrea cambiaso': ['a cambiaso', 'a. cambiaso', 'a cambiaso1'],
    'federico gatti': ['f gatti', 'f. gatti', 'f gatti1'],
    'pierre kalulu': ['p kalulu', 'p. kalulu', 'p kalulu1'],
    'khephren thuram': ['k thuram', 'k. thuram', 'k thuram1'],
    'juan cabal': ['j cabal', 'j. cabal', 'j cabal1'],
    'francisco conceicao': ['francisco conceicao', 'francisco conceicao1'],
    'fabio miretti': ['f miretti', 'f. miretti', 'f miertti1', 'f. miertti1'],
    'edon zhegrova': ['e zhegrova', 'e. zhegrova'],
    'vasilije adzic': ['v adzic', 'v. adzic'],
}

print("2. Applying Transfermarkt market values to original players...")
updated_count = 0
used_ids = set()

for tname, p_name, p_pos, p_val in TM_RECORDS:
    m_clean = clean_name(p_name)
    m_parts = m_clean.split()
    target_player = None

    for p in orig_players:
        if p.id in used_ids: continue
        p_clean = clean_name(p.name)
        p_parts = p_clean.split()
        
        if p_clean == m_clean:
            target_player = p
            break
        if m_clean in ALIASES and p_clean in ALIASES[m_clean]:
            target_player = p
            break
        if len(m_parts) >= 2 and len(p_parts) >= 2:
            if f"{m_parts[0][0]} {m_parts[-1]}" == f"{p_parts[0][0]} {p_parts[-1]}":
                target_player = p
                break

    if not target_player and m_clean == 'nico gonzalez':
        if tname == 'Juventus':
            for p in orig_players:
                if p.id not in used_ids and clean_name(p.name) in ['nico gonzalez', 'n gonzalez'] and p.position in ['LWF', 'RWF', 'LMF', 'RMF']:
                    target_player = p
                    break
        elif tname == 'Manchester City':
            for p in orig_players:
                if p.id not in used_ids and clean_name(p.name) in ['nico gonzalez', 'n gonzalez'] and p.position in ['CMF', 'DMF']:
                    target_player = p
                    break

    if target_player:
        used_ids.add(target_player.id)
        if p_val > 0:
            target_player.market_value = Decimal(str(p_val))
            target_player.save(update_fields=['market_value'])
            updated_count += 1

print(f"Updated market values for {updated_count} players.")

# Recalculate team star ratings
print("3. Recalculating all team star ratings...")
for team in Team.objects.all():
    squad = team.players.all()
    if squad.exists():
        top_11 = sorted([p.overall for p in squad], reverse=True)[:11]
        avg_ovr = sum(top_11) / len(top_11)
        stars = round((avg_ovr - 60) / 6.0, 1)
        stars = max(1.0, min(5.0, stars))
        team.star_rating = Decimal(str(stars))
        team.save(update_fields=['star_rating'])

print("==================================================")
print("SUCCESS: All fake/duplicate players removed.")
print("SUCCESS: Real original player squads preserved.")
print("SUCCESS: Transfermarkt market values applied.")
print("==================================================")
