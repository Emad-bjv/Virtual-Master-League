from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0027_player_base_team'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamgameplan',
            name='preset_name',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='سبک تاکتیک ساده'),
        ),
        migrations.AddField(
            model_name='teamgameplan',
            name='has_custom_player_edits',
            field=models.BooleanField(default=False, verbose_name='دارای جابجایی دستی بازیکنان'),
        ),
    ]
