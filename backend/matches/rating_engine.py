"""
rating_engine.py
Automated, position-specific player match rating engine based on eFootball PES 2021 individual statistics.
Calculates realistic match ratings clamped between 3.0 and 10.0 with 1 decimal precision.
"""
from decimal import Decimal


def calculate_player_rating(position, stats, match_context=None):
    """
    Calculates post-match performance rating (3.0 - 10.0) based on detailed PES individual statistics.

    :param position: Player primary position (e.g., 'CF', 'AMF', 'CB', 'GK')
    :param stats: dict containing individual PES stats
    :param match_context: optional dict (e.g. clean_sheet, team_won, yellow_cards, red_cards)
    :return: dict with 'rating' (float), 'rating_decimal' (Decimal), and 'breakdown' (list of factors)
    """
    if not stats or not isinstance(stats, dict):
        return {
            'rating': 6.0,
            'rating_decimal': Decimal('6.0'),
            'breakdown': [{'label': 'نمره پایه استاندارد', 'impact': '+6.0'}]
        }

    match_context = match_context or {}
    pos = str(position or 'CMF').upper().strip()
    breakdown = []

    # 1. Base rating
    rating = 6.0
    breakdown.append({'label': 'نمره پایه ورود به زمین', 'impact': '+6.0'})

    # Extract all metrics safely
    goals = int(stats.get('goals') or 0)
    penalty_goals = int(stats.get('penalty_goals') or 0)
    freekick_goals = int(stats.get('freekick_goals') or 0)
    assists = int(stats.get('assists') or 0)

    shots_total = int(stats.get('shots_total') or 0)
    shots_on_target = int(stats.get('shots_on_target') or 0)
    off_target_shots = max(0, shots_total - shots_on_target)

    passes_total = int(stats.get('passes_total') or 0)
    passes_completed = int(stats.get('passes_completed') or 0)
    crosses = int(stats.get('crosses') or 0)

    fouls = int(stats.get('fouls') or 0)
    offsides = int(stats.get('offsides') or 0)
    freekicks_won = int(stats.get('freekicks_won') or 0)
    corners = int(stats.get('corners') or 0)
    blocks = int(stats.get('blocks') or 0)
    minutes_played = int(stats.get('minutes_played') or 90)
    touches = int(stats.get('touches') or 0)
    dribble_distance = float(stats.get('dribble_distance') or 0.0)

    duels_total = int(stats.get('duels_total') or 0)
    duels_won = int(stats.get('duels_won') or 0)
    clearances = int(stats.get('clearances') or 0)

    # Goalkeeper metrics
    gk_shots_faced = int(stats.get('gk_shots_faced') or 0)
    gk_shots_on_target = int(stats.get('gk_shots_on_target') or 0)
    gk_saves = int(stats.get('gk_saves') or 0)
    goals_conceded = int(stats.get('goals_conceded') or 0)
    penalty_saves = int(stats.get('penalty_saves') or 0)

    # Match context
    clean_sheet = bool(match_context.get('clean_sheet', False))
    yellow_cards = int(match_context.get('yellow_cards') or stats.get('yellow_cards') or 0)
    red_cards = int(match_context.get('red_cards') or stats.get('red_cards') or 0)
    team_won = bool(match_context.get('team_won', False))

    # --- POSITION CATEGORIZATION ---
    is_goalkeeper = pos == 'GK'
    is_forward = pos in ['CF', 'SS', 'LWF', 'RWF']
    is_midfielder = pos in ['AMF', 'CMF', 'DMF', 'LMF', 'RMF']
    is_defender = pos in ['CB', 'LB', 'RB']

    # --- GOALKEEPER CALCULATIONS ---
    if is_goalkeeper:
        if gk_saves > 0:
            saves_bonus = round(gk_saves * 0.5, 2)
            rating += saves_bonus
            breakdown.append({'label': f'مهار شوت‌های درون چارچوب ({gk_saves} مهار)', 'impact': f'+{saves_bonus}'})

        if penalty_saves > 0:
            pk_save_bonus = round(penalty_saves * 1.5, 2)
            rating += pk_save_bonus
            breakdown.append({'label': f'مهار پنالتی حریف ({penalty_saves} مهار)', 'impact': f'+{pk_save_bonus}'})

        if gk_shots_on_target > 0:
            save_rate = gk_saves / gk_shots_on_target
            if save_rate >= 0.8:
                rating += 0.6
                breakdown.append({'label': f'درصد مهار عالی بالای ۸۰٪ ({int(save_rate*100)}%)', 'impact': '+0.6'})
            elif save_rate <= 0.4 and goals_conceded > 1:
                rating -= 0.5
                breakdown.append({'label': 'درصد مهار پایین شوت‌ها', 'impact': '-0.5'})

        if clean_sheet or goals_conceded == 0:
            rating += 0.8
            breakdown.append({'label': 'کلین‌شیت دروازه‌بان', 'impact': '+0.8'})
        elif goals_conceded > 0:
            conceded_penalty = round(goals_conceded * 0.35, 2)
            rating -= conceded_penalty
            breakdown.append({'label': f'گل خورده تیم ({goals_conceded} گل)', 'impact': f'-{conceded_penalty}'})

    # --- FORWARD CALCULATIONS ---
    elif is_forward:
        if goals > 0:
            g_bonus = round(goals * 1.0, 2)
            rating += g_bonus
            breakdown.append({'label': f'گل‌های زده در جریان بازی ({goals} گل)', 'impact': f'+{g_bonus}'})

        if freekick_goals > 0:
            fk_bonus = round(freekick_goals * 1.2, 2)
            rating += fk_bonus
            breakdown.append({'label': f'گل دیدنی از ضربه آزاد ({freekick_goals} گل)', 'impact': f'+{fk_bonus}'})

        if penalty_goals > 0:
            pkg_bonus = round(penalty_goals * 0.7, 2)
            rating += pkg_bonus
            breakdown.append({'label': f'گل پنالتی ({penalty_goals} گل)', 'impact': f'+{pkg_bonus}'})

        if assists > 0:
            a_bonus = round(assists * 0.7, 2)
            rating += a_bonus
            breakdown.append({'label': f'پاس گل تعیین‌کننده ({assists} پاس گل)', 'impact': f'+{a_bonus}'})

        if shots_on_target > 0:
            sot_bonus = round(shots_on_target * 0.2, 2)
            rating += sot_bonus
            breakdown.append({'label': f'شوت در چارچوب حریف ({shots_on_target} شوت)', 'impact': f'+{sot_bonus}'})

        if off_target_shots >= 3:
            rating -= 0.3
            breakdown.append({'label': f'شوت‌های ناموفق خارج چارچوب ({off_target_shots} شوت)', 'impact': '-0.3'})

        if dribble_distance >= 20.0:
            dribble_bonus = round(min(0.6, (dribble_distance / 30.0) * 0.3), 2)
            rating += dribble_bonus
            breakdown.append({'label': f'مسافت موثر دریبل ({dribble_distance:.1f} متر)', 'impact': f'+{dribble_bonus}'})

        if duels_won > 0:
            duel_bonus = round(min(0.5, duels_won * 0.15), 2)
            rating += duel_bonus
            breakdown.append({'label': f'نبردهای پیروز مهاجم ({duels_won} نبرد)', 'impact': f'+{duel_bonus}'})

        if offsides >= 2:
            off_penalty = round(min(0.4, offsides * 0.15), 2)
            rating -= off_penalty
            breakdown.append({'label': f'تله‌های آفساید حریف ({offsides} بار)', 'impact': f'-{off_penalty}'})

    # --- MIDFIELDER CALCULATIONS ---
    elif is_midfielder:
        if passes_total >= 5:
            pass_acc = passes_completed / passes_total
            if pass_acc >= 0.88:
                rating += 0.7
                breakdown.append({'label': f'دقت پاس عالی هافبک ({int(pass_acc*100)}%)', 'impact': '+0.7'})
            elif pass_acc >= 0.78:
                rating += 0.35
                breakdown.append({'label': f'دقت پاس استاندارد ({int(pass_acc*100)}%)', 'impact': '+0.35'})
            elif pass_acc <= 0.60:
                rating -= 0.4
                breakdown.append({'label': f'دقت پاس ضعیف ({int(pass_acc*100)}%)', 'impact': '-0.4'})

        if assists > 0:
            a_bonus = round(assists * 0.85, 2)
            rating += a_bonus
            breakdown.append({'label': f'پاس گل و گلسازی ({assists} پاس گل)', 'impact': f'+{a_bonus}'})

        if goals > 0:
            g_bonus = round(goals * 0.95, 2)
            rating += g_bonus
            breakdown.append({'label': f'گلزنی هافبک ({goals} گل)', 'impact': f'+{g_bonus}'})

        if blocks > 0:
            block_bonus = round(min(0.6, blocks * 0.3), 2)
            rating += block_bonus
            breakdown.append({'label': f'سد توپ و قطع مسیر پاس ({blocks} بار)', 'impact': f'+{block_bonus}'})

        if clearances > 0:
            clear_bonus = round(min(0.5, clearances * 0.25), 2)
            rating += clear_bonus
            breakdown.append({'label': f'دفع و بازپس‌گیری توپ ({clearances} بار)', 'impact': f'+{clear_bonus}'})

        if duels_won > 0:
            duel_bonus = round(min(0.6, duels_won * 0.2), 2)
            rating += duel_bonus
            breakdown.append({'label': f'پیروزی در دوئل‌های میانه میدان ({duels_won} نبرد)', 'impact': f'+{duel_bonus}'})

        if crosses >= 3:
            rating += 0.2
            breakdown.append({'label': f'ارسال‌های موفق سانتر ({crosses} سانتر)', 'impact': '+0.2'})

    # --- DEFENDER CALCULATIONS ---
    elif is_defender:
        if clearances > 0:
            clear_bonus = round(min(0.9, clearances * 0.35), 2)
            rating += clear_bonus
            breakdown.append({'label': f'دفع و پوشش مدافع ({clearances} دفع توپ)', 'impact': f'+{clear_bonus}'})

        if blocks > 0:
            block_bonus = round(min(0.8, blocks * 0.4), 2)
            rating += block_bonus
            breakdown.append({'label': f'سد توپ و بلاک شوت ({blocks} بار)', 'impact': f'+{block_bonus}'})

        if duels_won > 0:
            duel_bonus = round(min(0.6, duels_won * 0.2), 2)
            rating += duel_bonus
            breakdown.append({'label': f'پیروزی در نبردهای تن‌به‌تن ({duels_won} نبرد)', 'impact': f'+{duel_bonus}'})

        if duels_total > duels_won and (duels_total - duels_won) >= 3:
            rating -= 0.3
            breakdown.append({'label': 'شکست در نبردهای دفاعی', 'impact': '-0.3'})

        if clean_sheet or goals_conceded == 0:
            rating += 0.7
            breakdown.append({'label': 'کلین‌شیت خط دفاع', 'impact': '+0.7'})
        elif goals_conceded > 1:
            conceded_penalty = round(min(0.8, (goals_conceded - 1) * 0.25), 2)
            rating -= conceded_penalty
            breakdown.append({'label': f'آسیب‌پذیری خط دفاع ({goals_conceded} گل خورده)', 'impact': f'-{conceded_penalty}'})

        if goals > 0:
            g_bonus = round(goals * 1.1, 2)
            rating += g_bonus
            breakdown.append({'label': f'گلزنی درخشان مدافع ({goals} گل)', 'impact': f'+{g_bonus}'})

    # --- UNIVERSAL DISCIPLINARY & MATCH IMPACTS ---
    if fouls >= 3:
        foul_penalty = round(min(0.5, fouls * 0.1), 2)
        rating -= foul_penalty
        breakdown.append({'label': f'خطاهای مکرر بازیکن ({fouls} خطا)', 'impact': f'-{foul_penalty}'})

    if freekicks_won >= 2:
        rating += 0.2
        breakdown.append({'label': f'گرفتن ضربه آزاد خطرناک ({freekicks_won} ضربه)', 'impact': '+0.2'})

    if yellow_cards > 0:
        yc_penalty = round(yellow_cards * 0.5, 2)
        rating -= yc_penalty
        breakdown.append({'label': f'کارت زرد انضباطی ({yellow_cards} کارت)', 'impact': f'-{yc_penalty}'})

    if red_cards > 0:
        rating -= 2.0
        breakdown.append({'label': 'اخراج با کارت قرمز مستقیم', 'impact': '-2.0'})

    if team_won:
        rating += 0.2
        breakdown.append({'label': 'پیروزی نهایی تیم', 'impact': '+0.2'})

    # Minute scaling: if played less than 20 minutes, scale deviation towards 6.0
    if minutes_played < 25:
        deviation = rating - 6.0
        rating = 6.0 + (deviation * (minutes_played / 30.0))

    # Clamp rating to standard football match scale [3.0, 10.0]
    final_rating = max(3.0, min(10.0, round(rating, 1)))

    return {
        'rating': float(final_rating),
        'rating_decimal': Decimal(str(final_rating)),
        'breakdown': breakdown
    }
