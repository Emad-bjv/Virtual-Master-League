import os
import sys
import django
import unicodedata
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from transfers.models import TransferLog
from teams.models import Player, Team

def clean_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()

ALIASES = {
    'vinicius junior': ['vini jr', 'vinicius jr', 'vini jr.'],
    'gabriel magalhaes': ['gabriel', 'g magalhaes'],
    'kepa arrizabalaga': ['kepa'],
    'martin zubimendi': ['zubimendi', 'm zubimendi'],
    'frank anguissa': ['a zambo anguissa', 'zambo anguissa', 'f anguissa', 'a. zambo anguissa', 'zambo'],
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
    'amad diallo': ['amad'],
}

print("=== PARSING TEXT LOGS TO RESTORE MISSING TRANSFERS ===")

# Order by timestamp ASCENDING so later transfers override earlier ones
logs = TransferLog.objects.all().order_by('timestamp')
all_teams = {t.name: t for t in Team.objects.all()}

restored_count = 0

for log in logs:
    desc = log.description
    if not desc: continue
    
    player_name = None
    buyer_team_name = None
    
    # 1. Type 1: انتقال قطعی: بازیکن «NAME» با مبلغ X از تیم Y به تیم BUYER واگذار گردید
    m1 = re.search(r'بازیکن «(.*?)»', desc)
    m2 = re.search(r'به تیم (.*?) واگذار گردید', desc)
    
    # 2. Type 2: انتقال رسمی: NAME با مبلغ X از Y به تیم BUYER پیوست
    m3 = re.search(r'انتقال رسمی:\s*(.*?)\s*با مبلغ', desc)
    m4 = re.search(r'به تیم (.*?) پیوست', desc)
    
    if m1 and m2:
        player_name = m1.group(1).strip()
        buyer_team_name = m2.group(1).strip()
    elif m3 and m4:
        player_name = m3.group(1).strip()
        buyer_team_name = m4.group(1).strip()
        
    if player_name and buyer_team_name:
        buyer_team = all_teams.get(buyer_team_name)
        if not buyer_team:
            continue
            
        # Find player
        p_clean = clean_name(player_name)
        p_parts = p_clean.split()
        target_player = None
        
        # Priority 1: Exact match
        for p in Player.objects.all():
            m_clean = clean_name(p.name)
            if m_clean == p_clean:
                target_player = p
                break
                
        # Priority 2: Alias match
        if not target_player:
            for p in Player.objects.all():
                m_clean = clean_name(p.name)
                if m_clean in ALIASES and p_clean in ALIASES[m_clean]:
                    target_player = p
                    break
                    
        # Priority 3: Initial + Last name match (e.g. F. Dimarco == Federico Dimarco)
        if not target_player and len(p_parts) >= 2:
            # We assume log format might be "F. Dimarco" and DB format is "Federico Dimarco"
            log_first_initial = p_parts[0][0]
            log_last_name = p_parts[-1]
            
            for p in Player.objects.all():
                db_clean = clean_name(p.name)
                db_parts = db_clean.split()
                if len(db_parts) >= 2:
                    if db_parts[0][0] == log_first_initial and db_parts[-1] == log_last_name:
                        target_player = p
                        break
        
        # Priority 4: Last name match
        if not target_player:
            for p in Player.objects.all():
                db_clean = clean_name(p.name)
                db_parts = db_clean.split()
                if p_parts[-1] == db_parts[-1]:
                    target_player = p
                    break
                    
        if target_player:
            if target_player.team != buyer_team:
                print(f"[RECOVERED] '{target_player.name}' ({player_name}) -> {buyer_team.name}")
                target_player.team = buyer_team
                target_player.save(update_fields=['team'])
                restored_count += 1
        else:
            print(f"[NOT FOUND] Could not find player matching: {player_name}")

print(f"\nTotal missing transfers recovered from text logs: {restored_count}")

from decimal import Decimal
for team in Team.objects.all():
    squad = team.players.all()
    if squad.exists():
        top_11 = sorted([p.overall for p in squad], reverse=True)[:11]
        avg_ovr = sum(top_11) / len(top_11)
        stars = round((avg_ovr - 60) / 6.0, 1)
        stars = max(1.0, min(5.0, stars))
        team.star_rating = Decimal(str(stars))
        team.save(update_fields=['star_rating'])
