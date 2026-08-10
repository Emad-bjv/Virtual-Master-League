# Generated manually for Milestone 1 User & OTP model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name='آواتار'),
        ),
        migrations.AddField(
            model_name='user',
            name='points',
            field=models.PositiveIntegerField(default=0, verbose_name='امتیاز'),
        ),
        migrations.AddField(
            model_name='user',
            name='rank',
            field=models.PositiveIntegerField(default=0, verbose_name='رتبه جهانی'),
        ),
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('coach', 'Coach'), ('admin', 'Admin'), ('user', 'User')], default='coach', max_length=20, verbose_name='نقش کاربر'),
        ),
        migrations.AlterField(
            model_name='user',
            name='virtual_dollars',
            field=models.DecimalField(decimal_places=2, default=1000000.00, max_digits=15, verbose_name='دلار مجازی'),
        ),
        migrations.CreateModel(
            name='OTPRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_number', models.CharField(max_length=15, verbose_name='شماره موبایل')),
                ('code', models.CharField(max_length=6, verbose_name='کد OTP')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='زمان ایجاد')),
                ('expires_at', models.DateTimeField(verbose_name='زمان انقضا')),
                ('is_used', models.BooleanField(default=False, verbose_name='استفاده شده')),
                ('attempts', models.PositiveIntegerField(default=0, verbose_name='تعداد تلاش‌ها')),
            ],
            options={
                'verbose_name': 'کد تایید OTP',
                'verbose_name_plural': 'کدهای تایید OTP',
                'ordering': ['-created_at'],
            },
        ),
    ]
