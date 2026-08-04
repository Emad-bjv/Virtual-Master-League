from rest_framework import serializers
from .models import TransferListing, TransferBid, TransferHistory


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
