from django.db import migrations, models


def populate_usernames(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for u in User.objects.all():
        if not getattr(u, 'username', None):
            if hasattr(u, 'phone_number') and u.phone_number:
                u.username = f"coach_{u.phone_number.replace('+', '')}"
            else:
                u.username = f"user_{u.id}"
            u.save()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_fields_and_otprecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='username',
            field=models.CharField(default='', max_length=50, verbose_name='نام کاربری'),
            preserve_default=False,
        ),
        migrations.RunPython(populate_usernames, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(max_length=50, unique=True, verbose_name='نام کاربری'),
        ),
        migrations.RemoveField(
            model_name='user',
            name='phone_number',
        ),
        migrations.DeleteModel(
            name='OTPRecord',
        ),
    ]
