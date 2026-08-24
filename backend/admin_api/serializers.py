from rest_framework import serializers
from users.models import User
from economy.models import StorePackage, Transaction
from core.models import GlobalSettings
from audit.models import AdminAuditLog
from gacha.models import Pack, PackPlayer, PackOpeningSession
from matches.models import Season, Tournament, Match, MatchEvent, PlayerMatchStat, LiveSubstitutionRequest, MatchTeamStat, LeagueStanding
from notifications.models import Notification
from realtime.models import AdminNotification
from season_pass.models import WeeklyTask, TeamTaskProgress, SeasonPassLevel, TeamSeasonPass
from transfers.models import TransferListing, TransferBid, TransferHistory
from teams.models import Team, ClubFacilities, Player, PlayerGrowthLog, TeamGamePlan

def create_model_serializer(target_model):
    meta_cls = type('Meta', (), {'model': target_model, 'fields': '__all__'})
    return type(f"{target_model.__name__}Serializer", (serializers.ModelSerializer,), {'Meta': meta_cls})

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user

StorePackageSerializer = create_model_serializer(StorePackage)
TransactionSerializer = create_model_serializer(Transaction)

GlobalSettingsSerializer = create_model_serializer(GlobalSettings)
AdminAuditLogSerializer = create_model_serializer(AdminAuditLog)

PackSerializer = create_model_serializer(Pack)
PackPlayerSerializer = create_model_serializer(PackPlayer)
PackOpeningSessionSerializer = create_model_serializer(PackOpeningSession)

SeasonSerializer = create_model_serializer(Season)
TournamentSerializer = create_model_serializer(Tournament)
MatchSerializer = create_model_serializer(Match)
MatchEventSerializer = create_model_serializer(MatchEvent)
PlayerMatchStatSerializer = create_model_serializer(PlayerMatchStat)
LiveSubstitutionRequestSerializer = create_model_serializer(LiveSubstitutionRequest)
MatchTeamStatSerializer = create_model_serializer(MatchTeamStat)
LeagueStandingSerializer = create_model_serializer(LeagueStanding)

NotificationSerializer = create_model_serializer(Notification)
AdminNotificationSerializer = create_model_serializer(AdminNotification)

WeeklyTaskSerializer = create_model_serializer(WeeklyTask)
TeamTaskProgressSerializer = create_model_serializer(TeamTaskProgress)
SeasonPassLevelSerializer = create_model_serializer(SeasonPassLevel)
TeamSeasonPassSerializer = create_model_serializer(TeamSeasonPass)

TransferListingSerializer = create_model_serializer(TransferListing)
TransferBidSerializer = create_model_serializer(TransferBid)
TransferHistorySerializer = create_model_serializer(TransferHistory)

TeamSerializer = create_model_serializer(Team)
ClubFacilitiesSerializer = create_model_serializer(ClubFacilities)
PlayerSerializer = create_model_serializer(Player)
PlayerGrowthLogSerializer = create_model_serializer(PlayerGrowthLog)
TeamGamePlanSerializer = create_model_serializer(TeamGamePlan)
