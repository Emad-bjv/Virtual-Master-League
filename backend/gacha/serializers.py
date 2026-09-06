from rest_framework import serializers
from .models import Pack, PackPlayer, PackOpeningSession


class PackPlayerSerializer(serializers.ModelSerializer):
    claimed_by_team_name = serializers.CharField(source='claimed_by_team.name', read_only=True)
    card_image = serializers.ImageField(required=False, allow_null=True)
    club_logo = serializers.ImageField(required=False, allow_null=True)
    effective_weight = serializers.IntegerField(source='get_effective_weight', read_only=True)

    class Meta:
        model = PackPlayer
        fields = [
            'id', 'pack', 'name', 'position', 'compatible_positions', 'overall', 'potential_ovr',
            'age', 'base_stamina', 'drop_weight', 'effective_weight', 'card_image', 'nationality', 'prime_club', 'club_logo',
            'rarity', 'wage', 'market_value', 'is_claimed', 'claimed_by_team',
            'claimed_by_team_name', 'claimed_at', 'created_at'
        ]
        read_only_fields = ['is_claimed', 'claimed_by_team', 'claimed_at', 'created_at']

    def to_internal_value(self, data):
        # Handle string URL or empty string for image fields gracefully
        if hasattr(data, '_mutable'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        data.pop('id', None)

        for img_field in ['card_image', 'club_logo']:
            img_val = data.get(img_field)
            if isinstance(img_val, str) or img_val is None or img_val == '':
                data.pop(img_field, None)

        for num in ['overall', 'potential_ovr', 'age', 'base_stamina', 'wage', 'market_value', 'drop_weight']:
            if num in data:
                val = data.get(num)
                val_str = str(val).strip().lower()
                if val in ('', None) or val_str in ('', 'null', 'undefined', 'none', 'nan'):
                    data[num] = 0

        for str_field in ['compatible_positions', 'nationality', 'prime_club']:
            if str_field in data:
                val = data.get(str_field)
                if str(val).strip().lower() in ('null', 'undefined', 'none'):
                    data[str_field] = ''

        return super().to_internal_value(data)


class PackSerializer(serializers.ModelSerializer):
    total_players_count = serializers.IntegerField(read_only=True)
    unclaimed_players_count = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    is_time_valid = serializers.BooleanField(read_only=True)
    is_discount_active = serializers.BooleanField(read_only=True)
    effective_cost_gems = serializers.IntegerField(read_only=True)
    effective_cost_usd = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    purchase_method_display = serializers.CharField(source='get_purchase_method_display', read_only=True)
    cover_image = serializers.ImageField(required=False, allow_null=True)
    custom_card_bg = serializers.ImageField(required=False, allow_null=True)
    odds = serializers.DictField(source='get_odds_breakdown', read_only=True)

    class Meta:
        model = Pack
        fields = [
            'id', 'name', 'tier', 'tier_display', 'cover_image', 'custom_card_bg', 'description',
            'ovr_range_text', 'cost_usd', 'cost_gems', 'cost_irr',
            'badge_tag', 'custom_tag_text', 'custom_tag_color',
            'discount_cost_gems', 'discount_cost_usd', 'discount_until',
            'is_discount_active', 'effective_cost_gems', 'effective_cost_usd',
            'purchase_method', 'purchase_method_display', 'featured_team',
            'available_from', 'available_until', 'is_active', 'sort_order',
            'weight_top_tier', 'weight_mid_tier', 'weight_base_tier', 'guarantee_min_ovr',
            'early_bird_boost_pct',
            'odds', 'total_players_count', 'unclaimed_players_count', 'is_sold_out',
            'is_time_valid', 'created_at'
        ]

    def to_internal_value(self, data):
        # Handle string URL or empty string for image fields gracefully
        if hasattr(data, '_mutable'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        # Strip id so it doesn't cause read-only or type errors
        data.pop('id', None)

        for img_field in ['cover_image', 'custom_card_bg']:
            img_val = data.get(img_field)
            if isinstance(img_val, str) or img_val is None or img_val == '':
                data.pop(img_field, None)

        # Sanitize optional datetime fields
        for dt in ['available_from', 'available_until', 'discount_until']:
            if dt in data:
                val = data.get(dt)
                if val in ('', 'null', 'undefined', 'None', None) or str(val).strip() == '':
                    data[dt] = None

        # Sanitize optional discount numbers
        for opt_num in ['discount_cost_gems', 'discount_cost_usd']:
            if opt_num in data:
                val = data.get(opt_num)
                if val in ('', 'null', 'undefined', 'None', None) or str(val).strip() == '':
                    data[opt_num] = None

        # Sanitize numbers
        for num in ['cost_usd', 'cost_irr', 'cost_gems', 'sort_order', 'weight_top_tier', 'weight_mid_tier', 'weight_base_tier', 'guarantee_min_ovr', 'early_bird_boost_pct']:
            if num in data:
                val = data.get(num)
                val_str = str(val).strip().lower()
                if val in ('', None) or val_str in ('', 'null', 'undefined', 'none', 'nan'):
                    data[num] = 0

        # Sanitize boolean fields sent as strings from FormData
        if 'is_active' in data:
            data['is_active'] = str(data['is_active']).lower() in ['true', '1', 'yes']

        # Sanitize string fields to avoid literal "null"
        for str_field in ['description', 'ovr_range_text', 'featured_team']:
            if str_field in data:
                val = data.get(str_field)
                if str(val).strip().lower() in ('null', 'undefined', 'none'):
                    data[str_field] = ''

        return super().to_internal_value(data)


class PackOpeningSessionSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    pack_name = serializers.CharField(source='pack.name', read_only=True)
    pack_tier = serializers.CharField(source='pack.tier', read_only=True)
    card_1_detail = PackPlayerSerializer(source='card_1', read_only=True)
    card_2_detail = PackPlayerSerializer(source='card_2', read_only=True)
    card_3_detail = PackPlayerSerializer(source='card_3', read_only=True)
    picked_card_detail = PackPlayerSerializer(source='picked_card', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PackOpeningSession
        fields = [
            'id', 'team', 'team_name', 'pack', 'pack_name', 'pack_tier',
            'card_1', 'card_1_detail', 'card_2', 'card_2_detail',
            'card_3', 'card_3_detail', 'picked_card', 'picked_card_detail',
            'created_player', 'payment_method', 'cost', 'status',
            'status_display', 'expires_at', 'created_at', 'completed_at'
        ]
