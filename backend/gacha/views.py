from rest_framework import generics, status, views
from rest_framework.response import Response
from .models import GachaPack, GachaPity, PackOpeningLog
from .serializers import GachaPackSerializer, GachaPitySerializer, PackOpeningLogSerializer
from .services import open_gacha_pack


class GachaPackListView(generics.ListAPIView):
    """
    Returns active Gacha packs available for purchase.
    """
    queryset = GachaPack.objects.filter(is_active=True)
    serializer_class = GachaPackSerializer


class OpenGachaPackView(views.APIView):
    """
    Executes Gacha pack opening. Accepts team_id and pack_id.
    """
    def post(self, request):
        team_id = request.data.get('team_id')
        pack_id = request.data.get('pack_id')

        if not team_id or not pack_id:
            return Response({'error': 'team_id and pack_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = open_gacha_pack(team_id=int(team_id), pack_id=int(pack_id))

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class TeamPityView(views.APIView):
    """
    Returns current Pity counter status for a team.
    """
    def get(self, request, team_id):
        try:
            pity = GachaPity.objects.get(team_id=team_id)
            serializer = GachaPitySerializer(pity)
            return Response(serializer.data)
        except GachaPity.DoesNotExist:
            return Response({'counter': 0, 'total_pulls': 0})
