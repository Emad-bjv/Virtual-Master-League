from rest_framework import views, permissions, status
from rest_framework.response import Response
from .models import GlobalSettings
from .serializers import GlobalSettingsSerializer
from django.apps import apps
from django.db import models
from django.db.models import Q
import json
import decimal
from datetime import date, datetime

class GlobalSettingsView(views.APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get(self, request, *args, **kwargs):
        settings = GlobalSettings.get_settings()
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        return self.put(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        settings = GlobalSettings.get_settings()
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicFeatureFlagsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings = GlobalSettings.get_settings()
        from .serializers import FeatureFlagsSerializer
        serializer = FeatureFlagsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)



def _serialize_value(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, bytes):
        return str(val)
    return val

def _serialize_instance(obj):
    data = {}
    for field in obj._meta.fields:
        val = getattr(obj, field.name, None)
        if field.is_relation:
            data[field.name] = str(val) if val is not None else None
            fk_id = getattr(obj, f"{field.name}_id", None)
            if fk_id is not None or hasattr(obj, f"{field.name}_id"):
                data[f"{field.name}_id"] = fk_id
        else:
            data[field.name] = _serialize_value(val)
    return data


class AdminDatabaseSummaryView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        app_labels_order = [
            'users', 'teams', 'matches', 'transfers', 
            'economy', 'gacha', 'season_pass', 'notifications', 
            'audit', 'core', 'auth'
        ]

        MODEL_TRANSLATIONS = {
            'users.User': 'کاربران',
            'teams.Team': 'تیم‌ها',
            'teams.Player': 'بازیکنان',
            'teams.ClubFacilities': 'تسهیلات باشگاه‌ها',
            'teams.TeamGamePlan': 'ترکیب‌ها و تاکتیک‌ها',
            'matches.Match': 'مسابقات',
            'matches.MatchEvent': 'رویدادهای مسابقه',
            'matches.Tournament': 'تورنمنت‌ها',
            'matches.MatchLineup': 'ترکیب مسابقه',
            'matches.MatchStat': 'آمار مسابقه',
            'matches.MatchSubstitution': 'تعویض‌های مسابقه',
            'transfers.TransferListing': 'آگهی‌های نقل و انتقالات',
            'transfers.TransferBid': 'پیشنهادهای خرید',
            'transfers.TransferWindow': 'پنجره‌های نقل و انتقالات',
            'economy.ClubBudgetHistory': 'تاریخچه بودجه باشگاه‌ها',
            'economy.SponsorContract': 'قراردادهای اسپانسر',
            'economy.TicketSales': 'فروش بلیط',
            'economy.PrizeMoneyHistory': 'پاداش‌ها و جوایز',
            'economy.FinancialTransaction': 'تراکنش‌های مالی',
            'gacha.Pack': 'پک‌های بازیکنان',
            'gacha.PackPlayer': 'بازیکنان پک‌ها',
            'gacha.PackOpeningSession': 'سشن‌های بازکردن پک',
            'season_pass.SeasonPass': 'سیزن پس‌ها',
            'season_pass.SeasonPassTask': 'ماموریت‌های سیزن پس',
            'season_pass.UserSeasonProgress': 'پیشرفت سیزن پس کاربران',
            'season_pass.UserTaskProgress': 'پیشرفت ماموریت کاربران',
            'notifications.Notification': 'اعلان‌ها',
            'notifications.NotificationPreference': 'تنظیمات اعلان',
            'audit.AuditLog': 'لاگ‌های حسابرسی (Audit)',
            'core.GlobalSettings': 'تنظیمات سراسری',
            'auth.Group': 'گروه‌ها (دسترسی)',
            'auth.Permission': 'مجوزها (دسترسی)',
        }

        APP_TRANSLATIONS = {
            'users': 'کاربران',
            'teams': 'تیم‌ها و بازیکنان',
            'matches': 'مسابقات',
            'transfers': 'نقل و انتقالات',
            'economy': 'اقتصاد و مالی',
            'gacha': 'گاشا و پک‌ها',
            'season_pass': 'سیزن پس',
            'notifications': 'اعلان‌ها',
            'audit': 'حسابرسی',
            'core': 'سیستم و تنظیمات',
            'auth': 'دسترسی‌ها',
        }

        summary = []
        all_models = apps.get_models()

        for model in all_models:
            app_label = model._meta.app_label
            if app_label in ['contenttypes', 'sessions', 'admin']:
                continue

            model_name = model.__name__
            key = f"{app_label}.{model_name}"

            verbose_name = MODEL_TRANSLATIONS.get(
                key,
                str(model._meta.verbose_name_plural or model._meta.verbose_name or model_name).title()
            )

            try:
                count = model.objects.count()
            except Exception:
                count = 0

            summary.append({
                'app_label': app_label,
                'app_verbose_name': APP_TRANSLATIONS.get(app_label, app_label.capitalize()),
                'model_name': model_name,
                'verbose_name': verbose_name,
                'count': count
            })

        def sort_key(item):
            app_idx = app_labels_order.index(item['app_label']) if item['app_label'] in app_labels_order else 99
            return (app_idx, item['model_name'])

        summary.sort(key=sort_key)
        return Response(summary, status=status.HTTP_200_OK)


class AdminDatabaseTableView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def _parse_field_value(self, field, raw_val):
        if raw_val is None or raw_val == '':
            return None if field.null else ('' if field.blank else raw_val)

        ftype = field.get_internal_type()
        if ftype == 'BooleanField':
            if isinstance(raw_val, str):
                return raw_val.lower() in ['true', '1', 'yes', 't']
            return bool(raw_val)
        elif ftype in ['IntegerField', 'BigIntegerField', 'SmallIntegerField', 'PositiveIntegerField', 'PositiveSmallIntegerField']:
            try:
                return int(raw_val)
            except (ValueError, TypeError):
                return raw_val
        elif ftype in ['FloatField', 'DecimalField']:
            try:
                return float(raw_val)
            except (ValueError, TypeError):
                return raw_val
        elif ftype == 'JSONField':
            if isinstance(raw_val, str):
                try:
                    return json.loads(raw_val)
                except Exception:
                    return raw_val
            return raw_val
        return raw_val

    def get(self, request):
        app_label = request.query_params.get('app_label', 'users')
        model_name = request.query_params.get('model_name', 'User')
        search = request.query_params.get('search', '').strip()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))

        try:
            model = apps.get_model(app_label, model_name)
        except Exception:
            return Response({'error': 'مدل مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        qs = model.objects.all()

        if search:
            q_objects = Q()
            for field in model._meta.fields:
                ftype = field.get_internal_type()
                if ftype in ['CharField', 'TextField', 'EmailField']:
                    q_objects |= Q(**{f"{field.name}__icontains": search})
                elif ftype in ['IntegerField', 'BigAutoField', 'AutoField'] and search.isdigit():
                    q_objects |= Q(**{field.name: int(search)})
            qs = qs.filter(q_objects)

        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        rows_qs = qs[start:end]

        rows = [_serialize_instance(obj) for obj in rows_qs]
        fields = []
        for f in model._meta.fields:
            choices = []
            if getattr(f, 'choices', None):
                for val, label in f.flatchoices:
                    choices.append({'value': str(val), 'label': str(label)})
            
            fields.append({
                'name': f.name,
                'type': f.get_internal_type(),
                'verbose_name': str(f.verbose_name),
                'help_text': str(f.help_text) if hasattr(f, 'help_text') and f.help_text else '',
                'choices': choices,
                'is_relation': f.is_relation,
                'editable': f.editable and f.name != 'id',
                'null': f.null,
                'blank': f.blank,
            })

        return Response({
            'app_label': app_label,
            'model_name': model_name,
            'fields': fields,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, (total_count + page_size - 1) // page_size),
            'rows': rows
        }, status=status.HTTP_200_OK)

    def post(self, request):
        app_label = request.data.get('app_label')
        model_name = request.data.get('model_name')
        field_data = request.data.get('data', {})

        try:
            model = apps.get_model(app_label, model_name)
            create_kwargs = {}
            for f in model._meta.fields:
                if f.name == 'id' or not f.editable:
                    continue
                if f.is_relation:
                    fk_val = field_data.get(f"{f.name}_id") or field_data.get(f.name)
                    if fk_val is not None and fk_val != '':
                        create_kwargs[f"{f.name}_id"] = int(fk_val)
                elif f.name in field_data:
                    parsed = self._parse_field_value(f, field_data[f.name])
                    if parsed is not None or f.null:
                        create_kwargs[f.name] = parsed

            obj = model.objects.create(**create_kwargs)
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
            for f in model._meta.fields:
                if f.name == 'id' or not f.editable:
                    continue
                if f.is_relation:
                    fk_key = f"{f.name}_id"
                    fk_val = field_data.get(fk_key) if fk_key in field_data else field_data.get(f.name)
                    if fk_val is not None:
                        if fk_val == '' or fk_val is None:
                            setattr(obj, fk_key, None)
                        else:
                            try:
                                setattr(obj, fk_key, int(fk_val))
                            except (ValueError, TypeError):
                                pass
                elif f.name in field_data:
                    parsed = self._parse_field_value(f, field_data[f.name])
                    setattr(obj, f.name, parsed)

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


