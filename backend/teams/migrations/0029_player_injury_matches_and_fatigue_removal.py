from django.db import migrations, models


def reset_players_fatigue_and_init_injuries(apps, schema_editor):
    Player = apps.get_model('teams', 'Player')
    # Set all players to 100% stamina and unlock them
    Player.objects.all().update(
        virtual_stamina=100.00,
        is_locked=False,
        consecutive_games=0
    )
    # Set injury_matches = 2 for players who are currently marked as injured
    Player.objects.filter(is_injured=True).update(injury_matches=2)


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0028_teamgameplan_preset_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='injury_matches',
            field=models.PositiveIntegerField(
                default=0,
                help_text='تعداد بازی‌هایی که بازیکن به دلیل مصدومیت غایب است.',
                verbose_name='بازی‌های مصدومیت'
            ),
        ),
        migrations.RunPython(
            reset_players_fatigue_and_init_injuries,
            reverse_code=migrations.RunPython.noop
        ),
    ]
