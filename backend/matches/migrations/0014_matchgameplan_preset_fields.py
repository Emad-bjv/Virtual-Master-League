from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('matches', '0013_alter_matchevent_event_type_liveingamechangerequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='matchgameplan',
            name='preset_name',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='سبک تاکتیک ساده'),
        ),
        migrations.AddField(
            model_name='matchgameplan',
            name='has_custom_player_edits',
            field=models.BooleanField(default=False, verbose_name='دارای جابجایی دستی بازیکنان'),
        ),
    ]
