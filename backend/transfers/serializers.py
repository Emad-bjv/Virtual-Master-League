from rest_framework import serializers
from .models import TransferListing, TransferBid, TransferHistory, TransferOffer, TransferLog
from teams.models import Team, Player


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
    receiver_team_name = serializers.CharField(source='receiver_team.name', read_only=True)
    target_player_name = serializers.CharField(source='target_player.name', read_only=True)
    target_player_overall = serializers.IntegerField(source='target_player.overall', read_only=True)
    swap_players_details = serializers.SerializerMethodField()

    class Meta:
        model = TransferOffer
        fields = [
            'id', 'sender_team', 'sender_team_name', 'receiver_team', 'receiver_team_name',
            'target_player', 'target_player_name', 'target_player_overall',
            'offer_type', 'cash_amount', 'swap_players', 'swap_players_details',
            'loan_duration_matches', 'status', 'parent_offer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']

    def get_swap_players_details(self, obj):
        return [{'id': p.id, 'name': p.name, 'overall': p.overall, 'position': p.position} for p in obj.swap_players.all()]

class TransferLogSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = TransferLog
        fields = ['id', 'event_type', 'event_type_display', 'description', 'related_offer', 'timestamp']

class SimplePlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'position', 'overall', 'age', 'wage']

class LeagueTeamSerializer(serializers.ModelSerializer):
    players = SimplePlayerSerializer(many=True, read_only=True)
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'logo', 'budget', 'players']
