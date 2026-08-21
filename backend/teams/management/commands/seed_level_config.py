from django.core.management.base import BaseCommand
from teams.models import PlayerLevelConfig

class Command(BaseCommand):
    help = 'Seeds the database with default Player Level Configuration (1-20)'

    def handle(self, *args, **kwargs):
        # Level N requires X XP to reach Level N+1
        level_data = [
            (1, 50),
            (2, 70),
            (3, 95),
            (4, 125),
            (5, 160),
            (6, 200),
            (7, 250),
            (8, 310),
            (9, 380),
            (10, 460),
            (11, 550),
            (12, 660),
            (13, 790),
            (14, 940),
            (15, 1120),
            (16, 1330),
            (17, 1580),
            (18, 1880),
            (19, 2250),
            (20, 0), # Level 20 is max, requires 0 XP to progress
        ]

        created_count = 0
        updated_count = 0

        for level, xp in level_data:
            obj, created = PlayerLevelConfig.objects.update_or_create(
                level=level,
                defaults={'xp_required': xp}
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully seeded {len(level_data)} level configurations '
                f'({created_count} created, {updated_count} updated).'
            )
        )
