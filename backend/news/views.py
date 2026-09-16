from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import F, Q
from .models import LeagueNews, NewsReaction
from .serializers import LeagueNewsSerializer
from .news_engine import backfill_historical_news


class NewsFeedListView(generics.ListAPIView):
    """
    Public coach feed of all published news with category filtering and keyword search.
    """
    serializer_class = LeagueNewsSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = LeagueNews.objects.filter(is_published=True).select_related(
            'related_player', 'related_team', 'related_match', 'related_match__tournament'
        )

        # Dynamically exclude news for suspended tournaments (e.g. League or Cup with is_active=False)
        qs = qs.filter(
            Q(related_match__isnull=True) |
            Q(related_match__tournament__isnull=True) |
            Q(related_match__tournament__is_active=True)
        )

        category = self.request.query_params.get('category')
        if category and category.upper() != 'ALL':
            qs = qs.filter(category=category.upper())

        search = self.request.query_params.get('search')
        if search and search.strip():
            query = search.strip()
            qs = qs.filter(
                Q(title__icontains=query) |
                Q(summary__icontains=query) |
                Q(content__icontains=query) |
                Q(related_player__name__icontains=query) |
                Q(related_team__name__icontains=query)
            )

        return qs.order_by('-is_pinned', '-created_at')


class NewsDetailView(generics.RetrieveAPIView):
    """
    Retrieve single news details and increment views count.
    """
    serializer_class = LeagueNewsSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return LeagueNews.objects.filter(is_published=True).select_related(
            'related_player', 'related_team', 'related_match', 'related_match__tournament'
        ).filter(
            Q(related_match__isnull=True) |
            Q(related_match__tournament__isnull=True) |
            Q(related_match__tournament__is_active=True)
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment views atomically
        LeagueNews.objects.filter(id=instance.id).update(views_count=F('views_count') + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class NewsReactView(APIView):
    """
    Toggle emoji reaction (fire, heart, like, clap, mindblown) on a news article.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, news_id):
        news = get_object_or_404(LeagueNews, id=news_id)
        reaction_type = request.data.get('reaction_type', '').strip().lower()

        valid_reactions = ['fire', 'heart', 'like', 'clap', 'mindblown']
        if reaction_type not in valid_reactions:
            return Response({'error': 'نوع واکنش نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = NewsReaction.objects.filter(news=news, user=request.user).first()
        user_reaction = None

        if existing:
            if existing.reaction_type == reaction_type:
                # Remove reaction
                existing.delete()
                user_reaction = None
            else:
                # Switch reaction
                existing.reaction_type = reaction_type
                existing.save()
                user_reaction = reaction_type
        else:
            # Create new reaction
            NewsReaction.objects.create(news=news, user=request.user, reaction_type=reaction_type)
            user_reaction = reaction_type

        # Recompute totals for news.reactions_count
        counts = {}
        for r_type in valid_reactions:
            count = NewsReaction.objects.filter(news=news, reaction_type=r_type).count()
            if count > 0:
                counts[r_type] = count

        news.reactions_count = counts
        news.save(update_fields=['reactions_count'])

        return Response({
            'user_reaction': user_reaction,
            'reactions_count': counts
        }, status=status.HTTP_200_OK)


# =========================================================================
# ADMIN NEWS VIEWS
# =========================================================================

class AdminNewsListView(generics.ListCreateAPIView):
    """
    Admin: View all news (including drafts and hidden) and create manual news.
    """
    serializer_class = LeagueNewsSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = LeagueNews.objects.all().select_related(
            'related_player', 'related_team', 'related_match', 'related_match__tournament'
        )
        category = self.request.query_params.get('category')
        if category and category.upper() != 'ALL':
            qs = qs.filter(category=category.upper())
        search = self.request.query_params.get('search')
        if search and search.strip():
            query = search.strip()
            qs = qs.filter(Q(title__icontains=query) | Q(summary__icontains=query))
        return qs.order_by('-is_pinned', '-created_at')

    def perform_create(self, serializer):
        serializer.save(author_name='ادمین لیگ VML')


class AdminNewsDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin: Edit, toggle pin/published, or delete news article.
    """
    serializer_class = LeagueNewsSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = LeagueNews.objects.all()


class AdminNewsBackfillView(APIView):
    """
    Admin: Trigger historical backfill generator to produce authentic news from database records.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        limit = int(request.data.get('limit', 25))
        created = backfill_historical_news(limit=limit)
        return Response({
            'success': True,
            'created_count': created,
            'message': f'{created} خبر جدید و واقعی از رویدادهای پیشین دیتابیس تولید و منتشر گردید.'
        }, status=status.HTTP_200_OK)
