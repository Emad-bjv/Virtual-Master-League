from rest_framework import serializers
from .models import TransferListing, TransferBid, TransferHistory, TransferOffer, TransferLog
from teams.models import Team, Player
from teams.serializers import resolve_player_photo_url


class TransferListingSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    player_overall = serializers.IntegerField(source='player.overall', read_only=True)
    player_position = serializers.CharField(source='player.position', read_only=True)
    seller_team_name = serializers.CharField(source='seller_team.name', read_only=True)
    highest_bidder_name = serializers.CharField(source='highest_bidder.name', read_only=True, default=None)

    class Meta:
        model = TransferListing
        fields = [
            'id', 'player', 'player_name', 'player_overall', 'player_position',
            'seller_team', 'seller_team_name', 'listing_type', 'price_usd',
            'highest_bid', 'highest_bidder', 'highest_bidder_name', 'status', 'created_at'
        ]
        read_only_fields = ['highest_bid', 'highest_bidder', 'status', 'created_at']


class TransferBidSerializer(serializers.ModelSerializer):
    bidder_team_name = serializers.CharField(source='bidder_team.name', read_only=True)

    class Meta:
        model = TransferBid
        fields = ['id', 'listing', 'bidder_team', 'bidder_team_name', 'amount_usd', 'created_at']


class TransferHistorySerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    seller_team_name = serializers.CharField(source='seller_team.name', read_only=True, default="Free Agent")
    buyer_team_name = serializers.CharField(source='buyer_team.name', read_only=True, default="Released")

    class Meta:
        model = TransferHistory
        fields = ['id', 'player_name', 'seller_team_name', 'buyer_team_name', 'price_usd', 'transfer_type', 'transferred_at']

class TransferOfferSerializer(serializers.ModelSerializer):
    sender_team_name = serializers.CharField(source='sender_team.name', read_only=True)
    sender_team_logo = serializers.CharField(source='sender_team.logo', read_only=True)
    sender_budget = serializers.DecimalField(source='sender_team.budget', max_digits=15, decimal_places=2, read_only=True)
    receiver_team_name = serializers.CharField(source='receiver_team.name', read_only=True)
    receiver_team_logo = serializers.CharField(source='receiver_team.logo', read_only=True)
    receiver_budget = serializers.DecimalField(source='receiver_team.budget', max_digits=15, decimal_places=2, read_only=True)
    target_player_name = serializers.CharField(source='target_player.name', read_only=True)
    target_player_overall = serializers.IntegerField(source='target_player.overall', read_only=True)
    target_player_potential_ovr = serializers.IntegerField(source='target_player.potential_ovr', read_only=True)
    target_player_position = serializers.CharField(source='target_player.position', read_only=True)
    target_player_wage = serializers.DecimalField(source='target_player.wage', max_digits=12, decimal_places=2, read_only=True)
    target_player_market_value = serializers.DecimalField(source='target_player.market_value', max_digits=15, decimal_places=2, read_only=True)
    target_player_photo = serializers.SerializerMethodField()
    swap_players_details = serializers.SerializerMethodField()
    sender_players = serializers.SerializerMethodField()
    receiver_players = serializers.SerializerMethodField()
    seller_team_id = serializers.SerializerMethodField()
    buyer_team_id = serializers.SerializerMethodField()
    seller_team_name = serializers.SerializerMethodField()
    buyer_team_name = serializers.SerializerMethodField()

    class Meta:
        model = TransferOffer
        fields = [
            'id', 'sender_team', 'sender_team_name', 'sender_team_logo', 'sender_budget',
            'receiver_team', 'receiver_team_name', 'receiver_team_logo', 'receiver_budget',
            'seller_team_id', 'buyer_team_id', 'seller_team_name', 'buyer_team_name',
            'target_player', 'target_player_name', 'target_player_overall', 'target_player_potential_ovr',
            'target_player_position', 'target_player_wage', 'target_player_market_value', 'target_player_photo',
            'offer_type', 'cash_amount', 'swap_players', 'swap_players_details',
            'sender_players', 'receiver_players',
            'loan_duration_matches', 'status', 'parent_offer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']

    def get_seller_team_id(self, obj):
        return obj.target_player.team_id if obj.target_player else obj.receiver_team_id

    def get_buyer_team_id(self, obj):
        seller_id = self.get_seller_team_id(obj)
        return obj.sender_team_id if obj.receiver_team_id == seller_id else obj.receiver_team_id

    def get_seller_team_name(self, obj):
        if obj.target_player and obj.target_player.team:
            return obj.target_player.team.name
        return obj.receiver_team.name if obj.receiver_team else ''

    def get_buyer_team_name(self, obj):
        seller_id = self.get_seller_team_id(obj)
        if obj.receiver_team_id == seller_id:
            return obj.sender_team.name if obj.sender_team else ''
        return obj.receiver_team.name if obj.receiver_team else ''

    def get_target_player_photo(self, obj):
        if obj.target_player:
            return resolve_player_photo_url(obj.target_player)
        return None

    def get_swap_players_details(self, obj):
        return [
            {
                'id': p.id,
                'name': p.name,
                'photo_url': resolve_player_photo_url(p),
                'overall': p.overall,
                'potential_ovr': p.potential_ovr,
                'position': p.position,
                'wage': float(p.wage or 0),
                'market_value': float(p.market_value or 0),
                'team_id': p.team_id,
                'team_name': p.team.name if p.team else None,
            }
            for p in obj.swap_players.all()
        ]

    def get_sender_players(self, obj):
        if not obj.sender_team:
            return []
        return [
            {
                'id': p.id, 
                'name': p.name, 
                'photo_url': resolve_player_photo_url(p),
                'overall': p.overall, 
                'potential_ovr': p.potential_ovr,
                'position': p.position, 
                'wage': float(p.wage or 0),
                'market_value': float(p.market_value or 0)
            } 
            for p in obj.sender_team.players.filter(loan_owner_team__isnull=True).order_by('-overall')
        ]

    def get_receiver_players(self, obj):
        if not obj.receiver_team:
            return []
        return [
            {
                'id': p.id, 
                'name': p.name, 
                'photo_url': resolve_player_photo_url(p),
                'overall': p.overall, 
                'potential_ovr': p.potential_ovr,
                'position': p.position, 
                'wage': float(p.wage or 0),
                'market_value': float(p.market_value or 0)
            } 
            for p in obj.receiver_team.players.filter(loan_owner_team__isnull=True).order_by('-overall')
        ]

def _get_romano_headline_and_content(obj):
    """
    Generates dynamic, non-monotonous Fabrizio Romano 'HERE WE GO' style news reports.
    Uses deterministic indexing based on log ID to guarantee variety across records while remaining stable on reload.
    """
    o = obj.related_offer
    log_id = obj.id or 1
    
    # Try to resolve player & team details from related_offer or description/history
    tp = None
    seller_name = "باشگاه مبدأ"
    buyer_name = "باشگاه مقصد"
    cash_num = 0.0
    offer_type = 'DIRECT_TRANSFER'
    loan_matches = 0
    swap_list = []
    
    if o:
        tp = o.target_player
        offer_type = o.offer_type
        loan_matches = o.loan_duration_matches or 0
        cash_num = float(o.cash_amount or 0)
        swap_list = list(o.swap_players.all())
        if tp:
            seller_name = o.receiver_team.name if tp.team_id == o.sender_team_id else o.sender_team.name
            buyer_name = o.sender_team.name if tp.team_id == o.sender_team_id else o.receiver_team.name
        else:
            seller_name = o.sender_team.name if o.sender_team else "باشگاه مبدأ"
            buyer_name = o.receiver_team.name if o.receiver_team else "باشگاه مقصد"

    p_name = tp.name if tp else "ستاره فوتبال"
    pos = tp.position if tp else "-"
    ovr = tp.overall if tp else "-"
    cash_str = f"${cash_num:,.0f}" if cash_num > 0 else "مبلغ توافقی"

    variant = log_id % 4

    # 1. TRANSFER FINALIZED
    if obj.event_type == 'TRANSFER_FINALIZED':
        if offer_type == 'LOAN':
            headlines = [
                f"🚨 HERE WE GO! انتقال قرضی {p_name} به {buyer_name} نهایی شد!",
                f"🔄 رسمی به سبک رومانو: توافق برای انتقال قرضی {p_name} به {buyer_name}! Here we go! 🟢",
                f"🚨 Done Deal: امضای قرارداد قرضی {p_name} میان {seller_name} و {buyer_name} به پایان رسید!",
                f"🟢 Here We Go تایید شد: {buyer_name} ستاره جدید خود ({p_name}) را به صورت قرضی به خدمت گرفت!"
            ]
            contents = [
                (
                    f"🚨 HERE WE GO! 🟢\n"
                    f"توافق شفاهی و رسمی برای انتقال قرضی «{p_name}» به باشگاه {buyer_name} با موفقیت نهایی شد.\n\n"
                    f"🤝 تمام جزئیات قرارداد بین مدیران دو باشگاه {seller_name} و {buyer_name} بررسی و مدارک معامله ارسال گردید.\n\n"
                    f"📋 مشخصات توافق قرضی:\n"
                    f"• بازیکن: {p_name} (پست: {pos} | اورال: {ovr})\n"
                    f"• باشگاه مبدأ (مالک اصلی): {seller_name}\n"
                    f"• باشگاه مقصد (قرض‌گیرنده): {buyer_name}\n"
                    f"• مدت قرارداد قرضی: {loan_matches} مسابقه رسمی\n"
                    f"• هزینه قرض: {cash_str}\n\n"
                    f"✍️ مدارک امضا شد و بازیکن در دسترس کادر فنی {buyer_name} قرار گرفت.\n\n"
                    f"#HereWeGo #نقل_و_انتقالات #قرضی #مستر_لیگ #فوتبال #رسمی"
                ),
                (
                    f"🟢 DONE DEAL & HERE WE GO! 🚨\n"
                    f"پرونده انتقال موقت «{p_name}» بسته شد؛ او راهی {buyer_name} می‌شود!\n\n"
                    f"✈️ بازیکن تست‌های پزشکی و هماهنگی‌های نهایی را پشت سر گذاشته و برای {loan_matches} بازی در ترکیب {buyer_name} به میدان خواهد رفت.\n\n"
                    f"📊 شناسنامه قرارداد:\n"
                    f"• ستاره قرضی: {p_name} ({pos} - OVR {ovr})\n"
                    f"• انتقال از: {seller_name} ⬅️ به: {buyer_name}\n"
                    f"• مدت مجاز: {loan_matches} مسابقه رسمی\n"
                    f"• ارزش مالی انتقال: {cash_str}\n\n"
                    f"⚡ قرارداد در سیستم نقل‌وانتقالات ثبت رسمی گردید.\n\n"
                    f"#HereWeGo #انتقالات #مستر_لیگ #رومانو"
                ),
                (
                    f"🚨 اختصاصی مستر لیگ: توافق کامل برای حضور قرضی {p_name} در {buyer_name}!\n\n"
                    f"مذاکرات میان نمایندگان {seller_name} و {buyer_name} با موفقیت به سرانجام رسید و کارت بازی بازیکن صادر شد.\n\n"
                    f"📋 جزئیات نهایی:\n"
                    f"• نام ستاره: {p_name} (پست {pos} | قدرت {ovr})\n"
                    f"• توافق دو جانبه بین: {seller_name} و {buyer_name}\n"
                    f"• تعداد مسابقات قرضی: {loan_matches} بازی\n"
                    f"• رقم مالی معامله: {cash_str}\n\n"
                    f"🟢 Here we go confirmed!\n\n"
                    f"#نقل_و_انتقالات #رسمی #فوتبال #مستر_لیگ"
                ),
                (
                    f"💣 بمب نقل‌وانتقالات قرضی! Here We Go! 🚨\n"
                    f"باشگاه {buyer_name} با پرداخت {cash_str} موفق به جذب قرضی «{p_name}» از {seller_name} شد.\n\n"
                    f"📌 مشخصات انتقال:\n"
                    f"• بازیکن هدف: {p_name} | {pos} | OVR {ovr}\n"
                    f"• تیم مالک: {seller_name} | تیم مستأجر: {buyer_name}\n"
                    f"• سقف بازی‌های مجاز: {loan_matches} مسابقه\n\n"
                    f"✅ همه چیز نهایی و تایید شد. بازیکن آماده درخشش در تیم جدید است!\n\n"
                    f"#HereWeGo #مستر_لیگ #نقل_و_انتقالات"
                )
            ]
        elif offer_type == 'SWAP':
            swap_details_lines = [f"  • {sp.name} (پست: {sp.position} | اورال: {sp.overall})" for sp in swap_list]
            swap_text = "\n".join(swap_details_lines) if swap_details_lines else "  • بازیکنان معاوضه‌ای مورد توافق"
            cash_part = f"\n• نقدینگی مکمل پرداختی: {cash_str}" if cash_num > 0 else ""

            headlines = [
                f"🚨 HERE WE GO! بمب بزرگ معاوضه میان {seller_name} و {buyer_name} منفجر شد!",
                f"🔄 معاوضه تاریخی در مستر لیگ: توافق کامل دو باشگاه بر سر ستاره‌ها! Here we go! 🟢",
                f"🚨 Done Deal: قرارداد معاوضه بازیکنان میان {seller_name} و {buyer_name} امضا شد!",
                f"🟢 Here We Go تایید شد! جابجایی هیجان‌انگیز مهره‌ها بین {seller_name} و {buyer_name}!"
            ]
            contents = [
                (
                    f"🚨 HERE WE GO! 🟢🤝\n"
                    f"یکی از جذاب‌ترین معاملات پنجره نقل‌وانتقالات مستر لیگ رسمی شد!\n\n"
                    f"دو باشگاه {seller_name} و {buyer_name} بر سر یک معاوضه بزرگ به توافق ۱۰۰٪ رسیدند و تمامی فرم‌های انتقال به تایید سازمان لیگ رسید.\n\n"
                    f"📋 جزئیات معاوضه دوطرفه:\n"
                    f"⬅️ بازیکن خروجی از {seller_name} به مقصد {buyer_name}:\n"
                    f"  • {p_name} (پست: {pos} | اورال: {ovr})\n\n"
                    f"➡️ بازیکن(های) ارسالی از {buyer_name} به {seller_name}:\n"
                    f"{swap_text}"
                    f"{cash_part}\n\n"
                    f"💼 وضعیت: ثبت قطعی و رسمی در دیتابیس لیگ.\n\n"
                    f"#HereWeGo #معاوضه #نقل_و_انتقالات #مستر_لیگ #فوتبال"
                ),
                (
                    f"🟢 DONE DEAL & HERE WE GO! 🚨\n"
                    f"توافق دوطرفه به پایان رسید؛ ستاره‌ها پیراهن‌های جدید خود را بر تن می‌کنند!\n\n"
                    f"مذاکرات فشرده میان مدیران {seller_name} و {buyer_name} با لبخند رضایت طرفین بسته شد.\n\n"
                    f"📊 صورت جلسه معامله:\n"
                    f"• {p_name} ({pos} | OVR {ovr}) ➔ راهی {buyer_name} شد.\n"
                    f"• ستاره‌های معاوضه‌ای ➔ راهی {seller_name} شدند:\n{swap_text}"
                    f"{cash_part}\n\n"
                    f"✍️ قراردادها نهایی و ثبت رسمی شدند.\n\n"
                    f"#HereWeGo #نقل_و_انتقالات #مستر_لیگ"
                ),
                (
                    f"💣 بمب معاوضه در مستر لیگ! Here We Go! 🚨\n"
                    f"توافق شگفت‌انگیز دو قدرت لیگ؛ جابجایی همزمان بازیکنان میان {seller_name} و {buyer_name} نهایی شد!\n\n"
                    f"📋 جزئیات قرارداد:\n"
                    f"• بازیکن انتقالی: {p_name} (OVR {ovr})\n"
                    f"• بازیکنان مبادله‌شده:\n{swap_text}"
                    f"{cash_part}\n\n"
                    f"🟢 All documents approved and registered.\n\n"
                    f"#HereWeGo #معاوضه_رسمی #مستر_لیگ"
                ),
                (
                    f"🚨 رسمی: امضای طلایی پای قرارداد معاوضه {seller_name} و {buyer_name}! Here we go! 🟢\n\n"
                    f"با تایید مدیران عامل هر دو باشگاه، معامله جابجایی {p_name} و مهره‌های متقابل رسمیت یافت.\n\n"
                    f"📋 خلاصه ارقام و بازیکنان:\n"
                    f"• به مقصد {buyer_name}: {p_name} ({pos} | {ovr})\n"
                    f"• به مقصد {seller_name}:\n{swap_text}"
                    f"{cash_part}\n\n"
                    f"#HereWeGo #مستر_لیگ #اخبار_نقل_و_انتقالات"
                )
            ]
        else:
            # DIRECT TRANSFER
            headlines = [
                f"🚨 HERE WE GO! {p_name} رسماً با مبلغ {cash_str} به {buyer_name} پیوست!",
                f"🟢 DONE DEAL: توافق کامل حاصل شد؛ {p_name} ستاره جدید {buyer_name}! Here we go!",
                f"💣 بمب بزرگ بازار: شکار طلایی {buyer_name} با جذب {p_name}! Here we go! 🚨",
                f"🚨 EXCLUSIVE: قرارداد امضا شد؛ {p_name} به {buyer_name} ملحق گردید! Here we go!"
            ]
            contents = [
                (
                    f"🚨 HERE WE GO! 🟢\n"
                    f"بمب نقل‌وانتقالات منفجر شد! توافق کامل و ۱۰۰٪ برای انتقال «{p_name}» به باشگاه {buyer_name} حاصل گردید.\n\n"
                    f"💰 رقم انتقال: {cash_str}\n"
                    f"🤝 توافق بین باشگاه‌های {seller_name} و {buyer_name} نهایی شده و تست‌های پزشکی با موفقیت پاس شد.\n\n"
                    f"📋 شناسنامه انتقال:\n"
                    f"• بازیکن: {p_name}\n"
                    f"• پست تخصصی: {pos} | اورال: {ovr}\n"
                    f"• باشگاه مبدأ: {seller_name}\n"
                    f"• باشگاه مقصد: {buyer_name}\n"
                    f"• مبلغ معامله: {cash_str}\n"
                    f"• نوع انتقال: قطعی و رسمی\n\n"
                    f"✍️ قرارداد به صورت رسمی در سازمان مستر لیگ به ثبت رسید. بازیکن به زودی معرفی خواهد شد.\n\n"
                    f"#HereWeGo #نقل_و_انتقالات #مستر_لیگ #رسمی #فوتبال #بمب_نقل_و_انتقالات"
                ),
                (
                    f"🟢 DONE DEAL & HERE WE GO! 🚨\n"
                    f"انتقال بزرگ پنجره تایید شد؛ «{p_name}» رسماً به {buyer_name} پیوست!\n\n"
                    f"مدیران {buyer_name} پس از مذاکرات فشرده با {seller_name}، با پرداخت مبلغ {cash_str} رضایت‌نامه ستاره جدید خود را دریافت کردند.\n\n"
                    f"📊 جزئیات قرارداد:\n"
                    f"• نام بازیکن: {p_name} (پست: {pos} | ریتینگ: {ovr})\n"
                    f"• فروشنده: {seller_name} ⬅️ خریدار: {buyer_name}\n"
                    f"• ارزش مالی: {cash_str}\n\n"
                    f"⚡ قرارداد امضا، اسناد مبادله و کارت بازی ستاره در لیگ صادر شد!\n\n"
                    f"#HereWeGo #DoneDeal #مستر_لیگ #رومانو #اخبار_ورزشی"
                ),
                (
                    f"💣 شکار بزرگ در بازار مستر لیگ! Here We Go! 🚨\n"
                    f"باشگاه {buyer_name} خرید «{p_name}» از {seller_name} را قطعی کرد.\n\n"
                    f"💎 ستاره {pos} با قدرت {ovr} با قراردادی به ارزش {cash_str} لباس {buyer_name} را به تن خواهد کرد.\n\n"
                    f"📋 خلاصه توافق:\n"
                    f"• ستاره جدید: {p_name} ({pos} | OVR {ovr})\n"
                    f"• مبدأ: {seller_name} | مقصد: {buyer_name}\n"
                    f"• هزینه انتقال: {cash_str}\n\n"
                    f"✅ All terms agreed and confirmed. Official announcement ready!\n\n"
                    f"#HereWeGo #نقل_و_انتقالات #بمب_خبری #مستر_لیگ"
                ),
                (
                    f"🚨 اختصاصی رومانو: امضای نهایی و خوش‌آمد به {p_name} در {buyer_name}! Here we go! 🟢\n\n"
                    f"توافق شفاهی به امضای رسمی تبدیل شد؛ باشگاه {seller_name} با پیشنهاد {cash_str} موافقت کرد و {p_name} ستاره جدید کهکشان {buyer_name} لقب گرفت.\n\n"
                    f"📋 مشخصات معامله:\n"
                    f"• بازیکن: {p_name} (OVR {ovr})\n"
                    f"• باشگاه خریدار: {buyer_name}\n"
                    f"• باشگاه فروشنده: {seller_name}\n"
                    f"• هزینه قطعی: {cash_str}\n\n"
                    f"✍️ انتقال در سامانه مسابقات تایید نهایی شد.\n\n"
                    f"#HereWeGo #مستر_لیگ #انتقال_قطعی #رسمی"
                )
            ]

        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 2. COUNTER OFFER
    elif obj.event_type == 'COUNTER_OFFER':
        sender_t = o.sender_team.name if o and o.sender_team else "باشگاه پیشنهاد‌دهنده"
        rec_t = o.receiver_team.name if o and o.receiver_team else "باشگاه مقصد"
        swap_str = f" + معاوضه: {', '.join([p.name for p in swap_list])}" if swap_list else ""

        headlines = [
            f"🔥 داغ از اتاق مذاکرات: پیشنهاد متقابل {sender_t} روی میز {rec_t} برای {p_name}!",
            f"⏳ مذاکرات فشرده ادامه دارد: پیشنهاد اصلاح‌شده {cash_str} از سوی {sender_t} برای {p_name}!",
            f"🚨 رایزنی‌های سنگین بر سر {p_name}: {sender_t} شرایط جدیدی پیشنهاد داد!",
            f"👀 پاتک نقل‌وانتقالاتی: پیشنهاد متقابل جدید {sender_t} به {rec_t} برای ستاره لیگ!"
        ]
        contents = [
            (
                f"🔥 داغ از قلب مذاکرات مستر لیگ!\n"
                f"مذاکرات برای انتقال «{p_name}» وارد فاز حساسی شد. باشگاه {sender_t} با بازنگری در پیشنهاد خود، رقم جدید {cash_str}{swap_str} را به عنوان پیشنهاد متقابل به مدیریت {rec_t} ارسال کرد.\n\n"
                f"⏳ منابع نزدیک خبر می‌دهند گفتگوها به صورت فشرده ادامه دارد و تصمیم نهایی طی ساعات آینده اتخاذ خواهد شد.\n\n"
                f"#مذاکرات #نقل_و_انتقالات #پیشنهاد_متقابل #مستر_لیگ"
            ),
            (
                f"⏳ TALKS ONGOING! 🚨\n"
                f"باشگاه {sender_t} برای به خدمت گرفتن «{p_name}» تسلیم نمی‌شود! پیشنهاد متقابل اصلاح‌شده به ارزش {cash_str}{swap_str} به باشگاه {rec_t} تحویل داده شد.\n\n"
                f"📊 آخرین وضعیت:\n"
                f"• بازیکن مورد مذاکره: {p_name} ({pos} | OVR {ovr})\n"
                f"• پیشنهاددهنده: {sender_t} ➔ گیرنده: {rec_t}\n"
                f"• رقم پیشنهادی جدید: {cash_str}\n\n"
                f"#نقل_و_انتقالات #مستر_لیگ #رومانو"
            ),
            (
                f"🚨 تحولات داغ بازار نقل‌وانتقالات:\n"
                f"پیشنهاد متقابل باشگاه {sender_t} برای جذب «{p_name}» به ارزش {cash_str}{swap_str} به باشگاه {rec_t} رسید. توپ اکنون در زمین مدیریت {rec_t} است تا در مورد این پیشنهاد تصمیم‌گیری کند.\n\n"
                f"#پیشنهاد_جدید #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"🔥 فاز جدید مذاکرات بر سر {p_name}!\n"
                f"باشگاه {sender_t} شرایط خود را تغییر داد و پیشنهادی جذاب‌تر با ارزش {cash_str}{swap_str} برای {rec_t} ارسال کرد. مذاکرات با جدیت ادامه دارد.\n\n"
                f"#مستر_لیگ #مذاکرات_داغ #انتقالات"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 3. OFFER MADE
    elif obj.event_type == 'OFFER_MADE':
        sender_t = o.sender_team.name if o and o.sender_team else "باشگاه خریدار"
        rec_t = o.receiver_team.name if o and o.receiver_team else "باشگاه فروشنده"
        swap_str = f" + معاوضه: {', '.join([p.name for p in swap_list])}" if swap_list else ""

        headlines = [
            f"📢 پیشنهاد رسمی ارسال شد: {sender_t} رسماً برای جذب {p_name} وارد عمل شد!",
            f"🚨 اقدام فوری در بازار: تماس رسمی {sender_t} با {rec_t} برای خرید {p_name} ({cash_str})!",
            f"👀 زیر نظر {sender_t}: پیشنهاد رسمی برای انتقال {p_name} روی میز مدیریت {rec_t}!",
            f"💣 پیشنهاد جدید در پنجره: تلاش {sender_t} برای شکار {p_name} از {rec_t}!"
        ]
        contents = [
            (
                f"📢 OFFICIAL BID SUBMITTED! 🚨\n"
                f"باشگاه {sender_t} اولین پیشنهاد رسمی خود را به مبلغ {cash_str}{swap_str} جهت جذب «{p_name}» به باشگاه {rec_t} ارائه داد.\n\n"
                f"📋 جزئیات پیشنهاد ارسالی:\n"
                f"• بازیکن هدف: {p_name} ({pos} | OVR {ovr})\n"
                f"• خریدار احتمالی: {sender_t} | تیم فعلی: {rec_t}\n"
                f"• ساختار مالی: {cash_str}\n\n"
                f"⏳ بررسی پیشنهاد توسط کادر مدیریتی {rec_t} در جریان است.\n\n"
                f"#پیشنهاد_رسمی #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"🚨 اخبار فوری نقل‌وانتقالات:\n"
                f"باشگاه {sender_t} رسماً برای جذب «{p_name}» وارد عمل شد. رقم پیشنهادی معادل {cash_str}{swap_str} به باشگاه {rec_t} اعلام گردیده است.\n\n"
                f"#نقل_و_انتقالات #مستر_لیگ #رسمی"
            ),
            (
                f"👀 پیشنهاد تازه روی میز:\n"
                f"باشگاه {sender_t} خواهان به خدمت گرفتن {p_name} از {rec_t} شد. ارزش این پیشنهاد رسمی {cash_str} برآورد شده است.\n\n"
                f"#پیشنهاد_خرید #مستر_لیگ #فوتبال"
            ),
            (
                f"📢 استارت مذاکرات برای {p_name}!\n"
                f"باشگاه {sender_t} با ارائه پیشنهادی به ارزش {cash_str}{swap_str} به {rec_t}، رسماً فرایند جذب ستاره را کلید زد.\n\n"
                f"#مستر_لیگ #نقل_و_انتقالات #اخبار"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 4. OFFER REJECTED
    elif obj.event_type == 'OFFER_REJECTED':
        sender_t = o.sender_team.name if o and o.sender_team else "باشگاه متقاضی"
        rec_t = o.receiver_team.name if o and o.receiver_team else "باشگاه مقصد"
        headlines = [
            f"❌ رد پیشنهاد رسمی: باشگاه {rec_t} پیشنهاد جذب {p_name} را نپذیرفت!",
            f"🚫 بن‌بست در مذاکرات: پیشنهاد {sender_t} برای خرید {p_name} رد شد!",
            f"❌ مذاکرات متوقف شد: پاسخ منفی {rec_t} به پیشنهاد {sender_t} برای {p_name}!",
            f"🚨 پیشنهاد رد شد: عدم توافق مالی میان {sender_t} و {rec_t} بر سر {p_name}!"
        ]
        contents = [
            (
                f"❌ BID REJECTED! 🚫\n"
                f"باشگاه {rec_t} پیشنهاد دریافتی از سوی {sender_t} برای فروش «{p_name}» را ناکافی دانست و آن را رسماً رد کرد.\n\n"
                f"📌 مدیران {rec_t} اعلام کرده‌اند ستاره تیم تنها با شرایط و مبالغ بالاتری قابل انتقال خواهد بود.\n\n"
                f"#رد_پیشنهاد #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"🚫 عدم توافق:\n"
                f"پیشنهاد خرید «{p_name}» توسط باشگاه {rec_t} رد شد و پرونده این دور از مذاکرات بسته گردید.\n\n"
                f"#مستر_لیگ #نقل_و_انتقالات"
            ),
            (
                f"❌ پاسخ منفی {rec_t} به {sender_t}!\n"
                f"پیشنهاد ارسالی برای خرید {p_name} مورد موافقت قرار نگرفت و رد شد.\n\n"
                f"#مستر_لیگ #انتقالات"
            ),
            (
                f"🚫 توقف گفتگوها:\n"
                f"باشگاه {rec_t} رسماً پیشنهاد جذب {p_name} را رد کرد.\n\n"
                f"#نقل_و_انتقالات #مستر_لیگ"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 5. OFFER CANCELLED
    elif obj.event_type == 'OFFER_CANCELLED':
        sender_t = o.sender_team.name if o and o.sender_team else "باشگاه پیشنهاد‌دهنده"
        headlines = [
            f"🚫 لغو پیشنهاد: باشگاه {sender_t} پیشنهاد خود برای {p_name} را پس گرفت!",
            f"⚠️ عقب‌نشینی در بازار: انصراف {sender_t} از جذب {p_name}!",
            f"🚫 لغو شد: پایان تلاش {sender_t} برای انتقال {p_name}!",
            f"⚠️ تغییر استراتژی: لغو رسمی پیشنهاد {sender_t} برای ستاره لیگ!"
        ]
        contents = [
            (
                f"🚫 BID WITHDRAWN! ⚠️\n"
                f"باشگاه {sender_t} پیشنهاد رسمی خود جهت به خدمت گرفتن «{p_name}» را پس گرفت و پرونده این انتقال مختومه اعلام شد.\n\n"
                f"#لغو_پیشنهاد #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"⚠️ انصراف از خرید:\n"
                f"باشگاه {sender_t} رسماً اعلام کرد پیشنهاد جذب {p_name} را کان لم یکن تلقی می‌کند.\n\n"
                f"#مستر_لیگ #نقل_و_انتقالات"
            ),
            (
                f"🚫 لغو فرآیند جذب {p_name} توسط باشگاه {sender_t}.\n\n#مستر_لیگ #انتقالات",
            ),
            (
                f"⚠️ پس گرفتن پیشنهاد خرید {p_name} از سوی {sender_t}.\n\n#نقل_و_انتقالات #مستر_لیگ",
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 6. PLAYER RELEASED
    elif obj.event_type == 'PLAYER_RELEASED':
        headlines = [
            f"📄 فسخ قرارداد رسمی: بازیکن جدید وارد بازار بازیکنان آزاد شد!",
            f"🚨 اعلامیه رسمی: جدایی بازیکن و ورود به لیست بازیکنان آزاد مستر لیگ!",
            f"📄 پایان همکاری: فسخ توافقی قرارداد و اعلام وضعیت بازیکن آزاد!",
            f"⚡ بازار بازیکنان آزاد داغ شد: بازیکن جدید در دسترس تمام مربیان لیگ!"
        ]
        contents = [
            (
                f"📄 OFFICIAL STATEMENT | فسخ قرارداد رسمی 🚨\n\n"
                f"{obj.description}\n\n"
                f"🌟 بازیکن فوق هم‌اکنون به عنوان بازیکن آزاد (Free Agent) در دسترس تمام تیم‌های لیگ برای جذب فوری قرار گرفته است.\n\n"
                f"#فسخ_قرارداد #بازیکن_آزاد #مستر_لیگ #نقل_و_انتقالات"
            ),
            (
                f"🚨 اطلاعیه نقل‌وانتقالات:\n\n{obj.description}\n\n#بازیکن_آزاد #مستر_لیگ #فوتبال"
            ),
            (
                f"📄 جدایی قطعی و ورود به مارکت آزاد:\n\n{obj.description}\n\n#مستر_لیگ #نقل_و_انتقالات"
            ),
            (
                f"⚡ بازیکن آزاد جدید در مستر لیگ!\n\n{obj.description}\n\n#FreeAgent #مستر_لیگ"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 7. FREE AGENT SIGNED
    elif obj.event_type == 'FREE_AGENT_SIGNED':
        headlines = [
            f"🌟 شکار بزرگ از بازار آزاد: صید طلایی بازیکن آزاد در مستر لیگ! Here we go!",
            f"🚨 صید جدید بازار آزاد: پیوستن ستاره جدید به مسابقات مستر لیگ!",
            f"🟢 Done Deal: جذب رسمی بازیکن آزاد و ثبت در سازمان لیگ!",
            f"🌟 بمب بازار آزاد: شکار ارزشمند در پنجره نقل‌وانتقالات مستر لیگ!"
        ]
        contents = [
            (
                f"🌟 FREE AGENT SIGNED & HERE WE GO! 🚨\n\n"
                f"{obj.description}\n\n"
                f"✍️ مدارک و قرارداد با موفقیت در سیستم نقل‌وانتقالات سازمان لیگ ثبت گردید و کارت بازی صادر شد.\n\n"
                f"#بازیکن_آزاد #HereWeGo #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"🚨 شکار از بازار آزاد!\n\n{obj.description}\n\n#DoneDeal #مستر_لیگ #فوتبال"
            ),
            (
                f"🟢 قرارداد رسمی بازیکن آزاد بسته شد.\n\n{obj.description}\n\n#مستر_لیگ #نقل_و_انتقالات"
            ),
            (
                f"🌟 صید درخشان نقل‌وانتقالات:\n\n{obj.description}\n\n#مستر_لیگ #HereWeGo"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    # 8. LOAN EXPIRED
    elif obj.event_type == 'LOAN_EXPIRED':
        headlines = [
            f"🔄 پایان قرارداد قرضی: بازگشت بازیکن به باشگاه اصلی در مستر لیگ",
            f"📋 ماموریت قرضی به پایان رسید: ستاره به تیم مالک خود بازگشت",
            f"🔄 اتمام سقف بازی‌های قرضی و بازگشت به ترکیب باشگاه مبدأ",
            f"🚨 پایان دوره قرضی: بازیکن رسماً به تیم اصلی خود بازگشت"
        ]
        contents = [
            (
                f"🔄 LOAN SPELL ENDED 📋\n\n"
                f"{obj.description}\n\n"
                f"✅ بازیکن پس از تکمیل بازی‌های تعیین‌شده به لیست تیم اصلی بازگشت و در خدمت کادر فنی باشگاه مالک قرار گرفت.\n\n"
                f"#پایان_قرضی #نقل_و_انتقالات #مستر_لیگ"
            ),
            (
                f"📋 بازگشت به خانه:\n\n{obj.description}\n\n#مستر_لیگ #قرضی"
            ),
            (
                f"🔄 اتمام مدت قرارداد قرضی و ثبت بازگشت در سازمان لیگ.\n\n{obj.description}\n\n#مستر_لیگ"
            ),
            (
                f"🚨 پایان دوره قرضی بازیکن در مسابقات مستر لیگ.\n\n{obj.description}\n\n#نقل_و_انتقالات"
            )
        ]
        return headlines[variant % len(headlines)], contents[variant % len(contents)]

    return "📰 گزارش رسمی نقل‌وانتقالات مستر لیگ", f"{obj.description}\n\n#مستر_لیگ"


class TransferLogSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    news_headline = serializers.SerializerMethodField()
    news_content = serializers.SerializerMethodField()
    offer_details = serializers.SerializerMethodField()

    class Meta:
        model = TransferLog
        fields = [
            'id', 'event_type', 'event_type_display', 'description', 
            'related_offer', 'timestamp', 'news_headline', 'news_content', 'offer_details'
        ]

    def get_news_headline(self, obj):
        headline, _ = _get_romano_headline_and_content(obj)
        return headline

    def get_news_content(self, obj):
        _, content = _get_romano_headline_and_content(obj)
        return content

    def get_offer_details(self, obj):
        o = obj.related_offer
        if o:
            tp = o.target_player
            seller_name = o.receiver_team.name if tp and tp.team_id == o.sender_team_id else (o.sender_team.name if o.sender_team else None)
            buyer_name = o.sender_team.name if tp and tp.team_id == o.sender_team_id else (o.receiver_team.name if o.receiver_team else None)
            seller_team = o.receiver_team if tp and tp.team_id == o.sender_team_id else o.sender_team
            buyer_team = o.sender_team if tp and tp.team_id == o.sender_team_id else o.receiver_team

            romano_tag = "🚨 HERE WE GO!"
            if obj.event_type == 'TRANSFER_FINALIZED':
                romano_tag = "🚨 HERE WE GO!"
            elif obj.event_type == 'COUNTER_OFFER':
                romano_tag = "🔥 COUNTER OFFER"
            elif obj.event_type == 'OFFER_MADE':
                romano_tag = "📢 OFFICIAL BID"
            elif obj.event_type == 'OFFER_REJECTED':
                romano_tag = "❌ BID REJECTED"
            elif obj.event_type == 'OFFER_CANCELLED':
                romano_tag = "🚫 BID CANCELLED"

            return {
                'offer_id': o.id,
                'romano_tag': romano_tag,
                'sender_team_name': o.sender_team.name if o.sender_team else None,
                'sender_team_logo': o.sender_team.logo.url if (o.sender_team and o.sender_team.logo) else None,
                'receiver_team_name': o.receiver_team.name if o.receiver_team else None,
                'receiver_team_logo': o.receiver_team.logo.url if (o.receiver_team and o.receiver_team.logo) else None,
                'seller_team_name': seller_name,
                'seller_team_logo': seller_team.logo.url if (seller_team and seller_team.logo) else None,
                'buyer_team_name': buyer_name,
                'buyer_team_logo': buyer_team.logo.url if (buyer_team and buyer_team.logo) else None,
                'target_player_id': tp.id if tp else None,
                'target_player_name': tp.name if tp else None,
                'target_player_overall': tp.overall if tp else None,
                'target_player_position': tp.position if tp else None,
                'target_player_age': getattr(tp, 'age', None) if tp else None,
                'target_player_photo': resolve_player_photo_url(tp) if tp else None,
                'cash_amount': float(o.cash_amount or 0),
                'offer_type': o.offer_type,
                'offer_type_display': o.get_offer_type_display(),
                'loan_duration_matches': o.loan_duration_matches,
                'swap_players_details': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'overall': p.overall,
                        'position': p.position,
                        'photo_url': resolve_player_photo_url(p),
                    }
                    for p in o.swap_players.all()
                ],
                'status': o.status,
                'status_display': o.get_status_display(),
            }

        # Fallback if no related_offer (e.g. Player Released, Free Agent, Auction, or direct history log)
        # Attempt to find player mentioned in description
        p_match = None
        desc = obj.description or ''
        if '«' in desc and '»' in desc:
            extracted_name = desc.split('«')[1].split('»')[0].strip()
            p_match = Player.objects.filter(name=extracted_name).first()
        
        romano_tag = "📰 LEAGUE REPORT"
        if obj.event_type == 'PLAYER_RELEASED':
            romano_tag = "📄 FREE AGENT"
        elif obj.event_type == 'FREE_AGENT_SIGNED':
            romano_tag = "🌟 SIGNING"
        elif obj.event_type == 'LOAN_EXPIRED':
            romano_tag = "🔄 LOAN EXPIRED"
        elif obj.event_type == 'TRANSFER_FINALIZED':
            romano_tag = "🚨 DONE DEAL"

        if p_match:
            return {
                'offer_id': None,
                'romano_tag': romano_tag,
                'target_player_id': p_match.id,
                'target_player_name': p_match.name,
                'target_player_overall': p_match.overall,
                'target_player_position': p_match.position,
                'target_player_age': getattr(p_match, 'age', None),
                'target_player_photo': resolve_player_photo_url(p_match),
                'seller_team_name': p_match.team.name if p_match.team else None,
                'seller_team_logo': p_match.team.logo.url if (p_match.team and p_match.team.logo) else None,
                'buyer_team_name': None,
                'buyer_team_logo': None,
                'cash_amount': 0.0,
                'offer_type': 'DIRECT_TRANSFER',
                'offer_type_display': 'گزارش رسمی',
                'loan_duration_matches': 0,
                'swap_players_details': [],
                'status': 'FINALIZED',
                'status_display': 'نهایی شده',
            }

        return {
            'offer_id': None,
            'romano_tag': romano_tag,
            'target_player_id': None,
            'target_player_name': None,
            'target_player_overall': None,
            'target_player_position': None,
            'target_player_photo': None,
            'seller_team_name': None,
            'seller_team_logo': None,
            'buyer_team_name': None,
            'buyer_team_logo': None,
            'cash_amount': 0.0,
            'offer_type': 'DIRECT_TRANSFER',
            'offer_type_display': 'گزارش رسمی',
            'loan_duration_matches': 0,
            'swap_players_details': [],
            'status': 'FINALIZED',
            'status_display': 'نهایی شده',
        }


class SimplePlayerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = [
            'id', 'name', 'photo_url', 'position', 'overall', 'potential_ovr', 'age', 'wage', 'market_value',
            'shirt_number', 'is_starting', 'virtual_stamina', 'is_injured', 'rarity'
        ]

    def get_photo_url(self, obj):
        return resolve_player_photo_url(obj)

class LeagueTeamSerializer(serializers.ModelSerializer):
    players = SimplePlayerSerializer(many=True, read_only=True)
    manager_name = serializers.CharField(source='manager.username', read_only=True, default=None)
    manager_full_name = serializers.CharField(source='manager.full_name', read_only=True, default=None)
    manager_birth_date = serializers.DateField(source='manager.birth_date', read_only=True, default=None)
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'logo', 'budget', 'gems', 'star_rating', 'manager', 'manager_name', 'manager_full_name', 'manager_birth_date', 'players']

