from rest_framework import views, permissions, status
from rest_framework.response import Response
from .models import GlobalSettings
from .serializers import GlobalSettingsSerializer

class GlobalSettingsView(views.APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get(self, request, *args, **kwargs):
        settings = GlobalSettings.get_settings()
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        settings = GlobalSettings.get_settings()
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from django.apps import apps
from django.forms.models import model_to_dict
import json
from datetime import date, datetime

def _serialize_value(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val

def _serialize_instance(obj):
    data = {}
    for field in obj._meta.fields:
        val = getattr(obj, field.name)
        data[field.name] = _serialize_value(val)
    return data

class AdminDatabaseSummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        target_models = [
            ('users', 'User', 'کاربران'),
            ('teams', 'Team', 'تیم‌ها'),
            ('teams', 'Player', 'بازیکنان'),
            ('teams', 'ClubFacilities', 'تسهیلات باشگاه‌ها'),
            ('teams', 'TeamGamePlan', 'ترکیب‌ها و تاکتیک‌ها'),
            ('matches', 'Match', 'مسابقات'),
            ('matches', 'MatchEvent', 'رویدادهای مسابقه'),
            ('matches', 'Tournament', 'تورنمنت‌ها'),
            ('transfers', 'TransferListing', 'آگهی‌های نقل و انتقالات'),
            ('transfers', 'TransferBid', 'پیشنهادهای خرید'),
            ('season_pass', 'SeasonPass', 'سیزن پس‌ها'),
            ('season_pass', 'SeasonPassTask', 'ماموریت‌های سیزن پس'),
            ('core', 'GlobalSettings', 'تنظیمات سراسری'),
            ('users', 'OTPRecord', 'کدهای OTP'),
        ]

        summary = []
        for app_label, model_name, verbose_name in target_models:
            try:
                model = apps.get_model(app_label, model_name)
                count = model.objects.count()
                summary.append({
                    'app_label': app_label,
                    'model_name': model_name,
                    'verbose_name': verbose_name,
                    'count': count
                })
            except Exception:
                continue

        return Response(summary, status=status.HTTP_200_OK)


class AdminDatabaseTableView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        app_label = request.query_params.get('app_label', 'users')
        model_name = request.query_params.get('model_name', 'User')
        search = request.query_params.get('search', '')

        try:
            model = apps.get_model(app_label, model_name)
        except Exception:
            return Response({'error': 'مدل مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        qs = model.objects.all()

        # Simple search across CharFields/TextFields if search query provided
        if search:
            from django.db.models import Q
            q_objects = Q()
            for field in model._meta.fields:
                if field.get_internal_type() in ['CharField', 'TextField']:
                    q_objects |= Q(**{f"{field.name}__icontains": search})
            qs = qs.filter(q_objects)

        total_count = qs.count()
        rows = [_serialize_instance(obj) for obj in qs[:100]]
        fields = [{'name': f.name, 'type': f.get_internal_type(), 'verbose_name': str(f.verbose_name)} for f in model._meta.fields]

        return Response({
            'app_label': app_label,
            'model_name': model_name,
            'fields': fields,
            'total_count': total_count,
            'rows': rows
        }, status=status.HTTP_200_OK)

    def post(self, request):
        app_label = request.data.get('app_label')
        model_name = request.data.get('model_name')
        field_data = request.data.get('data', {})

        try:
            model = apps.get_model(app_label, model_name)
            obj = model.objects.create(**field_data)
            return Response(_serialize_instance(obj), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        app_label = request.data.get('app_label')
        model_name = request.data.get('model_name')
        record_id = request.data.get('id')
        field_data = request.data.get('data', {})

        try:
            model = apps.get_model(app_label, model_name)
            obj = model.objects.get(id=record_id)
            for k, v in field_data.items():
                if hasattr(obj, k) and k != 'id':
                    setattr(obj, k, v)
            obj.save()
            return Response(_serialize_instance(obj), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        app_label = request.query_params.get('app_label')
        model_name = request.query_params.get('model_name')
        record_id = request.query_params.get('id')

        try:
            model = apps.get_model(app_label, model_name)
            obj = model.objects.get(id=record_id)
            obj.delete()
            return Response({'status': 'رکورد با موفقیت حذف شد.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

