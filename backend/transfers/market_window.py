"""
Transfer Market Window Manager — Virtual Master League
======================================================
Enforces automated transfer window schedules according to tournament rest days:
- Market opens on rest days (Saturday & Monday) from 00:00 to 18:00.
- Market is locked on match days and after 18:00 on rest days.
- Fully configurable by admin: AUTO schedule, FORCE_OPEN, or FORCE_CLOSED.
- Calculates exact seconds remaining for live frontend countdown timers.
"""

from datetime import datetime, timedelta, time
from django.utils import timezone
from core.models import GlobalSettings


def get_market_status_info() -> dict:
    """
    Computes current status of the transfer market window,
    countdown seconds until next state change, and descriptive Persian messages.
    """
    settings = GlobalSettings.objects.first()
    if not settings:
        settings = GlobalSettings.objects.create()

    # 1. Feature Flag Check
    if not settings.feature_transfer_market:
        return {
            'is_open': False,
            'mode': 'DISABLED',
            'seconds_remaining': 0,
            'next_change': None,
            'status_label': 'غیرفعال',
            'message': 'بازار نقل و انتقالات در حال حاضر به دستور مدیریت غیرفعال است.',
        }

    # 2. Manual Override Check
    override_mode = getattr(settings, 'transfer_manual_override', 'AUTO') or 'AUTO'

    if override_mode == 'FORCE_OPEN':
        return {
            'is_open': True,
            'mode': 'FORCE_OPEN',
            'seconds_remaining': None,
            'next_change': None,
            'status_label': 'اجباراً باز',
            'message': 'پنجره نقل‌وانتقالات با دستور مستقیم مدیریت باز است.',
        }

    if override_mode == 'FORCE_CLOSED':
        return {
            'is_open': False,
            'mode': 'FORCE_CLOSED',
            'seconds_remaining': None,
            'next_change': None,
            'status_label': 'اجباراً بسته',
            'message': 'پنجره نقل‌وانتقالات با دستور مستقیم مدیریت بسته است.',
        }

    # 3. Automated Calendar Schedule
    # REST DAYS: Saturday (5), Monday (0), Wednesday (2)
    # MATCH DAYS: Sunday (6), Tuesday (1), Thursday (3), Friday (4)
    REST_WEEKDAYS = [0, 2, 5]  # Monday, Wednesday, Saturday
    WEEKDAY_NAMES_FA = {5: "شنبه", 0: "دوشنبه", 2: "چهارشنبه"}

    now = timezone.localtime(timezone.now())
    open_hour = getattr(settings, 'transfer_window_open_hour', 0)
    close_hour = getattr(settings, 'transfer_window_close_hour', 18)

    is_today_rest = now.weekday() in REST_WEEKDAYS
    today_open_dt = now.replace(hour=open_hour, minute=0, second=0, microsecond=0)
    today_close_dt = now.replace(hour=close_hour, minute=0, second=0, microsecond=0)

    is_open = False
    next_change_dt = None
    message = ""
    status_label = ""

    if is_today_rest:
        if now < today_open_dt:
            # Before opening on a rest day
            is_open = False
            next_change_dt = today_open_dt
            status_label = 'بسته تا بامداد'
            message = f'امروز روز استراحت است. بازار رأس ساعت ۱۲:۰۰ بامداد باز می‌شود.'
        elif today_open_dt <= now < today_close_dt:
            # Inside the open window on a rest day
            is_open = True
            next_change_dt = today_close_dt
            status_label = 'باز'
            message = f'پنجره نقل‌وانتقالات باز است. مهلت فعالیت تا ساعت ۱۸:۰۰ غروب امروز.'
        else:
            # After closing on a rest day -> Find next rest day
            is_open = False
            status_label = 'بسته'
            # Look ahead for next rest day
            check_d = (now + timedelta(days=1)).replace(hour=open_hour, minute=0, second=0, microsecond=0)
            while check_d.weekday() not in REST_WEEKDAYS:
                check_d += timedelta(days=1)
            next_change_dt = check_d
            weekday_name_fa = WEEKDAY_NAMES_FA.get(check_d.weekday(), "شنبه")
            message = f'بازار امروز به پایان رسید. بازگشایی بعدی: {weekday_name_fa} ساعت ۱۲:۰۰ بامداد.'
    else:
        # Today is a match day!
        is_open = False
        status_label = 'روز مسابقه (بسته)'
        # Find next rest day
        check_d = (now + timedelta(days=1)).replace(hour=open_hour, minute=0, second=0, microsecond=0)
        while check_d.weekday() not in REST_WEEKDAYS:
            check_d += timedelta(days=1)
        next_change_dt = check_d
        weekday_name_fa = WEEKDAY_NAMES_FA.get(check_d.weekday(), "شنبه")
        message = f'امروز روز مسابقه است و پنجره بسته می‌باشد. بازگشایی بعدی: {weekday_name_fa} ساعت ۱۲:۰۰ بامداد.'

    seconds_remaining = 0
    if next_change_dt:
        diff = int((next_change_dt - now).total_seconds())
        seconds_remaining = max(0, diff)

    return {
        'is_open': is_open,
        'mode': 'AUTO',
        'seconds_remaining': seconds_remaining,
        'next_change': next_change_dt.isoformat() if next_change_dt else None,
        'status_label': status_label,
        'message': message,
        'open_hour': open_hour,
        'close_hour': close_hour,
    }


def is_market_open_for_request(request) -> tuple[bool, str]:
    """
    Helper to check if the current request is allowed to perform market actions.
    Staff/superusers are always permitted.
    """
    user = getattr(request, 'user', None)
    if user and (user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin'):
        return True, ""

    info = get_market_status_info()
    if not info['is_open']:
        return False, info['message']
    return True, ""
