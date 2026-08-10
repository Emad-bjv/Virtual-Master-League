from celery import shared_task

@shared_task(name='season_pass.reset_weekly_tasks')
def reset_weekly_tasks(week_number: int):
    from .models import WeeklyTask, TeamTaskProgress
    from teams.models import Team

    # Archive old tasks
    WeeklyTask.objects.filter(week_number__lt=week_number).update(is_active=False)
    
    # Generate progress for new active tasks
    active_tasks = WeeklyTask.objects.filter(week_number=week_number, is_active=True)
    
    for team in Team.objects.all():
        for task in active_tasks:
            TeamTaskProgress.objects.get_or_create(team=team, task=task)
