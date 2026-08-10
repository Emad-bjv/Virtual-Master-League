# Tier 2 Implementation Plan — مستر لیگ مجازی
### تسک هفتگی + Season Pass، اجرای قوانین ناقص، Audit Log، Rate Limiting گسترده، پاکسازی، i18n، تست Integration، مانیتورینگ

پیش‌نیاز: Tier 0 و Tier 1 کامل شده باشند (خصوصاً بخش ۸ Tier 1 برای نرخ جم، چون Season Pass مستقیماً روی آن سوار می‌شود).

موارد این سند: **#۱۵، #۱۶، #۱۷، #۱۸، #۱۹، #۲۰، #۲۱، #۲۲، #۲۳**

ترتیب اجرا: بیشتر این موارد **مستقل از هم** هستند و می‌توانند کاملاً موازی اجرا شوند؛ فقط #۱۵ به Tier1/#۸ وابسته است. نمودار وابستگی در انتهای سند.

---

## بخش ۱۵: تسک هفتگی + Season Pass + پاداش لجند

### مدل‌ها
```python
# backend/season_pass/models.py  (اپ جدید)

from django.db import models
from teams.models import Team

class WeeklyTask(models.Model):
    TASK_TYPES = [
        ('WIN_MATCHES', 'برد در N بازی'),
        ('SCORE_GOALS', 'گلزنی'),
        ('SUBMIT_LINEUP', 'ثبت ترکیب به‌موقع'),
        ('OPEN_PACKS', 'باز کردن پک'),
        ('CLEAN_SHEETS', 'کلین‌شیت'),
    ]
    title = models.CharField(max_length=100, verbose_name="عنوان تسک")
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    target_value = models.PositiveIntegerField(verbose_name="هدف عددی")
    reward_xp = models.PositiveIntegerField(default=50, verbose_name="امتیاز XP پاس فصلی")
    week_number = models.PositiveIntegerField(verbose_name="شماره هفته فعال‌بودن")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "تسک هفتگی"


class TeamTaskProgress(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='task_progress')
    task = models.ForeignKey(WeeklyTask, on_delete=models.CASCADE)
    current_value = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    is_claimed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('team', 'task')


class SeasonPassLevel(models.Model):
    """تعریف جدول پاداش هر سطح — یک بار توسط ادمین ست می‌شود."""
    level = models.PositiveIntegerField(unique=True)
    xp_required = models.PositiveIntegerField()
    free_reward_gems = models.PositiveIntegerField(default=0)
    vip_reward_gems = models.PositiveIntegerField(default=0)
    vip_reward_player_rarity = models.CharField(max_length=20, blank=True)  # فقط سطح آخر: 'LEGENDARY'
    is_final_level = models.BooleanField(default=False)


class TeamSeasonPass(models.Model):
    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name='season_pass')
    current_xp = models.PositiveIntegerField(default=0)
    current_level = models.PositiveIntegerField(default=1)
    is_vip = models.BooleanField(default=False)
    claimed_levels = models.JSONField(default=list)
```

### Service Layer
```python
# season_pass/services.py

from django.db import transaction
from .models import TeamTaskProgress, TeamSeasonPass, SeasonPassLevel

def increment_task_progress(team, task_type: str, amount: int = 1):
    """
    صدا زده می‌شود از:
    - matches/tasks.py بعد از پایان بازی (WIN_MATCHES, SCORE_GOALS, CLEAN_SHEETS)
    - teams/views.py submit_gameplan (SUBMIT_LINEUP)
    - gacha/services.py open_gacha_pack (OPEN_PACKS)
    """
    active_tasks = TeamTaskProgress.objects.filter(
        team=team, task__task_type=task_type, task__is_active=True, is_completed=False
    ).select_related('task')

    for progress in active_tasks:
        progress.current_value += amount
        if progress.current_value >= progress.task.target_value:
            progress.is_completed = True
        progress.save()


def claim_task_reward(team, task_progress_id: int) -> dict:
    with transaction.atomic():
        progress = TeamTaskProgress.objects.select_for_update().get(id=task_progress_id, team=team)
        if not progress.is_completed:
            return {'success': False, 'error': 'تسک هنوز کامل نشده است.'}
        if progress.is_claimed:
            return {'success': False, 'error': 'قبلاً دریافت شده است.'}

        progress.is_claimed = True
        progress.save(update_fields=['is_claimed'])

        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        pass_obj.current_xp += progress.task.reward_xp
        _recalculate_level(pass_obj)
        pass_obj.save()

        return {'success': True, 'new_xp': pass_obj.current_xp, 'new_level': pass_obj.current_level}


def _recalculate_level(pass_obj: TeamSeasonPass):
    eligible_level = SeasonPassLevel.objects.filter(
        xp_required__lte=pass_obj.current_xp
    ).order_by('-level').first()
    if eligible_level:
        pass_obj.current_level = eligible_level.level


def claim_level_reward(team, level: int) -> dict:
    """دریافت جایزه‌ی یک سطح خاص (رایگان یا VIP)."""
    from economy.services import process_gems_update
    from gacha.services import generate_random_player

    with transaction.atomic():
        pass_obj = TeamSeasonPass.objects.select_for_update().get(team=team)
        if level > pass_obj.current_level:
            return {'success': False, 'error': 'هنوز به این سطح نرسیده‌اید.'}
        if level in pass_obj.claimed_levels:
            return {'success': False, 'error': 'قبلاً دریافت شده است.'}

        level_def = SeasonPassLevel.objects.get(level=level)

        if level_def.free_reward_gems:
            process_gems_update(team.id, level_def.free_reward_gems, 'PRIZE', f"پاداش سطح {level} پاس فصلی")

        if pass_obj.is_vip and level_def.vip_reward_gems:
            process_gems_update(team.id, level_def.vip_reward_gems, 'PRIZE', f"پاداش VIP سطح {level}")

        if level_def.is_final_level and pass_obj.is_vip and level_def.vip_reward_player_rarity:
            player = generate_random_player(level_def.vip_reward_player_rarity, team)
            pass_obj.claimed_levels.append(level)
            pass_obj.save(update_fields=['claimed_levels'])
            return {'success': True, 'legendary_player': player.name}

        pass_obj.claimed_levels.append(level)
        pass_obj.save(update_fields=['claimed_levels'])
        return {'success': True}
```

### Celery Beat برای ریست هفتگی
```python
# season_pass/tasks.py
@shared_task(name='season_pass.reset_weekly_tasks')
def reset_weekly_tasks(week_number: int):
    from .models import WeeklyTask, TeamTaskProgress
    from teams.models import Team

    WeeklyTask.objects.filter(week_number__lt=week_number).update(is_active=False)
    active_tasks = WeeklyTask.objects.filter(week_number=week_number, is_active=True)
    for team in Team.objects.all():
        for task in active_tasks:
            TeamTaskProgress.objects.get_or_create(team=team, task=task)
```
```python
# config/settings.py — افزودن به CELERY_BEAT_SCHEDULE
'weekly-task-reset': {
    'task': 'season_pass.reset_weekly_tasks',
    'schedule': crontab(day_of_week=6, hour=0, minute=0),  # هر شنبه نیمه‌شب
}
```

### چک‌لیست Self-Test
- [ ] تکمیل یک تسک نباید خودکار XP بدهد؛ فقط بعد از `claim` صریح مربی
- [ ] رسیدن به سطح آخر بدون VIP نباید بازیکن لجند بدهد
- [ ] ریست هفتگی نباید progress هفته‌های قبل را پاک کند (باید آرشیو شود، نه حذف)

---

## بخش ۱۶: اجرای قوانین ناقص (محرومیت، Wage Cap، فارغ‌التحصیلی آکادمی)

### الف) محرومیت (Suspension)
مشکل: `Player.suspension_matches` و `yellow_card_accumulator` تعریف شده‌اند ولی هیچ‌جا چک نمی‌شوند.

```python
# teams/serializers.py — GamePlanUpdateSerializer.validate اضافه شود

def validate(self, data):
    if data.get('is_starting'):
        player = Player.objects.get(id=data['player_id'])
        if player.suspension_matches > 0:
            raise serializers.ValidationError(
                f"بازیکن {player.name} به دلیل محرومیت ({player.suspension_matches} بازی باقی‌مانده) نمی‌تواند در ترکیب باشد."
            )
        # ... چک‌های موجود stamina/injury
    return data
```

```python
# matches/tasks.py — بعد از پایان هر بازی

@shared_task(name='matches.process_disciplinary_actions')
def task_process_disciplinary_actions(match_id: int):
    from teams.models import Player
    from matches.models import Match, MatchEvent

    match = Match.objects.get(id=match_id)
    yellow_events = MatchEvent.objects.filter(match=match, event_type='YELLOW')
    red_events = MatchEvent.objects.filter(match=match, event_type='RED')

    for event in yellow_events:
        player = event.player
        player.yellow_card_accumulator += 1
        if player.yellow_card_accumulator >= 3:  # قانون: ۳ زرد تجمیعی = ۱ بازی محرومیت
            player.suspension_matches += 1
            player.yellow_card_accumulator = 0
        player.save(update_fields=['yellow_card_accumulator', 'suspension_matches'])

    for event in red_events:
        player = event.player
        player.suspension_matches += 2  # قانون: قرمز مستقیم = ۲ بازی محرومیت
        player.save(update_fields=['suspension_matches'])
```
> نکته‌ی طراحی: کاهش محرومیت باید فقط وقتی اتفاق بیفتد که بازیکن به‌خاطر محرومیت (نه مصدومیت یا انتخاب مربی) غایب بوده. پیشنهاد: یک Celery task هفتگی جدا که فقط بازیکنان `suspension_matches > 0` را که در ترکیب هفته‌ی جاری نبوده‌اند decrement کند.

### ب) Wage Cap
مشکل: `Team.wage_cap` و `Player.wage` تعریف شده‌اند ولی در نقل‌وانتقال یا گاچا هیچ‌جا چک نمی‌شوند.

```python
# transfers/services.py — تابع کمکی جدید

def check_wage_cap_compliance(team, incoming_player) -> dict:
    from django.db.models import Sum
    from decimal import Decimal
    current_total_wage = team.players.aggregate(total=Sum('wage'))['total'] or Decimal('0.00')
    projected_total = current_total_wage + incoming_player.wage
    if projected_total > team.wage_cap:
        return {
            'compliant': False,
            'error': f"افزودن این بازیکن از سقف دستمزد تیم ({team.wage_cap}) عبور می‌کند "
                     f"(دستمزد فعلی: {current_total_wage}, این بازیکن: {incoming_player.wage})."
        }
    return {'compliant': True}
```
این چک باید در `buy_player_direct`, `finalize_auction` (هر دو در `transfers/services.py`)، و `open_gacha_pack` (`gacha/services.py`) صدا زده شود؛ اگر عبور کرد، تراکنش کامل rollback شود (`transaction.atomic`).

### ج) فارغ‌التحصیلی آکادمی
مشکل: `generate_academy_prospect` و `graduates_count` در `growth_engine.py` نوشته شده‌اند ولی هیچ Celery task یا admin action آن‌ها را صدا نمی‌زند.

```python
# teams/tasks.py — افزودن

@shared_task(name='teams.run_academy_graduation')
def task_run_academy_graduation():
    """پیشنهاد اجرا: پایان هر فصل (نه هفتگی)."""
    from teams.models import Team
    from teams.growth_engine import generate_academy_prospect, graduates_count
    from gacha.services import generate_random_player

    results = []
    for team in Team.objects.select_related('facilities').all():
        if team.players.count() >= 25:
            continue  # ظرفیت پر است
        count = graduates_count(team)
        target_ovr = generate_academy_prospect(team)
        for _ in range(count):
            player = generate_random_player('RARE', team)
            player.age = 17
            player.overall = target_ovr
            player.save(update_fields=['age', 'overall'])
            results.append({'team': team.name, 'player': player.name, 'ovr': target_ovr})
    return results
```
اتصال: در پایان هر `Season` (Tier 1 بخش ۱۳)، وقتی ادمین فصل را می‌بندد (`Season.is_active=False`)، این task صدا زده شود.

### چک‌لیست Self-Test
- [ ] بازیکن با ۳ زرد تجمیعی باید در هفته‌ی بعد قابل انتخاب در ترکیب نباشد
- [ ] خرید بازیکنی که wage cap را رد می‌کند باید کامل rollback شود (budget دست‌نخورده)
- [ ] فارغ‌التحصیلان آکادمی نباید از سقف ۲۵ بازیکن عبور کنند

---

## بخش ۱۷: Audit Log برای اکشن‌های دستی ادمین

### مدل
```python
# backend/audit/models.py  (اپ جدید کوچک)

class AdminAuditLog(models.Model):
    admin_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=40)
    target_team = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True)
    target_player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL, null=True, blank=True)
    before_value = models.JSONField(null=True, blank=True)
    after_value = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
```

### تابع کمکی
```python
# audit/utils.py

def log_admin_action(admin_user, action_type, target_team=None, target_player=None,
                      before_value=None, after_value=None, reason=""):
    AdminAuditLog.objects.create(
        admin_user=admin_user, action_type=action_type,
        target_team=target_team, target_player=target_player,
        before_value=before_value, after_value=after_value, reason=reason
    )
```

### اعمال روی endpoint های حساس موجود
```python
# teams/views.py — admin_adjust_budget

@action(detail=False, methods=['post'])
def admin_adjust_budget(self, request):
    team_id = request.data.get('team_id', 1)
    amount = float(request.data.get('amount', 0))
    reason = request.data.get('reason', '')
    team = Team.objects.get(id=team_id)
    before = float(team.budget)
    team.budget = float(team.budget) + amount
    team.save()

    log_admin_action(
        admin_user=request.user, action_type='BUDGET_ADJUST', target_team=team,
        before_value={'budget': before}, after_value={'budget': float(team.budget)},
        reason=reason
    )
    return Response({'status': 'Budget adjusted', 'new_budget': team.budget})
```
همین الگو روی `admin_override_facility` و `admin_update_player` هم تکرار شود.

### فرانت
تب جدید در `AdminDashboard.jsx`: «گزارش تغییرات» — لیست `AdminAuditLog` با فیلتر بر اساس تیم/نوع اکشن.

### چک‌لیست Self-Test
- [ ] هر سه endpoint حساس بدون استثنا لاگ بسازند
- [ ] لاگ نباید از طریق API معمولی قابل حذف باشد (فقط از admin site جنگو با superuser)

---

## بخش ۱۸: Rate Limiting گسترده‌تر

Tier 0/بخش ۵ throttling پایه (OTP, Payment, Gacha) را پوشش داد. این بخش موارد باقی‌مانده را اضافه می‌کند:

```python
# settings.py — گسترش REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
{
    'otp': '3/min',
    'payment': '10/min',
    'gacha': '20/min',
    'transfer_bid': '30/min',
    'admin_action': '60/min',
    'substitution': '10/min',
}
```
هر view مربوطه `throttle_scope` مناسب بگیرد (`PlaceBidView.throttle_scope = 'transfer_bid'` و غیره).

### چک‌لیست Self-Test
- [ ] تست هر throttle scope با درخواست‌های متوالی سریع‌تر از حد مجاز → باید ۴۲۹ برگرداند

---

## بخش ۱۹: رفع فیلد تکراری `academy_level`

مشکل: هم `Team.academy_level` و هم `ClubFacilities.academy_level` وجود دارد.

### تصمیم
`ClubFacilities.academy_level` منبع حقیقت باقی می‌ماند (چون در `growth_engine.generate_academy_prospect`/`graduates_count` استفاده می‌شود و همراه بقیه‌ی facilities است). `Team.academy_level` حذف می‌شود.

```python
# teams/migrations/000X_remove_team_academy_level.py

def copy_academy_level_forward(apps, schema_editor):
    Team = apps.get_model('teams', 'Team')
    ClubFacilities = apps.get_model('teams', 'ClubFacilities')
    for team in Team.objects.all():
        facilities, _ = ClubFacilities.objects.get_or_create(team=team)
        if team.academy_level > facilities.academy_level:
            facilities.academy_level = team.academy_level
            facilities.save()

class Migration(migrations.Migration):
    dependencies = [('teams', '00XX_previous')]
    operations = [
        migrations.RunPython(copy_academy_level_forward, migrations.RunPython.noop),
        migrations.RemoveField(model_name='team', name='academy_level'),
    ]
```

### چک‌لیست Self-Test
- [ ] بعد از migration، هیچ ارجاع باقی‌مانده‌ای به `Team.academy_level` در کل codebase نباشد (grep)
- [ ] داده‌ی موجود (اگر تفاوتی بین دو فیلد بود) گم نشده باشد

---

## بخش ۲۰: رفع Mismatch های کوچک Enum/Choice

### روش پیشنهادی: منبع مشترک truth
```python
# teams/views.py — endpoint جدید کوچک
class PositionChoicesView(views.APIView):
    def get(self, request):
        return Response(dict(Player.POSITIONS))
```
فرانت به‌جای هاردکد پوزیشن‌ها در چند فایل (`AdminDashboard.jsx`, `TeamTab.jsx`, `EFootballGamePlan.jsx`)، یک‌بار در سطح بالا (`usePositions()`) fetch کند.

### اسکریپت Validation
```python
# backend/scripts/validate_frontend_enums.py
"""
رشته‌های موقعیت/rarity/status هاردکد در فایل‌های .jsx را استخراج و با
choices واقعی مدل‌های Django مقایسه می‌کند. جایگزین تست خودکار نیست،
ابزار audit سریع است.
"""
```

### چک‌لیست Self-Test
- [ ] موارد شناخته‌شده (`'ST'` در `AdminDashboard.jsx`) رفع شده باشد
- [ ] اسکریپت validation حداقل یک بار روی کل فرانت اجرا و خروجی در گزارش پیوست شود

---

## بخش ۲۱: زیرساخت i18n (فقط پایه‌گذاری)

### وضعیت فعلی
تمام رشته‌های فارسی مستقیم در JSX هاردکد شده‌اند. این بخش فقط **زیرساخت** می‌گذارد، نه ترجمه‌ی کامل (کاری بزرگ و خارج scope فعلی).

```bash
npm install react-i18next i18next
```

```js
// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fa from './locales/fa.json';

i18n.use(initReactI18next).init({
  resources: { fa: { translation: fa } },
  lng: 'fa',
  fallbackLng: 'fa',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### استراتژی مهاجرت تدریجی
1. زیرساخت در این بخش ساخته شود
2. فقط کامپوننت‌های **جدید** (مثل `MatchTeamStatsForm`, `PlayerRatingsForm`, تب Audit Log) از ابتدا با `useTranslation()` نوشته شوند
3. مهاجرت کامپوننت‌های قدیمی به تسک جداگانه‌ی آینده موکول شود — این تصمیم باید آگاهانه توسط Emad تأیید شود

### چک‌لیست Self-Test
- [ ] `i18n` باید بدون کرش در `main.jsx` initialize شود
- [ ] حداقل یک کامپوننت نمونه با ساختار i18n بازنویسی و مستند شود

---

## بخش ۲۲: تست‌های Integration End-to-End

### وضعیت فعلی
تست‌های واحد خوبی برای منطق دامنه هست ولی هیچ تستی مسیر کامل «ترکیب → پایان بازی → آمار → جدول → پاداش» را end-to-end چک نمی‌کند.

### نمونه سناریو
```python
# backend/integration_tests/test_full_match_cycle.py

class FullMatchCycleIntegrationTest(TransactionTestCase):
    """
    شبیه‌سازی چرخه کامل: ترکیب → پایان بازی → ثبت آمار ادمین →
    پاداش → رشد بازیکن → جدول لیگ
    """
    def test_full_cycle(self):
        # 1. ایجاد تیم‌ها، فصل، فیکسچر
        # 2. مربی ترکیب می‌فرستد → چک AdminNotification ساخته شده
        # 3. ادمین رویدادها را ثبت می‌کند → چک broadcast (mock channel layer)
        # 4. ادمین وضعیت را FINISHED می‌کند → چک Celery task ها (eager mode)
        # 5. ادمین آمار را ثبت می‌کند → چک stats_finalized=True
        # 6. چک LeagueStanding با امتیاز صحیح
        # 7. چک Team.budget طبق فرمول پاداش (با سقف هفتگی)
        # 8. چک PlayerGrowthLog اگر حداقل بازی لازم را داشته
        pass
```

### چک‌لیست Self-Test
- [ ] تست با `CELERY_TASK_ALWAYS_EAGER=True` اجرا شود (بدون نیاز به Redis واقعی)
- [ ] حداقل یک سناریوی مسیر خطا هم تست شود (ثبت آمار قبل از FINISHED باید رد شود)

---

## بخش ۲۳: Sentry با DSN واقعی + مانیتورینگ

```python
# settings.py
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
        environment=os.environ.get('DJANGO_ENV', 'development'),
    )
```
> نکته‌ی حریم خصوصی: `send_default_pii=True` فعلی یعنی شماره موبایل کاربران به Sentry ارسال می‌شود. بعد از Auth واقعی (Tier 0) این باید `False` شود.

مانیتورینگ فرانت (اختیاری): `@sentry/react` برای خطاهای runtime، مکمل `ErrorBoundary.jsx` فعلی که فقط لاگ کنسول می‌کند.

### چک‌لیست Self-Test
- [ ] یک خطای عمدی باید در Sentry (یا لاگ محلی اگر DSN خالی است) ظاهر شود
- [ ] هیچ شماره موبایل خامی در event payload ها دیده نشود

---

## پرامپت‌های Agent

### Agent: Season Pass & Progression
```
Loop Engineering Task — Tier 2 / Weekly Tasks & Season Pass
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

هدف: پیاده‌سازی بخش ۱۵ سند Tier2 Implementation Plan.
پیش‌نیاز: Tier 1 بخش ۸ (نرخ جم) کامل باشد.

خروجی مورد انتظار:
1. اپ season_pass با مدل‌های WeeklyTask, TeamTaskProgress, SeasonPassLevel, TeamSeasonPass
2. توابع increment_task_progress, claim_task_reward, claim_level_reward
3. اتصال increment_task_progress به نقاط مربوطه (matches/tasks.py, teams/views.py submit_gameplan, gacha/services.py)
4. Celery Beat برای ریست هفتگی
5. UI فرانت: تب Season Pass در StoreTab.jsx با داده واقعی (جایگزین mock فعلی)

Self-Test الزامی:
- تسک کامل‌شده نباید خودکار XP بدهد؛ فقط با claim صریح
- رسیدن به سطح آخر بدون VIP نباید لجند بدهد
- شبیه‌سازی ۴ هفته کامل با claim تمام تسک‌ها → تأیید نرخ XP منطقی است

در گزارش، جدول کامل XP لازم برای هر سطح و تخمین «چند هفته طول می‌کشد یک تیم معمولی به سطح آخر برسد» را پیوست کن.
```

### Agent: Rule Enforcement (Suspension, Wage Cap, Academy)
```
Loop Engineering Task — Tier 2 / Rule Enforcement
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

هدف: پیاده‌سازی بخش ۱۶ سند Tier2 Implementation Plan (سه زیرقانون مستقل).

خروجی مورد انتظار:
1. چک محرومیت در GamePlanUpdateSerializer + task_process_disciplinary_actions
2. چک wage cap در transfers/services.py و gacha/services.py
3. task_run_academy_graduation + اتصال به پایان فصل

Self-Test الزامی:
- بازیکن با ۳ کارت زرد تجمیعی نباید قابل انتخاب در ترکیب باشد
- خرید بازیکنی که wage cap را رد می‌کند باید کامل rollback شود
- فارغ‌التحصیلان آکادمی نباید از سقف ۲۵ بازیکن عبور کنند

هر سه زیرقانون مستقل از هم‌اند — جداگانه پیاده و تست کن.
```

### Agent: Audit & Security Ops
```
Loop Engineering Task — Tier 2 / Audit Logging & Extended Rate Limiting
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

هدف: پیاده‌سازی بخش‌های ۱۷ و ۱۸ سند Tier2 Implementation Plan.

خروجی مورد انتظار:
1. اپ audit با مدل AdminAuditLog + تابع log_admin_action
2. اعمال لاگ روی admin_adjust_budget, admin_override_facility, admin_update_player
3. تب «گزارش تغییرات» در AdminDashboard.jsx
4. throttle_scope های جدید (transfer_bid, admin_action, substitution)

Self-Test الزامی:
- هر سه endpoint حساس بدون استثنا لاگ بسازند
- throttle هر scope با درخواست سریع متوالی باید ۴۲۹ برگرداند
```

### Agent: Cleanup & Consistency
```
Loop Engineering Task — Tier 2 / Cleanup (Duplicate Fields & Enum Mismatches)
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

هدف: پیاده‌سازی بخش‌های ۱۹ و ۲۰ سند Tier2 Implementation Plan.

خروجی مورد انتظار:
1. Data migration ادغام Team.academy_level به ClubFacilities.academy_level و حذف فیلد قدیمی
2. Endpoint PositionChoicesView + هوک frontend usePositions()
3. رفع 'ST' در AdminDashboard.jsx و mismatch های مشابه
4. اسکریپت scripts/validate_frontend_enums.py

Self-Test الزامی:
- grep کامل برای اطمینان از حذف تمام ارجاعات به Team.academy_level
- اجرای اسکریپت validation و پیوست خروجی به گزارش
```

### Agent: QA & Observability
```
Loop Engineering Task — Tier 2 / Integration Tests & Monitoring
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

هدف: پیاده‌سازی بخش‌های ۲۲ و ۲۳ سند Tier2 Implementation Plan.

خروجی مورد انتظار:
1. backend/integration_tests/test_full_match_cycle.py
2. حداقل یک تست مسیر خطا
3. تنظیم CELERY_TASK_ALWAYS_EAGER برای محیط تست
4. SENTRY_DSN از env + send_default_pii=False + traces_sample_rate=0.2

Self-Test الزامی:
- تست integration باید بدون Redis/Celery واقعی پاس شود
- بررسی دستی نبود PII خام در Sentry payload
```

### Agent: i18n Foundation (اختیاری — نیازمند تأیید صریح Emad قبل از شروع)
```
Loop Engineering Task — Tier 2 / i18n Infrastructure (Foundation Only)
Plan → Implement → Self-Test → Verify → Fix → Repeat → Report

⚠️ فقط در صورتی شروع کن که Emad صراحتاً تأیید کرده چندزبانگی در نقشه‌راه
نزدیک است. رفکتور کامل کامپوننت‌های قدیمی خارج از scope این تسک است.

هدف: پیاده‌سازی بخش ۲۱ سند Tier2 Implementation Plan (فقط زیرساخت).

خروجی مورد انتظار:
1. نصب و پیکربندی react-i18next
2. frontend/src/i18n/index.js + locales/fa.json (اسکلت اولیه)
3. بازنویسی یک کامپوننت نمونه (MatchTeamStatsForm.jsx از Tier1) با useTranslation()

Self-Test الزامی:
- برنامه بدون کرش با i18n initialize شود
- کامپوننت نمونه دقیقاً همان رفتار قبلی را داشته باشد
```

---

## خلاصه‌ی وابستگی‌ها

```
#15 Season Pass ────────► وابسته به Tier1/#8 (نرخ جم)
#16 Rule Enforcement ───► مستقل، سه زیرقانون هرکدام مستقل از هم
#17 Audit Log ──────────► مستقل
#18 Rate Limiting ──────► مستقل (تکمیل‌کننده‌ی Tier0/#5)
#19 Cleanup فیلد ───────► مستقل
#20 Enum Mismatch ──────► مستقل
#21 i18n ───────────────► مستقل، نیازمند تأیید صریح قبل از شروع
#22 Integration Test ───► بهتر است بعد از پایداری Tier0+Tier1 اجرا شود
#23 Sentry/Monitoring ──► مستقل، هر زمان قابل انجام
```

تقریباً همه‌ی موارد این Tier می‌توانند **کاملاً موازی** با چند Agent مختلف اجرا شوند (به‌جز #۱۵ که به Tier1 نیاز دارد) — فرصت خوبی برای موازی‌سازی و کوتاه‌کردن زمان کل توسعه.

پس از تکمیل هر سه Tier (۰، ۱، ۲)، پروژه از نظر معماری بنیادی کامل خواهد بود. مرحله‌ی بعدی صرفاً Polish، طراحی UI/UX (Figma-first برای Tactics Board، Gacha animation، Mobile dashboard)، و آماده‌سازی انتشار (Capacitor/TWA، APK) است — طبق فاز ۴ نقشه راه اصلی پروژه.
