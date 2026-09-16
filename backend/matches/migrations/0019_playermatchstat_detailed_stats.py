# Generated for PES 2021 Detailed Match Stats and Automated Rating
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('matches', '0018_match_away_attitude_level_match_home_attitude_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='playermatchstat',
            name='detailed_stats',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='شامل ۱۷ پارامتر عملکرد فردی بر اساس PES 2021 (گل، شوت، پاس، دوئل، مهار و ...)',
                verbose_name='آمار تفصیلی PES'
            ),
        ),
    ]
