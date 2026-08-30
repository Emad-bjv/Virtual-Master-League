# Generated for Player base_team

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0026_player_compatible_positions'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='base_team',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='base_players',
                to='teams.team',
                verbose_name='تیم پایه اولیه'
            ),
        ),
    ]
