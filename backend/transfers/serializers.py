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
        o = obj.related_offer
        if obj.event_type == 'TRANSFER_FINALIZED':
            if o and o.target_player:
                tp = o.target_player
                seller_name = o.receiver_team.name if tp.team_id == o.sender_team_id else o.sender_team.name
                buyer_name = o.sender_team.name if tp.team_id == o.sender_team_id else o.receiver_team.name
                if o.offer_type == 'SWAP':
                    return f"🚨 معاوضه بزرگ و رسمی: توافق هیجان‌انگیز میان {seller_name} و {buyer_name} نهایی شد!"
                elif o.offer_type == 'LOAN':
                    return f"🔄 انتقال قرضی رسمی: {tp.name} به مدت {o.loan_duration_matches} مسابقه به {buyer_name} پیوست!"
                return f"🚨 رسمی: بمب نقل‌وانتقالات منفجر شد؛ {tp.name} به {buyer_name} پیوست!"
            return "🚨 توافق و انتقال رسمی در لیگ ثبت شد!"
        elif obj.event_type == 'COUNTER_OFFER':
            if o and o.target_player:
                return f"🔄 پیشنهاد متقابل: مذاکرات داغ میان {o.sender_team.name} و {o.receiver_team.name} برای {o.target_player.name}"
            return "🔄 تغییر شرایط و ارسال پیشنهاد متقابل در مذاکرات"
        elif obj.event_type == 'OFFER_MADE':
            if o and o.target_player:
                return f"📢 پیشنهاد رسمی: ابراز علاقه باشگاه {o.sender_team.name} به جذب {o.target_player.name}"
            return "📢 ارسال پیشنهاد جدید نقل‌وانتقالات"
        elif obj.event_type == 'OFFER_REJECTED':
            if o and o.target_player:
                return f"❌ رد پیشنهاد: پیشنهاد جذب {o.target_player.name} توسط باشگاه مقصد رد شد"
            return "❌ رد پیشنهاد نقل‌وانتقالاتی"
        elif obj.event_type == 'OFFER_CANCELLED':
            if o and o.target_player:
                return f"🚫 لغو پیشنهاد: باشگاه {o.sender_team.name} پیشنهاد خود را پس گرفت"
            return "🚫 لغو پیشنهاد نقل‌وانتقالات"
        elif obj.event_type == 'PLAYER_RELEASED':
            return "📄 فسخ قرارداد رسمی و معرفی بازیکن آزاد جدید در مستر لیگ"
        elif obj.event_type == 'LOAN_EXPIRED':
            return "🔄 پایان قرارداد قرضی و بازگشت بازیکن به باشگاه اصلی"
        elif obj.event_type == 'FREE_AGENT_SIGNED':
            return "🌟 صید بزرگ از بازار آزاد: جذب بازیکن جدید در مستر لیگ"
        return "📰 گزارش رسمی رویداد مستر لیگ"

    def get_news_content(self, obj):
        o = obj.related_offer
        if obj.event_type == 'TRANSFER_FINALIZED' and o:
            tp = o.target_player
            p_name = tp.name if tp else 'بازیکن'
            pos = tp.position if tp else '-'
            ovr = tp.overall if tp else '-'
            cash_num = float(o.cash_amount or 0)
            cash_str = f"${cash_num:,.0f}"

            seller_name = o.receiver_team.name if tp and tp.team_id == o.sender_team_id else o.sender_team.name
            buyer_name = o.sender_team.name if tp and tp.team_id == o.sender_team_id else o.receiver_team.name

            if o.offer_type == 'SWAP':
                swap_list = list(o.swap_players.all())
                swap_details_lines = []
                for sp in swap_list:
                    swap_details_lines.append(f"  • {sp.name} (پست: {sp.position} | اورال: {sp.overall})")
                swap_text = "\n".join(swap_details_lines) if swap_details_lines else "  • بازیکنان توافق‌شده"
                cash_part = f"\n• مبلغ نقدی پرداختی (واریزی {buyer_name} به {seller_name}): {cash_str}" if cash_num > 0 else ""

                return (
                    f"🤝 بمب نقل‌وانتقالات در مستر لیگ منفجر شد!\n"
                    f"معاوضه رسمی و تاییدشده میان باشگاه‌های {seller_name} و {buyer_name} با موفقیت نهایی گردید.\n\n"
                    f"📋 جزئیات بازیکنان معاوضه:\n"
                    f"⬅️ بازیکن خروجی از {seller_name} به مقصد {buyer_name}:\n"
                    f"  • {p_name} (پست: {pos} | اورال: {ovr})\n\n"
                    f"➡️ بازیکن(های) خروجی از {buyer_name} به مقصد {seller_name}:\n"
                    f"{swap_text}"
                    f"{cash_part}\n\n"
                    f"💼 وضعیت معامله: نهایی و ثبت رسمی در سازمان لیگ\n\n"
                    f"#نقل_و_انتقالات #معاوضه #مستر_لیگ #رسمی #فوتبال"
                )
            elif o.offer_type == 'LOAN':
                return (
                    f"🔄 توافق رسمی برای انتقال قرضی بازیکن به سرانجام رسید!\n\n"
                    f"📋 جزئیات قرارداد قرضی:\n"
                    f"• بازیکن: {p_name} (پست: {pos} | اورال: {ovr})\n"
                    f"• باشگاه مبدأ (مالک): {seller_name}\n"
                    f"• باشگاه مقصد (قرض‌گیرنده): {buyer_name}\n"
                    f"• مدت قرارداد قرضی: {o.loan_duration_matches} مسابقه رسمی\n"
                    f"• مبلغ اجاره: {cash_str}\n\n"
                    f"#نقل_و_انتقالات #قرضی #مستر_لیگ #رسمی"
                )
            else:
                # DIRECT_TRANSFER
                return (
                    f"⚽ توافق رسمی و نهایی در بازار نقل‌وانتقالات مستر لیگ حاصل شد!\n\n"
                    f"📋 جزئیات انتقال:\n"
                    f"• بازیکن: {p_name} (پست: {pos} | اورال: {ovr})\n"
                    f"• باشگاه فروشنده: {seller_name}\n"
                    f"• باشگاه خریدار: {buyer_name}\n"
                    f"• مبلغ قرارداد: {cash_str}\n"
                    f"• ساختار معامله: خرید و فروش قطعی\n\n"
                    f"#نقل_و_انتقالات #مستر_لیگ #رسمی #فوتبال"
                )
        elif obj.event_type == 'COUNTER_OFFER' and o:
            tp = o.target_player
            p_name = tp.name if tp else 'بازیکن'
            cash = f"${float(o.cash_amount or 0):,.0f}"
            swap_list = list(o.swap_players.all())
            swap_str = f" + معاوضه: {', '.join([p.name for p in swap_list])}" if swap_list else ""
            return (
                f"🔥 مذاکرات فشرده و هیجان‌انگیز بر سر انتقال {p_name} وارد فاز جدیدی شد.\n"
                f"باشگاه {o.sender_team.name} با اصلاح شرایط و ارائه مبلغ {cash}{swap_str}، پیشنهاد متقابل خود را رسماً به باشگاه {o.receiver_team.name} تحویل داد.\n\n"
                f"#نقل_و_انتقالات #مذاکرات #مستر_لیگ"
            )
        elif obj.event_type == 'OFFER_MADE' and o:
            tp = o.target_player
            p_name = tp.name if tp else 'بازیکن'
            cash = f"${float(o.cash_amount or 0):,.0f}"
            swap_list = list(o.swap_players.all())
            swap_str = f" + معاوضه: {', '.join([p.name for p in swap_list])}" if swap_list else ""
            return (
                f"📢 باشگاه {o.sender_team.name} پیشنهادی رسمی به ارزش {cash}{swap_str} جهت جذب {p_name} به باشگاه {o.receiver_team.name} ارسال نمود.\n\n"
                f"#پیشنهاد_رسمی #نقل_و_انتقالات #مستر_لیگ"
            )
        elif obj.event_type == 'FREE_AGENT_SIGNED':
            return f"🌟 صید بزرگ از بازار آزاد مستر لیگ!\n\n{obj.description}\n\n#بازیکن_آزاد #نقل_و_انتقالات #مستر_لیگ"
        elif obj.event_type == 'PLAYER_RELEASED':
            return f"📄 فسخ رسمی قرارداد در مستر لیگ!\n\n{obj.description}\n\n#فسخ_قرارداد #بازیکن_آزاد #مستر_لیگ"
        return f"{obj.description}\n\n#اخبار_لیگ #مستر_لیگ"

    def get_offer_details(self, obj):
        o = obj.related_offer
        if not o:
            return None
        tp = o.target_player
        seller_name = o.receiver_team.name if tp and tp.team_id == o.sender_team_id else o.sender_team.name
        buyer_name = o.sender_team.name if tp and tp.team_id == o.sender_team_id else o.receiver_team.name

        return {
            'offer_id': o.id,
            'sender_team_name': o.sender_team.name if o.sender_team else None,
            'receiver_team_name': o.receiver_team.name if o.receiver_team else None,
            'seller_team_name': seller_name,
            'buyer_team_name': buyer_name,
            'target_player_name': tp.name if tp else None,
            'target_player_overall': tp.overall if tp else None,
            'target_player_position': tp.position if tp else None,
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

