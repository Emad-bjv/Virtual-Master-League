"""
news_engine.py
Automated journalistic sports news generator for Virtual Master League (VML).
Generates authentic, database-driven, non-duplicate news articles with dynamic templates.
"""

import hashlib
import random
from decimal import Decimal
from django.utils import timezone


def compute_event_hash(event_type, source_id, extra_key=''):
    """Generates an immutable SHA-256 hash to prevent duplicate news generation."""
    raw = f"{event_type}:{source_id}:{extra_key}".strip().lower()
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def generate_transfer_news(transfer_record, is_history=True):
    """
    Generates breaking transfer news from a TransferHistory or accepted TransferOffer.
    """
    from news.models import LeagueNews

    if not transfer_record:
        return None

    player = transfer_record.player if hasattr(transfer_record, 'player') else getattr(transfer_record, 'target_player', None)
    seller_team = getattr(transfer_record, 'seller_team', None) or getattr(transfer_record, 'receiver_team', None)
    buyer_team = getattr(transfer_record, 'buyer_team', None) or getattr(transfer_record, 'sender_team', None)

    if not player or not buyer_team:
        return None

    player_name = player.name
    buyer_name = buyer_team.name
    seller_name = seller_team.name if seller_team else 'بازیکن آزاد (Free Agent)'
    price = getattr(transfer_record, 'price_usd', None) or getattr(transfer_record, 'cash_amount', None) or 0
    price_formatted = f"{int(price):,} $" if price else "مبلغ توافقی"
    rec_id = transfer_record.id

    event_hash = compute_event_hash('transfer', rec_id, f"{player.id}_{buyer_team.id}")
    if LeagueNews.objects.filter(event_hash=event_hash).exists():
        return None

    # Journalistic headline variants (Fabrizio Romano & sports press style)
    headlines = [
        f"🚨 رسمی و قطعی | بمب نقل‌وانتقالات منفجر شد: {player_name} رسماً به {buyer_name} پیوست!",
        f"⚡ قرارداد امضا شد! پایان ماراتن مذاکرات بر سر {player_name}؛ مقصد نهایی: {buyer_name}",
        f"🔥 صید بزرگ {buyer_name} در پنجره نقل‌وانتقالات؛ {player_name} پیراهن باشگاه را بر تن کرد",
        f"🤝 توافق نهایی و تاریخی | انتقال هیجان‌انگیز {player_name} از {seller_name} به {buyer_name} با {price_formatted}",
        f"🌟 شکار ستاره در مستر لیگ | {buyer_name} با جذب {player_name} خطوط تیمی خود را کهکشانی کرد!",
    ]
    title = random.choice(headlines)

    subtitle = f"ارزش معامله: {price_formatted} • پست: {player.position} (اورال {player.overall})"

    summaries = [
        f"پس از مذاکرات فشرده در پنجره نقل‌وانتقالات، سرانجام باشگاه {buyer_name} موفق شد با رقم {price_formatted} رضایت‌نامه {player_name} را قطعی کند.",
        f"مدیران باشگاه {buyer_name} خرید بزرگ فصل خود را رونمایی کردند؛ {player_name} ستاره پست {player.position} با قراردادی رسمی به این تیم ملحق شد.",
        f"در یکی از مهم‌ترین انتقالات فصل مستر لیگ، {player_name} از {seller_name} جدا شده و از این پس برای {buyer_name} به میدان خواهد رفت.",
    ]
    summary = random.choice(summaries)

    content_templates = [
        f"""طبق اعلام رسمی اتاق خبر و مرکز نقل‌وانتقالات مستر لیگ (VML)، پروسه انتقال {player_name} به باشگاه {buyer_name} با موفقیت خاتمه یافت و کلیه تاییدیه‌های مالی و فدراسیونی صادر گردید.

این بازیکن با اورال قدرتمند {player.overall} و سن {player.age} سال در پست تخصصی {player.position} بازی می‌کند و کارشناسان فنی لیگ، جذب او را یکی از هوشمندانه‌ترین اقدامات تاکتیکی {buyer_name} برای فصل جاری توصیف کرده‌اند.

ارزش رسمی این قرارداد معادل {price_formatted} به ثبت رسیده و باشگاه {seller_name} نیز با تایید این معامله، برای این ستاره در ادامه مسیر حرفه‌ای آرزوی موفقیت نمود. انتظار می‌رود هواداران {buyer_name} استقبال پرشوری از ورود این مهره ارزشمند به ترکیب تیم خود داشته باشند.""",

        f"""ساعاتی پیش دفتر نقل‌وانتقالات مجازی VML شاهد امضای رسمی اسناد قرارداد میان نمایندگان {buyer_name} و {seller_name} بود که طی آن، {player_name} به عنوان خرید راهبردی جدید این باشگاه معرفی شد.

{player_name} که در زمره بازیکنان برجسته لیگ با اورال {player.overall} قرار دارد، قرار است کمربند پست {player.position} تیم جدیدش را مستحکم کند. سرمربی {buyer_name} در گفتگوهای اولیه با کادر فنی ابراز امیدواری کرده که حضور این ستاره بتواند شانس تیم را در رقابت‌های لیگ و جام حذفی به طور چشمگیری افزایش دهد.

رقم نهایی توافق شده در سامانه مرکزی مسابقات معادل {price_formatted} ثبت شده و کارت بازی این بازیکن برای دیدار آتی به طور فوری صادر گردیده است."""
    ]
    content = random.choice(content_templates)

    # Determine best featured image
    image_url = ''
    if player.custom_photo and hasattr(player.custom_photo, 'url'):
        try:
            image_url = player.custom_photo.url
        except Exception:
            image_url = ''
    if not image_url and buyer_team.logo:
        image_url = str(buyer_team.logo)
    if not image_url:
        image_url = '/images/vml_news_messi.webp'

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='TRANSFER',
        summary=summary,
        content=content,
        image_url=image_url,
        source_event_type='transfer',
        source_event_id=str(rec_id),
        event_hash=event_hash,
        related_player=player,
        related_team=buyer_team,
        is_published=True,
        reactions_count={'fire': random.randint(3, 12), 'heart': random.randint(2, 9), 'clap': random.randint(1, 7)}
    )
    return news


def generate_match_news(match):
    """
    Generates dynamic post-match analytical and headline news based on actual match scores and ratings.
    """
    from news.models import LeagueNews

    if not match or match.status != 'FINISHED':
        return None

    home = match.home_team
    away = match.away_team
    h_score = match.home_score
    a_score = match.away_score
    round_label = match.round_name or f"هفته {match.id}"

    event_hash = compute_event_hash('match_result', match.id)
    if LeagueNews.objects.filter(event_hash=event_hash).exists():
        return None

    # Analyze match outcome
    is_draw = h_score == a_score
    home_won = h_score > a_score
    winner = home if home_won else away
    loser = away if home_won else home
    diff = abs(h_score - a_score)

    # Find MOTM / top rated player from stats
    best_stat = match.player_stats.select_related('player', 'player__team').order_by('-rating').first()
    motm_name = best_stat.player.name if best_stat and best_stat.player else None
    motm_rating = float(best_stat.rating) if best_stat and best_stat.rating else None

    # Count total goals
    total_goals = h_score + a_score

    # Choose narrative angle
    if is_draw:
        if total_goals >= 4:
            title = f"⚔️ جنگ تمام‌عیار در {round_label} | جشنواره گل و تساوی پرهیجان {home.name} و {away.name} ({h_score}-{a_score})!"
        else:
            title = f"🤝 تقسیم امتیازات در دیداری نفس‌گیر | تقابل تاکتیکی {home.name} و {away.name} با تساوی {h_score}-{a_score} خاتمه یافت"
        summary = f"نبرد دو تیم {home.name} و {away.name} پس از ۹۰ دقیقه تلاش فشرده با تساوی {h_score} بر {a_score} به پایان رسید تا هر دو تیم با یک امتیاز میدان را ترک کنند."
    elif diff >= 3:
        title = f"🔥 آتش‌بازی و برتری قاطع | تحقیر حریف توسط {winner.name} با پیروزی مقتدرانه {h_score}-{a_score}!"
        summary = f"شاگردان {winner.name} در شبی فراموش‌نشدنی موفق شدند با نتیجه پرگل {h_score} بر {a_score} از سد {loser.name} بگذرند و قدرت هجومی خود را به رخ رقبا بکشند."
    elif diff == 1 and total_goals >= 3:
        title = f"⚡ پیروزی میلی‌متری و هیجان در واپسین دقایق | برتری دیدنی {winner.name} مقابل {loser.name} ({h_score}-{a_score})"
        summary = f"در یکی از تماشایی‌ترین تقابل‌های {round_label}، تیم {winner.name} توانست با نتیجه نزدیک {h_score} بر {a_score} دست پر از زمین خارج شود."
    else:
        title = f"🏆 ۳ امتیاز ارزشمند برای {winner.name} | غلبه تاکتیکی بر {loser.name} با حساب {h_score} به {a_score}"
        summary = f"دیدار تیم‌های {home.name} و {away.name} در چارچوب {round_label} با پیروزی {h_score}-{a_score} به سود {winner.name} به پایان رسید."

    subtitle = f"نتیجه نهایی: {h_score} - {a_score} • {round_label}"
    if motm_name and motm_rating:
        subtitle += f" • ستاره میدان: {motm_name} (نمره {motm_rating:.1f})"

    motm_paragraph = ""
    if motm_name and motm_rating:
        motm_paragraph = f"\n\nدر پایان این مسابقه، هیئت داوران و سیستم هوشمند PES، {motm_name} را با نمره استثنایی {motm_rating:.1f} از ۱۰ به عنوان ستاره بلامنازع و بهترین بازیکن میدان (MOTM) برگزیدند."

    content = f"""سوت پایان دیدار حساس میان {home.name} و {away.name} در چارچوب رقابت‌های {round_label} مستر لیگ به صدا درآمد و تماشاگران شاهد تقابلی جذاب با نتیجه نهایی {h_score} بر {a_score} بودند.

در این نبرد تاکتیکی، خطوط مختلف بازی نمایش متفاوتی را ارائه دادند. عملکرد کادر فنی {winner.name if not is_draw else home.name} در مدیریت تعویض‌ها و پیاده‌سازی پرس از بالا نقشی محوری در کسب این نتیجه ایفا نمود.{motm_paragraph}

با احتساب نتیجه این پیکار، جایگاه دو تیم در جدول رده‌بندی مسابقات دستخوش تغییرات مهمی گردید و کارشناسان معتقدند این مسابقه می‌تواند نقطه عطفی در سرنوشت قهرمانی این فصل باشد."""

    image_url = ''
    if best_stat and best_stat.player and best_stat.player.custom_photo and hasattr(best_stat.player.custom_photo, 'url'):
        try:
            image_url = best_stat.player.custom_photo.url
        except Exception:
            image_url = ''
    if not image_url and winner.logo:
        image_url = str(winner.logo)
    if not image_url:
        image_url = '/images/vml_news_trophy.webp'

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='MATCH',
        summary=summary,
        content=content,
        image_url=image_url,
        source_event_type='match_result',
        source_event_id=str(match.id),
        event_hash=event_hash,
        related_match=match,
        related_team=winner if not is_draw else home,
        related_player=best_stat.player if best_stat else None,
        is_published=True,
        reactions_count={'fire': random.randint(4, 15), 'like': random.randint(5, 18), 'clap': random.randint(2, 10)}
    )
    return news


def generate_disciplinary_news(penalty):
    """
    Generates official disciplinary news release from a DisciplinaryPenalty record.
    """
    from news.models import LeagueNews

    if not penalty or not penalty.publish_to_newsroom:
        return None

    team = penalty.team
    team_name = team.name if team else 'یکی از باشگاه‌ها'
    p_id = penalty.id

    event_hash = compute_event_hash('disciplinary', p_id)
    if LeagueNews.objects.filter(event_hash=event_hash).exists():
        return None

    fine_amount = f"{int(penalty.fine_budget_usd):,} $" if getattr(penalty, 'fine_budget_usd', 0) else ""
    pts_deducted = f"{penalty.points_deduction} امتیاز کسر امتیاز" if getattr(penalty, 'points_deduction', 0) else ""
    ban_days = f"{penalty.transfer_ban_days} روز محرومیت نقل‌وانتقالات" if getattr(penalty, 'transfer_ban_days', 0) else ""
    sanctions_desc = " و ".join(filter(None, [fine_amount, pts_deducted, ban_days])) or "اخطار و توبیخ کتبی"

    case_num = getattr(penalty, 'case_number', None) or f"#{p_id}"
    title = f"⚖️ بیانیه فوری کمیته انضباطی لیگ | اعمال جرایم بازدارنده برای باشگاه {team_name}"
    subtitle = f"محکومیت انضباطی: {sanctions_desc} • پرونده {case_num}"
    summary = f"کمیته اخلاق و انضباطی مسابقات مستر لیگ، در حکمی قاطع باشگاه {team_name} را به دلیل {penalty.title or 'تخلفات مقرراتی'} مورد جریمه قرار داد."

    content = f"""کمیته انضباطی و نظارت بر مسابقات لیگ مستر مجازی (VML)، پس از تشکیل جلسه فوق‌العاده و بررسی اسناد و گزارش‌های ثبت‌شده، حکم رسمی پرونده {case_num} را به شرح ذیل صادر نمود:

باشگاه {team_name} به موجب نقض مقررات رقابت‌ها در خصوص «{penalty.title}» و مستند به آیین‌نامه انضباطی لیگ، به موارد زیر محکوم گردید:
- عنوان تخلف: {penalty.title}
- شرح پرونده: {getattr(penalty, 'reason', '') or getattr(penalty, 'official_verdict_text', '') or 'عدم رعایت ضوابط رسمی مسابقات'}
- تنبیهات تعیین‌شده: {sanctions_desc}

فدراسیون مستر لیگ بار دیگر تاکید می‌کند رعایت اصول بازی جوانمردانه (Fair Play)، مدیریت حساب‌های مالی و انضباط در تعاملات تیمی خط قرمز مسابقات بوده و در صورت تکرار تخلفات، مجازات‌های سنگین‌تری از جمله محرومیت‌های گسترده اعمال خواهد شد."""

    image_url = str(team.logo) if team and team.logo else '/images/vml_news_tactics.webp'

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='DISCIPLINARY',
        summary=summary,
        content=content,
        image_url=image_url,
        source_event_type='disciplinary',
        source_event_id=str(p_id),
        event_hash=event_hash,
        related_team=team,
        is_published=True,
        reactions_count={'mindblown': random.randint(2, 8), 'like': random.randint(1, 5)}
    )
    return news


def generate_coach_news(coach_name, team):
    """
    Generates news when a coach takes charge of a team.
    """
    from news.models import LeagueNews

    if not coach_name or not team:
        return None

    event_hash = compute_event_hash('coach_appointment', team.id, coach_name)
    if LeagueNews.objects.filter(event_hash=event_hash).exists():
        return None

    title = f"🎙️ کنفرانس خبری معارفه | {coach_name} رسماً هدایت باشگاه {team.name} را بر عهده گرفت!"
    subtitle = f"سرمربی جدید {team.name} با اهداف قهرمانی معرفی شد"
    summary = f"با امضای رسمی قرارداد، {coach_name} به عنوان سکاندار جدید نیمکت {team.name} معرفی شد و مأموریت خود را در رقابت‌های لیگ مستر آغاز نمود."

    content = f"""باشگاه {team.name} با برگزاری نشست خبری رسمی، از سرمربی جدید خود {coach_name} رونمایی کرد. مدیران باشگاه پس از بررسی چند گزینه شاخص، سکان هدایت فنی تیم را به این مربی واگذار کردند.

{coach_name} در نخستین مصاحبه رسمی خود با رسانه لیگ گفت: «از حضور در باشگاه بزرگ {team.name} بسیار خرسندم. برنامه ما پیاده‌سازی فوتبالی مدرن، جذاب و نتیجه‌بخش است و با حمایت مربیان و بازیکنان برای کسب بالاترین عناوین خواهیم جنگید.»

کادر فنی جدید بلافاصله نظارت بر ترکیب تیم و چینش تاکتیکی بازیکنان را آغاز نموده و تمرینات برای مصاف بعدی مسابقات طبق برنامه پیگیری خواهد شد."""

    image_url = str(team.logo) if team and team.logo else '/images/vml_news_tactics.webp'

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='COACH',
        summary=summary,
        content=content,
        image_url=image_url,
        source_event_type='coach_appointment',
        source_event_id=f"{team.id}_{coach_name}",
        event_hash=event_hash,
        related_team=team,
        is_published=True,
        reactions_count={'heart': random.randint(3, 10), 'clap': random.randint(4, 12)}
    )
    return news


def backfill_historical_news(limit=25):
    """
    Scans the database for recent finished matches, transfers, and penalties to generate
    an initial rich, authentic newsroom feed from real historical data.
    """
    from matches.models import Match
    from transfers.models import TransferHistory, TransferOffer
    from teams.models import ClubPenalty

    created_count = 0

    # 1. Matches backfill (most recent finished matches)
    recent_matches = Match.objects.filter(status='FINISHED').order_by('-id')[:limit]
    for m in recent_matches:
        news = generate_match_news(m)
        if news:
            created_count += 1

    # 2. Transfers backfill (TransferHistory or accepted TransferOffer)
    recent_transfers = TransferHistory.objects.order_by('-id')[:limit]
    for t in recent_transfers:
        news = generate_transfer_news(t, is_history=True)
        if news:
            created_count += 1

    accepted_offers = TransferOffer.objects.filter(status='ACCEPTED').order_by('-id')[:limit]
    for o in accepted_offers:
        news = generate_transfer_news(o, is_history=False)
        if news:
            created_count += 1

    # 3. Disciplinary penalties backfill
    recent_penalties = ClubPenalty.objects.filter(publish_to_newsroom=True).order_by('-id')[:limit]
    for p in recent_penalties:
        news = generate_disciplinary_news(p)
        if news:
            created_count += 1

    return created_count
