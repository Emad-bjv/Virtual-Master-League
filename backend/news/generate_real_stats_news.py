"""
generate_real_stats_news.py
Builds authentic, journalistic sports news articles for VML based on real database records:
1. Big Transfer deals (from TransferHistory)
2. Gameweek 1 Heavyweight Match Preview (from Match)
3. League Financial Ranking & Club Wealth Report (from Team budgets)
4. Golden Generation & Top Player Ratings Spotlight (from Player ratings)
5. Official League Kickoff & Referee Instructions (from League fixtures)
"""

import os
import sys
import django
import random
import hashlib
from decimal import Decimal

# Setup django environment if run directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from news.models import LeagueNews
from news.news_engine import compute_event_hash, backfill_historical_news
from teams.models import Team, Player, ClubPenalty
from matches.models import Match
from transfers.models import TransferHistory


def generate_upcoming_fixture_news():
    """Generates preview news for the top upcoming scheduled match in Gameweek 1."""
    match = Match.objects.filter(status__in=['SCHEDULED', 'TIMED']).order_by('id').first()
    if not match:
        return None

    home_name = match.home_team.name
    away_name = match.away_team.name
    round_label = match.round_name or "هفته اول لیگ"
    event_hash = compute_event_hash('preview_match', match.id, f"{match.home_team_id}_{match.away_team_id}")

    existing = LeagueNews.objects.filter(event_hash=event_hash).first()
    if existing:
        return existing

    home_manager = getattr(match.home_team.manager, 'username', 'کادر فنی') if match.home_team.manager else 'سرمربی'
    away_manager = getattr(match.away_team.manager, 'username', 'کادر فنی') if match.away_team.manager else 'سرمربی'

    title = f"⚽ پیش‌بازی فوق‌العاده حساس {round_label} | تقابل بزرگ {home_name} و {away_name}"
    subtitle = f"نبرد تاکتیکی مربیان • ورزشگاه مرکزی VML • پخش مستقیم زنده"
    summary = f"در یکی از هیجان‌انگیزترین دیدارهای {round_label}، تیم‌های مدعی {home_name} و {away_name} برای کسب نخستین ۳ امتیاز حیاتی فصل به مصاف یکدیگر خواهند رفت."
    content = f"""سوت آغاز رقابت‌های {round_label} با یک ابرنبرد جذاب میان دو غول مستر لیگ به صدا درخواهد آمد؛ دیداری که کارشناسان آن را آزمون واقعی آمادگی پیش‌فصل دو تیم می‌دانند.

باشگاه {home_name} با بهره‌گیری از امتیاز میزبانی و هدایت {home_manager}، با ترکیب تهاجمی پای به میدان می‌گذارد تا با برتری در نبردهای میانه زمین، حریف سرسخت خود را زمین‌گیر کند. در سوی مقابل، {away_name} تحت رهبری {away_manager} با استراتژی فشرده و استفاده از ضدحملات برق‌آسا به دنبال غافلگیری میزبان است.

کمیته داوران و انضباطی لیگ یادآور شده است که مهلت نهایی تایید و ثبت ترکیب اصلی و نیمکت ذخیره‌ها حداکثر ۳۰ دقیقه پیش از سوت بازی خواهد بود. این مسابقه به صورت کامل و اختصاصی از شبکه پخش زنده VML استریم خواهد شد."""

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='MATCH',
        summary=summary,
        content=content,
        image_url='/images/vml_hero_banner.webp',
        source_event_type='match_preview',
        source_event_id=str(match.id),
        event_hash=event_hash,
        related_match=match,
        related_team=match.home_team,
        is_published=True,
        is_pinned=True,
        views_count=random.randint(15, 35),
        reactions_count={'fire': random.randint(10, 25), 'heart': random.randint(8, 20), 'clap': random.randint(5, 15)}
    )
    return news


def generate_financial_report_news():
    """Generates a financial analysis report based on real club budgets in Team."""
    teams = Team.objects.order_by('-budget')[:5]
    if not teams:
        return None

    top_team = teams[0]
    total_league_wealth = sum(t.budget for t in Team.objects.all())
    formatted_total = f"{int(total_league_wealth):,} $"
    event_hash = compute_event_hash('financial_report', 'season_1_budgets')

    existing = LeagueNews.objects.filter(event_hash=event_hash).first()
    if existing:
        return existing

    lines = []
    for idx, t in enumerate(teams, 1):
        manager_str = f" (سرمربی: {t.manager.username})" if t.manager else ""
        lines.append(f"{idx}. {t.name}{manager_str}: بودجه {int(t.budget):,} $ • موجودی جم: {t.gems} 💎")
    rankings_text = "\n".join(lines)

    title = f"💰 گزارش ویژه اقتصادی VML | پرده‌برداری از ثروتمندترین باشگاه‌ها و نقدینگی فصل جدید"
    subtitle = f"ارزش کل خزانه‌های لیگ: بیش از {formatted_total} • {top_team.name} صدرنشین جدول ثروت"
    summary = f"دپارتمان مالی لیگ مستر مجازی گزارش رسمی تراز مالی باشگاه‌ها را منتشر کرد؛ {top_team.name} با در اختیار داشتن بالاترین بودجه نقدی، قدرتمندترین خزانه نقل‌وانتقالاتی را به خود اختصاص داد."
    content = f"""با آغاز ماراتن فصل جدید مسابقات مستر لیگ، رقابت در بازار نقل‌وانتقالات و توسعه زیرساخت‌های باشگاهی وارد مرحله‌ای تاریخی شده است. بررسی داده‌های رسمی نشان می‌دهد که مجموع دارایی‌های نقدی باشگاه‌های حاضر در لیگ از مرز {formatted_total} عبور کرده است.

بر اساس جدول رسمی ارزش‌گذاری مالی باشگاه‌ها:
{rankings_text}

کارشناسان اقتصادی VML معتقدند باشگاه‌هایی که هوشمندانه‌تر میان خرید ستاره‌های بزرگ، تمدید قراردادها و تقویت امکانات باشگاهی توازن ایجاد کنند، بخت نخست تصاحب جام قهرمانی خواهند بود. پنجره نقل‌وانتقالات همچنان برای جذب ستاره‌های آزاد و بازیکنان مطرح باز است."""

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='GENERAL',
        summary=summary,
        content=content,
        image_url='/images/vml_news_trophy.webp',
        source_event_type='financial_report',
        source_event_id='season_1_budgets',
        event_hash=event_hash,
        related_team=top_team,
        is_published=True,
        is_pinned=True,
        views_count=random.randint(20, 45),
        reactions_count={'like': random.randint(12, 28), 'fire': random.randint(8, 22), 'mindblown': random.randint(5, 14)}
    )
    return news


def generate_top_players_spotlight():
    """Generates a spotlight report on the top rated players in the league."""
    top_players = Player.objects.order_by('-overall')[:5]
    if not top_players:
        return None

    top_star = top_players[0]
    event_hash = compute_event_hash('player_spotlight', 'top_ratings_season_1')

    existing = LeagueNews.objects.filter(event_hash=event_hash).first()
    if existing:
        return existing

    lines = []
    for idx, p in enumerate(top_players, 1):
        team_str = p.team.name if p.team else 'بازیکن آزاد (Free Agent)'
        lines.append(f"⭐ رتبه {idx} | {p.name} — اورال: {p.overall} (پست {p.position}) — تیم: {team_str}")
    ranking_list = "\n".join(lines)

    title = f"🌟 کهکشان ستارگان VML | رده‌بندی مرگبارترین مهره‌ها و مدعیان جایزه توپ طلا"
    subtitle = f"اسطوره‌ها در اوج درخشش • {top_star.name} با اورال خیره‌کننده {top_star.overall} در صدر فهرست"
    summary = f"جدول بالاترین نمرات کلی (OVR) بازیکنان حاضر در لیگ منتشر شد؛ رقابتی شانه به شانه میان نوابغ مستر لیگ برای ربودن عنوان برترین بازیکن فصل (MVP)."
    content = f"""با آغاز رقابت‌های این فصل، نگاه تمامی هواداران فوتبال و مربیان مستر لیگ به ساق پای بازیکنان تعیین‌کننده دوخته شده است. تجزیه و تحلیل سیستم داده‌کاوی لیگ نشان می‌دهد که سطح فنی و تکنیکی تیم‌ها در فصل جاری به اوج شکوه خود رسیده است.

پنج ستاره برتر با بالاترین نمرات در دیتابیس رسمی VML:
{ranking_list}

حضور این ابرستاره‌ها نه تنها جذابیت تاکتیکی بازی‌ها را دوچندان کرده، بلکه سیستم امتیازدهی پس از مسابقه (Player Ratings) نیز عملکرد لحظه به لحظه هر یک از آنان را بر اساس پاس گل، ضربات در چارچوب و دریبل‌های موفق رصد و ثبت خواهد کرد."""

    photo_url = top_star.custom_photo.url if top_star.custom_photo else '/images/vml_news_messi.webp'

    news = LeagueNews.objects.create(
        title=title,
        subtitle=subtitle,
        category='GENERAL',
        summary=summary,
        content=content,
        image_url=photo_url,
        source_event_type='player_spotlight',
        source_event_id='top_ratings_season_1',
        event_hash=event_hash,
        related_player=top_star,
        related_team=top_star.team,
        is_published=True,
        is_pinned=False,
        views_count=random.randint(30, 60),
        reactions_count={'fire': random.randint(15, 30), 'heart': random.randint(12, 25), 'clap': random.randint(8, 18)}
    )
    return news


def run_full_generation():
    """Runs backfill of existing database events plus fixture and financial news."""
    print("1. Running historical backfill (transfers, matches, disciplinary)...")
    bf_count = backfill_historical_news(limit=25)
    print(f"   Backfilled {bf_count} articles from existing events.")

    print("2. Generating upcoming fixture preview news...")
    f_news = generate_upcoming_fixture_news()
    if f_news:
        print(f"   Generated fixture preview: {f_news.title[:50]}...")
    else:
        print("   Fixture preview news already exists or no matches found.")

    print("3. Generating league financial report news...")
    fin_news = generate_financial_report_news()
    if fin_news:
        print(f"   Generated financial report: {fin_news.title[:50]}...")
    else:
        print("   Financial report already exists or no teams found.")

    print("4. Generating top players spotlight news...")
    star_news = generate_top_players_spotlight()
    if star_news:
        print(f"   Generated player spotlight: {star_news.title[:50]}...")
    else:
        print("   Player spotlight already exists or no players found.")

    total_news = LeagueNews.objects.count()
    print(f"\nSUCCESS! Total published news articles in database: {total_news}")


if __name__ == '__main__':
    run_full_generation()
